// The 10 presets for each audio mode. Names describe the sound/state — never a
// clinical claim. (See the honest-framing copy in the Audio page.)

export interface EightDPreset {
  id: number;
  name: string;
  orbit: number; // seconds per turn
  spread: number; // %
  reverb: number; // %
  feel: string;
}

export const EIGHT_D_PRESETS: EightDPreset[] = [
  { id: 1, name: "Classic 8D", orbit: 8, spread: 100, reverb: 30, feel: "The standard signature sweep" },
  { id: 2, name: "Hyper Focus", orbit: 7, spread: 70, reverb: 0, feel: "Dry, clean, stimulating" },
  { id: 3, name: "Study Flow", orbit: 10, spread: 60, reverb: 15, feel: "Gentle, non-distracting" },
  { id: 4, name: "Slow Drift", orbit: 16, spread: 100, reverb: 55, feel: "Dreamy, ambient" },
  { id: 5, name: "Fast Spin", orbit: 3, spread: 100, reverb: 10, feel: "Intense, attention-grabbing" },
  { id: 6, name: "Calm Sway", orbit: 18, spread: 50, reverb: 35, feel: "Relaxation / wind-down" },
  { id: 7, name: "Deep Space", orbit: 14, spread: 100, reverb: 75, feel: "Immersive, big reverb" },
  { id: 8, name: "Tight Wobble", orbit: 5, spread: 35, reverb: 10, feel: "Subtle close movement" },
  { id: 9, name: "Wide Cinema", orbit: 9, spread: 100, reverb: 50, feel: "Movie-like immersion" },
  { id: 10, name: "Sleep Spiral", orbit: 20, spread: 80, reverb: 60, feel: "Very slow, soothing" },
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
