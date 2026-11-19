import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { AssetVault } from './components/AssetVault';
import { BrandEditor } from './components/BrandEditor';
import { InstagramStudio } from './components/InstagramStudio';
import { OkarinaMark } from './components/OkarinaMark';
import { SoundEffectsStudio } from './components/SoundEffectsStudio';
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
  SfxId,
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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
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

  const handleSendSfxToVideo = (
    sfxId: SfxId,
    sfxTiming: 'intro' | 'mid' | 'outro'
  ) => {
    setVideoConfig((prev) => ({
      ...prev,
      sfxId,
      sfxTiming,
    }));
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

  const navItems: { id: WorkspaceTab; label: string }[] = [
    { id: 'editor', label: 'Brand Editor' },
    { id: 'instagram', label: 'Instagram Studio' },
    { id: 'video', label: 'Video Studio' },
    { id: 'sfx', label: 'Sound Effects' },
    { id: 'vault', label: 'Asset Vault' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FC] text-[#0B1120]">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2939F0] rounded-md"
        >
          <OkarinaMark
            fill="#2939F0"
            detailColor="#FFFFFF"
            subtleDetailColor="#B8C4FF"
            mouthpieceColor="#0B1120"
            className="h-7 w-auto"
          />
          <span className="font-display text-xl font-semibold tracking-tight text-[#0B1120]">
            okarina
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary workspaces"
          className="flex items-center gap-6 sm:gap-8 h-full overflow-x-auto"
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
                    ? 'text-[#0B1120]'
                    : 'text-slate-500 hover:text-[#0B1120]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-[#2939F0]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {activeTab === 'vault'
              ? 'New Instagram Post'
              : activeTab === 'video'
              ? 'Export Video'
              : activeTab === 'sfx'
              ? 'Open Video Studio'
              : 'Export PNG'}
          </button>
        </div>
      </header>

      {/* Main Active Workspace */}
      <main className="flex-1">
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
    </div>
  );
}

export default App;
