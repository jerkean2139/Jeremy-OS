// Binaural beats engine: two pure sine tones, a carrier in the left ear and
// carrier+beat in the right, kept in hard-separated stereo via a ChannelMerger
// (never summed to mono). An optional background layer (pink/brown noise or a
// loaded track) plays underneath at its own volume. Headphones required.
//
//   leftOsc  → merger.input[0] (L) ┐
//   rightOsc → merger.input[1] (R) ┼→ toneGain → out
//   noise/track → bgGain → out

import { getAudioContext, resumeAudio, makeNoiseBuffer } from "./context";

export type BackgroundType = "none" | "pink" | "brown" | "track";

export class BinauralEngine {
  private ctx: AudioContext;
  private toneGain: GainNode;
  private bgGain: GainNode;
  private merger: ChannelMergerNode;

  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private bgNode: AudioBufferSourceNode | null = null;

  private carrier = 200;
  private beat = 6;
  private volume = 0.5;
  private _playing = false;

  // Optional loaded-track background
  private trackAudio: HTMLAudioElement | null = null;
  private trackSource: MediaElementAudioSourceNode | null = null;
  private bgType: BackgroundType = "none";
  private bgLevel = 0.4;

  onError?: (message: string) => void;

  constructor() {
    this.ctx = getAudioContext();
    this.merger = this.ctx.createChannelMerger(2);
    this.toneGain = this.ctx.createGain();
    this.toneGain.gain.value = 0;
    this.bgGain = this.ctx.createGain();
    this.bgGain.gain.value = 0;

    this.merger.connect(this.toneGain).connect(this.ctx.destination);
    this.bgGain.connect(this.ctx.destination);
  }

  get playing() {
    return this._playing;
  }
  getCarrier() {
    return this.carrier;
  }
  getBeat() {
    return this.beat;
  }

  async play() {
    await resumeAudio();
    const t = this.ctx.currentTime;

    this.leftOsc = this.ctx.createOscillator();
    this.rightOsc = this.ctx.createOscillator();
    this.leftOsc.type = "sine";
    this.rightOsc.type = "sine";
    this.leftOsc.frequency.setValueAtTime(this.carrier, t);
    this.rightOsc.frequency.setValueAtTime(this.carrier + this.beat, t);

    // Hard stereo separation: left → channel 0, right → channel 1.
    this.leftOsc.connect(this.merger, 0, 0);
    this.rightOsc.connect(this.merger, 0, 1);
    this.leftOsc.start();
    this.rightOsc.start();

    // Fade in to avoid a click.
    this.toneGain.gain.cancelScheduledValues(t);
    this.toneGain.gain.setValueAtTime(0, t);
    this.toneGain.gain.linearRampToValueAtTime(this.volume, t + 0.05);

    this.startBackground();
    this._playing = true;
  }

  pause() {
    if (!this._playing) return;
    const t = this.ctx.currentTime;
    this.toneGain.gain.cancelScheduledValues(t);
    this.toneGain.gain.setValueAtTime(this.toneGain.gain.value, t);
    this.toneGain.gain.linearRampToValueAtTime(0, t + 0.05);
    this.bgGain.gain.linearRampToValueAtTime(0, t + 0.05);

    const left = this.leftOsc;
    const right = this.rightOsc;
    const bg = this.bgNode;
    setTimeout(() => {
      left?.stop();
      right?.stop();
      bg?.stop();
    }, 80);
    this.leftOsc = null;
    this.rightOsc = null;
    this.bgNode = null;
    this.trackAudio?.pause();
    this._playing = false;
  }

  // Smoothly ramp to a new carrier/beat (no abrupt jumps).
  setBeat(carrier: number, beat: number) {
    this.carrier = carrier;
    this.beat = beat;
    if (this.leftOsc && this.rightOsc) {
      const t = this.ctx.currentTime;
      this.leftOsc.frequency.linearRampToValueAtTime(carrier, t + 0.3);
      this.rightOsc.frequency.linearRampToValueAtTime(carrier + beat, t + 0.3);
    }
  }

  // 0–100 master tone volume.
  setVolume(pct: number) {
    this.volume = Math.min(100, Math.max(0, pct)) / 100;
    if (this._playing) {
      this.toneGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setBackground(type: BackgroundType, level: number) {
    this.bgType = type;
    this.bgLevel = Math.min(100, Math.max(0, level)) / 100;
    if (this._playing) {
      this.stopBackgroundNodes();
      this.startBackground();
    }
  }

  // Provide a loaded track to use as the background ("track" type).
  setTrack(src: File | string) {
    if (!this.trackAudio) {
      this.trackAudio = new Audio();
      this.trackAudio.loop = true;
      this.trackAudio.addEventListener("error", () =>
        this.onError?.("Could not load that track for the background.")
      );
      this.trackSource = this.ctx.createMediaElementSource(this.trackAudio);
      this.trackSource.connect(this.bgGain);
    }
    if (typeof src === "string") {
      this.trackAudio.crossOrigin = "anonymous";
      this.trackAudio.src = src;
    } else {
      this.trackAudio.removeAttribute("crossorigin");
      this.trackAudio.src = URL.createObjectURL(src);
    }
    this.trackAudio.load();
  }

  hasTrack() {
    return !!this.trackAudio?.src;
  }

  private startBackground() {
    const t = this.ctx.currentTime;
    if (this.bgType === "none") {
      this.bgGain.gain.setTargetAtTime(0, t, 0.05);
      return;
    }
    if (this.bgType === "track") {
      if (this.trackAudio?.src) {
        void this.trackAudio.play().catch(() => {});
        this.bgGain.gain.linearRampToValueAtTime(this.bgLevel, t + 0.1);
      }
      return;
    }
    // pink / brown noise
    const node = this.ctx.createBufferSource();
    node.buffer = makeNoiseBuffer(this.ctx, this.bgType);
    node.loop = true;
    node.connect(this.bgGain);
    node.start();
    this.bgNode = node;
    this.bgGain.gain.linearRampToValueAtTime(this.bgLevel, t + 0.1);
  }

  private stopBackgroundNodes() {
    try {
      this.bgNode?.stop();
    } catch {
      /* ignore */
    }
    this.bgNode = null;
    this.trackAudio?.pause();
  }

  destroy() {
    this.pause();
    this.stopBackgroundNodes();
  }
}
