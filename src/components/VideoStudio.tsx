import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  BookmarkPlus,
  Check,
  Download,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  SFX_CATALOG,
  STUDIO_AUDIO_TRACKS,
  VIDEO_FORMAT_META,
  VIDEO_TEMPLATES,
} from '../data/brandPresets';
import {
  AudioCategory,
  AudioSourceMode,
  BackdropStyle,
  CC0WebTrack,
  SfxId,
  VideoConfig,
  VideoFormat,
} from '../types/brand';
import {
  audioBufferToWavBlob,
  fetchAndDecodeAudioUrl,
  renderStudioAudioTrack,
  searchCC0AudioLibrary,
} from '../utils/audioEngine';
import { downloadDataUrl } from '../utils/canvasRenderers';
import { renderSoundEffect } from '../utils/sfxEngine';
import {
  pickSupportedVideoMimeType,
  renderVideoFrameToCanvas,
} from '../utils/videoRenderer';
import { ColorField } from './ColorField';

interface VideoStudioProps {
  config: VideoConfig;
  onChange: (next: VideoConfig) => void;
  onSaveDesign: (config: VideoConfig) => void;
  exportTrigger: number;
  onOpenSfxStudio?: () => void;
}

const VIDEO_THEMES = [
  {
    id: 'midnight',
    label: 'Midnight',
    bg: '#0B1120',
    dot: '#5C7CFA',
    patch: {
      bgColor: '#0B1120',
      backdropStyle: 'midnight-mesh' as BackdropStyle,
      textColor: '#FFFFFF',
      mutedTextColor: '#CBD5E1',
      accentColor: '#18D5A8',
      markFill: '#5C7CFA',
      markDetailColor: '#0B1120',
      markSubtleDetailColor: '#1E294B',
      mouthpieceColor: '#0B1120',
    },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    bg: '#2939F0',
    dot: '#FFFFFF',
    patch: {
      bgColor: '#2939F0',
      backdropStyle: 'indigo-aura' as BackdropStyle,
      textColor: '#FFFFFF',
      mutedTextColor: '#DDE3FF',
      accentColor: '#18D5A8',
      markFill: '#FFFFFF',
      markDetailColor: '#2939F0',
      markSubtleDetailColor: '#8B97FA',
      mouthpieceColor: '#2939F0',
    },
  },
  {
    id: 'light',
    label: 'Crisp Light',
    bg: '#F5F7FB',
    dot: '#2939F0',
    patch: {
      bgColor: '#F5F7FB',
      backdropStyle: 'cool-mist' as BackdropStyle,
      textColor: '#0B1120',
      mutedTextColor: '#475569',
      accentColor: '#18D5A8',
      markFill: '#2939F0',
      markDetailColor: '#FFFFFF',
      markSubtleDetailColor: '#B8C4FF',
      mouthpieceColor: '#0B1120',
    },
  },
  {
    id: 'grid',
    label: 'Navy Grid',
    bg: '#0B1120',
    dot: '#18D5A8',
    patch: {
      bgColor: '#0B1120',
      backdropStyle: 'navy-grid' as BackdropStyle,
      textColor: '#FFFFFF',
      mutedTextColor: '#94A3B8',
      accentColor: '#18D5A8',
      markFill: '#5C7CFA',
      markDetailColor: '#0B1120',
      markSubtleDetailColor: '#1E294B',
      mouthpieceColor: '#0B1120',
    },
  },
];

const BACKDROP_OPTIONS: { id: BackdropStyle; label: string }[] = [
  { id: 'midnight-mesh', label: 'Midnight Mesh' },
  { id: 'indigo-aura', label: 'Indigo Aura' },
  { id: 'cool-mist', label: 'Cool Mist' },
  { id: 'mint-horizon', label: 'Mint Horizon' },
  { id: 'navy-grid', label: 'Studio Grid' },
  { id: 'solid', label: 'Solid Flat' },
];

const DURATIONS = [5, 10, 15, 30];

