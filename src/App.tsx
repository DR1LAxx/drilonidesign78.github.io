import React, { useEffect, useState } from 'react';
import { Archive, Download, Film, Home, Image as ImageIcon, Menu, PenTool, Volume2, X } from 'lucide-react';
import { AssetVault } from './components/AssetVault';
import { BrandEditor } from './components/BrandEditor';
import { DownloadTray } from './components/DownloadTray';
import { HomePage } from './components/HomePage';
import { InstagramStudio } from './components/InstagramStudio';
import { OkarinaMark } from './components/OkarinaMark';
import {
  SoundEffectsStudio,
  VideoSfxSelection,
} from './components/SoundEffectsStudio';
import { VideoStudio } from './components/VideoStudio';
import {
  DEFAULT_BRAND_CONFIG,
  DEFAULT_INSTAGRAM_CONFIG,
  DEFAULT_VIDEO_CONFIG,
} from './data/brandPresets';
import {
  BrandConfig,
  InstagramConfig,
  SavedBrandVersion,
  SavedInstagramDesign,
  SavedVideoDesign,
  VideoConfig,
  WorkspaceTab,
} from './types/brand';

const BRAND_STORAGE_KEY = 'okarina_saved_brand_versions_v1';
const IG_STORAGE_KEY = 'okarina_saved_ig_designs_v1';
const VIDEO_STORAGE_KEY = 'okarina_saved_video_designs_v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(
    DEFAULT_BRAND_CONFIG
  );
  const [instagramConfig, setInstagramConfig] = useState<InstagramConfig>(
    DEFAULT_INSTAGRAM_CONFIG
  );
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(
    DEFAULT_VIDEO_CONFIG
  );

  const [savedBrandVersions, setSavedBrandVersions] = useState<
    SavedBrandVersion[]
  >(() => loadFromStorage<SavedBrandVersion[]>(BRAND_STORAGE_KEY, []));
  const [savedInstagramDesigns, setSavedInstagramDesigns] = useState<
    SavedInstagramDesign[]
  >(() => loadFromStorage<SavedInstagramDesign[]>(IG_STORAGE_KEY, []));
  const [savedVideoDesigns, setSavedVideoDesigns] = useState<
    SavedVideoDesign[]
  >(() => loadFromStorage<SavedVideoDesign[]>(VIDEO_STORAGE_KEY, []));

  const [brandExportTrigger, setBrandExportTrigger] = useState(0);
  const [igExportTrigger, setIgExportTrigger] = useState(0);
  const [videoExportTrigger, setVideoExportTrigger] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(
        BRAND_STORAGE_KEY,
        JSON.stringify(savedBrandVersions)
      );
    } catch {
      // Ignore quota errors
    }
  }, [savedBrandVersions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        IG_STORAGE_KEY,
        JSON.stringify(savedInstagramDesigns)
      );
    } catch {
      // Ignore quota errors
    }
  }, [savedInstagramDesigns]);

  useEffect(() => {
    try {
      localStorage.setItem(
        VIDEO_STORAGE_KEY,
        JSON.stringify(savedVideoDesigns)
      );
    } catch {
      // Ignore quota errors
    }
  }, [savedVideoDesigns]);

  const handleSaveBrandVersion = (cfg: BrandConfig) => {
    const entry: SavedBrandVersion = {
      ...cfg,
      id: `bv-${Date.now()}`,
      savedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    };
    setSavedBrandVersions((prev) => [entry, ...prev]);
  };

  const handleSaveInstagramDesign = (cfg: InstagramConfig) => {
    const entry: SavedInstagramDesign = {
      ...cfg,
      id: `ig-${Date.now()}`,
      savedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    };
    setSavedInstagramDesigns((prev) => [entry, ...prev]);
  };

  const handleSaveVideoDesign = (cfg: VideoConfig) => {
    const entry: SavedVideoDesign = {
      ...cfg,
      id: `vid-${Date.now()}`,
      savedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    };
    setSavedVideoDesigns((prev) => [entry, ...prev]);
  };

  const handleEditBrandPreset = (preset: Partial<BrandConfig>) => {
    setBrandConfig((prev) => ({
      ...DEFAULT_BRAND_CONFIG,
      ...prev,
      ...preset,
    }));
    setActiveTab('editor');
  };

  const handleEditInstagramDesign = (design: InstagramConfig) => {
    setInstagramConfig(design);
    setActiveTab('instagram');
  };

  const handleEditVideoDesign = (design: VideoConfig) => {
    setVideoConfig({ ...DEFAULT_VIDEO_CONFIG, ...design });
    setActiveTab('video');
  };

  const handleSendSfxToVideo = (selection: VideoSfxSelection) => {
    if (selection.kind === 'mixkit') {
      setVideoConfig((prev) => ({
        ...prev,
        sfxId: 'mixkit',
        sfxCustomUrl: selection.audioUrl,
        sfxCustomTitle: selection.title,
        sfxTiming: selection.timing,
      }));
    } else {
      setVideoConfig((prev) => ({
        ...prev,
        sfxId: selection.sfxId,
        sfxTiming: selection.timing,
      }));
    }
    setActiveTab('video');
  };

  const handlePrimaryAction = () => {
    if (activeTab === 'editor') {
      setBrandExportTrigger((n) => n + 1);
    } else if (activeTab === 'instagram') {
      setIgExportTrigger((n) => n + 1);
    } else if (activeTab === 'video') {
      setVideoExportTrigger((n) => n + 1);
    } else if (activeTab === 'sfx') {
      setActiveTab('video');
    } else {
      setActiveTab('instagram');
    }
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'instagram', label: 'Instagram Studio', icon: ImageIcon },
    { id: 'video', label: 'Video Studio', icon: Film },
    { id: 'sfx', label: 'Sound Effects', icon: Volume2 },
    { id: 'editor', label: 'Brand Editor', icon: PenTool },
    { id: 'vault', label: 'Asset Vault', icon: Archive },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#080D1A] text-slate-50">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-30 h-16 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFA] rounded-md"
        >
          <OkarinaMark
            fill="#5C7CFA"
            detailColor="#0B1120"
            subtleDetailColor="#1E294B"
            mouthpieceColor="#0B1120"
            className="h-7 w-auto"
          />
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            okarina
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links (Desktop / Tablet) */}
        <nav
          aria-label="Primary workspaces"
          className="hidden md:flex items-center gap-6 lg:gap-8 h-full overflow-x-auto"
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative h-full inline-flex items-center text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-[#5C7CFA]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action + Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {activeTab === 'home' || activeTab === 'vault'
              ? 'New Instagram Post'
              : activeTab === 'video'
              ? 'Export Video'
              : activeTab === 'sfx'
              ? 'Open Video Studio'
              : 'Export PNG'}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-workspace-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700 bg-[#0B1120] text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-4.5 h-4.5" />
            ) : (
              <Menu className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Hamburger Menu Overlay & Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 top-16 z-30 bg-black/60 backdrop-blur-xs"
          />
          <nav
            id="mobile-workspace-menu"
            aria-label="Mobile navigation"
            className="md:hidden fixed inset-x-0 top-16 z-40 bg-[#0F172A] border-b border-slate-800 shadow-2xl px-4 py-3"
          >
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-[#182342] text-white border-[#5C7CFA]'
                        : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:bg-[#131C31] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-[#5C7CFA]' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full bg-[#18D5A8]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}

      {/* Main Active Workspace */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomePage
            savedCount={
              savedBrandVersions.length +
              savedInstagramDesigns.length +
              savedVideoDesigns.length
            }
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'editor' && (
          <BrandEditor
            config={brandConfig}
            onChange={setBrandConfig}
            onSaveVersion={handleSaveBrandVersion}
            exportTrigger={brandExportTrigger}
          />
        )}

        {activeTab === 'instagram' && (
          <InstagramStudio
            config={instagramConfig}
            onChange={setInstagramConfig}
            onSaveDesign={handleSaveInstagramDesign}
            exportTrigger={igExportTrigger}
          />
        )}

        {activeTab === 'video' && (
          <VideoStudio
            config={videoConfig}
            onChange={setVideoConfig}
            onSaveDesign={handleSaveVideoDesign}
            exportTrigger={videoExportTrigger}
            onOpenSfxStudio={() => setActiveTab('sfx')}
          />
        )}

        {activeTab === 'sfx' && (
          <SoundEffectsStudio
            activeVideoSfxId={videoConfig.sfxId ?? 'none'}
            activeVideoSfxUrl={videoConfig.sfxCustomUrl}
            onSendToVideo={handleSendSfxToVideo}
          />
        )}

        {activeTab === 'vault' && (
          <AssetVault
            savedBrandVersions={savedBrandVersions}
            savedInstagramDesigns={savedInstagramDesigns}
            savedVideoDesigns={savedVideoDesigns}
            onEditBrandPreset={handleEditBrandPreset}
            onEditInstagramDesign={handleEditInstagramDesign}
            onEditVideoDesign={handleEditVideoDesign}
            onDeleteBrandVersion={(id) =>
              setSavedBrandVersions((prev) => prev.filter((v) => v.id !== id))
            }
            onDeleteInstagramDesign={(id) =>
              setSavedInstagramDesigns((prev) =>
                prev.filter((d) => d.id !== id)
              )
            }
            onDeleteVideoDesign={(id) =>
              setSavedVideoDesigns((prev) => prev.filter((v) => v.id !== id))
            }
          />
        )}
      </main>

      <DownloadTray />
    </div>
  );
}

export default App;
