import { CC0WebTrack, StudioAudioTrackId } from '../types/brand';

const SAMPLE_RATE = 44100;

/**
 * Converts a rendered AudioBuffer into a standard stereo 16-bit PCM WAV Blob
 * so users can preview, seek, scrub, or download any built-in track directly.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function schedulePadChord(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  notes: number[],
  startTime: number,
  duration: number,
  gainVal: number,
  wave: OscillatorType = 'triangle',
  cutoff = 1100
) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, startTime);
  filter.Q.value = 0.8;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, startTime);
  env.gain.linearRampToValueAtTime(
    gainVal,
    startTime + Math.min(0.85, duration * 0.25)
  );
  env.gain.setValueAtTime(gainVal * 0.85, startTime + duration * 0.72);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  filter.connect(env);
  env.connect(dest);

  notes.forEach((midi, idx) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(midiToFreq(midi), startTime);
    osc.detune.setValueAtTime((idx % 2 === 0 ? -1 : 1) * 5, startTime);
    osc.connect(filter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  });
}

function scheduleTone(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  midi: number,
  startTime: number,
  duration: number,
  gainVal: number,
  style: 'flute' | 'pluck' | 'keys' | 'bell' | 'bass'
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();

  const freq = midiToFreq(midi);
  osc.frequency.setValueAtTime(freq, startTime);

  if (style === 'flute') {
    osc.type = 'sine';
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.2, startTime);
    lfoGain.gain.setValueAtTime(freq * 0.008, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(startTime);
    lfo.stop(startTime + duration + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.09);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  } else if (style === 'bell') {
    osc.type = 'sine';
    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2.0, startTime);
    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(gainVal * 0.25, startTime);
    overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);
    overtone.connect(overGain);
    overGain.connect(dest);
    overtone.start(startTime);
    overtone.stop(startTime + duration + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4200, startTime);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  } else if (style === 'bass') {
    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, startTime);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  } else if (style === 'pluck') {
    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, startTime);
    filter.frequency.exponentialRampToValueAtTime(520, startTime + duration);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  } else {
    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1900, startTime);
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  }

  osc.connect(filter);
  filter.connect(env);
  env.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function scheduleKick(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  startTime: number,
  gainVal = 0.42
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(135, startTime);
  osc.frequency.exponentialRampToValueAtTime(42, startTime + 0.14);

  env.gain.setValueAtTime(gainVal, startTime);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

  osc.connect(env);
  env.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + 0.3);
}

function scheduleSnareOrRim(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  startTime: number,
  gainVal = 0.12
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1850, startTime);
  bp.Q.value = 1.4;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gainVal, startTime);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);
  src.connect(bp);
  bp.connect(env);
  env.connect(dest);
  src.start(startTime);
  src.stop(startTime + 0.13);
}

function scheduleHat(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  startTime: number,
  gainVal = 0.07
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(6800, startTime);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gainVal, startTime);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);

  src.connect(hp);
  hp.connect(env);
  env.connect(dest);
  src.start(startTime);
  src.stop(startTime + 0.07);
}

function scheduleTextureBed(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  durationSec: number,
  centerFreq: number,
  qVal: number,
  gainVal: number,
  modHz = 0.18
) {
  const noiseBuf = createNoiseBuffer(ctx, durationSec);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(centerFreq, 0);
  filter.Q.value = qVal;

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = modHz;
  lfoGain.gain.value = centerFreq * 0.35;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(0);
  lfo.stop(durationSec);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, 0);
  env.gain.linearRampToValueAtTime(gainVal, 1.2);
  env.gain.setValueAtTime(gainVal, durationSec - 1.2);
  env.gain.exponentialRampToValueAtTime(0.0001, durationSec);

  src.connect(filter);
  filter.connect(env);
  env.connect(dest);
  src.start(0);
  src.stop(durationSec);
}

const trackCache = new Map<StudioAudioTrackId, AudioBuffer>();

/**
 * Synthesizes any of the 18 built-in CC0 non-copyrighted studio tracks into an AudioBuffer.
 */
