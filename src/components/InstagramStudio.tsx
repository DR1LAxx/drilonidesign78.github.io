import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  BookmarkPlus,
  Check,
  Code2,
  Copy,
  Download,
  ImagePlus,
  Layers,
  Smartphone,
  Square,
  Trash2,
} from 'lucide-react';
import {
  INSTAGRAM_FORMAT_META,
  INSTAGRAM_TEMPLATES,
} from '../data/brandPresets';
import {
  BackdropStyle,
  InstagramConfig,
  InstagramFormat,
} from '../types/brand';
import { renderInstagramToCanvas } from '../utils/canvasRenderers';
import { saveCanvasAsPng } from '../utils/downloadHelper';
import { ColorField } from './ColorField';

interface InstagramStudioProps {
  config: InstagramConfig;
  onChange: (next: InstagramConfig) => void;
  onSaveDesign: (config: InstagramConfig) => void;
  exportTrigger: number;
}

const IG_THEMES = [
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

function getBackdropCss(bgColor: string, style: BackdropStyle): string {
  switch (style) {
    case 'midnight-mesh':
      return `background-color: ${bgColor};\nbackground-image:\n  radial-gradient(circle at 82% 16%, rgba(41, 57, 240, 0.48) 0%, rgba(41, 57, 240, 0) 60%),\n  radial-gradient(circle at 15% 84%, rgba(24, 213, 168, 0.22) 0%, rgba(24, 213, 168, 0) 55%);`;
    case 'indigo-aura':
      return `background-color: ${bgColor};\nbackground-image:\n  radial-gradient(circle at 78% 78%, rgba(24, 213, 168, 0.25) 0%, rgba(24, 213, 168, 0) 52%),\n  linear-gradient(135deg, rgba(92, 124, 250, 0.45) 0%, rgba(41, 57, 240, 0.1) 55%, rgba(11, 17, 32, 0.55) 100%);`;
    case 'cool-mist':
      return `background-color: ${bgColor};\nbackground-image:\n  radial-gradient(circle at 88% 14%, rgba(41, 57, 240, 0.1) 0%, rgba(41, 57, 240, 0) 55%),\n  radial-gradient(circle at 12% 88%, rgba(24, 213, 168, 0.14) 0%, rgba(24, 213, 168, 0) 52%);`;
    case 'mint-horizon':
      return `background-color: ${bgColor};\nbackground-image:\n  radial-gradient(circle at 50% 92%, rgba(24, 213, 168, 0.34) 0%, rgba(41, 57, 240, 0.22) 45%, rgba(11, 17, 32, 0) 75%);`;
    case 'navy-grid':
      return `background-color: ${bgColor};\nbackground-image:\n  radial-gradient(circle at 50% 22%, rgba(92, 124, 250, 0.22) 0%, rgba(11, 17, 32, 0) 62%),\n  linear-gradient(to right, rgba(148, 163, 184, 0.09) 1px, transparent 1px),\n  linear-gradient(to bottom, rgba(148, 163, 184, 0.09) 1px, transparent 1px);\nbackground-size: 100% 100%, 72px 72px, 72px 72px;`;
    default:
      return `background-color: ${bgColor};`;
  }
}

function getBackdropPrompt(bgColor: string, style: BackdropStyle): string {
  const styleDesc: Record<BackdropStyle, string> = {
    'midnight-mesh':
      'deep navy (#0B1120) canvas with an atmospheric Electric Indigo (#2939F0, 48% opacity) radial glow in the upper-right and a subtle Mint (#18D5A8, 22% opacity) radial glow in the lower-left',
    'indigo-aura':
      'rich indigo-to-navy diagonal gradient wash (Periwinkle #5C7CFA to Deep Navy #0B1120) accented with a soft Mint (#18D5A8, 25% opacity) radial glow in the lower-right',
    'cool-mist':
      'crisp off-white (#F5F7FB) canvas with whisper-soft Electric Indigo (10% opacity) upper-right and Mint (14% opacity) lower-left ambient radial washes',
    'mint-horizon':
      'deep navy (#0B1120) surface illuminated from the bottom center by a Mint (#18D5A8, 34% opacity) into Electric Indigo (#2939F0, 22% opacity) horizon glow',
    'navy-grid':
      'deep navy (#0B1120) canvas overlaid with a fine 72px architectural hairline grid (rgba(148,163,184,0.09)) and a soft Periwinkle (#5C7CFA, 22% opacity) top-center radial spotlight',
    solid: `clean flat ${bgColor} surface without gradients`,
  };

  return `Use the okarina brand background design for the main landing page of okarina.dev: a full-bleed ${styleDesc[style]} (base ${bgColor}). Pair with crisp Outfit display headings, Plus Jakarta Sans body copy, and Mint (#18D5A8) as a restrained primary accent rule/CTA highlight so foreground content keeps >= 4.5:1 contrast.`;
}

export const InstagramStudio: React.FC<InstagramStudioProps> = ({
  config,
  onChange,
  onSaveDesign,
  exportTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [designName, setDesignName] = useState(config.name || 'Instagram Post');
  const [justSaved, setJustSaved] = useState(false);
  const [copiedType, setCopiedType] = useState<'prompt' | 'css' | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const meta = INSTAGRAM_FORMAT_META[config.format];

  useEffect(() => {
    setDesignName(config.name);
  }, [config.name]);

  // Load uploaded photo DataURL into an HTMLImageElement for crisp canvas rendering
  useEffect(() => {
    if (!config.photoDataUrl) {
      setLoadedImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLoadedImage(img);
    img.src = config.photoDataUrl;
  }, [config.photoDataUrl]);

  // Render live canvas preview
  useEffect(() => {
    const render = () => {
      if (canvasRef.current) {
        renderInstagramToCanvas(canvasRef.current, config, loadedImage);
      }
    };
    render();
    if (document.fonts) {
      document.fonts.ready.then(render);
    }
  }, [config, loadedImage]);

  const update = (patch: Partial<InstagramConfig>) => {
    onChange({ ...config, ...patch });
  };

  const handleExportPng = () => {
    const offscreen = document.createElement('canvas');
    renderInstagramToCanvas(offscreen, config, loadedImage);
    const slug = (designName || config.templateId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    saveCanvasAsPng(
      offscreen,
      `okarina-ig-${config.format}-${slug}.png`
    );
  };

  const prevTrigger = useRef(exportTrigger);
  useEffect(() => {
    if (exportTrigger !== prevTrigger.current) {
      prevTrigger.current = exportTrigger;
      handleExportPng();
    }
  });

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({
          photoDataUrl: reader.result,
          photoZoom: 1,
          photoOffsetX: 0,
          photoOffsetY: 0,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const trimmed = designName.trim() || `${meta.label} Template`;
    onSaveDesign({ ...config, name: trimmed });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[276px_minmax(0,1fr)_330px] gap-0 min-h-[calc(100vh-65px)]">
      {/* Left Rail: Formats, Templates & Photo Upload */}
      <aside className="bg-[#0F172A] border-b lg:border-b-0 lg:border-r border-slate-800 p-5 overflow-y-auto flex flex-col gap-6">
        {/* Format Switcher */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 mb-2.5">
            Instagram Format
          </h2>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
            {(['story', 'post-square', 'post-portrait'] as InstagramFormat[]).map(
              (fmt) => {
                const active = config.format === fmt;
                const item = INSTAGRAM_FORMAT_META[fmt];
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => update({ format: fmt })}
                    className={`py-2 px-1.5 rounded-md text-center transition-colors ${
                      active
                        ? 'bg-[#1E293B] text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-slate-100 font-medium'
                    }`}
                  >
                    <div className="text-xs leading-tight whitespace-nowrap">
                      {fmt === 'story'
                        ? 'Story'
                        : fmt === 'post-square'
                        ? 'Square'
                        : 'Portrait'}
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

        {/* Photo Uploader */}
        <div className="pb-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-400">
              Background Photo
            </h2>
            {config.photoDataUrl && (
              <button
                type="button"
                onClick={() => update({ photoDataUrl: null })}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
            className={`cursor-pointer rounded-xl border border-dashed p-3.5 text-center transition-colors ${
              isDraggingFile
                ? 'border-[#5C7CFA] bg-[#2939F0]/15'
                : 'border-slate-700 hover:border-[#5C7CFA] bg-[#0B1120]'
            }`}
          >
            {config.photoDataUrl ? (
              <div className="flex items-center gap-3 text-left">
                <img
                  src={config.photoDataUrl}
                  alt="Uploaded template background"
                  className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    Custom photo active
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Click or drop to replace
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <ImagePlus className="w-5 h-5 text-[#5C7CFA]" />
                <div className="text-xs font-medium text-slate-200">
                  Upload or drop a photo
                </div>
                <div className="text-[11px] text-slate-500">
                  JPG, PNG, or WebP
                </div>
              </div>
            )}
          </div>

          {config.photoDataUrl && (
            <div className="mt-3.5 space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-300">Photo Zoom</span>
                  <span className="font-mono-tabular text-slate-400">
                    {Math.round(config.photoZoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={2.2}
                  step={0.02}
                  value={config.photoZoom}
                  onChange={(e) =>
                    update({ photoZoom: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] font-medium text-slate-300 mb-1">
                    Pan X
                  </span>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={config.photoOffsetX}
                    onChange={(e) =>
                      update({ photoOffsetX: parseInt(e.target.value, 10) })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-slate-300 mb-1">
                    Pan Y
                  </span>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={config.photoOffsetY}
                    onChange={(e) =>
                      update({ photoOffsetY: parseInt(e.target.value, 10) })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-300">
                    Contrast Scrim
                  </span>
                  <span className="font-mono-tabular text-slate-400">
                    {Math.round(config.scrimOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.02}
                  value={config.scrimOpacity}
                  onChange={(e) =>
                    update({ scrimOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Templates Gallery */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 mb-2.5">
            Templates
          </h2>
          <div className="space-y-1.5">
            {INSTAGRAM_TEMPLATES.map((tpl) => {
              const active = config.templateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() =>
                    update({
                      ...tpl.defaults,
                      name: tpl.name,
                    })
                  }
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#182342] text-white border-[#5C7CFA]'
                      : 'bg-[#0B1120] text-slate-200 border-slate-800 hover:border-slate-700 hover:bg-[#131C31]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{tpl.name}</span>
                    <span
                      className={`text-[10px] font-mono-tabular ${
                        active ? 'text-[#18D5A8]' : 'text-slate-500'
                      }`}
                    >
                      {tpl.recommendedFormat === 'story'
                        ? '9:16'
                        : tpl.recommendedFormat === 'post-square'
                        ? '1:1'
                        : '4:5'}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 leading-snug ${
                      active ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {tpl.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Center Stage: Live Instagram Canvas */}
      <section className="bg-[#080D1A] p-6 lg:p-8 flex flex-col justify-between gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-white flex items-center gap-2">
              {config.format === 'story' ? (
                <Smartphone className="w-4 h-4 text-[#5C7CFA]" />
              ) : (
                <Square className="w-4 h-4 text-[#5C7CFA]" />
              )}
              {meta.label}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="font-mono-tabular">
                {meta.width} × {meta.height} px
              </span>
              <span aria-hidden="true">·</span>
              <span>Native {meta.ratioLabel} Instagram export</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => update({ showSafeZones: !config.showSafeZones })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              config.showSafeZones
                ? 'bg-[#2939F0] text-white border-[#2939F0]'
                : 'bg-[#0F172A] text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {config.showSafeZones ? 'Hide Safe Zones' : 'Instagram Safe Zones'}
          </button>
        </div>

        {/* Canvas Preview Container */}
        <div className="flex-1 min-h-[420px] rounded-xl border border-slate-800 bg-[#0B1120] flex items-center justify-center p-6">
          <div className="relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className={`rounded-xl shadow-md border border-slate-800 w-auto h-auto ${
                config.format === 'story'
                  ? 'max-h-[640px] max-w-full'
                  : 'max-h-[560px] max-w-full'
              }`}
            />

            {/* Optional Instagram UI safe-zone overlay */}
            {config.showSafeZones && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden"
              >
                {config.format === 'story' ? (
                  <>
                    <div className="absolute top-0 inset-x-0 h-[11%] bg-rose-500/15 border-b border-dashed border-rose-400 flex items-end justify-center pb-1">
                      <span className="text-[10px] font-mono-tabular text-rose-100 bg-rose-600/80 px-1.5 py-0.5 rounded">
                        Profile header zone
                      </span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-[12%] bg-rose-500/15 border-t border-dashed border-rose-400 flex items-start justify-center pt-1">
                      <span className="text-[10px] font-mono-tabular text-rose-100 bg-rose-600/80 px-1.5 py-0.5 rounded">
                        Reply & action bar zone
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-[7%] border border-dashed border-[#18D5A8] rounded-md" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Save & Download Bar */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="Template name"
              aria-label="Template name"
              className="flex-1 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
            />
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#18D5A8]" />
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
            onClick={handleExportPng}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download {meta.width}×{meta.height} PNG
          </button>
        </div>
      </section>

      {/* Right Inspector: Copy & Brand Styling */}
      <aside className="bg-[#0F172A] border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto flex flex-col gap-6">
        {/* Copy Editor */}
        <div className="space-y-3 pb-5 border-b border-slate-800">
          <h2 className="text-xs font-semibold text-slate-400">
            Template Copy
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Eyebrow / Label
            </label>
            <input
              type="text"
              value={config.eyebrow}
              onChange={(e) => update({ eyebrow: e.target.value })}
              className="w-full px-3 py-1.5 text-sm text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Headline
            </label>
            <textarea
              rows={2}
              value={config.headline}
              onChange={(e) => update({ headline: e.target.value })}
              className="w-full px-3 py-1.5 text-sm text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Body / Caption
            </label>
            <textarea
              rows={3}
              value={config.body}
              onChange={(e) => update({ body: e.target.value })}
              className="w-full px-3 py-1.5 text-sm text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date / Tag
              </label>
              <input
                type="text"
                value={config.dateLabel}
                onChange={(e) => update({ dateLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Handle
              </label>
              <input
                type="text"
                value={config.footerHandle}
                onChange={(e) => update({ footerHandle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bottom Action Text
            </label>
            <input
              type="text"
              value={config.ctaText}
              onChange={(e) => update({ ctaText: e.target.value })}
              className="w-full px-3 py-1.5 text-xs text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
            />
          </div>
        </div>

        {/* Theme & Backdrop */}
        <div className="space-y-3.5 pb-5 border-b border-slate-800">
          <h2 className="text-xs font-semibold text-slate-400">
            Color Theme & Backdrop
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {IG_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => update(theme.patch)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-800 hover:border-slate-600 bg-[#0B1120] hover:bg-[#131C31] text-left transition-colors"
              >
                <span
                  className="w-4 h-4 rounded-full border border-slate-700 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: theme.bg }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: theme.dot }}
                  />
                </span>
                <span className="text-xs font-medium text-slate-200">
                  {theme.label}
                </span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Backdrop Texture
            </label>
            <select
              value={config.backdropStyle}
              onChange={(e) =>
                update({ backdropStyle: e.target.value as BackdropStyle })
              }
              className="w-full px-3 py-1.5 text-xs text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
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

          <div className="pt-1">
            <span className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Reuse on okarina.dev
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    getBackdropPrompt(config.bgColor, config.backdropStyle)
                  );
                  setCopiedType('prompt');
                  setTimeout(() => setCopiedType(null), 1800);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] hover:bg-slate-800 text-slate-200 transition-colors"
              >
                {copiedType === 'prompt' ? (
                  <Check className="w-3.5 h-3.5 text-[#18D5A8]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedType === 'prompt' ? 'Copied Prompt' : 'Copy Prompt'}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    getBackdropCss(config.bgColor, config.backdropStyle)
                  );
                  setCopiedType('css');
                  setTimeout(() => setCopiedType(null), 1800);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-[#0B1120] hover:bg-slate-800 text-slate-200 transition-colors"
              >
                {copiedType === 'css' ? (
                  <Check className="w-3.5 h-3.5 text-[#18D5A8]" />
                ) : (
                  <Code2 className="w-3.5 h-3.5" />
                )}
                {copiedType === 'css' ? 'Copied CSS' : 'Copy CSS'}
              </button>
            </div>
          </div>
        </div>

        {/* Layout & Lockup */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-400">
            Layout & Branding
          </h2>

          <div>
            <span className="block text-xs font-medium text-slate-300 mb-1.5">
              Logo Lockup
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
              {(['horizontal', 'stacked', 'mark', 'none'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update({ logoVariant: v })}
                  className={`py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                    config.logoVariant === v
                      ? 'bg-[#1E293B] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {v === 'horizontal'
                    ? 'Horiz'
                    : v === 'stacked'
                    ? 'Stack'
                    : v === 'mark'
                    ? 'Mark'
                    : 'Off'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-medium text-slate-300 mb-1.5">
                Text Align
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => update({ textAlign: 'left' })}
                  className={`py-1.5 flex items-center justify-center rounded-md ${
                    config.textAlign === 'left'
                      ? 'bg-[#1E293B] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
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
                      ? 'bg-[#1E293B] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-label="Align center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-300 mb-1.5">
                Logo Position
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
                {(['top', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => update({ logoPosition: pos })}
                    className={`py-1.5 text-[11px] font-medium rounded-md ${
                      config.logoPosition === pos
                        ? 'bg-[#1E293B] text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pos === 'top' ? 'Top' : 'Bottom'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-300">Headline Scale</span>
              <span className="font-mono-tabular text-slate-400">
                {Math.round(config.headlineScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.75}
              max={1.35}
              step={0.02}
              value={config.headlineScale}
              onChange={(e) =>
                update({ headlineScale: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-medium text-slate-300">
              Show Mint Accent Rule
            </label>
            <input
              type="checkbox"
              checked={config.showMintAccent}
              onChange={(e) => update({ showMintAccent: e.target.checked })}
              className="rounded border-slate-600 accent-[#5C7CFA]"
            />
          </div>
        </div>
      </aside>
    </div>
  );
};
