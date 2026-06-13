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

  // Load a File (upload) or a CORS-enabled remote URL.
  setSource(src: File | string) {
    this.stopLoop();
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
    try {
      this.audio.src = "";
    } catch {
      /* ignore */
    }
  }
}
