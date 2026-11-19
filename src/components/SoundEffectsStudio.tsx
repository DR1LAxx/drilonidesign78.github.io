import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { SFX_CATALOG } from '../data/brandPresets';
import { CC0WebTrack, SfxCategory, SfxId, SfxMeta } from '../types/brand';
import {
  audioBufferToWavBlob,
  fetchAndDecodeAudioUrl,
  searchCC0AudioLibrary,
} from '../utils/audioEngine';
import { downloadDataUrl } from '../utils/canvasRenderers';
import { renderSoundEffect } from '../utils/sfxEngine';

interface SoundEffectsStudioProps {
  activeVideoSfxId: SfxId | 'none';
  onSendToVideo: (sfxId: SfxId, timing: 'intro' | 'mid' | 'outro') => void;
}

const CATEGORIES: { id: 'all' | SfxCategory; label: string }[] = [
  { id: 'all', label: 'All (24)' },
  { id: 'ui', label: 'UI & Clicks' },
  { id: 'transitions', label: 'Whooshes' },
  { id: 'chimes', label: 'Chimes' },
  { id: 'impacts', label: 'Impacts' },
  { id: 'musical', label: 'Okarina & Keys' },
  { id: 'foley', label: 'Foley' },
];

export const SoundEffectsStudio: React.FC<SoundEffectsStudioProps> = ({
  activeVideoSfxId,
  onSendToVideo,
}) => {
  const [sourceMode, setSourceMode] = useState<'board' | 'web'>('board');
  const [category, setCategory] = useState<'all' | SfxCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedSfx, setSelectedSfx] = useState<SfxMeta>(SFX_CATALOG[9]); // Okarina Brand Stinger
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [cueTiming, setCueTiming] = useState<'intro' | 'mid' | 'outro'>('intro');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);

  // CC0 Web SFX search state
  const [webQuery, setWebQuery] = useState('sound effect whoosh');
  const [webResults, setWebResults] = useState<CC0WebTrack[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [activeWebTrack, setActiveWebTrack] = useState<CC0WebTrack | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Draw waveform of current buffer onto inspector canvas
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

    // Subtle center axis
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

  // Re-render selected studio SFX whenever selection or pitch changes
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

  const playBuffer = useCallback(
    (buf: AudioBuffer, id: string) => {
      stopActiveSound();
      const ctx = getAudioContext();
      const src = ctx.createBufferSource();
      src.buffer = buf;
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

  const handleAuditionCard = async (sfx: SfxMeta) => {
    setSelectedSfx(sfx);
    setSourceMode('board');
    const semitones = sfx.id === selectedSfx.id ? pitchSemitones : 0;
    if (sfx.id !== selectedSfx.id) setPitchSemitones(0);
    const buf = await renderSoundEffect(sfx.id, semitones);
    setBuffer(buf);
    drawWaveform(buf);
    playBuffer(buf, sfx.id);
  };

  const handleDownloadSfx = () => {
    if (!buffer) return;
    const wav = audioBufferToWavBlob(buffer);
    const url = URL.createObjectURL(wav);
    const name =
      sourceMode === 'web' && activeWebTrack
        ? activeWebTrack.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : selectedSfx.id;
    downloadDataUrl(url, `okarina-sfx-${name}.wav`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        setWebError('No CC0 sound effects found. Try "whoosh", "bell", "rain", or "click".');
      }
    } catch (err) {
      setWebError(
        err instanceof Error ? err.message : 'Unable to search CC0 web catalog.'
      );
    } finally {
      setWebLoading(false);
    }
  };

  const handleAuditionWebTrack = async (track: CC0WebTrack) => {
    setActiveWebTrack(track);
    setWebError(null);
    try {
      const ctx = getAudioContext();
      const decoded = await fetchAndDecodeAudioUrl(track.audioUrl, ctx);
      setBuffer(decoded);
      drawWaveform(decoded);
      playBuffer(decoded, track.id);
    } catch (err) {
      setWebError(
        err instanceof Error ? err.message : 'Could not decode that audio file.'
      );
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

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0B1120]">
            Sound Effects Studio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            24 non-copyrighted CC0 sound effects plus live public-domain SFX search. Click any pad to audition, tune pitch, download WAV, or cue into Video Studio.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSourceMode('board')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              sourceMode === 'board'
                ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Studio SFX Board (24)
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
                ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CC0 Web SFX Search
          </button>
        </div>
      </div>

      {/* Main 2-Column Soundboard + Inspector */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left: Sound Effects Grid */}
        <div className="space-y-5">
          {sourceMode === 'board' ? (
            <>
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/60 rounded-lg">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        category === cat.id
                          ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
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
                    placeholder="Filter sound effects..."
                    aria-label="Filter sound effects"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
                  />
                </div>
              </div>

              {/* SFX Pads Grid */}
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
                          ? 'bg-[#0B1120] text-white border-[#0B1120]'
                          : 'bg-white text-[#0B1120] border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">
                            {sfx.title}
                          </h3>
                          <p
                            className={`text-xs mt-1 leading-snug ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
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
                              : 'bg-slate-100 text-slate-700'
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
                            : 'border-slate-100 text-slate-400'
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
          ) : (
            /* CC0 Web Sound Effects Search */
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
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
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
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
                  <span className="text-[11px] text-slate-400 mr-1">
                    Quick topics:
                  </span>
                  {['whoosh', 'bell', 'rain', 'birds', 'chime', 'applause', 'click'].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSearchWebSfx(tag)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              {webError && (
                <div className="p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
                  {webError}
                </div>
              )}

              {webLoading ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#2939F0]" />
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
                            ? 'bg-[#0B1120] text-white border-[#0B1120]'
                            : 'bg-white text-[#0B1120] border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">
                            {track.title}
                          </h3>
                          <p
                            className={`text-xs mt-1 truncate ${
                              active ? 'text-slate-300' : 'text-slate-500'
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
                              : 'bg-slate-100 text-slate-700'
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
        <aside className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 sticky top-24">
          <div>
            <span className="text-[11px] font-mono-tabular text-[#2939F0] font-semibold">
              {sourceMode === 'web' && activeWebTrack
                ? activeWebTrack.license
                : selectedSfx.license}
            </span>
            <h2 className="font-display text-lg font-semibold text-[#0B1120] mt-0.5 truncate">
              {sourceMode === 'web' && activeWebTrack
                ? activeWebTrack.title
                : selectedSfx.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {sourceMode === 'web' && activeWebTrack
                ? activeWebTrack.creator
                : selectedSfx.description}
            </p>
          </div>

          {/* Waveform Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#0B1120]">
            <canvas
              ref={waveCanvasRef}
              width={320}
              height={110}
              className="w-full h-28 block"
            />
          </div>

          <button
            type="button"
            disabled={!buffer}
            onClick={() => {
              if (buffer) {
                const id =
                  sourceMode === 'web' && activeWebTrack
                    ? activeWebTrack.id
                    : selectedSfx.id;
                playBuffer(buffer, id);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#0B1120] text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Play Sound Effect
          </button>

          {sourceMode === 'board' && (
            <>
              {/* Pitch Shift */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Pitch Tuning</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-slate-500">
                      {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st
                    </span>
                    {pitchSemitones !== 0 && (
                      <button
                        type="button"
                        onClick={() => setPitchSemitones(0)}
                        className="text-slate-400 hover:text-slate-700"
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
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="block text-xs font-medium text-slate-700">
                  Video Cue Placement
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
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
                          ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onSendToVideo(selectedSfx.id, cueTiming)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
                >
                  <Film className="w-3.5 h-3.5" />
                  Add Cue to Video Studio
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            disabled={!buffer}
            onClick={handleDownloadSfx}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download WAV File
          </button>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-[#18D5A8] shrink-0" />
            Safe for Instagram Reels, Stories, YouTube & okarina.dev.
          </p>
        </aside>
      </div>
    </div>
  );
};
