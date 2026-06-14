// 8D audio engine: takes a loaded track and orbits it around the listener's
// head with HRTF panning + spatial reverb. Headphones required.
//
//   media ──┬─ centerGain ───────────────┐
//           └─ panGain → panner(HRTF) ────┼─→ bus ─┬─ (dry) ───────────────→ master → out
//                                                  └─ convolver → wetGain ──→ master
//
// Spread crossfades between the centered signal and the orbiting one; reverb
// sets the convolver wet level. Only audio you can read as samples works
// (uploads, your own CORS-enabled URLs) — never DRM streams.

import { getAudioContext, resumeAudio, makeImpulseResponse } from "./context";
import type { EightDPreset } from "./presets";

export class EightDEngine {
  private ctx: AudioContext;
  private audio: HTMLAudioElement;
  private source: MediaElementAudioSourceNode;
  private centerGain: GainNode;
  private panGain: GainNode;
  private panner: PannerNode;
  private bus: GainNode;
  private wetGain: GainNode;
  private master: GainNode;

  private secondsPerTurn = 8;
  private radius = 2.2;
  private angle = 0;
  private raf: number | null = null;
  private lastTs: number | null = null;
  private _playing = false;
  private _hasSource = false;

  // Generated soundbed (built-in preset audio — no file needed).
  private mode: "media" | "bed" = "media";
  private bedSpec: EightDPreset | null = null;
  private bedNodes: AudioNode[] = [];
  private bedGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  onError?: (message: string) => void;
  onEnded?: () => void;

  constructor() {
    this.ctx = getAudioContext();
    this.audio = new Audio();
    this.audio.loop = false;
    this.audio.preload = "auto";
    this.audio.addEventListener("error", () => {
      this.onError?.("Could not load. The file must allow cross-origin (CORS) access.");
    });
    this.audio.addEventListener("ended", () => {
      this._playing = false;
      this.stopLoop();
      this.onEnded?.();
    });

    this.source = this.ctx.createMediaElementSource(this.audio);

    this.centerGain = this.ctx.createGain();
    this.panGain = this.ctx.createGain();
    this.bus = this.ctx.createGain();
    this.master = this.ctx.createGain();

    this.panner = this.ctx.createPanner();
    this.panner.panningModel = "HRTF";
    this.panner.distanceModel = "linear";
    this.panner.rolloffFactor = 0; // keep loudness steady; direction comes from HRTF
    this.panner.refDistance = 1;
    this.panner.maxDistance = 10000;

    const convolver = this.ctx.createConvolver();
    convolver.buffer = makeImpulseResponse(this.ctx);
    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = 0.3;

    // Wiring
    this.source.connect(this.centerGain).connect(this.bus);
    this.source.connect(this.panGain).connect(this.panner).connect(this.bus);
    this.bus.connect(this.master); // dry
    this.bus.connect(convolver).connect(this.wetGain).connect(this.master); // wet
    this.master.connect(this.ctx.destination);

    this.setSpread(100);
  }

  get playing() {
    return this._playing;
  }
  get hasSource() {
    return this._hasSource;
  }
  getAngle() {
    return this.angle;
  }
  getSpeed() {
    return this.secondsPerTurn;
  }

  // Select a built-in soundbed preset — a generated ambient texture that plays
  // for as long as you like with nothing to load.
  setBed(spec: EightDPreset) {
    const wasBedPlaying = this._playing && this.mode === "bed";
    this.mode = "bed";
    this.bedSpec = spec;
    this._hasSource = true;
    this.setSpeed(spec.orbit);
    this.setSpread(spec.spread);
    this.setReverb(spec.reverb);
    if (wasBedPlaying) {
      this.teardownBed();
      this.buildBed();
    }
  }

