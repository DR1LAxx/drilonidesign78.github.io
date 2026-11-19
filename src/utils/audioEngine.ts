import { StudioAudioTrackId } from '../types/brand';

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
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
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
  env.gain.linearRampToValueAtTime(gainVal, startTime + Math.min(0.8, duration * 0.25));
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

function schedulePluckOrFlute(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  midi: number,
  startTime: number,
  duration: number,
  gainVal: number,
  style: 'flute' | 'pluck' | 'keys'
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();

  const freq = midiToFreq(midi);
  osc.frequency.setValueAtTime(freq, startTime);

  if (style === 'flute') {
    osc.type = 'sine';
    // Gentle ocarina vibrato
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

const trackCache = new Map<StudioAudioTrackId, AudioBuffer>();

/**
 * Synthesizes one of the 5 built-in okarina studio soundtracks into an AudioBuffer.
 * Cached in memory so switching tracks is instantaneous after first render.
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

  const noiseBuf = createNoiseBuffer(ctx, 0.1);

  if (trackId === 'okarina-breeze') {
    // 96 BPM D minor warm ocarina flute + lush chords
    const beat = 60 / 96;
    const chords = [
      [50, 57, 60, 65], // Dm7
      [46, 53, 57, 62], // Bbmaj7
      [48, 55, 60, 64], // C6
      [45, 52, 57, 60], // Am7
    ];
    const melody = [
      74, 77, 79, 81, 79, 77, 74, 72,
      74, 77, 81, 84, 81, 79, 77, 74,
    ];

    for (let bar = 0; bar < 12; bar++) {
      const barTime = bar * beat * 4;
      if (barTime >= durationSec) break;
      const chord = chords[bar % chords.length];
      schedulePadChord(ctx, master, chord, barTime, beat * 4, 0.13, 'triangle', 1200);
      scheduleKick(ctx, master, barTime, 0.25);
      scheduleKick(ctx, master, barTime + beat * 2.5, 0.18);
      for (let b = 0; b < 8; b++) {
        if (b % 2 === 1) {
          scheduleHat(ctx, master, noiseBuf, barTime + b * (beat / 2), 0.04);
        }
      }
      // 2 flute notes per bar
      const m1 = melody[(bar * 2) % melody.length];
      const m2 = melody[(bar * 2 + 1) % melody.length];
      schedulePluckOrFlute(ctx, master, m1, barTime + beat * 0.5, beat * 1.4, 0.16, 'flute');
      schedulePluckOrFlute(ctx, master, m2, barTime + beat * 2.25, beat * 1.6, 0.15, 'flute');
    }
  } else if (trackId === 'midnight-mesh') {
    // 90 BPM F minor atmospheric sub + shimmering arp
    const beat = 60 / 90;
    const chords = [
      [41, 53, 60, 63], // Fm7
      [39, 51, 58, 63], // Eb
      [37, 49, 56, 60], // Db maj7
      [36, 48, 55, 60], // Cm
    ];
    const arpPattern = [60, 63, 67, 72, 67, 63, 65, 70];

    for (let bar = 0; bar < 12; bar++) {
      const barTime = bar * beat * 4;
      if (barTime >= durationSec) break;
      const chord = chords[bar % chords.length];
      schedulePadChord(ctx, master, chord, barTime, beat * 4, 0.15, 'sawtooth', 850);
      scheduleKick(ctx, master, barTime, 0.34);
      for (let step = 0; step < 8; step++) {
        const note = arpPattern[step % arpPattern.length] + (bar % 2 === 0 ? 0 : -2);
        schedulePluckOrFlute(ctx, master, note, barTime + step * (beat * 0.5), beat * 0.45, 0.08, 'pluck');
      }
    }
  } else if (trackId === 'indigo-pulse') {
    // 118 BPM C minor crisp electronic groove
    const beat = 60 / 118;
    const chords = [
      [48, 55, 60, 63], // Cm7
      [44, 51, 56, 60], // Abmaj7
      [46, 53, 58, 62], // Bb6
      [43, 50, 55, 58], // Gm7
    ];
    const plucks = [72, 75, 79, 75, 74, 72, 70, 72];

    for (let bar = 0; bar < 16; bar++) {
      const barTime = bar * beat * 4;
      if (barTime >= durationSec) break;
      schedulePadChord(ctx, master, chords[bar % chords.length], barTime, beat * 4, 0.11, 'triangle', 1400);
      for (let b = 0; b < 4; b++) {
        scheduleKick(ctx, master, barTime + b * beat, 0.38);
        scheduleHat(ctx, master, noiseBuf, barTime + (b + 0.5) * beat, 0.065);
      }
      for (let step = 0; step < 8; step++) {
        schedulePluckOrFlute(
          ctx,
          master,
          plucks[(bar + step) % plucks.length],
          barTime + step * (beat * 0.5),
          beat * 0.36,
          0.1,
          'pluck'
        );
      }
    }
  } else if (trackId === 'quiet-studio') {
    // 84 BPM A minor warm Rhodes keys
    const beat = 60 / 84;
    const chords = [
      [45, 52, 57, 60, 64], // Am9
      [41, 48, 53, 57, 60], // Fmaj7
      [48, 55, 60, 64, 67], // Cmaj7
      [43, 50, 55, 59, 62], // G6
    ];

    for (let bar = 0; bar < 12; bar++) {
      const barTime = bar * beat * 4;
      if (barTime >= durationSec) break;
      const chord = chords[bar % chords.length];
      chord.forEach((n, idx) => {
        schedulePluckOrFlute(ctx, master, n, barTime + idx * 0.035, beat * 3.8, 0.075, 'keys');
      });
      scheduleKick(ctx, master, barTime, 0.28);
      scheduleKick(ctx, master, barTime + beat * 2.5, 0.22);
      for (let b = 0; b < 8; b++) {
        scheduleHat(ctx, master, noiseBuf, barTime + b * (beat * 0.5), b % 2 === 1 ? 0.045 : 0.02);
      }
    }
  } else {
    // mint-horizon: 108 BPM G major uplifting synth + marimba
    const beat = 60 / 108;
    const chords = [
      [43, 50, 55, 59, 62], // G
      [48, 55, 60, 64, 67], // Cmaj7
      [40, 47, 52, 55, 59], // Em7
      [45, 52, 57, 62, 66], // Dadd9
    ];
    const notes = [67, 71, 74, 79, 74, 71, 69, 74];

    for (let bar = 0; bar < 15; bar++) {
      const barTime = bar * beat * 4;
      if (barTime >= durationSec) break;
      schedulePadChord(ctx, master, chords[bar % chords.length], barTime, beat * 4, 0.12, 'triangle', 1700);
      for (let b = 0; b < 4; b++) {
        scheduleKick(ctx, master, barTime + b * beat, 0.3);
        scheduleHat(ctx, master, noiseBuf, barTime + (b + 0.5) * beat, 0.05);
      }
      for (let step = 0; step < 8; step++) {
        schedulePluckOrFlute(
          ctx,
          master,
          notes[step % notes.length],
          barTime + step * (beat * 0.5),
          beat * 0.35,
          0.09,
          'keys'
        );
      }
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
