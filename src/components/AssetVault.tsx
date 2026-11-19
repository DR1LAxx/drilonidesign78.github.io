import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  BRAND_FORMAT_META,
  INSTAGRAM_FORMAT_META,
  ORIGINAL_ASSETS,
  VIDEO_FORMAT_META,
} from '../data/brandPresets';
import {
  BrandConfig,
  InstagramConfig,
  OriginalAssetItem,
  SavedBrandVersion,
  SavedInstagramDesign,
  SavedVideoDesign,
  VideoConfig,
} from '../types/brand';
import { saveUrlAsFile } from '../utils/downloadHelper';
import { OkarinaMark } from './OkarinaMark';

interface AssetVaultProps {
  savedBrandVersions: SavedBrandVersion[];
  savedInstagramDesigns: SavedInstagramDesign[];
  savedVideoDesigns: SavedVideoDesign[];
  onEditBrandPreset: (preset: Partial<BrandConfig>) => void;
  onEditInstagramDesign: (design: InstagramConfig) => void;
  onEditVideoDesign: (design: VideoConfig) => void;
  onDeleteBrandVersion: (id: string) => void;
  onDeleteInstagramDesign: (id: string) => void;
  onDeleteVideoDesign: (id: string) => void;
}

type VaultFilter =
  | 'all'
  | 'lockups'
  | 'marks'
  | 'icons'
  | 'social'
  | 'saved';

