import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  Film,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { SFX_CATALOG } from '../data/brandPresets';
import {
  CC0WebTrack,
  MixkitSfxItem,
  SfxCategory,
  SfxId,
  SfxMeta,
} from '../types/brand';
import {
  audioBufferToWavBlob,
  fetchAndDecodeAudioUrl,
  fetchMixkitSfx,
  searchCC0AudioLibrary,
} from '../utils/audioEngine';
import { saveBlobFile, saveUrlAsFile } from '../utils/downloadHelper';
import { renderSoundEffect } from '../utils/sfxEngine';

export type VideoSfxSelection =
  | { kind: 'studio'; sfxId: SfxId; timing: 'intro' | 'mid' | 'outro' }
  | {
      kind: 'mixkit';
      audioUrl: string;
      title: string;
      timing: 'intro' | 'mid' | 'outro';
    };

interface SoundEffectsStudioProps {
  activeVideoSfxId: SfxId | 'mixkit' | 'none';
  activeVideoSfxUrl?: string;
  onSendToVideo: (selection: VideoSfxSelection) => void;
}

const STUDIO_CATEGORIES: { id: 'all' | SfxCategory; label: string }[] = [
  { id: 'all', label: 'All (24)' },
  { id: 'ui', label: 'UI & Clicks' },
  { id: 'transitions', label: 'Whooshes' },
  { id: 'chimes', label: 'Chimes' },
  { id: 'impacts', label: 'Impacts' },
  { id: 'musical', label: 'Okarina & Keys' },
  { id: 'foley', label: 'Foley' },
];

const MIXKIT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Featured' },
  { id: 'transition', label: 'Transitions' },
  { id: 'whoosh', label: 'Whoosh' },
  { id: 'click', label: 'Clicks' },
  { id: 'notification', label: 'Notifications' },
  { id: 'impact', label: 'Impacts' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'bell', label: 'Bells' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'nature', label: 'Nature' },
  { id: 'game', label: 'Game' },
  { id: 'technology', label: 'Technology' },
];