export async function renderStudioAudioTrack(
  trackId: StudioAudioTrackId
): Promise<AudioBuffer> {
  const cached = trackCache.get(trackId);
  if (cached) return cached;

  const durationSec = 32;
  const ctx = new OfflineAudioContext(2, SAMPLE_RATE * durationSec, SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = 0.85;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.ratio.value = 4;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const noiseBuf = createNoiseBuffer(ctx, 0.15);

  switch (trackId) {
    case 'okarina-breeze': {
      const beat = 60 / 96;
      const chords = [
        [50, 57, 60, 65],
        [46, 53, 57, 62],
        [48, 55, 60, 64],
        [45, 52, 57, 60],
      ];
      const melody = [74, 77, 79, 81, 79, 77, 74, 72, 74, 77, 81, 84, 81, 79, 77, 74];
      for (let bar = 0; bar < 12; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        schedulePadChord(ctx, master, chords[bar % 4], t, beat * 4, 0.13, 'triangle', 1200);
        scheduleKick(ctx, master, t, 0.25);
        scheduleKick(ctx, master, t + beat * 2.5, 0.18);
        for (let b = 0; b < 8; b++) {
          if (b % 2 === 1) scheduleHat(ctx, master, noiseBuf, t + b * (beat / 2), 0.04);
        }
        scheduleTone(ctx, master, melody[(bar * 2) % melody.length], t + beat * 0.5, beat * 1.4, 0.16, 'flute');
        scheduleTone(ctx, master, melody[(bar * 2 + 1) % melody.length], t + beat * 2.25, beat * 1.6, 0.15, 'flute');
      }
      break;
    }

    case 'mint-horizon': {
      const beat = 60 / 108;
      const chords = [
        [43, 50, 55, 59, 62],
        [48, 55, 60, 64, 67],
        [40, 47, 52, 55, 59],
        [45, 52, 57, 62, 66],
      ];
      const notes = [67, 71, 74, 79, 74, 71, 69, 74];
      for (let bar = 0; bar < 15; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        schedulePadChord(ctx, master, chords[bar % 4], t, beat * 4, 0.12, 'triangle', 1700);
        for (let b = 0; b < 4; b++) {
          scheduleKick(ctx, master, t + b * beat, 0.3);
          scheduleHat(ctx, master, noiseBuf, t + (b + 0.5) * beat, 0.05);
        }
        for (let s = 0; s < 8; s++) {
          scheduleTone(ctx, master, notes[s % 8], t + s * (beat * 0.5), beat * 0.35, 0.09, 'keys');
        }
      }
      break;
    }

    case 'indigo-pulse': {
      const beat = 60 / 118;
      const chords = [
        [48, 55, 60, 63],
        [44, 51, 56, 60],
        [46, 53, 58, 62],
        [43, 50, 55, 58],
      ];
      const plucks = [72, 75, 79, 75, 74, 72, 70, 72];
      for (let bar = 0; bar < 16; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        schedulePadChord(ctx, master, chords[bar % 4], t, beat * 4, 0.11, 'triangle', 1400);
        for (let b = 0; b < 4; b++) {
          scheduleKick(ctx, master, t + b * beat, 0.38);
          scheduleHat(ctx, master, noiseBuf, t + (b + 0.5) * beat, 0.065);
        }
        for (let s = 0; s < 8; s++) {
          scheduleTone(ctx, master, plucks[(bar + s) % 8], t + s * (beat * 0.5), beat * 0.36, 0.1, 'pluck');
        }
      }
      break;
    }

    case 'quiet-studio': {
      const beat = 60 / 84;
      const chords = [
        [45, 52, 57, 60, 64],
        [41, 48, 53, 57, 60],
        [48, 55, 60, 64, 67],
        [43, 50, 55, 59, 62],
      ];
      for (let bar = 0; bar < 12; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        chords[bar % 4].forEach((n, idx) => {
          scheduleTone(ctx, master, n, t + idx * 0.035, beat * 3.8, 0.075, 'keys');
        });
        scheduleKick(ctx, master, t, 0.28);
        scheduleKick(ctx, master, t + beat * 2.5, 0.22);
        for (let b = 0; b < 8; b++) {
          scheduleHat(ctx, master, noiseBuf, t + b * (beat * 0.5), b % 2 === 1 ? 0.045 : 0.02);
        }
      }
      break;
    }

    case 'dawn-arpeggio': {
      const beat = 60 / 102;
      const chords = [
        [52, 59, 64, 68], // E
        [49, 56, 61, 64], // C#m
        [45, 52, 57, 61], // A
        [47, 54, 59, 63], // B
      ];
      for (let bar = 0; bar < 14; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        const ch = chords[bar % 4];
        scheduleTone(ctx, master, ch[0] - 12, t, beat * 3.8, 0.18, 'bass');
        for (let s = 0; s < 8; s++) {
          const note = ch[s % ch.length] + (s >= 4 ? 12 : 0);
          scheduleTone(ctx, master, note, t + s * (beat * 0.5), beat * 0.7, 0.085, 'bell');
        }
      }
      break;
    }

    case 'velvet-chord': {
      const beat = 60 / 78;
      const chords = [
        [41, 53, 57, 60, 64], // Fmaj7
        [38, 50, 53, 57, 60], // Dm7
        [43, 55, 58, 62, 65], // Gm7
        [36, 48, 55, 58, 62], // C9sus
      ];
      for (let bar = 0; bar < 11; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        chords[bar % 4].forEach((n, idx) => {
          scheduleTone(ctx, master, n, t + idx * 0.04, beat * 3.9, 0.072, 'keys');
        });
        scheduleKick(ctx, master, t, 0.28);
        scheduleSnareOrRim(ctx, master, noiseBuf, t + beat, 0.08);
        scheduleSnareOrRim(ctx, master, noiseBuf, t + beat * 3, 0.08);
      }
      break;
    }

    case 'midnight-mesh': {
      const beat = 60 / 90;
      const chords = [
        [41, 53, 60, 63],
        [39, 51, 58, 63],
        [37, 49, 56, 60],
        [36, 48, 55, 60],
      ];
      const arp = [60, 63, 67, 72, 67, 63, 65, 70];
      for (let bar = 0; bar < 12; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        schedulePadChord(ctx, master, chords[bar % 4], t, beat * 4, 0.15, 'sawtooth', 850);
        scheduleKick(ctx, master, t, 0.34);
        for (let s = 0; s < 8; s++) {
          const note = arp[s % 8] + (bar % 2 === 0 ? 0 : -2);
          scheduleTone(ctx, master, note, t + s * (beat * 0.5), beat * 0.45, 0.08, 'pluck');
        }
      }
      break;
    }

    case 'oceanic-drift': {
      const chords = [
        [48, 55, 60, 64, 67],
        [45, 52, 57, 60, 64],
        [41, 48, 53, 57, 60],
        [43, 50, 55, 59, 62],
      ];
      for (let i = 0; i < 8; i++) {
        const t = i * 4;
        schedulePadChord(ctx, master, chords[i % 4], t, 4.2, 0.14, 'sine', 950);
        scheduleTone(ctx, master, chords[i % 4][2] + 12, t + 1.2, 2.5, 0.05, 'bell');
      }
      scheduleTextureBed(ctx, master, durationSec, 420, 0.7, 0.05, 0.12);
      break;
    }

    case 'tape-warmth': {
      const chords = [
        [50, 57, 61, 66],
        [47, 54, 57, 62],
        [43, 50, 54, 59],
        [45, 52, 55, 61],
      ];
      for (let i = 0; i < 8; i++) {
        const t = i * 4;
        schedulePadChord(ctx, master, chords[i % 4], t, 4.1, 0.14, 'triangle', 760);
      }
      scheduleTextureBed(ctx, master, durationSec, 2400, 1.2, 0.018, 0.35);
      break;
    }

    case 'deep-space-wash': {
      const chords = [
        [43, 50, 55, 58, 62],
        [39, 46, 51, 55, 58],
        [36, 43, 48, 51, 55],
        [38, 45, 50, 54, 57],
      ];
      for (let i = 0; i < 8; i++) {
        const t = i * 4;
        schedulePadChord(ctx, master, chords[i % 4], t, 4.4, 0.16, 'sawtooth', 640);
        scheduleTone(ctx, master, chords[i % 4][0], t, 3.9, 0.15, 'bass');
      }
      break;
    }

    case 'late-night-desk': {
      const beat = 60 / 88;
      const chords = [
        [52, 59, 62, 67],
        [48, 55, 59, 64],
        [45, 52, 55, 60],
        [47, 54, 57, 62],
      ];
      for (let bar = 0; bar < 12; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        chords[bar % 4].forEach((n, idx) => {
          scheduleTone(ctx, master, n, t + idx * 0.025, beat * 2.8, 0.068, 'keys');
        });
        scheduleKick(ctx, master, t, 0.36);
        scheduleKick(ctx, master, t + beat * 1.75, 0.24);
        scheduleSnareOrRim(ctx, master, noiseBuf, t + beat, 0.12);
        scheduleSnareOrRim(ctx, master, noiseBuf, t + beat * 3, 0.13);
        for (let b = 0; b < 8; b++) {
          scheduleHat(ctx, master, noiseBuf, t + b * (beat * 0.5), 0.045);
        }
      }
      break;
    }

    case 'crisp-tech-beat': {
      const beat = 60 / 124;
      const bassNotes = [45, 45, 48, 45, 43, 45, 50, 48];
      for (let bar = 0; bar < 17; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        for (let b = 0; b < 4; b++) {
          scheduleKick(ctx, master, t + b * beat, 0.44);
          scheduleHat(ctx, master, noiseBuf, t + (b + 0.5) * beat, 0.08);
          if (b === 1 || b === 3) {
            scheduleSnareOrRim(ctx, master, noiseBuf, t + b * beat, 0.14);
          }
        }
        for (let s = 0; s < 8; s++) {
          scheduleTone(ctx, master, bassNotes[s % 8], t + s * (beat * 0.5), beat * 0.35, 0.18, 'bass');
        }
      }
      break;
    }

    case 'soft-percussion': {
      const beat = 60 / 100;
      const kalimba = [60, 64, 67, 72, 69, 67, 64, 62];
      for (let bar = 0; bar < 14; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        scheduleKick(ctx, master, t, 0.26);
        scheduleKick(ctx, master, t + beat * 2, 0.22);
        for (let s = 0; s < 8; s++) {
          scheduleHat(ctx, master, noiseBuf, t + s * (beat * 0.5), s % 2 === 0 ? 0.03 : 0.055);
          if (s % 2 === 0 || s === 5) {
            scheduleTone(ctx, master, kalimba[(bar + s) % 8], t + s * (beat * 0.5), beat * 0.55, 0.11, 'bell');
          }
        }
      }
      break;
    }

    case 'sunday-coffee': {
      const beat = 60 / 80;
      const chords = [
        [46, 53, 57, 60, 65],
        [43, 50, 53, 57, 62],
        [48, 55, 58, 62, 65],
        [41, 48, 52, 57, 60],
      ];
      for (let bar = 0; bar < 11; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        chords[bar % 4].forEach((n, idx) => {
          scheduleTone(ctx, master, n, t + idx * 0.03, beat * 3.6, 0.07, 'keys');
        });
        scheduleKick(ctx, master, t, 0.3);
        scheduleKick(ctx, master, t + beat * 2.58, 0.2);
        scheduleSnareOrRim(ctx, master, noiseBuf, t + beat, 0.09);
        scheduleSnareOrRim(ctx, master, noiseBuf, t + beat * 3, 0.09);
      }
      break;
    }

    case 'gentle-rain-chimes': {
      scheduleTextureBed(ctx, master, durationSec, 1500, 0.65, 0.14, 0.16);
      scheduleTextureBed(ctx, master, durationSec, 380, 0.8, 0.08, 0.09);
      const chimes = [72, 74, 79, 81, 84, 86];
      for (let i = 0; i < 20; i++) {
        const t = 0.6 + i * 1.52;
        if (t >= durationSec - 1) break;
        scheduleTone(ctx, master, chimes[(i * 3) % chimes.length], t, 2.4, 0.075, 'bell');
      }
      break;
    }

    case 'forest-wind-ocarina': {
      scheduleTextureBed(ctx, master, durationSec, 620, 1.3, 0.11, 0.22);
      const calls = [74, 77, 81, 79, 74, 81, 84, 79];
      for (let i = 0; i < 10; i++) {
        const t = 1.0 + i * 3.0;
        if (t >= durationSec - 1.5) break;
        scheduleTone(ctx, master, calls[i % calls.length], t, 1.9, 0.14, 'flute');
      }
      break;
    }

    case 'studio-room-pulse': {
      const beat = 60 / 112;
      for (let bar = 0; bar < 15; bar++) {
        const t = bar * beat * 4;
        if (t >= durationSec) break;
        scheduleTone(ctx, master, 41, t, beat * 3.8, 0.16, 'bass');
        for (let b = 0; b < 4; b++) {
          scheduleHat(ctx, master, noiseBuf, t + b * beat, b === 0 ? 0.065 : 0.032);
        }
      }
      break;
    }

    case 'golden-hour-shimmer': {
      const chords = [
        [45, 52, 57, 61, 64],
        [40, 47, 52, 56, 59],
        [42, 49, 54, 57, 61],
        [38, 45, 50, 54, 57],
      ];
      for (let i = 0; i < 8; i++) {
        const t = i * 4;
        schedulePadChord(ctx, master, chords[i % 4], t, 4.2, 0.13, 'triangle', 1500);
        scheduleTone(ctx, master, chords[i % 4][3] + 12, t + 0.5, 2.6, 0.06, 'bell');
        scheduleTone(ctx, master, chords[i % 4][4] + 12, t + 2.1, 2.2, 0.055, 'bell');
      }
      break;
    }
  }

  const rendered = await ctx.startRendering();
  trackCache.set(trackId, rendered);
  return rendered;
}

/**
 * Loads and decodes an external audio URL via direct fetch first,
 * falling back to the Express /api/audio-proxy endpoint when CORS blocks direct access.
 */
export async function fetchAndDecodeAudioUrl(
  url: string,
  audioCtx: AudioContext
): Promise<AudioBuffer> {
  const tryDecode = async (targetUrl: string) => {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const json = (await res.json()) as { error?: string };
        if (json.error) msg = json.error;
      } catch {
        // non-JSON response
      }
      throw new Error(msg);
    }
    const buf = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(buf.slice(0));
  };

  try {
    return await tryDecode(url);
  } catch {
    const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(url)}`;
    return await tryDecode(proxyUrl);
  }
}

/**
 * Queries the server /api/cc0-search endpoint for Public Domain / CC0 audio files.
 */
export async function searchCC0AudioLibrary(
  query: string
): Promise<CC0WebTrack[]> {
  const res = await fetch(`/api/cc0-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    let msg = `Search failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) msg = json.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { tracks?: CC0WebTrack[] };
  return data.tracks || [];
}
