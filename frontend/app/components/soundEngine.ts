// Gentle Web Audio synthesizer for Sound Sanctuary & Vibroacoustic Brown Noise.
// Uses smooth gain envelopes so playback never startles.

export type SoundPreset = "sanctuary" | "purr";

class GentleSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stopFns: (() => void)[] = [];
  private activePreset: SoundPreset | null = null;

  get current(): SoundPreset | null {
    return this.activePreset;
  }

  toggle(preset: SoundPreset): SoundPreset | null {
    if (this.activePreset === preset) {
      this.stop();
      return null;
    }
    this.stop();
    this.start(preset);
    return preset;
  }

  start(preset: SoundPreset) {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.1);
    master.connect(ctx.destination);

    // Generate 3 seconds of smooth brown noise buffer
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = preset === "sanctuary" ? 420 : 145;
    noise.connect(filter);
    filter.connect(master);
    noise.start();

    const cleanups: (() => void)[] = [
      () => {
        try {
          noise.stop();
        } catch {
          // ignore
        }
      },
    ];

    if (preset === "sanctuary") {
      // Soft singing-bowl warm fifth (174Hz + 261Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = 174;
      osc2.frequency.value = 261.6;
      droneGain.gain.value = 0.09;
      osc1.connect(droneGain);
      osc2.connect(droneGain);
      droneGain.connect(master);
      osc1.start();
      osc2.start();
      cleanups.push(() => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          // ignore
        }
      });
    } else {
      // Subtle 27Hz vibroacoustic purr modulation
      const subOsc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.value = 54;
      lfo.type = "sine";
      lfo.frequency.value = 0.35;
      lfoGain.gain.value = 0.08;
      subGain.gain.value = 0.16;
      lfo.connect(lfoGain);
      lfoGain.connect(subGain.gain);
      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start();
      lfo.start();
      cleanups.push(() => {
        try {
          subOsc.stop();
          lfo.stop();
        } catch {
          // ignore
        }
      });
    }

    this.ctx = ctx;
    this.masterGain = master;
    this.stopFns = cleanups;
    this.activePreset = preset;
  }

  stop() {
    if (!this.ctx || !this.masterGain) {
      this.activePreset = null;
      return;
    }
    const ctx = this.ctx;
    const gain = this.masterGain;
    const fns = [...this.stopFns];
    this.ctx = null;
    this.masterGain = null;
    this.stopFns = [];
    this.activePreset = null;

    try {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      window.setTimeout(() => {
        fns.forEach((fn) => fn());
        ctx.close().catch(() => undefined);
      }, 380);
    } catch {
      fns.forEach((fn) => fn());
      ctx.close().catch(() => undefined);
    }
  }
}

export const soundEngine = new GentleSoundEngine();