export const AssetVault: React.FC<AssetVaultProps> = ({
  savedBrandVersions,
  savedInstagramDesigns,
  savedVideoDesigns,
  onEditBrandPreset,
  onEditInstagramDesign,
  onEditVideoDesign,
  onDeleteBrandVersion,
  onDeleteInstagramDesign,
  onDeleteVideoDesign,
}) => {
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [selectedAsset, setSelectedAsset] = useState<OriginalAssetItem | null>(
    null
  );
  const [inspectBg, setInspectBg] = useState<'checker' | 'light' | 'dark'>(
    'checker'
  );

  const savedTotal =
    savedBrandVersions.length +
    savedInstagramDesigns.length +
    savedVideoDesigns.length;

  const visibleOriginals =
    filter === 'all'
      ? ORIGINAL_ASSETS
      : filter === 'saved'
      ? []
      : ORIGINAL_ASSETS.filter((a) => a.category === filter);

  const triggerDownload = (path: string, filename: string) => {
    saveUrlAsFile(path, filename);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">
            Asset Vault
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            All 18 original okarina source files and your saved custom editions.
            Click any asset to inspect or open it in the editor.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0F172A] border border-slate-800 rounded-lg self-start">
          {(
            [
              { id: 'all', label: `All Originals (${ORIGINAL_ASSETS.length})` },
              { id: 'lockups', label: 'Lockups' },
              { id: 'marks', label: 'Marks' },
              { id: 'icons', label: 'Icons' },
              { id: 'social', label: 'Profiles & Banner' },
              { id: 'saved', label: `Saved (${savedTotal})` },
            ] as { id: VaultFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Versions View */}
      {filter === 'saved' ? (
        <div className="mt-8 space-y-10">
          {savedTotal === 0 ? (
            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-12 text-center">
              <p className="font-display text-lg font-semibold text-white">
                No saved versions yet
              </p>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                Customize any okarina logo in the Brand Editor or build a
                template in Instagram Studio, then click Save to store it here.
              </p>
            </div>
          ) : (
            <>
              {savedBrandVersions.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    Saved Brand Versions ({savedBrandVersions.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedBrandVersions.map((ver) => {
                      const fmt = BRAND_FORMAT_META[ver.format];
                      return (
                        <div
                          key={ver.id}
                          className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div
                            className={`h-44 flex items-center justify-center p-6 ${
                              ver.transparentBg ? 'bg-checkerboard-dark' : ''
                            }`}
                            style={{
                              backgroundColor: ver.transparentBg
                                ? undefined
                                : ver.bgColor,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <OkarinaMark
                                fill={ver.markFill}
                                detailColor={ver.markDetailColor}
                                subtleDetailColor={ver.markSubtleDetailColor}
                                mouthpieceColor={ver.mouthpieceColor}
                                className="h-16 w-auto"
                              />
                              {(ver.format === 'primary' ||
                                ver.format === 'horizontal' ||
                                ver.format === 'banner') && (
                                <span
                                  className="font-display text-2xl font-medium"
                                  style={{ color: ver.wordmarkColor }}
                                >
                                  {ver.brandText}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-800">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate">
                                {ver.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {fmt.label} · {ver.savedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onEditBrandPreset(ver)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteBrandVersion(ver.id)}
                                aria-label={`Delete ${ver.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {savedInstagramDesigns.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    Saved Instagram Templates ({savedInstagramDesigns.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedInstagramDesigns.map((des) => {
                      const fmt = INSTAGRAM_FORMAT_META[des.format];
                      return (
                        <div
                          key={des.id}
                          className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div
                            className="h-44 p-5 flex flex-col justify-between"
                            style={{
                              backgroundColor: des.bgColor,
                              color: des.textColor,
                            }}
                          >
                            <span
                              className="text-[11px] font-mono-tabular opacity-80"
                              style={{ color: des.accentColor }}
                            >
                              {des.eyebrow || fmt.label}
                            </span>
                            <p className="font-display text-lg font-semibold leading-snug line-clamp-2">
                              {des.headline}
                            </p>
                            <span className="text-xs opacity-70">
                              {des.footerHandle} · {fmt.ratioLabel}
                            </span>
                          </div>
                          <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-800">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate">
                                {des.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {fmt.label} · {des.savedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onEditInstagramDesign(des)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteInstagramDesign(des.id)}
                                aria-label={`Delete ${des.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {savedVideoDesigns.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-200 mb-4">
                    Saved Video Projects ({savedVideoDesigns.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedVideoDesigns.map((vid) => {
                      const fmt = VIDEO_FORMAT_META[vid.format];
                      return (
                        <div
                          key={vid.id}
                          className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div
                            className="h-44 p-5 flex flex-col justify-between"
                            style={{
                              backgroundColor: vid.bgColor,
                              color: vid.textColor,
                            }}
                          >
                            <span
                              className="text-[11px] font-mono-tabular opacity-85"
                              style={{ color: vid.accentColor }}
                            >
                              {vid.eyebrow || fmt.label} · {vid.durationSec}s
                            </span>
                            <p className="font-display text-lg font-semibold leading-snug line-clamp-2">
                              {vid.headline}
                            </p>
                            <span className="text-xs opacity-70">
                              {vid.footerHandle} · {fmt.ratioLabel}
                            </span>
                          </div>
                          <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-800">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate">
                                {vid.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {fmt.label} · {vid.savedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onEditVideoDesign(vid)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteVideoDesign(vid.id)}
                                aria-label={`Delete ${vid.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Originals Grid */
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleOriginals.map((asset) => {
            const tileBg =
              asset.theme === 'transparent'
                ? 'bg-checkerboard-dark'
                : asset.theme === 'dark'
                ? 'bg-[#080D1A]'
                : asset.theme === 'indigo'
                ? 'bg-[#1B2544]'
                : 'bg-[#E9EEF8]';

            return (
              <article
                key={asset.id}
                className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden flex flex-col transition-colors hover:border-slate-700"
              >
                <button
                  type="button"
                  onClick={() => setSelectedAsset(asset)}
                  className={`h-52 w-full flex items-center justify-center p-6 ${tileBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFA]`}
                >
                  <img
                    src={asset.path}
                    alt={asset.title}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </button>

                <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-800">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {asset.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {asset.dimensionsLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditBrandPreset(asset.editorPreset)}
                      title="Edit this version in Brand Editor"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        triggerDownload(asset.path, `${asset.id}.png`)
                      }
                      title="Download original PNG"
                      aria-label={`Download ${asset.title}`}
                      className="p-1.5 text-slate-300 hover:text-white border border-slate-700 bg-[#0B1120] rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Inspecting Original Asset */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="bg-[#0F172A] rounded-2xl max-w-3xl w-full overflow-hidden border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {selectedAsset.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedAsset.dimensionsLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-[#0B1120] border border-slate-800 rounded-lg">
                  {(['checker', 'light', 'dark'] as const).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setInspectBg(bg)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                        inspectBg === bg
                          ? 'bg-[#1E293B] text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {bg === 'checker'
                        ? 'Grid'
                        : bg === 'light'
                        ? 'Light'
                        : 'Dark'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  aria-label="Close preview"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`h-[380px] flex items-center justify-center p-8 ${
                inspectBg === 'checker'
                  ? 'bg-checkerboard-dark'
                  : inspectBg === 'dark'
                  ? 'bg-[#080D1A]'
                  : 'bg-[#F5F7FB]'
              }`}
            >
              <img
                src={selectedAsset.path}
                alt={selectedAsset.title}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0F172A]">
              <span className="text-xs font-mono-tabular text-slate-400">
                Original source asset
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      selectedAsset.path,
                      `${selectedAsset.id}.png`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Original PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEditBrandPreset(selectedAsset.editorPreset);
                    setSelectedAsset(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Edit Version in Brand Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