  private noiseBuffer(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish: soft, airy, non-fatiguing
      d[i] = last * 3.2;
    }
    this.noiseBuf = buf;
    return buf;
  }

  private buildBed() {
    if (!this.bedSpec || this.bedGain) return;
    const ctx = this.ctx;
    const s = this.bedSpec;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0;

    // Air layer: looping brown noise through a lowpass (its "color").
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer();
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = s.noiseCut;
    const ng = ctx.createGain();
    ng.gain.value = s.noiseLevel;
    noise.connect(nf).connect(ng).connect(bedGain);
    noise.start();

    // Pad layer: soft root/fifth/octave chord through a slowly-drifting lowpass.
    const pf = ctx.createBiquadFilter();
    pf.type = "lowpass";
    pf.frequency.value = s.root * 6;
    pf.Q.value = 3;
    const pg = ctx.createGain();
    pg.gain.value = s.padLevel;
    pf.connect(pg).connect(bedGain);
    const oscs = [1, 1.5, 2].map((r, i) => {
      const o = ctx.createOscillator();
      o.type = s.wave;
      o.frequency.value = s.root * r;
      o.detune.value = (i - 1) * 5; // gentle chorus
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.28;
      o.connect(g).connect(pf);
      o.start();
      return o;
    });

    // Slow LFO drifts the pad filter so the texture breathes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = s.lfo;
    const lg = ctx.createGain();
    lg.gain.value = s.root * 2.5;
    lfo.connect(lg).connect(pf.frequency);
    lfo.start();

    bedGain.connect(this.centerGain);
    bedGain.connect(this.panGain);
    bedGain.gain.setTargetAtTime(0.85, ctx.currentTime, 1.2); // gentle fade-in

    this.bedGain = bedGain;
    this.bedNodes = [noise, ...oscs, lfo];
  }

  private teardownBed() {
    const bedGain = this.bedGain;
    const nodes = this.bedNodes;
    this.bedGain = null;
    this.bedNodes = [];
    if (bedGain) bedGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    window.setTimeout(() => {
      for (const n of nodes) {
        try {
          (n as OscillatorNode).stop?.();
        } catch {
          /* already stopped */
        }
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      }
      try {
        bedGain?.disconnect();
      } catch {
        /* ignore */
      }
    }, 350);
  }

  // Load a File (upload) or a CORS-enabled remote URL.
  setSource(src: File | string) {
    this.stopLoop();
    this.mode = "media";
    if (this.bedGain) this.teardownBed();
    this._playing = false;
    if (typeof src === "string") {
      this.audio.crossOrigin = "anonymous";
      this.audio.src = src;
    } else {
      this.audio.removeAttribute("crossorigin");
      this.audio.src = URL.createObjectURL(src);
    }
    this.audio.load();
    this._hasSource = true;
  }

  async play() {
    if (!this._hasSource) return;
    await resumeAudio();
    if (this.mode === "bed") {
      if (!this.bedGain) this.buildBed();
      this._playing = true;
      this.lastTs = null;
      this.startLoop();
      return;
    }
    try {
      await this.audio.play();
    } catch {
      this.onError?.("Playback was blocked. Tap play again.");
      return;
    }
    this._playing = true;
    this.lastTs = null;
    this.startLoop();
  }

  pause() {
    if (this.mode === "bed") {
      this.teardownBed();
      this._playing = false;
      this.stopLoop();
      return;
    }
    this.audio.pause();
    this._playing = false;
    this.stopLoop();
  }

  setSpeed(secondsPerTurn: number) {
    this.secondsPerTurn = Math.max(0.5, secondsPerTurn);
  }

  // 0–100: crossfade from centered (0) to fully orbiting (100).
  setSpread(percent: number) {
    const p = Math.min(100, Math.max(0, percent)) / 100;
    const t = this.ctx.currentTime;
    this.panGain.gain.setTargetAtTime(p, t, 0.05);
    this.centerGain.gain.setTargetAtTime(1 - p, t, 0.05);
  }

  // 0–100: reverb wet level.
  setReverb(percent: number) {
    const p = Math.min(100, Math.max(0, percent)) / 100;
    this.wetGain.gain.setTargetAtTime(p, this.ctx.currentTime, 0.05);
  }

  private startLoop() {
    if (this.raf != null) return;
    const tick = (ts: number) => {
      if (!this._playing) return;
      if (this.lastTs != null) {
        const dt = (ts - this.lastTs) / 1000;
        this.angle += (dt / this.secondsPerTurn) * Math.PI * 2;
      }
      this.lastTs = ts;
      const t = this.ctx.currentTime;
      const x = Math.sin(this.angle) * this.radius;
      const z = -Math.cos(this.angle) * this.radius;
      this.panner.positionX.setValueAtTime(x, t);
      this.panner.positionZ.setValueAtTime(z, t);
      this.panner.positionY.setValueAtTime(0, t);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.lastTs = null;
  }

  destroy() {
    this.pause();
    this.teardownBed();
    try {
      this.audio.src = "";
    } catch {
      /* ignore */
    }
  }
}