export const VideoStudio: React.FC<VideoStudioProps> = ({
  config,
  onChange,
  onSaveDesign,
  exportTrigger,
  onOpenSfxStudio,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [designName, setDesignName] = useState(config.name || 'okarina Video');
  const [justSaved, setJustSaved] = useState(false);

  // Playback & audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(config.audioUrl || '');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [sfxBuffer, setSfxBuffer] = useState<AudioBuffer | null>(null);

  // Built-in library filters & CC0 web catalog search
  const [studioCategory, setStudioCategory] = useState<'all' | AudioCategory>('all');
  const [studioSearch, setStudioSearch] = useState('');
  const [cc0Query, setCc0Query] = useState('ambient');
  const [cc0Results, setCc0Results] = useState<CC0WebTrack[]>([]);
  const [cc0Searching, setCc0Searching] = useState(false);
  const [cc0SearchError, setCc0SearchError] = useState<string | null>(null);
  const [selectedCc0Track, setSelectedCc0Track] = useState<CC0WebTrack | null>(null);

  // Video export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef(false);

  // AudioContext & active nodes refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewGainRef = useRef<GainNode | null>(null);
  const previewSfxSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewSfxGainRef = useRef<GainNode | null>(null);
  const previewAnalyserRef = useRef<AnalyserNode | null>(null);
  const freqBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const playStartPerfRef = useRef<number>(0);
  const playOffsetRef = useRef<number>(0);

  const meta = VIDEO_FORMAT_META[config.format];

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

  useEffect(() => {
    setDesignName(config.name);
  }, [config.name]);

  // Load optional background photo
  useEffect(() => {
    if (!config.photoDataUrl) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLoadedImage(img);
    img.src = config.photoDataUrl;
  }, [config.photoDataUrl]);

  // Synthesize selected built-in studio track automatically
  useEffect(() => {
    if (config.audioMode !== 'studio') return;
    let cancelled = false;
    setAudioLoading(true);
    setAudioError(null);
    renderStudioAudioTrack(config.studioTrackId)
      .then((buf) => {
        if (!cancelled) {
          setAudioBuffer(buf);
          setAudioLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAudioError(
            err instanceof Error ? err.message : 'Unable to generate studio audio.'
          );
          setAudioLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config.audioMode, config.studioTrackId]);

  // Synthesize optional SFX cue layer when selected
  useEffect(() => {
    const activeSfx = config.sfxId ?? 'none';
    if (activeSfx === 'none') {
      setSfxBuffer(null);
      return;
    }
    let cancelled = false;
    renderSoundEffect(activeSfx)
      .then((buf) => {
        if (!cancelled) {
          setSfxBuffer(buf);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSfxBuffer(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config.sfxId]);

  const getSfxCueStartSec = useCallback(
    (
      sfxBuf: AudioBuffer,
      durationSec: number,
      timing: 'intro' | 'mid' | 'outro'
    ) => {
      if (timing === 'intro') return 0;
      if (timing === 'mid') return durationSec * 0.5;
      return Math.max(0, durationSec - Math.min(2, sfxBuf.duration));
    },
    []
  );

  const stopPreviewAudio = useCallback(() => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch {
        // already stopped
      }
      previewSourceRef.current = null;
    }
    if (previewGainRef.current) {
      previewGainRef.current.disconnect();
      previewGainRef.current = null;
    }
    if (previewSfxSourceRef.current) {
      try {
        previewSfxSourceRef.current.stop();
        previewSfxSourceRef.current.disconnect();
      } catch {
        // already stopped
      }
      previewSfxSourceRef.current = null;
    }
    if (previewSfxGainRef.current) {
      previewSfxGainRef.current.disconnect();
      previewSfxGainRef.current = null;
    }
    if (previewAnalyserRef.current) {
      previewAnalyserRef.current.disconnect();
      previewAnalyserRef.current = null;
    }
  }, []);

  // Live volume adjustment while playing
  useEffect(() => {
    if (audioCtxRef.current) {
      if (previewGainRef.current) {
        const target = isMuted ? 0 : config.audioVolume;
        previewGainRef.current.gain.setTargetAtTime(
          target,
          audioCtxRef.current.currentTime,
          0.03
        );
      }
      if (previewSfxGainRef.current) {
        const sfxTarget = isMuted ? 0 : (config.sfxVolume ?? 0.75);
        previewSfxGainRef.current.gain.setTargetAtTime(
          sfxTarget,
          audioCtxRef.current.currentTime,
          0.03
        );
      }
    }
  }, [isMuted, config.audioVolume, config.sfxVolume]);

  // Render static frame whenever paused & config changes
  useEffect(() => {
    if (isPlaying || isExporting) return;
    const draw = () => {
      if (canvasRef.current) {
        renderVideoFrameToCanvas(
          canvasRef.current,
          config,
          playheadSec,
          null,
          loadedImage
        );
      }
    };
    draw();
    if (document.fonts) {
      document.fonts.ready.then(draw);
    }
  }, [config, playheadSec, loadedImage, isPlaying, isExporting]);

  const startPreviewAudioAt = useCallback(
    (timelineOffsetSec: number) => {
      stopPreviewAudio();
      const hasMusic = config.audioMode !== 'none' && audioBuffer !== null;
      const activeSfx = config.sfxId ?? 'none';
      const hasSfx = activeSfx !== 'none' && sfxBuffer !== null;
      if (!hasMusic && !hasSfx) return;

      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      freqBufferRef.current = new Uint8Array(analyser.frequencyBinCount);
      analyser.connect(ctx.destination);
      previewAnalyserRef.current = analyser;

      if (hasMusic && audioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;

        const gain = ctx.createGain();
        gain.gain.value = isMuted ? 0 : config.audioVolume;

        source.connect(gain);
        gain.connect(analyser);

        const audioOffset =
          (config.audioStartSec + timelineOffsetSec) % audioBuffer.duration;
        source.start(0, Math.max(0, audioOffset));

        previewSourceRef.current = source;
        previewGainRef.current = gain;
      }

      if (hasSfx && sfxBuffer) {
        const cueSec = getSfxCueStartSec(
          sfxBuffer,
          config.durationSec,
          config.sfxTiming ?? 'intro'
        );
        if (timelineOffsetSec < cueSec + sfxBuffer.duration) {
          const sfxSource = ctx.createBufferSource();
          sfxSource.buffer = sfxBuffer;

          const sfxGain = ctx.createGain();
          sfxGain.gain.value = isMuted ? 0 : (config.sfxVolume ?? 0.75);

          sfxSource.connect(sfxGain);
          sfxGain.connect(analyser);

          const delaySec = Math.max(0, cueSec - timelineOffsetSec);
          const bufferOffset = Math.max(0, timelineOffsetSec - cueSec);
          sfxSource.start(ctx.currentTime + delaySec, bufferOffset);

          previewSfxSourceRef.current = sfxSource;
          previewSfxGainRef.current = sfxGain;
        }
      }
    },
    [
      audioBuffer,
      sfxBuffer,
      config.audioMode,
      config.audioStartSec,
      config.audioVolume,
      config.durationSec,
      config.sfxId,
      config.sfxTiming,
      config.sfxVolume,
      getAudioContext,
      getSfxCueStartSec,
      isMuted,
      stopPreviewAudio,
    ]
  );

  // Preview animation loop
  useEffect(() => {
    if (!isPlaying || isExporting) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    playStartPerfRef.current = performance.now();
    playOffsetRef.current = playheadSec;
    startPreviewAudioAt(playheadSec);

    const tick = (now: number) => {
      const elapsed = (now - playStartPerfRef.current) / 1000;
      const rawTime = playOffsetRef.current + elapsed;
      const wrappedTime = rawTime % config.durationSec;

      // Restart audio smoothly on loop wrap
      if (rawTime >= config.durationSec) {
        playStartPerfRef.current = now;
        playOffsetRef.current = 0;
        startPreviewAudioAt(0);
      }

      setPlayheadSec(wrappedTime);

      let freqData: Uint8Array | null = null;
      if (previewAnalyserRef.current && freqBufferRef.current) {
        previewAnalyserRef.current.getByteFrequencyData(freqBufferRef.current);
        freqData = freqBufferRef.current;
      }

      if (canvasRef.current) {
        renderVideoFrameToCanvas(
          canvasRef.current,
          config,
          wrappedTime,
          freqData,
          loadedImage
        );
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopPreviewAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isExporting, config, loadedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPreviewAudio();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stopPreviewAudio]);

  const update = (patch: Partial<VideoConfig>) => {
    onChange({ ...config, ...patch });
  };

  const handlePhotoUpload = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({ photoDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAudioFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsPlaying(false);
    setAudioLoading(true);
    setAudioError(null);
    try {
      const ctx = getAudioContext();
      const arr = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arr.slice(0));
      setAudioBuffer(decoded);
      update({
        audioMode: 'upload',
        uploadedAudioName: file.name,
        audioStartSec: 0,
      });
    } catch {
      setAudioError(
        'Could not decode that audio file. Please try an MP3, WAV, M4A, or OGG file.'
      );
    } finally {
      setAudioLoading(false);
    }
  };

  const handleLoadAudioUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setAudioError('Paste a direct audio file URL (.mp3, .wav, .ogg).');
      return;
    }
    setIsPlaying(false);
    setAudioLoading(true);
    setAudioError(null);
    try {
      const ctx = getAudioContext();
      const decoded = await fetchAndDecodeAudioUrl(trimmed, ctx);
      setAudioBuffer(decoded);
      update({
        audioMode: 'url',
        audioUrl: trimmed,
        audioStartSec: 0,
      });
    } catch (err) {
      setAudioError(
        err instanceof Error
          ? err.message
          : 'Failed to load audio from URL.'
      );
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSearchCC0 = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? cc0Query).trim() || 'ambient';
    if (overrideQuery !== undefined) setCc0Query(overrideQuery);
    setCc0Searching(true);
    setCc0SearchError(null);
    try {
      const tracks = await searchCC0AudioLibrary(q);
      setCc0Results(tracks);
      if (tracks.length === 0) {
        setCc0SearchError('No CC0 tracks matched that search. Try "piano", "ambient", or "rain".');
      }
    } catch (err) {
      setCc0SearchError(
        err instanceof Error ? err.message : 'Unable to reach public CC0 catalog.'
      );
    } finally {
      setCc0Searching(false);
    }
  };

  const handleSelectCC0Track = async (track: CC0WebTrack) => {
    setIsPlaying(false);
    setAudioLoading(true);
    setAudioError(null);
    try {
      const ctx = getAudioContext();
      const decoded = await fetchAndDecodeAudioUrl(track.audioUrl, ctx);
      setAudioBuffer(decoded);
      setSelectedCc0Track(track);
      update({
        audioMode: 'cc0web',
        audioUrl: track.audioUrl,
        uploadedAudioName: track.title,
        audioStartSec: 0,
      });
    } catch (err) {
      setAudioError(
        err instanceof Error ? err.message : 'Could not load that CC0 audio track.'
      );
    } finally {
      setAudioLoading(false);
    }
  };

  const handleDownloadWavTrack = () => {
    if (!audioBuffer) return;
    const wav = audioBufferToWavBlob(audioBuffer);
    const url = URL.createObjectURL(wav);
    downloadDataUrl(url, `okarina-${config.studioTrackId}.wav`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportVideo = useCallback(async () => {
    if (isExporting) return;
    if (typeof MediaRecorder === 'undefined') {
      setExportError(
        'Video recording is not supported in this browser. Try Chrome, Edge, or Firefox.'
      );
      return;
    }

    setIsPlaying(false);
    stopPreviewAudio();
    setExportError(null);
    setIsExporting(true);
    setExportProgress(0);
    exportAbortRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsExporting(false);
      return;
    }

    try {
      const ctx = getAudioContext();
      const mediaDest = ctx.createMediaStreamDestination();
      let exportSource: AudioBufferSourceNode | null = null;
      let sfxExportSource: AudioBufferSourceNode | null = null;
      let exportAnalyser: AnalyserNode | null = null;
      let exportFreq: Uint8Array<ArrayBuffer> | null = null;

      const hasMusic = config.audioMode !== 'none' && audioBuffer !== null;
      const activeSfx = config.sfxId ?? 'none';
      const hasSfx = activeSfx !== 'none' && sfxBuffer !== null;
      const hasAudio = hasMusic || hasSfx;

      if (hasAudio) {
        exportAnalyser = ctx.createAnalyser();
        exportAnalyser.fftSize = 128;
        exportAnalyser.smoothingTimeConstant = 0.78;
        exportFreq = new Uint8Array(exportAnalyser.frequencyBinCount);
        exportAnalyser.connect(mediaDest);
      }

      if (hasMusic && audioBuffer && exportAnalyser) {
        exportSource = ctx.createBufferSource();
        exportSource.buffer = audioBuffer;
        exportSource.loop = true;

        const gainNode = ctx.createGain();
        const vol = config.audioVolume;
        const now = ctx.currentTime;
        if (config.audioFadeInOut && config.durationSec >= 2) {
          gainNode.gain.setValueAtTime(0.001, now);
          gainNode.gain.linearRampToValueAtTime(vol, now + 0.45);
          gainNode.gain.setValueAtTime(vol, now + config.durationSec - 0.65);
          gainNode.gain.linearRampToValueAtTime(0.001, now + config.durationSec);
        } else {
          gainNode.gain.setValueAtTime(vol, now);
        }

        exportSource.connect(gainNode);
        gainNode.connect(exportAnalyser);
      }

      let sfxCueSec = 0;
      if (hasSfx && sfxBuffer && exportAnalyser) {
        sfxExportSource = ctx.createBufferSource();
        sfxExportSource.buffer = sfxBuffer;

        const sfxGainNode = ctx.createGain();
        sfxGainNode.gain.setValueAtTime(
          config.sfxVolume ?? 0.75,
          ctx.currentTime
        );

        sfxExportSource.connect(sfxGainNode);
        sfxGainNode.connect(exportAnalyser);

        sfxCueSec = getSfxCueStartSec(
          sfxBuffer,
          config.durationSec,
          config.sfxTiming ?? 'intro'
        );
      }

      // Draw frame 0 before capturing stream
      renderVideoFrameToCanvas(canvas, config, 0, null, loadedImage);

      const videoStream = canvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
      if (hasAudio) {
        tracks.push(...mediaDest.stream.getAudioTracks());
      }
      const combinedStream = new MediaStream(tracks);

      const { mimeType, extension } = pickSupportedVideoMimeType();
      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 6_500_000,
        audioBitsPerSecond: 192_000,
      };
      if (mimeType) recorderOptions.mimeType = mimeType;

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      const recordingFinished = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(250);
      if (exportSource && audioBuffer) {
        const offset = config.audioStartSec % audioBuffer.duration;
        exportSource.start(0, Math.max(0, offset));
      }
      if (sfxExportSource) {
        sfxExportSource.start(ctx.currentTime + sfxCueSec);
      }

      const startPerf = performance.now();
      const totalMs = config.durationSec * 1000;

      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (exportAbortRef.current) {
            resolve();
            return;
          }
          const elapsedMs = now - startPerf;
          const tSec = Math.min(config.durationSec, elapsedMs / 1000);
          setExportProgress(Math.min(1, elapsedMs / totalMs));
          setPlayheadSec(tSec);

          let freqData: Uint8Array | null = null;
          if (exportAnalyser && exportFreq) {
            exportAnalyser.getByteFrequencyData(exportFreq);
            freqData = exportFreq;
          }

          renderVideoFrameToCanvas(canvas, config, tSec, freqData, loadedImage);

          if (elapsedMs < totalMs) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      if (exportSource) {
        try {
          exportSource.stop();
          exportSource.disconnect();
        } catch {
          // ignore
        }
      }
      if (sfxExportSource) {
        try {
          sfxExportSource.stop();
          sfxExportSource.disconnect();
        } catch {
          // ignore
        }
      }

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      await recordingFinished;

      videoStream.getTracks().forEach((t) => t.stop());

      if (!exportAbortRef.current && chunks.length > 0) {
        const blob = new Blob(chunks, {
          type: mimeType || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        const slug = (designName || config.templateId)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
        downloadDataUrl(
          url,
          `okarina-video-${config.format}-${slug}.${extension}`
        );
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Video export failed. Try switching format or audio source.'
      );
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setPlayheadSec(0);
    }
  }, [
    audioBuffer,
    sfxBuffer,
    config,
    designName,
    getAudioContext,
    getSfxCueStartSec,
    isExporting,
    loadedImage,
    stopPreviewAudio,
  ]);

  const prevTrigger = useRef(exportTrigger);
  useEffect(() => {
    if (exportTrigger !== prevTrigger.current) {
      prevTrigger.current = exportTrigger;
      handleExportVideo();
    }
  }, [exportTrigger, handleExportVideo]);

  const handleSave = () => {
    const trimmed = designName.trim() || `${meta.label} Video`;
    onSaveDesign({ ...config, name: trimmed });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const handleTestSfxCue = async () => {
    const activeSfx = config.sfxId ?? 'none';
    if (activeSfx === 'none') return;
    const buf = sfxBuffer || (await renderSoundEffect(activeSfx));
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = config.sfxVolume ?? 0.75;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
  };

  const activeTrackMeta = STUDIO_AUDIO_TRACKS.find(
    (t) => t.id === config.studioTrackId
  );
  const activeSfxMeta = SFX_CATALOG.find(
    (s) => s.id === (config.sfxId ?? 'none')
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[276px_minmax(0,1fr)_345px] gap-0 min-h-[calc(100vh-65px)]">
      {/* Left Rail: Format, Duration, Templates, Photo */}
      <aside className="bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 overflow-y-auto flex flex-col gap-6">
        {/* Video Format */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 mb-2.5">
            Video Aspect Ratio
          </h2>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
            {(['reel', 'square', 'portrait', 'landscape'] as VideoFormat[]).map(
              (fmt) => {
                const active = config.format === fmt;
                const item = VIDEO_FORMAT_META[fmt];
                return (
                  <button
                    key={fmt}
                    type="button"
                    disabled={isExporting}
                    onClick={() => update({ format: fmt })}
                    className={`py-2 px-2 rounded-md text-center transition-colors ${
                      active
                        ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="text-xs leading-tight whitespace-nowrap">
                      {item.label}
                    </div>
                    <div className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">
                      {item.ratioLabel}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Duration */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 mb-2">
            Clip Duration
          </h2>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
            {DURATIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={isExporting}
                onClick={() => {
                  setPlayheadSec(0);
                  update({ durationSec: sec });
                }}
                className={`py-1.5 text-xs font-mono-tabular rounded-md transition-colors ${
                  config.durationSec === sec
                    ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Motion Templates */}
        <div className="pb-5 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 mb-2.5">
            Motion Templates
          </h2>
          <div className="space-y-1.5">
            {VIDEO_TEMPLATES.map((tpl) => {
              const active = config.templateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={isExporting}
                  onClick={() =>
                    update({
                      ...tpl.defaults,
                      name: tpl.name,
                    })
                  }
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#0B1120] text-white border-[#0B1120]'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{tpl.name}</span>
                    <span
                      className={`text-[10px] font-mono-tabular ${
                        active ? 'text-[#18D5A8]' : 'text-slate-400'
                      }`}
                    >
                      {VIDEO_FORMAT_META[tpl.recommendedFormat].ratioLabel}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 leading-snug ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tpl.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Photo */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-500">
              Ken Burns Photo (Optional)
            </h2>
            {config.photoDataUrl && (
              <button
                type="button"
                onClick={() => update({ photoDataUrl: null })}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-slate-300 hover:border-[#2939F0] bg-slate-50/70 p-3 text-center transition-colors"
          >
            {config.photoDataUrl ? (
              <div className="flex items-center gap-3 text-left">
                <img
                  src={config.photoDataUrl}
                  alt="Video background"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0B1120] truncate">
                    Photo layer active
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Click to replace image
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-slate-700">
                <ImagePlus className="w-4 h-4 text-[#2939F0]" />
                Add background photo
              </div>
            )}
          </button>

          {config.photoDataUrl && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-medium text-slate-600">Contrast Scrim</span>
                <span className="font-mono-tabular text-slate-400">
                  {Math.round(config.scrimOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.85}
                step={0.02}
                value={config.scrimOpacity}
                onChange={(e) =>
                  update({ scrimOpacity: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
          )}
        </div>
      </aside>

      {/* Center Stage: Live Video Player + Transport + Export */}
      <section className="bg-[#F2F5FA] p-6 lg:p-8 flex flex-col justify-between gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-[#0B1120] flex items-center gap-2">
              <Film className="w-4 h-4 text-[#2939F0]" />
              {meta.label} Video
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span className="font-mono-tabular">
                {meta.width} × {meta.height} px · {config.durationSec}s
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {config.audioMode === 'none'
                  ? 'Silent track'
                  : config.audioMode === 'studio'
                  ? `Audio: ${activeTrackMeta?.title || 'Studio Track'}`
                  : config.audioMode === 'cc0web'
                  ? `Audio: ${selectedCc0Track?.title || config.uploadedAudioName || 'CC0 Web Track'}`
                  : config.audioMode === 'upload'
                  ? `Audio: ${config.uploadedAudioName || 'Uploaded file'}`
                  : 'Audio: External URL'}
                {activeSfxMeta ? ` + SFX: ${activeSfxMeta.title}` : ''}
              </span>
            </p>
          </div>
        </div>

        {/* Live Canvas Viewport */}
        <div className="flex-1 min-h-[420px] rounded-xl border border-slate-200/90 bg-white flex flex-col items-center justify-center p-6 gap-4">
          <div className="relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className={`rounded-xl shadow-md border border-slate-200/80 w-auto h-auto ${
                config.format === 'reel'
                  ? 'max-h-[560px] max-w-full'
                  : config.format === 'landscape'
                  ? 'max-h-[420px] max-w-full'
                  : 'max-h-[500px] max-w-full'
              }`}
            />

            {isExporting && (
              <div className="absolute inset-0 rounded-xl bg-[#0B1120]/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center">
                <Loader2 className="w-7 h-7 animate-spin text-[#18D5A8] mb-3" />
                <p className="font-display text-base font-semibold">
                  Rendering Video & Synced Audio
                </p>
                <p className="text-xs font-mono-tabular text-slate-300 mt-1">
                  {(exportProgress * config.durationSec).toFixed(1)}s /{' '}
                  {config.durationSec.toFixed(1)}s
                </p>
                <div className="w-56 h-1.5 bg-white/15 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-[#18D5A8] transition-all duration-100"
                    style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportAbortRef.current = true;
                  }}
                  className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/25 hover:bg-white/10 transition-colors"
                >
                  Cancel Render
                </button>
              </div>
            )}
          </div>

          {/* Transport Scrub Bar */}
          <div className="w-full max-w-xl flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <button
              type="button"
              disabled={isExporting || audioLoading}
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pause video preview' : 'Play video preview'}
              className="w-8 h-8 rounded-lg bg-[#0B1120] text-white flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => {
                setIsPlaying(false);
                setPlayheadSec(0);
              }}
              aria-label="Restart preview"
              className="p-1.5 text-slate-500 hover:text-[#0B1120] rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min={0}
              max={config.durationSec}
              step={0.05}
              disabled={isExporting}
              value={playheadSec}
              onChange={(e) => {
                setIsPlaying(false);
                setPlayheadSec(parseFloat(e.target.value));
              }}
              aria-label="Video timeline scrubber"
              className="flex-1"
            />

            <span className="text-xs font-mono-tabular text-slate-600 shrink-0 w-20 text-right">
              {playheadSec.toFixed(1)}s / {config.durationSec}s
            </span>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute preview audio' : 'Mute preview audio'}
              className="p-1.5 text-slate-600 hover:text-[#0B1120] rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {exportError && (
          <div className="px-4 py-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {exportError}
          </div>
        )}

        {/* Bottom Save & Render Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="Video project name"
              aria-label="Video project name"
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
            />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Saved
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save to Vault
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            disabled={isExporting || audioLoading}
            onClick={handleExportVideo}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Render & Download Video
              </>
            )}
          </button>
        </div>
      </section>

      {/* Right Inspector: Audio Source + Copy + Styling */}
      <aside className="bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 overflow-y-auto flex flex-col gap-6">
        {/* Audio Source Section */}
        <div className="space-y-3.5 pb-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-[#2939F0]" />
              Audio Source
            </h2>
            {audioBuffer && config.audioMode !== 'none' && (
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {audioBuffer.duration.toFixed(1)}s ready
              </span>
            )}
          </div>

          {/* Audio Source Mode Switcher */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'studio', label: 'Studio' },
                { id: 'cc0web', label: 'CC0 Web' },
                { id: 'upload', label: 'Upload' },
                { id: 'url', label: 'URL' },
                { id: 'none', label: 'Silent' },
              ] as { id: AudioSourceMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setAudioError(null);
                  update({ audioMode: mode.id });
                  if (mode.id === 'cc0web' && cc0Results.length === 0 && !cc0Searching) {
                    handleSearchCC0('ambient');
                  }
                }}
                className={`py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  config.audioMode === mode.id
                    ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Built-in 18-Track CC0 Studio Library */}
          {config.audioMode === 'studio' && (
            <div className="space-y-2.5">
              {/* Category filter & quick search */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'All (18)' },
                    { id: 'music', label: 'Music' },
                    { id: 'ambient', label: 'Ambient' },
                    { id: 'beats', label: 'Beats' },
                    { id: 'soundscapes', label: 'FX' },
                  ] as { id: 'all' | AudioCategory; label: string }[]
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setStudioCategory(cat.id)}
                    className={`flex-1 py-1 px-1.5 text-[10px] font-medium rounded-md transition-colors whitespace-nowrap ${
                      studioCategory === cat.id
                        ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studioSearch}
                  onChange={(e) => setStudioSearch(e.target.value)}
                  placeholder="Filter tracks (e.g. rain, lo-fi, flute)..."
                  aria-label="Filter studio tracks"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                {STUDIO_AUDIO_TRACKS.filter((t) => {
                  if (studioCategory !== 'all' && t.category !== studioCategory) {
                    return false;
                  }
                  if (studioSearch.trim()) {
                    const q = studioSearch.toLowerCase();
                    return (
                      t.title.toLowerCase().includes(q) ||
                      t.vibe.toLowerCase().includes(q) ||
                      t.category.toLowerCase().includes(q)
                    );
                  }
                  return true;
                }).map((track) => {
                  const active = config.studioTrackId === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        update({ studioTrackId: track.id, audioStartSec: 0 });
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        active
                          ? 'bg-[#0B1120] text-white border-[#0B1120]'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          {track.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono-tabular shrink-0 ${
                            active ? 'text-[#18D5A8]' : 'text-slate-400'
                          }`}
                        >
                          {track.bpm} BPM · {track.keyLabel}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 leading-snug ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {track.vibe}
                      </p>
                      <div
                        className={`text-[10px] mt-1 ${
                          active ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {track.category} · {track.license}
                      </div>
                    </button>
                  );
                })}
              </div>

              {audioBuffer && (
                <button
                  type="button"
                  onClick={handleDownloadWavTrack}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Active Track (.wav)
                </button>
              )}
            </div>
          )}

          {/* Public Domain / CC0 Web Catalog (Internet Archive) */}
          {config.audioMode === 'cc0web' && (
            <div className="space-y-2.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={cc0Query}
                  onChange={(e) => setCc0Query(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchCC0();
                  }}
                  placeholder="Search free CC0 audio..."
                  aria-label="Search CC0 public domain audio"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
                />
                <button
                  type="button"
                  disabled={cc0Searching}
                  onClick={() => handleSearchCC0()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors shrink-0 disabled:opacity-50"
                >
                  {cc0Searching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  Search
                </button>
              </div>

              {/* Quick topic picks */}
              <div className="flex flex-wrap gap-1">
                {['ambient', 'piano', 'synth', 'rain', 'acoustic', 'lofi'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSearchCC0(tag)}
                      className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>

              {cc0SearchError && (
                <div className="p-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                  {cc0SearchError}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                {cc0Searching ? (
                  <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2939F0]" />
                    Searching CC0 & Public Domain catalog...
                  </div>
                ) : (
                  cc0Results.map((track) => {
                    const active = selectedCc0Track?.id === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        disabled={audioLoading}
                        onClick={() => handleSelectCC0Track(track)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          active
                            ? 'bg-[#0B1120] text-white border-[#0B1120]'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate">
                            {track.title}
                          </span>
                          <span
                            className={`text-[10px] font-mono-tabular shrink-0 ${
                              active ? 'text-[#18D5A8]' : 'text-slate-400'
                            }`}
                          >
                            {track.lengthLabel}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 truncate ${
                            active ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {track.creator} · {track.license}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Filtered strictly to CC0 1.0 & Public Domain recordings via
                Internet Archive.
              </p>
            </div>
          )}

          {/* Upload Audio File */}
          {config.audioMode === 'upload' && (
            <div>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => handleAudioFileUpload(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-slate-300 hover:border-[#2939F0] bg-slate-50 p-4 text-center transition-colors"
              >
                <Upload className="w-5 h-5 text-[#2939F0] mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-[#0B1120] truncate">
                  {config.uploadedAudioName || 'Choose MP3, WAV, M4A, or OGG'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Decoded locally in your browser
                </div>
              </button>
            </div>
          )}

          {/* External Audio URL */}
          {config.audioMode === 'url' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-slate-600">
                Direct Audio Link (.mp3, .wav, .ogg)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/track.mp3"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
                />
                <button
                  type="button"
                  disabled={audioLoading}
                  onClick={handleLoadAudioUrl}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors shrink-0 disabled:opacity-50"
                >
                  {audioLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  Load
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Supports direct MP3, WAV, and OGG links. Proxied automatically so
                audio-reactive visuals and video export work cleanly.
              </p>
            </div>
          )}

          {audioLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2939F0]" />
              Preparing audio buffer...
            </div>
          )}

          {audioError && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {audioError}
            </div>
          )}

          {config.audioMode !== 'none' && audioBuffer && (
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-600">Volume</span>
                  <span className="font-mono-tabular text-slate-400">
                    {Math.round(config.audioVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={config.audioVolume}
                  onChange={(e) =>
                    update({ audioVolume: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              {audioBuffer.duration > 1 && (
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-600">
                      Audio Start Offset
                    </span>
                    <span className="font-mono-tabular text-slate-400">
                      {config.audioStartSec.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, audioBuffer.duration - 1)}
                    step={0.5}
                    value={config.audioStartSec}
                    onChange={(e) =>
                      update({ audioStartSec: parseFloat(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Smooth Audio Fade In & Out
                </label>
                <input
                  type="checkbox"
                  checked={config.audioFadeInOut}
                  onChange={(e) =>
                    update({ audioFadeInOut: e.target.checked })
                  }
                  className="rounded border-slate-300 accent-[#2939F0]"
                />
              </div>
            </div>
          )}

          {/* SFX Cue Overlay */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#18D5A8]" />
                SFX Cue Layer (CC0)
              </span>
              {onOpenSfxStudio && (
                <button
                  type="button"
                  onClick={onOpenSfxStudio}
                  className="text-[11px] font-medium text-[#2939F0] hover:underline"
                >
                  Open Sound Effects
                </button>
              )}
            </div>

            <select
              value={config.sfxId ?? 'none'}
              onChange={(e) =>
                update({ sfxId: e.target.value as SfxId | 'none' })
              }
              aria-label="Select sound effect cue"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
            >
              <option value="none">No SFX Cue</option>
              {SFX_CATALOG.map((sfx) => (
                <option key={sfx.id} value={sfx.id}>
                  {sfx.title} ({sfx.durationLabel})
                </option>
              ))}
            </select>

            {(config.sfxId ?? 'none') !== 'none' && (
              <div className="space-y-2.5 pt-1">
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
                      onClick={() => update({ sfxTiming: pos.id })}
                      className={`py-1 text-[11px] font-medium rounded-md transition-colors ${
                        (config.sfxTiming ?? 'intro') === pos.id
                          ? 'bg-white text-[#0B1120] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-600">SFX Level</span>
                    <span className="font-mono-tabular text-slate-400">
                      {Math.round((config.sfxVolume ?? 0.75) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={config.sfxVolume ?? 0.75}
                    onChange={(e) =>
                      update({ sfxVolume: parseFloat(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTestSfxCue}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Play className="w-3 h-3" />
                  Test SFX Cue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video Copy */}
        <div className="space-y-3 pb-5 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500">Video Copy</h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Eyebrow / Label
            </label>
            <input
              type="text"
              value={config.eyebrow}
              onChange={(e) => update({ eyebrow: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Headline
            </label>
            <textarea
              rows={2}
              value={config.headline}
              onChange={(e) => update({ headline: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Body / Subtitle
            </label>
            <textarea
              rows={2}
              value={config.body}
              onChange={(e) => update({ body: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date / Tag
              </label>
              <input
                type="text"
                value={config.dateLabel}
                onChange={(e) => update({ dateLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Website / Handle
              </label>
              <input
                type="text"
                value={config.footerHandle}
                onChange={(e) => update({ footerHandle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Bottom Action Text
            </label>
            <input
              type="text"
              value={config.ctaText}
              onChange={(e) => update({ ctaText: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
            />
          </div>
        </div>

        {/* Theme & Motion */}
        <div className="space-y-3.5">
          <h2 className="text-xs font-semibold text-slate-500">
            Backdrop & Motion
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {VIDEO_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => update(theme.patch)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-left transition-colors"
              >
                <span
                  className="w-4 h-4 rounded-full border border-slate-200 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: theme.bg }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: theme.dot }}
                  />
                </span>
                <span className="text-xs font-medium text-slate-700">
                  {theme.label}
                </span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Backdrop Style
            </label>
            <select
              value={config.backdropStyle}
              onChange={(e) =>
                update({ backdropStyle: e.target.value as BackdropStyle })
              }
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2939F0]"
            >
              {BACKDROP_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <ColorField
            label="Canvas Color"
            value={config.bgColor}
            onChange={(bgColor) => update({ bgColor })}
          />
          <ColorField
            label="Accent Color"
            value={config.accentColor}
            onChange={(accentColor) => update({ accentColor })}
          />

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Text Align
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'left' })}
                  className={`py-1.5 flex items-center justify-center rounded-md ${
                    config.textAlign === 'left'
                      ? 'bg-white text-[#0B1120] shadow-xs'
                      : 'text-slate-500'
                  }`}
                  aria-label="Align left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'center' })}
                  className={`py-1.5 flex items-center justify-center rounded-md ${
                    config.textAlign === 'center'
                      ? 'bg-white text-[#0B1120] shadow-xs'
                      : 'text-slate-500'
                  }`}
                  aria-label="Align center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Lockup
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['horizontal', 'mark', 'none'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update({ logoVariant: v })}
                    className={`py-1.5 text-[11px] font-medium rounded-md ${
                      config.logoVariant === v
                        ? 'bg-white text-[#0B1120] shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    {v === 'horizontal' ? 'Full' : v === 'mark' ? 'Mark' : 'Off'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Motion Energy</span>
              <span className="font-mono-tabular text-slate-500">
                {Math.round(config.motionIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={1.6}
              step={0.05}
              value={config.motionIntensity}
              onChange={(e) =>
                update({ motionIntensity: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-medium text-slate-700">
              Show Audio Spectrum Bars
            </label>
            <input
              type="checkbox"
              checked={config.showWaveform}
              onChange={(e) => update({ showWaveform: e.target.checked })}
              className="rounded border-slate-300 accent-[#2939F0]"
            />
          </div>
        </div>
      </aside>
    </div>
  );
};
