import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Download,
  FileCode2,
  Grid,
  RotateCcw,
} from 'lucide-react';
import {
  BRAND_FORMAT_META,
  BRAND_THEME_PRESETS,
  DEFAULT_BRAND_CONFIG,
} from '../data/brandPresets';
import { BrandAssetFormat, BrandConfig } from '../types/brand';
import {
  downloadSvgString,
  generateBrandAssetSVG,
  renderBrandAssetToCanvas,
} from '../utils/canvasRenderers';
import { saveCanvasAsPng } from '../utils/downloadHelper';
import { ColorField } from './ColorField';

interface BrandEditorProps {
  config: BrandConfig;
  onChange: (next: BrandConfig) => void;
  onSaveVersion: (config: BrandConfig) => void;
  exportTrigger: number;
}

const FORMAT_LIST: BrandAssetFormat[] = [
  'primary',
  'horizontal',
  'mark',
  'app-icon',
  'profile',
  'banner',
  'favicon',
];

export const BrandEditor: React.FC<BrandEditorProps> = ({
  config,
  onChange,
  onSaveVersion,
  exportTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stageBg, setStageBg] = useState<'light' | 'dark' | 'checker'>('dark');
  const [versionName, setVersionName] = useState(config.name || 'Custom Version');
  const [justSaved, setJustSaved] = useState(false);

  const meta = BRAND_FORMAT_META[config.format];

  useEffect(() => {
    setVersionName(config.name);
  }, [config.name]);

  // Render live WYSIWYG preview onto canvas
  useEffect(() => {
    const render = () => {
      if (canvasRef.current) {
        renderBrandAssetToCanvas(canvasRef.current, config);
      }
    };
    render();
    if (document.fonts) {
      document.fonts.ready.then(render);
    }
  }, [config]);

  const handleExportPng = () => {
    const offscreen = document.createElement('canvas');
    renderBrandAssetToCanvas(offscreen, config);
    const slug = (versionName || config.format)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    saveCanvasAsPng(offscreen, `okarina-${config.format}-${slug}.png`);
  };

  const handleExportSvg = () => {
    const svg = generateBrandAssetSVG(config);
    const slug = (versionName || config.format)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    downloadSvgString(svg, `okarina-${config.format}-${slug}.svg`);
  };

  // Respond to top-bar primary export button
  const prevTrigger = useRef(exportTrigger);
  useEffect(() => {
    if (exportTrigger !== prevTrigger.current) {
      prevTrigger.current = exportTrigger;
      handleExportPng();
    }
  });

  const handleSave = () => {
    const trimmed = versionName.trim() || `${meta.label} Custom`;
    onSaveVersion({ ...config, name: trimmed });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const update = (patch: Partial<BrandConfig>) => {
    onChange({ ...config, ...patch });
  };

  const showContainerColor =
    config.format === 'app-icon' ||
    config.format === 'profile' ||
    config.format === 'favicon';

  const showWordmarkControls =
    config.format === 'primary' ||
    config.format === 'horizontal' ||
    config.format === 'banner';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_320px] gap-0 min-h-[calc(100vh-65px)]">
      {/* Left Rail: Format Selector */}
      <aside className="bg-[#0F172A] border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col gap-6">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 mb-3">
            Asset Format
          </h2>
          <div className="flex flex-col gap-1">
            {FORMAT_LIST.map((fmt) => {
              const item = BRAND_FORMAT_META[fmt];
              const active = config.format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => update({ format: fmt })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#182342] text-white border-[#5C7CFA]'
                      : 'text-slate-300 border-transparent hover:bg-[#131C31] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] font-mono-tabular shrink-0 ${
                        active ? 'text-[#18D5A8]' : 'text-slate-500'
                      }`}
                    >
                      {item.width}×{item.height}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-5 border-t border-slate-800">
          <h2 className="text-xs font-semibold text-slate-400 mb-3">
            Brand Presets
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {BRAND_THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => update(preset.values)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-800 hover:border-slate-600 bg-[#0B1120] hover:bg-[#131C31] text-left transition-colors"
              >
                <span
                  className="w-4 h-4 rounded-full border border-slate-700 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: preset.previewBg }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: preset.previewMark }}
                  />
                </span>
                <span className="text-xs font-medium text-slate-200 truncate">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Center Stage: Live Artboard */}
      <section className="bg-[#080D1A] p-6 lg:p-8 flex flex-col justify-between gap-6">
        {/* Stage Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">
              {meta.label}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="font-mono-tabular">
                {meta.width} × {meta.height} px
              </span>
              <span aria-hidden="true">·</span>
              <span>{config.transparentBg ? 'Transparent PNG / SVG' : config.bgColor.toUpperCase()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-[#0F172A] border border-slate-800 rounded-lg">
              {(['light', 'dark', 'checker'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStageBg(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    stageBg === mode
                      ? 'bg-[#1E293B] text-white'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'Grid'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => update({ showSafeZone: !config.showSafeZone })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                config.showSafeZone
                  ? 'bg-[#2939F0] text-white border-[#2939F0]'
                  : 'bg-[#0F172A] text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Guides
            </button>
          </div>
        </div>

        {/* Artboard Preview */}
        <div
          className={`flex-1 min-h-[380px] rounded-xl border border-slate-800 flex items-center justify-center p-6 lg:p-10 transition-colors ${
            stageBg === 'dark'
              ? 'bg-[#0B1120]'
              : stageBg === 'checker'
              ? 'bg-checkerboard-dark'
              : 'bg-white'
          }`}
        >
          <div className="relative max-w-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-[540px] w-auto h-auto rounded-lg shadow-sm border border-slate-800/80 ${
                config.transparentBg ? 'bg-checkerboard-dark' : ''
              }`}
            />
            {config.showSafeZone && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[10%] border border-dashed border-[#18D5A8] rounded-md"
              />
            )}
          </div>
        </div>

        {/* Bottom Export & Save Bar */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Version name (e.g. Q4 Dark Lockup)"
              aria-label="Version name"
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
                  Save Version
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportSvg}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Download SVG
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
          </div>
        </div>
      </section>

      {/* Right Inspector: Controls */}
      <aside className="bg-[#0F172A] border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Customize Version
          </h2>
          <button
            type="button"
            onClick={() =>
              onChange({ ...DEFAULT_BRAND_CONFIG, format: config.format })
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Surface & Background */}
        <div className="space-y-3.5 pb-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Canvas & Surface
            </span>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.transparentBg}
                onChange={(e) => update({ transparentBg: e.target.checked })}
                className="rounded border-slate-600 accent-[#5C7CFA]"
              />
              Transparent
            </label>
          </div>

          <ColorField
            label="Canvas Background"
            value={config.bgColor}
            onChange={(bgColor) => update({ bgColor })}
            disabled={config.transparentBg}
            showSwatches
          />

          {showContainerColor && (
            <ColorField
              label="Icon / Badge Fill"
              value={config.containerColor}
              onChange={(containerColor) => update({ containerColor })}
              showSwatches
            />
          )}
        </div>

        {/* Mark Colors */}
        <div className="space-y-3.5 pb-5 border-b border-slate-800">
          <span className="block text-xs font-semibold text-slate-400">
            Okarina Mark
          </span>
          <ColorField
            label="Mark Fill"
            value={config.markFill}
            onChange={(markFill) => update({ markFill })}
            showSwatches
          />
          <ColorField
            label="Band & Eyes"
            value={config.markDetailColor}
            onChange={(markDetailColor) => update({ markDetailColor })}
          />
          <ColorField
            label="Lashes & Chin Marks"
            value={config.markSubtleDetailColor}
            onChange={(markSubtleDetailColor) =>
              update({ markSubtleDetailColor })
            }
          />
          <ColorField
            label="Top Mouthpiece"
            value={config.mouthpieceColor}
            onChange={(mouthpieceColor) => update({ mouthpieceColor })}
          />
        </div>

        {/* Wordmark & Accent */}
        {showWordmarkControls && (
          <div className="space-y-3.5 pb-5 border-b border-slate-800">
            <span className="block text-xs font-semibold text-slate-400">
              Wordmark & Accent
            </span>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={config.brandText}
                onChange={(e) => update({ brandText: e.target.value })}
                className="w-full px-3 py-1.5 text-sm text-slate-100 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
              />
            </div>

            <ColorField
              label="Wordmark Color"
              value={config.wordmarkColor}
              onChange={(wordmarkColor) => update({ wordmarkColor })}
            />

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-medium text-slate-300">
                Signature Accent Bar
              </label>
              <input
                type="checkbox"
                checked={config.showAccentBar}
                onChange={(e) => update({ showAccentBar: e.target.checked })}
                className="rounded border-slate-600 accent-[#5C7CFA]"
              />
            </div>

            {config.showAccentBar && (
              <ColorField
                label="Accent Bar Color"
                value={config.accentColor}
                onChange={(accentColor) => update({ accentColor })}
              />
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-medium text-slate-300">
                Include Tagline
              </label>
              <input
                type="checkbox"
                checked={config.showTagline}
                onChange={(e) => update({ showTagline: e.target.checked })}
                className="rounded border-slate-600 accent-[#5C7CFA]"
              />
            </div>

            {config.showTagline && (
              <input
                type="text"
                value={config.tagline}
                onChange={(e) => update({ tagline: e.target.value })}
                placeholder="Tagline text"
                className="w-full px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:border-[#5C7CFA]"
              />
            )}
          </div>
        )}

        {/* Geometry Sliders */}
        <div className="space-y-4">
          <span className="block text-xs font-semibold text-slate-400">
            Proportions
          </span>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-300">Mark Scale</span>
              <span className="font-mono-tabular text-slate-400">
                {Math.round(config.markScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.65}
              max={1.3}
              step={0.01}
              value={config.markScale}
              onChange={(e) => update({ markScale: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {showWordmarkControls && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-300">Letter Tracking</span>
                <span className="font-mono-tabular text-slate-400">
                  {config.letterSpacing.toFixed(2)}em
                </span>
              </div>
              <input
                type="range"
                min={-0.04}
                max={0.14}
                step={0.005}
                value={config.letterSpacing}
                onChange={(e) =>
                  update({ letterSpacing: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
          )}

          {(config.format === 'app-icon' || config.format === 'favicon') && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-300">Corner Radius</span>
                <span className="font-mono-tabular text-slate-400">
                  {config.cornerRadius}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={config.cornerRadius}
                onChange={(e) =>
                  update({ cornerRadius: parseInt(e.target.value, 10) })
                }
                className="w-full"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-300">Spacing / Padding</span>
              <span className="font-mono-tabular text-slate-400">
                {Math.round(config.padding * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.7}
              max={1.35}
              step={0.02}
              value={config.padding}
              onChange={(e) => update({ padding: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </aside>
    </div>
  );
};