export const SoundEffectsStudio: React.FC<SoundEffectsStudioProps> = ({
  activeVideoSfxId,
  activeVideoSfxUrl,
  onSendToVideo,
}) => {
  const [sourceMode, setSourceMode] = useState<'mixkit' | 'board' | 'web'>('mixkit');

  // Mixkit state
  const [mixkitCategory, setMixkitCategory] = useState<string>('all');
  const [mixkitQuery, setMixkitQuery] = useState('');
  const [mixkitActiveQuery, setMixkitActiveQuery] = useState('');
  const [mixkitPage, setMixkitPage] = useState(1);
  const [mixkitItems, setMixkitItems] = useState<MixkitSfxItem[]>([]);
  const [mixkitSourceUrl, setMixkitSourceUrl] = useState(
    'https://mixkit.co/free-sound-effects/'
  );
  const [mixkitLoading, setMixkitLoading] = useState(false);
  const [mixkitError, setMixkitError] = useState<string | null>(null);
  const [selectedMixkit, setSelectedMixkit] = useState<MixkitSfxItem | null>(null);

  // Built-in Studio Board state
  const [category, setCategory] = useState<'all' | SfxCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedSfx, setSelectedSfx] = useState<SfxMeta>(SFX_CATALOG[9]);

  // Shared inspector & playback state
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [cueTiming, setCueTiming] = useState<'intro' | 'mid' | 'outro'>('intro');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [decodingId, setDecodingId] = useState<string | null>(null);
  const [downloadingMp3, setDownloadingMp3] = useState(false);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);

  // CC0 Archive Search state
  const [webQuery, setWebQuery] = useState('whoosh');
  const [webResults, setWebResults] = useState<CC0WebTrack[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [activeWebTrack, setActiveWebTrack] = useState<CC0WebTrack | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodedMixkitCache = useRef<Map<string, AudioBuffer>>(new Map());

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const stopActiveSound = useCallback(() => {
    if (activeSrcRef.current) {
      try {
        activeSrcRef.current.stop();
        activeSrcRef.current.disconnect();
      } catch {
        // ignore
      }
      activeSrcRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => {
    return () => stopActiveSound();
  }, [stopActiveSound]);

  const drawWaveform = useCallback((buf: AudioBuffer | null) => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!buf) return;

    const data = buf.getChannelData(0);
    const bars = 68;
    const step = Math.max(1, Math.floor(data.length / bars));
    const gap = 3;
    const barW = (w - 32 - gap * (bars - 1)) / bars;

    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const start = i * step;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[start + j] || 0);
        if (v > peak) peak = v;
      }
      const barH = Math.max(4, peak * (h - 28));
      const x = 16 + i * (barW + gap);
      const y = (h - barH) / 2;
      ctx.fillStyle = i % 4 === 0 ? '#18D5A8' : '#5C7CFA';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, barW / 2);
      ctx.fill();
    }
  }, []);

  const playBuffer = useCallback(
    (buf: AudioBuffer, id: string, playbackRate = 1) => {
      stopActiveSound();
      const ctx = getAudioContext();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = playbackRate;
      src.connect(ctx.destination);
      src.onended = () => {
        setPlayingId((curr) => (curr === id ? null : curr));
      };
      src.start(0);
      activeSrcRef.current = src;
      setPlayingId(id);
    },
    [getAudioContext, stopActiveSound]
  );

  // Load Mixkit catalog items
  const loadMixkitCatalog = useCallback(
    async (opts: { category?: string; query?: string; page?: number }) => {
      setMixkitLoading(true);
      setMixkitError(null);
      try {
        const res = await fetchMixkitSfx(opts);
        setMixkitItems(res.items);
        setMixkitSourceUrl(res.sourceUrl);
        if (res.items.length === 0) {
          setMixkitError(
            'No Mixkit sound effects matched that search. Try a single keyword like "whoosh", "click", "bell", or "impact".'
          );
        } else {
          setSelectedMixkit((prev) =>
            prev && res.items.some((item) => item.id === prev.id)
              ? prev
              : res.items[0]
          );
        }
      } catch (err) {
        setMixkitError(
          err instanceof Error
            ? err.message
            : 'Unable to fetch sound effects from mixkit.co.'
        );
      } finally {
        setMixkitLoading(false);
      }
    },
    []
  );

  // Initial load of Mixkit featured sound effects
  useEffect(() => {
    loadMixkitCatalog({ category: 'all', page: 1 });
  }, [loadMixkitCatalog]);

  // Decode selected Mixkit SFX quietly for waveform preview if not yet decoded
  useEffect(() => {
    if (sourceMode !== 'mixkit' || !selectedMixkit) return;
    const cached = decodedMixkitCache.current.get(selectedMixkit.id);
    if (cached) {
      setBuffer(cached);
      drawWaveform(cached);
      return;
    }
    let cancelled = false;
    setDecodingId(selectedMixkit.id);
    const ctx = getAudioContext();
    fetchAndDecodeAudioUrl(selectedMixkit.audioUrl, ctx)
      .then((decoded) => {
        decodedMixkitCache.current.set(selectedMixkit.id, decoded);
        if (!cancelled) {
          setBuffer(decoded);
          drawWaveform(decoded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          drawWaveform(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDecodingId((curr) => (curr === selectedMixkit.id ? null : curr));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sourceMode, selectedMixkit, drawWaveform, getAudioContext]);

  // Re-render Studio Board SFX whenever selection or pitch changes
  useEffect(() => {
    if (sourceMode !== 'board') return;
    let cancelled = false;
    renderSoundEffect(selectedSfx.id, pitchSemitones).then((buf) => {
      if (!cancelled) {
        setBuffer(buf);
        drawWaveform(buf);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSfx.id, pitchSemitones, sourceMode, drawWaveform]);

  const handleAuditionMixkitCard = async (item: MixkitSfxItem) => {
    setSelectedMixkit(item);
    setSourceMode('mixkit');
    setMixkitError(null);
    const rate =
      item.id === selectedMixkit?.id ? Math.pow(2, pitchSemitones / 12) : 1;
    if (item.id !== selectedMixkit?.id) setPitchSemitones(0);

    const cached = decodedMixkitCache.current.get(item.id);
    if (cached) {
      setBuffer(cached);
      drawWaveform(cached);
      playBuffer(cached, item.id, rate);
      return;
    }

    setDecodingId(item.id);
    try {
      const ctx = getAudioContext();
      const decoded = await fetchAndDecodeAudioUrl(item.audioUrl, ctx);
      decodedMixkitCache.current.set(item.id, decoded);
      setBuffer(decoded);
      drawWaveform(decoded);
      playBuffer(decoded, item.id, rate);
    } catch (err) {
      setMixkitError(
        err instanceof Error
          ? err.message
          : 'Could not load Mixkit audio preview.'
      );
    } finally {
      setDecodingId((curr) => (curr === item.id ? null : curr));
    }
  };

  const handleAuditionCard = async (sfx: SfxMeta) => {
    setSelectedSfx(sfx);
    setSourceMode('board');
    const semitones = sfx.id === selectedSfx.id ? pitchSemitones : 0;
    if (sfx.id !== selectedSfx.id) setPitchSemitones(0);
    const buf = await renderSoundEffect(sfx.id, semitones);
    setBuffer(buf);
    drawWaveform(buf);
    playBuffer(buf, sfx.id, 1);
  };

  const handleDownloadWav = () => {
    if (!buffer) return;
    const wav = audioBufferToWavBlob(buffer);
    const slug =
      sourceMode === 'mixkit' && selectedMixkit
        ? selectedMixkit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : sourceMode === 'web' && activeWebTrack
        ? activeWebTrack.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : selectedSfx.id;
    saveBlobFile(wav, `okarina-sfx-${slug}.wav`);
  };

  const handleDownloadMixkitMp3 = async () => {
    if (!selectedMixkit || downloadingMp3) return;
    setDownloadingMp3(true);
    try {
      const slug = selectedMixkit.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const filename = `${slug || 'mixkit-sfx'}.mp3`;
      const proxyHref = `/api/audio-proxy?url=${encodeURIComponent(
        selectedMixkit.audioUrl
      )}&download=1&filename=${encodeURIComponent(filename)}`;
      await saveUrlAsFile(proxyHref, filename);
    } finally {
      setDownloadingMp3(false);
    }
  };

  const handleSearchWebSfx = async (override?: string) => {
    const q = (override ?? webQuery).trim() || 'sound effect';
    if (override !== undefined) setWebQuery(override);
    setWebLoading(true);
    setWebError(null);
    try {
      const tracks = await searchCC0AudioLibrary(q);
      setWebResults(tracks);
      if (tracks.length === 0) {
        setWebError(
          'No CC0 sound effects found. Try "whoosh", "bell", "rain", or "click".'
        );
      }
    } catch (err) {
      setWebError(
        err instanceof Error ? err.message : 'Unable to search CC0 archive.'
      );
    } finally {
      setWebLoading(false);
    }
  };

  const handleAuditionWebTrack = async (track: CC0WebTrack) => {
    setActiveWebTrack(track);
    setWebError(null);
    setDecodingId(track.id);
    try {
      const ctx = getAudioContext();
      const decoded = await fetchAndDecodeAudioUrl(track.audioUrl, ctx);
      setBuffer(decoded);
      drawWaveform(decoded);
      playBuffer(decoded, track.id, 1);
    } catch (err) {
      setWebError(
        err instanceof Error ? err.message : 'Could not decode that audio file.'
      );
    } finally {
      setDecodingId((curr) => (curr === track.id ? null : curr));
    }
  };

  const visibleSfx = SFX_CATALOG.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inspectorLicense =
    sourceMode === 'mixkit' && selectedMixkit
      ? selectedMixkit.license
      : sourceMode === 'web' && activeWebTrack
      ? activeWebTrack.license
      : selectedSfx.license;

  const inspectorTitle =
    sourceMode === 'mixkit' && selectedMixkit
      ? selectedMixkit.title
      : sourceMode === 'web' && activeWebTrack
      ? activeWebTrack.title
      : selectedSfx.title;

  const inspectorSubtitle =
    sourceMode === 'mixkit' && selectedMixkit
      ? selectedMixkit.tags.length > 0
        ? `${selectedMixkit.tags.join(' · ')} · mixkit.co`
        : 'mixkit.co/free-sound-effects'
      : sourceMode === 'web' && activeWebTrack
      ? activeWebTrack.creator
      : selectedSfx.description;

  const canSendCurrentToVideo =
    sourceMode === 'board' || (sourceMode === 'mixkit' && selectedMixkit !== null);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Sound Effects Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse royalty-free sound effects sourced live from{' '}
            <a
              href="https://mixkit.co/free-sound-effects/"
              target="_blank"
              rel="noreferrer"
              className="text-[#5C7CFA] font-medium hover:underline inline-flex items-center gap-1"
            >
              mixkit.co/free-sound-effects
              <ExternalLink className="w-3 h-3" />
            </a>
            , plus 24 built-in studio pads and CC0 archive search.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0F172A] border border-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSourceMode('mixkit')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sourceMode === 'mixkit'
                ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Mixkit SFX (mixkit.co)
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('board')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sourceMode === 'board'
                ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Studio Board (24)
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceMode('web');
              if (webResults.length === 0 && !webLoading) {
                handleSearchWebSfx('whoosh');
              }
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sourceMode === 'web'
                ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            CC0 Archive
          </button>
        </div>
      </div>

      {/* Main 2-Column Soundboard + Inspector */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left: Sound Effects Grid */}
        <div className="space-y-5">
          {sourceMode === 'mixkit' && (
            <div className="space-y-4">
              {/* Mixkit Search + Category Strip */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={mixkitQuery}
                      onChange={(e) => setMixkitQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const q = mixkitQuery.trim();
                          setMixkitActiveQuery(q);
                          setMixkitPage(1);
                          loadMixkitCatalog({
                            category: q ? undefined : mixkitCategory,
                            query: q || undefined,
                            page: 1,
                          });
                        }
                      }}
                      placeholder="Search mixkit.co/free-sound-effects (e.g. whoosh, laser, coin, rain, click)..."
                      aria-label="Search Mixkit sound effects"
                      className="w-full pl-8 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={mixkitLoading}
                    onClick={() => {
                      const q = mixkitQuery.trim();
                      setMixkitActiveQuery(q);
                      setMixkitPage(1);
                      loadMixkitCatalog({
                        category: q ? undefined : mixkitCategory,
                        query: q || undefined,
                        page: 1,
                      });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors shrink-0 disabled:opacity-50"
                  >
                    {mixkitLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Search Mixkit
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
                  {MIXKIT_CATEGORIES.map((cat) => {
                    const active =
                      !mixkitActiveQuery && mixkitCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setMixkitCategory(cat.id);
                          setMixkitQuery('');
                          setMixkitActiveQuery('');
                          setMixkitPage(1);
                          loadMixkitCatalog({ category: cat.id, page: 1 });
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {mixkitError && (
                <div className="p-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  {mixkitError}
                </div>
              )}

              {mixkitLoading ? (
                <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#5C7CFA]" />
                  Loading sound effects from mixkit.co/free-sound-effects...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {mixkitItems.map((item) => {
                      const isSelected = selectedMixkit?.id === item.id;
                      const isPlaying = playingId === item.id;
                      const isDecoding = decodingId === item.id;
                      const isInVideo =
                        activeVideoSfxId === 'mixkit' &&
                        activeVideoSfxUrl === item.audioUrl;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleAuditionMixkitCard(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleAuditionMixkitCard(item);
                            }
                          }}
                          className={`cursor-pointer rounded-xl border p-4 transition-colors flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#182342] text-white border-[#5C7CFA]'
                              : 'bg-[#0F172A] text-white border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                                {item.title}
                              </h3>
                              <p
                                className={`text-xs mt-1 truncate ${
                                  isSelected ? 'text-slate-300' : 'text-slate-400'
                                }`}
                              >
                                {item.tags.length > 0
                                  ? item.tags.join(' · ')
                                  : 'Mixkit Sound Effect'}
                              </p>
                            </div>

                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isPlaying
                                  ? 'bg-[#18D5A8] text-[#0B1120]'
                                  : isSelected
                                  ? 'bg-white/10 text-white'
                                  : 'bg-[#0B1120] text-slate-300 border border-slate-800'
                              }`}
                            >
                              {isDecoding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isPlaying ? (
                                <Volume2 className="w-4 h-4" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between text-[11px] pt-2 border-t ${
                              isSelected
                                ? 'border-white/10 text-slate-400'
                                : 'border-slate-800 text-slate-500'
                            }`}
                          >
                            <span className="font-mono-tabular">
                              {item.durationLabel} · {item.license}
                            </span>
                            {isInVideo && (
                              <span className="text-[#18D5A8] font-medium">
                                Active in Video
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination bar */}
                  {mixkitItems.length > 0 && (
                    <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                      <span className="truncate">
                        Sourced live from{' '}
                        <span className="font-mono-tabular">{mixkitSourceUrl}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={mixkitPage <= 1 || mixkitLoading}
                          onClick={() => {
                            const nextPage = Math.max(1, mixkitPage - 1);
                            setMixkitPage(nextPage);
                            loadMixkitCatalog({
                              category: mixkitActiveQuery
                                ? undefined
                                : mixkitCategory,
                              query: mixkitActiveQuery || undefined,
                              page: nextPage,
                            });
                          }}
                          className="px-2.5 py-1 rounded-md border border-slate-700 bg-[#0F172A] text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <span className="font-mono-tabular px-1.5 text-slate-300">
                          Page {mixkitPage}
                        </span>
                        <button
                          type="button"
                          disabled={mixkitLoading || mixkitItems.length < 10}
                          onClick={() => {
                            const nextPage = mixkitPage + 1;
                            setMixkitPage(nextPage);
                            loadMixkitCatalog({
                              category: mixkitActiveQuery
                                ? undefined
                                : mixkitCategory,
                              query: mixkitActiveQuery || undefined,
                              page: nextPage,
                            });
                          }}
                          className="px-2.5 py-1 rounded-md border border-slate-700 bg-[#0F172A] text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {sourceMode === 'board' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0F172A] border border-slate-800 rounded-lg">
                  {STUDIO_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        category === cat.id
                          ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter studio effects..."
                    aria-label="Filter sound effects"
                    className="w-full pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 bg-[#0F172A] border border-slate-800 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {visibleSfx.map((sfx) => {
                  const isSelected = selectedSfx.id === sfx.id;
                  const isPlaying = playingId === sfx.id;
                  const isInVideo = activeVideoSfxId === sfx.id;

                  return (
                    <div
                      key={sfx.id}
                      onClick={() => handleAuditionCard(sfx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAuditionCard(sfx);
                        }
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-colors flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#182342] text-white border-[#5C7CFA]'
                          : 'bg-[#0F172A] text-white border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">
                            {sfx.title}
                          </h3>
                          <p
                            className={`text-xs mt-1 leading-snug ${
                              isSelected ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {sfx.description}
                          </p>
                        </div>

                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isPlaying
                              ? 'bg-[#18D5A8] text-[#0B1120]'
                              : isSelected
                              ? 'bg-white/10 text-white'
                              : 'bg-[#0B1120] text-slate-300 border border-slate-800'
                          }`}
                        >
                          {isPlaying ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </span>
                      </div>

                      <div
                        className={`flex items-center justify-between text-[11px] pt-2 border-t ${
                          isSelected
                            ? 'border-white/10 text-slate-400'
                            : 'border-slate-800 text-slate-500'
                        }`}
                      >
                        <span className="font-mono-tabular">
                          {sfx.durationLabel} · {sfx.license}
                        </span>
                        {isInVideo && (
                          <span className="text-[#18D5A8] font-medium">
                            Active in Video
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {sourceMode === 'web' && (
            <div className="space-y-4">
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchWebSfx();
                    }}
                    placeholder="Search public domain sound effects (e.g. whoosh, bell, bird, click)..."
                    aria-label="Search CC0 web sound effects"
                    className="flex-1 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
                  />
                  <button
                    type="button"
                    disabled={webLoading}
                    onClick={() => handleSearchWebSfx()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors shrink-0 disabled:opacity-50"
                  >
                    {webLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Search CC0
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">
                    Quick topics:
                  </span>
                  {[
                    'whoosh',
                    'bell',
                    'rain',
                    'birds',
                    'chime',
                    'applause',
                    'click',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSearchWebSfx(tag)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#0B1120] border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {webError && (
                <div className="p-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  {webError}
                </div>
              )}

              {webLoading ? (
                <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#5C7CFA]" />
                  Searching CC0 & Public Domain recordings...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {webResults.map((track) => {
                    const active = activeWebTrack?.id === track.id;
                    const playing = playingId === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => handleAuditionWebTrack(track)}
                        className={`text-left rounded-xl border p-4 transition-colors flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-[#182342] text-white border-[#5C7CFA]'
                            : 'bg-[#0F172A] text-white border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">
                            {track.title}
                          </h3>
                          <p
                            className={`text-xs mt-1 truncate ${
                              active ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {track.creator} · {track.license} · {track.lengthLabel}
                          </p>
                        </div>
                        <span
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            playing
                              ? 'bg-[#18D5A8] text-[#0B1120]'
                              : active
                              ? 'bg-white/10 text-white'
                              : 'bg-[#0B1120] text-slate-300 border border-slate-800'
                          }`}
                        >
                          {playing ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Inspector & Export */}
        <aside className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-5 sticky top-24">
          <div>
            <span className="text-[11px] font-mono-tabular text-[#18D5A8] font-semibold">
              {inspectorLicense}
            </span>
            <h2 className="font-display text-lg font-semibold text-white mt-0.5 line-clamp-2">
              {inspectorTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {inspectorSubtitle}
            </p>
          </div>

          {/* Waveform Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0B1120] relative">
            <canvas
              ref={waveCanvasRef}
              width={320}
              height={110}
              className="w-full h-28 block"
            />
            {decodingId && (
              <div className="absolute inset-0 bg-[#0B1120]/70 flex items-center justify-center gap-2 text-xs text-white">
                <Loader2 className="w-4 h-4 animate-spin text-[#18D5A8]" />
                Decoding waveform...
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!buffer}
            onClick={() => {
              if (!buffer) return;
              const id =
                sourceMode === 'mixkit' && selectedMixkit
                  ? selectedMixkit.id
                  : sourceMode === 'web' && activeWebTrack
                  ? activeWebTrack.id
                  : selectedSfx.id;
              const rate =
                sourceMode === 'board' ? 1 : Math.pow(2, pitchSemitones / 12);
              playBuffer(buffer, id, rate);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Play Sound Effect
          </button>

          {/* Pitch Tuning */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-300">Pitch Tuning</span>
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-slate-400">
                  {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st
                </span>
                {pitchSemitones !== 0 && (
                  <button
                    type="button"
                    onClick={() => setPitchSemitones(0)}
                    className="text-slate-400 hover:text-white"
                    aria-label="Reset pitch"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={pitchSemitones}
              onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>

          {/* Cue Timing for Video Studio */}
          {canSendCurrentToVideo && (
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <span className="block text-xs font-medium text-slate-300">
                Video Cue Placement
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
                {(
                  [
                    { id: 'intro', label: 'Intro (0s)' },
                    { id: 'mid', label: 'Midpoint' },
                    { id: 'outro', label: 'Outro' },
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setCueTiming(pos.id)}
                    className={`py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                      cueTiming === pos.id
                        ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (sourceMode === 'mixkit' && selectedMixkit) {
                    onSendToVideo({
                      kind: 'mixkit',
                      audioUrl: selectedMixkit.audioUrl,
                      title: selectedMixkit.title,
                      timing: cueTiming,
                    });
                  } else {
                    onSendToVideo({
                      kind: 'studio',
                      sfxId: selectedSfx.id,
                      timing: cueTiming,
                    });
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#18D5A8] text-[#0B1120] hover:bg-[#14BE96] transition-colors"
              >
                <Film className="w-3.5 h-3.5" />
                Add Cue to Video Studio
              </button>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              disabled={!buffer}
              onClick={handleDownloadWav}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download WAV File
            </button>

            {sourceMode === 'mixkit' && selectedMixkit && (
              <button
                type="button"
                disabled={downloadingMp3}
                onClick={handleDownloadMixkitMp3}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {downloadingMp3 ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Preparing MP3...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download Mixkit MP3
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-[#18D5A8] shrink-0" />
            Royalty-free SFX safe for Instagram Reels, Stories & okarina.dev.
          </p>
        </aside>
      </div>
    </div>
  );
};
