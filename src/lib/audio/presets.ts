// The 10 presets for each audio mode. Names describe the sound/state — never a
// clinical claim. (See the honest-framing copy in the Audio page.)

export interface EightDPreset {
  id: number;
  name: string;
  orbit: number; // seconds per turn
  spread: number; // %
  reverb: number; // %
  feel: string;
  // Built-in soundbed: a calm, generated ambient texture so the preset plays for
  // a full session with nothing to load. root = pad chord base (Hz); noiseCut =
  // air-noise lowpass (Hz); levels 0–1; wave = pad timbre; lfo = drift rate (Hz).
  root: number;
  noiseCut: number;
  noiseLevel: number;
  padLevel: number;
  wave: OscillatorType;
  lfo: number;
}

export const EIGHT_D_PRESETS: EightDPreset[] = [
  { id: 1, name: "Classic 8D", orbit: 8, spread: 100, reverb: 30, feel: "The standard signature sweep", root: 110, noiseCut: 1200, noiseLevel: 0.24, padLevel: 0.5, wave: "sine", lfo: 0.05 },
  { id: 2, name: "Hyper Focus", orbit: 7, spread: 70, reverb: 0, feel: "Dry, clean, stimulating", root: 146.83, noiseCut: 2000, noiseLevel: 0.16, padLevel: 0.4, wave: "triangle", lfo: 0.08 },
  { id: 3, name: "Study Flow", orbit: 10, spread: 60, reverb: 15, feel: "Gentle, non-distracting", root: 130.81, noiseCut: 1000, noiseLevel: 0.2, padLevel: 0.44, wave: "sine", lfo: 0.04 },
  { id: 4, name: "Slow Drift", orbit: 16, spread: 100, reverb: 55, feel: "Dreamy, ambient", root: 98, noiseCut: 700, noiseLevel: 0.3, padLevel: 0.54, wave: "sine", lfo: 0.03 },
  { id: 5, name: "Fast Spin", orbit: 3, spread: 100, reverb: 10, feel: "Intense, attention-grabbing", root: 164.81, noiseCut: 2500, noiseLevel: 0.2, padLevel: 0.4, wave: "triangle", lfo: 0.1 },
  { id: 6, name: "Calm Sway", orbit: 18, spread: 50, reverb: 35, feel: "Relaxation / wind-down", root: 110, noiseCut: 800, noiseLevel: 0.28, padLevel: 0.5, wave: "sine", lfo: 0.025 },
  { id: 7, name: "Deep Space", orbit: 14, spread: 100, reverb: 75, feel: "Immersive, big reverb", root: 82.41, noiseCut: 600, noiseLevel: 0.32, padLevel: 0.55, wave: "sine", lfo: 0.02 },
  { id: 8, name: "Tight Wobble", orbit: 5, spread: 35, reverb: 10, feel: "Subtle close movement", root: 123.47, noiseCut: 1500, noiseLevel: 0.2, padLevel: 0.4, wave: "triangle", lfo: 0.12 },
  { id: 9, name: "Wide Cinema", orbit: 9, spread: 100, reverb: 50, feel: "Movie-like immersion", root: 110, noiseCut: 1400, noiseLevel: 0.25, padLevel: 0.55, wave: "sine", lfo: 0.045 },
  { id: 10, name: "Sleep Spiral", orbit: 20, spread: 80, reverb: 60, feel: "Very slow, soothing", root: 73.42, noiseCut: 500, noiseLevel: 0.3, padLevel: 0.5, wave: "sine", lfo: 0.015 },
];

export interface BinauralPreset {
  id: number;
  name: string;
  band: string;
  beat: number; // Hz
  carrier: number; // Hz
  note: string;
}

export const BINAURAL_PRESETS: BinauralPreset[] = [
  { id: 1, name: "Deep Sleep", band: "Delta", beat: 2.0, carrier: 100, note: "Deep, dreamless rest" },
  { id: 2, name: "Drift Off", band: "Delta", beat: 3.5, carrier: 140, note: "Falling asleep" },
  { id: 3, name: "Deep Relax", band: "Theta", beat: 4.5, carrier: 180, note: "Deep relaxation" },
  { id: 4, name: "Meditation", band: "Theta", beat: 6.0, carrier: 200, note: "Meditative state" },
  { id: 5, name: "Creative Flow", band: "Theta/Alpha", beat: 7.83, carrier: 210, note: "Schumann · ideation" },
  { id: 6, name: "Calm Focus", band: "Alpha", beat: 10.0, carrier: 220, note: "Relaxed, calm alertness" },
  { id: 7, name: "Relaxed Alert", band: "Alpha", beat: 12.0, carrier: 240, note: "Light, easy focus" },
  { id: 8, name: "Study", band: "Beta", beat: 16.0, carrier: 256, note: "Active concentration" },
  { id: 9, name: "High Focus", band: "Beta", beat: 20.0, carrier: 280, note: "Sustained task focus" },
  { id: 10, name: "Peak Attention", band: "Gamma", beat: 40.0, carrier: 300, note: "High-level attention" },
];
