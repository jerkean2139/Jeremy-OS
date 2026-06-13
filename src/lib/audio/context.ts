// One shared AudioContext for the whole app (both audio engines reuse it).
// Must be created/resumed inside a user gesture or mobile browsers block it.

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext is only available in the browser");
  }
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

// Call from a Play tap. Resumes a suspended context so audio can start.
export async function resumeAudio(): Promise<AudioContext> {
  const c = getAudioContext();
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* some browsers resolve late; the first sound still plays */
    }
  }
  return c;
}

// A short, decaying-noise impulse response for the convolver reverb. Generated
// once and reused; length scales the perceived room size.
export function makeImpulseResponse(c: BaseAudioContext, seconds = 2.6, decay = 2.2): AudioBuffer {
  const rate = c.sampleRate;
  const length = Math.max(1, Math.floor(seconds * rate));
  const impulse = c.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// A looping noise buffer (pink-ish or brown) for the binaural background layer.
export function makeNoiseBuffer(c: BaseAudioContext, kind: "pink" | "brown", seconds = 3): AudioBuffer {
  const rate = c.sampleRate;
  const length = Math.floor(seconds * rate);
  const buffer = c.createBuffer(1, length, rate);
  const out = buffer.getChannelData(0);

  if (kind === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      out[i] = last * 3.5;
    }
  } else {
    // Pink noise via the Paul Kellet approximation.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}
