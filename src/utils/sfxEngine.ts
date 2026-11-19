import { SfxId } from '../types/brand';

const SAMPLE_RATE = 44100;

function createNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function semitoneRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

const sfxCache = new Map<string, AudioBuffer>();

/**
 * Synthesizes any of the 24 non-copyrighted CC0 sound effects at 44.1kHz stereo,
 * with optional pitch shift in semitones (-12 to +12).
 */
export async function renderSoundEffect(
  sfxId: SfxId,
  pitchSemitones = 0
): Promise<AudioBuffer> {
  const cacheKey = `${sfxId}:${pitchSemitones}`;
  const cached = sfxCache.get(cacheKey);
  if (cached) return cached;

  const p = semitoneRatio(pitchSemitones);

  const durationMap: Record<SfxId, number> = {
    'ui-soft-pop': 0.25,
    'ui-glass-tap': 0.25,
    'ui-toggle-switch': 0.3,
    'ui-typing-burst': 0.55,
    'whoosh-air': 0.85,
    'whoosh-indigo-riser': 1.65,
    'whoosh-reverse-swell': 1.45,
    'whoosh-fast-swipe': 0.4,
    'chime-mint-spark': 1.25,
    'chime-okarina-logo': 2.3,
    'chime-glass-bell': 1.85,
    'chime-success-chord': 1.55,
    'impact-sub-boom': 1.25,
    'impact-punch-hit': 0.5,
    'impact-cine-slam': 1.85,
    'impact-glitch-blip': 0.4,
    'ocarina-call-high': 1.55,
    'ocarina-breath-swell': 1.85,
    'marimba-ping': 0.75,
    'arp-flourish': 1.25,
    'foley-camera-shutter': 0.32,
    'foley-vinyl-drop': 1.25,
    'foley-water-drop': 0.4,
    'foley-thunder-rumble': 2.45,
  };

  const durationSec = durationMap[sfxId] || 1.0;
  const ctx = new OfflineAudioContext(2, Math.floor(SAMPLE_RATE * durationSec), SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  switch (sfxId) {
    case 'ui-soft-pop': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(760 * p, 0.065);
      env.gain.setValueAtTime(0.001, 0);
      env.gain.linearRampToValueAtTime(0.6, 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.14);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(0.16);
      break;
    }

    case 'ui-glass-tap': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1680 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(1120 * p, 0.08);
      env.gain.setValueAtTime(0.45, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.16);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(0.18);
      break;
    }

    case 'ui-toggle-switch': {
      [0, 0.07].forEach((t, idx) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime((idx === 0 ? 520 : 880) * p, t);
        env.gain.setValueAtTime(0.42, t);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + 0.085);
      });
      break;
    }

    case 'ui-typing-burst': {
      const noise = createNoise(ctx, 0.06);
      [0, 0.09, 0.19, 0.31].forEach((t, i) => {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = (2100 + i * 240) * p;
        bp.Q.value = 3.2;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.45, t);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        src.connect(bp);
        bp.connect(env);
        env.connect(master);
        src.start(t);
        src.stop(t + 0.05);
      });
      break;
    }

    case 'whoosh-air': {
      const noise = createNoise(ctx, 0.85);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.6;
      bp.frequency.setValueAtTime(220 * p, 0);
      bp.frequency.exponentialRampToValueAtTime(2400 * p, 0.36);
      bp.frequency.exponentialRampToValueAtTime(340 * p, 0.8);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, 0);
      env.gain.linearRampToValueAtTime(0.55, 0.32);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.82);
      src.connect(bp);
      bp.connect(env);
      env.connect(master);
      src.start(0);
      src.stop(0.84);
      break;
    }

    case 'whoosh-indigo-riser': {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const env = ctx.createGain();
      osc.type = 'sawtooth';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(110 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(660 * p, 1.48);
      osc2.frequency.setValueAtTime(165 * p, 0);
      osc2.frequency.exponentialRampToValueAtTime(990 * p, 1.48);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, 0);
      lp.frequency.exponentialRampToValueAtTime(4200, 1.48);
      env.gain.setValueAtTime(0.001, 0);
      env.gain.linearRampToValueAtTime(0.32, 1.38);
      env.gain.exponentialRampToValueAtTime(0.0001, 1.6);
      osc.connect(lp);
      osc2.connect(lp);
      lp.connect(env);
      env.connect(master);
      osc.start(0);
      osc2.start(0);
      osc.stop(1.62);
      osc2.stop(1.62);
      break;
    }

    case 'whoosh-reverse-swell': {
      const noise = createNoise(ctx, 1.45);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.Q.value = 2.4;
      hp.frequency.setValueAtTime(900 * p, 0);
      hp.frequency.exponentialRampToValueAtTime(5200 * p, 1.35);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, 0);
      env.gain.exponentialRampToValueAtTime(0.6, 1.28);
      env.gain.exponentialRampToValueAtTime(0.0001, 1.42);
      src.connect(hp);
      hp.connect(env);
      env.connect(master);
      src.start(0);
      src.stop(1.44);
      break;
    }

    case 'whoosh-fast-swipe': {
      const noise = createNoise(ctx, 0.4);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.8;
      bp.frequency.setValueAtTime(450 * p, 0);
      bp.frequency.exponentialRampToValueAtTime(3400 * p, 0.14);
      bp.frequency.exponentialRampToValueAtTime(600 * p, 0.35);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, 0);
      env.gain.linearRampToValueAtTime(0.65, 0.12);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.37);
      src.connect(bp);
      bp.connect(env);
      env.connect(master);
      src.start(0);
      src.stop(0.39);
      break;
    }

    case 'chime-mint-spark': {
      [783.99, 1174.66].forEach((f, i) => {
        const t = i * 0.13;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * p, t);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.38, t + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + 1.05);
      });
      break;
    }

    case 'chime-okarina-logo': {
      // Signature 3-note warm ocarina call + lush shimmer chord
      const motif = [
        { f: 587.33, t: 0, d: 0.32 },
        { f: 783.99, t: 0.24, d: 0.35 },
        { f: 880.0, t: 0.48, d: 1.55 },
      ];
      motif.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * p, t);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.34, t + 0.04);
        env.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + d + 0.05);
      });
      // Supporting shimmer triad at t=0.48
      [293.66, 440.0, 523.25].forEach((f) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * p, 0.48);
        env.gain.setValueAtTime(0.001, 0.48);
        env.gain.linearRampToValueAtTime(0.11, 0.6);
        env.gain.exponentialRampToValueAtTime(0.0001, 2.2);
        osc.connect(env);
        env.connect(master);
        osc.start(0.48);
        osc.stop(2.25);
      });
      break;
    }

    case 'chime-glass-bell': {
      [1046.5, 2093.0, 3135.96].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * p, 0);
        env.gain.setValueAtTime(0.32 / (idx + 1), 0);
        env.gain.exponentialRampToValueAtTime(0.0001, 1.75 / (idx * 0.5 + 1));
        osc.connect(env);
        env.connect(master);
        osc.start(0);
        osc.stop(1.8);
      });
      break;
    }

    case 'chime-success-chord': {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const t = idx * 0.065;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * p, t);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.24, t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + 1.3);
      });
      break;
    }

    case 'impact-sub-boom': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(34 * p, 0.45);
      env.gain.setValueAtTime(0.8, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 1.18);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(1.22);
      break;
    }

    case 'impact-punch-hit': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(48 * p, 0.16);
      env.gain.setValueAtTime(0.75, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.36);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(0.4);
      break;
    }

    case 'impact-cine-slam': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(32 * p, 0.5);
      env.gain.setValueAtTime(0.75, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 1.65);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(1.7);

      const noise = createNoise(ctx, 1.8);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400 * p, 0);
      lp.frequency.exponentialRampToValueAtTime(240, 1.5);
      const nEnv = ctx.createGain();
      nEnv.gain.setValueAtTime(0.45, 0);
      nEnv.gain.exponentialRampToValueAtTime(0.0001, 1.75);
      src.connect(lp);
      lp.connect(nEnv);
      nEnv.connect(master);
      src.start(0);
      src.stop(1.8);
      break;
    }

    case 'impact-glitch-blip': {
      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420 * p, 0);
      osc.frequency.setValueAtTime(840 * p, 0.08);
      osc.frequency.setValueAtTime(280 * p, 0.16);
      mod.frequency.value = 95;
      modGain.gain.value = 260;
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      env.gain.setValueAtTime(0.3, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.34);
      osc.connect(env);
      env.connect(master);
      mod.start(0);
      osc.start(0);
      mod.stop(0.35);
      osc.stop(0.35);
      break;
    }

    case 'ocarina-call-high': {
      const notes = [
        { f: 783.99, t: 0, d: 0.48 },
        { f: 1046.5, t: 0.42, d: 1.05 },
      ];
      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f * p, t);
        lfo.frequency.value = 5.4;
        lfoGain.gain.value = f * p * 0.01;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.42, t + 0.07);
        env.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(env);
        env.connect(master);
        lfo.start(t);
        osc.start(t);
        lfo.stop(t + d + 0.03);
        osc.stop(t + d + 0.03);
      });
      break;
    }

    case 'ocarina-breath-swell': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33 * p, 0);
      env.gain.setValueAtTime(0.001, 0);
      env.gain.linearRampToValueAtTime(0.35, 0.65);
      env.gain.exponentialRampToValueAtTime(0.0001, 1.75);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(1.8);

      const noise = createNoise(ctx, 1.8);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1175 * p;
      bp.Q.value = 6;
      const nEnv = ctx.createGain();
      nEnv.gain.setValueAtTime(0.001, 0);
      nEnv.gain.linearRampToValueAtTime(0.14, 0.55);
      nEnv.gain.exponentialRampToValueAtTime(0.0001, 1.7);
      src.connect(bp);
      bp.connect(nEnv);
      nEnv.connect(master);
      src.start(0);
      src.stop(1.75);
      break;
    }

    case 'marimba-ping': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25 * p, 0);
      env.gain.setValueAtTime(0.55, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.55);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(0.6);
      break;
    }

    case 'arp-flourish': {
      const freqs = [523.25, 587.33, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        const t = idx * 0.08;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * p, t);
        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.3, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + 0.75);
      });
      break;
    }

    case 'foley-camera-shutter': {
      const noise = createNoise(ctx, 0.12);
      [0, 0.085].forEach((t, idx) => {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = (idx === 0 ? 3400 : 2300) * p;
        bp.Q.value = 1.5;
        const env = ctx.createGain();
        env.gain.setValueAtTime(idx === 0 ? 0.65 : 0.48, t);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
        src.connect(bp);
        bp.connect(env);
        env.connect(master);
        src.start(t);
        src.stop(t + 0.075);
      });
      break;
    }

    case 'foley-vinyl-drop': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(48 * p, 0.12);
      env.gain.setValueAtTime(0.55, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.18);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(0.2);

      const noise = createNoise(ctx, 1.2);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3200;
      const nEnv = ctx.createGain();
      nEnv.gain.setValueAtTime(0.06, 0.06);
      nEnv.gain.exponentialRampToValueAtTime(0.0001, 1.2);
      src.connect(hp);
      hp.connect(nEnv);
      nEnv.connect(master);
      src.start(0.06);
      src.stop(1.22);
      break;
    }

    case 'foley-water-drop': {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620 * p, 0);
      osc.frequency.exponentialRampToValueAtTime(1650 * p, 0.085);
      env.gain.setValueAtTime(0.55, 0);
      env.gain.exponentialRampToValueAtTime(0.0001, 0.19);
      osc.connect(env);
      env.connect(master);
      osc.start(0);
      osc.stop(0.21);
      break;
    }

    case 'foley-thunder-rumble': {
      const noise = createNoise(ctx, 2.4);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220 * p, 0);
      lp.frequency.linearRampToValueAtTime(95 * p, 2.3);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, 0);
      env.gain.linearRampToValueAtTime(0.75, 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, 2.38);
      src.connect(lp);
      lp.connect(env);
      env.connect(master);
      src.start(0);
      src.stop(2.42);
      break;
    }
  }

  const rendered = await ctx.startRendering();
  sfxCache.set(cacheKey, rendered);
  return rendered;
}
