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
} from '../data/brandPresets';
import {
  BrandConfig,
  InstagramConfig,
  OriginalAssetItem,
  SavedBrandVersion,
  SavedInstagramDesign,
} from '../types/brand';
import { OkarinaMark } from './OkarinaMark';

interface AssetVaultProps {
  savedBrandVersions: SavedBrandVersion[];
  savedInstagramDesigns: SavedInstagramDesign[];
  onEditBrandPreset: (preset: Partial<BrandConfig>) => void;
  onEditInstagramDesign: (design: InstagramConfig) => void;
  onDeleteBrandVersion: (id: string) => void;
  onDeleteInstagramDesign: (id: string) => void;
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
  onEditBrandPreset,
  onEditInstagramDesign,
  onDeleteBrandVersion,
  onDeleteInstagramDesign,
}) => {
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [selectedAsset, setSelectedAsset] = useState<OriginalAssetItem | null>(
    null
  );
  const [inspectBg, setInspectBg] = useState<'checker' | 'light' | 'dark'>(
    'checker'
  );

  const savedTotal = savedBrandVersions.length + savedInstagramDesigns.length;

  const visibleOriginals =
    filter === 'all'
      ? ORIGINAL_ASSETS
      : filter === 'saved'
      ? []
      : ORIGINAL_ASSETS.filter((a) => a.category === filter);

  const triggerDownload = (path: string, filename: string) => {
    const a = document.createElement('a');
    a.href = path;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-6 py-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#0B1120]">
            Asset Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All 18 original okarina source files and your saved custom editions.
            Click any asset to inspect or open it in the editor.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
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
                  ? 'bg-white text-[#0B1120] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="font-display text-lg font-semibold text-[#0B1120]">
                No saved versions yet
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Customize any okarina logo in the Brand Editor or build a
                template in Instagram Studio, then click Save to store it here.
              </p>
            </div>
          ) : (
            <>
              {savedBrandVersions.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-[#0B1120] mb-4">
                    Saved Brand Versions ({savedBrandVersions.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedBrandVersions.map((ver) => {
                      const fmt = BRAND_FORMAT_META[ver.format];
                      return (
                        <div
                          key={ver.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                        >
                          <div
                            className={`h-44 flex items-center justify-center p-6 ${
                              ver.transparentBg ? 'bg-checkerboard' : ''
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
                          <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-100">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-[#0B1120] truncate">
                                {ver.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {fmt.label} · {ver.savedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onEditBrandPreset(ver)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#0B1120] text-white hover:bg-slate-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteBrandVersion(ver.id)}
                                aria-label={`Delete ${ver.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
                  <h2 className="text-sm font-semibold text-[#0B1120] mb-4">
                    Saved Instagram Templates ({savedInstagramDesigns.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedInstagramDesigns.map((des) => {
                      const fmt = INSTAGRAM_FORMAT_META[des.format];
                      return (
                        <div
                          key={des.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
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
                          <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-100">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-[#0B1120] truncate">
                                {des.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
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
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
                ? 'bg-checkerboard'
                : asset.theme === 'dark'
                ? 'bg-[#0B1120]'
                : asset.theme === 'indigo'
                ? 'bg-[#E6EAF2]'
                : 'bg-[#F5F7FB]';

            return (
              <article
                key={asset.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-colors hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => setSelectedAsset(asset)}
                  className={`h-52 w-full flex items-center justify-center p-6 ${tileBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2939F0]`}
                >
                  <img
                    src={asset.path}
                    alt={asset.title}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </button>

                <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-100">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#0B1120] truncate">
                      {asset.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {asset.dimensionsLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditBrandPreset(asset.editorPreset)}
                      title="Edit this version in Brand Editor"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#0B1120] text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
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
                      className="p-1.5 text-slate-600 hover:text-[#0B1120] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
          className="fixed inset-0 z-50 bg-[#0B1120]/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#0B1120]">
                  {selectedAsset.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAsset.dimensionsLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                  {(['checker', 'light', 'dark'] as const).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setInspectBg(bg)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                        inspectBg === bg
                          ? 'bg-white text-[#0B1120] shadow-xs'
                          : 'text-slate-600'
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
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`h-[380px] flex items-center justify-center p-8 ${
                inspectBg === 'checker'
                  ? 'bg-checkerboard'
                  : inspectBg === 'dark'
                  ? 'bg-[#0B1120]'
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

            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors"
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
