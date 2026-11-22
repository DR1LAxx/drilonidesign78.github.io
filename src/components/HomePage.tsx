import React from 'react';
import {
  Archive,
  ArrowRight,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Layers,
  PenTool,
  Smartphone,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { WorkspaceTab } from '../types/brand';
import { OkarinaMark } from './OkarinaMark';

interface HomePageProps {
  savedCount: number;
  onNavigate: (tab: WorkspaceTab) => void;
}

const STUDIO_WORKSPACES: {
  id: Exclude<WorkspaceTab, 'home'>;
  title: string;
  spec: string;
  summary: string;
  highlights: string[];
  ctaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'instagram',
    title: 'Instagram Studio',
    spec: '1080×1920 · 1080×1080 · 1080×1350',
    summary:
      'Generate crisp Instagram Story, Square, and Portrait graphics around the okarina visual system—with your own photos, safe-zone overlays, and copyable okarina.dev backdrop CSS.',
    highlights: ['8 ready-to-edit brand templates', 'Story profile & action-bar safe zones', 'Photo zoom, pan, and contrast scrim'],
    ctaLabel: 'Open Instagram Studio',
    icon: ImageIcon,
  },
  {
    id: 'video',
    title: 'Video Studio',
    spec: '9:16 Reel · 1:1 · 4:5 · 16:9',
    summary:
      'Render animated motion teasers, kinetic typography, and Ken Burns photo reels synced to built-in royalty-free music, live CC0 web audio, or your own uploaded tracks.',
    highlights: ['5 motion templates + audio spectrum bars', '18 built-in royalty-free tracks + CC0 search', 'Layered SFX intro, mid, and outro cues'],
    ctaLabel: 'Open Video Studio',
    icon: Film,
  },
  {
    id: 'sfx',
    title: 'Sound Effects',
    spec: 'Mixkit Live · 24 Studio Pads · CC0',
    summary:
      'Browse and audition royalty-free sound effects sourced live from mixkit.co/free-sound-effects alongside 24 synthesized studio pads, pitch tuning, and one-click WAV/MP3 export.',
    highlights: ['Live Mixkit search & category filtering', 'Real-time waveform & ±12 semitone pitch shift', 'Send any SFX cue straight to Video Studio'],
    ctaLabel: 'Browse Sound Effects',
    icon: Volume2,
  },
  {
    id: 'editor',
    title: 'Brand Editor',
    spec: 'PNG & Vector SVG Export',
    summary:
      'Customize official okarina logos, app icons, profile badges, social banners, and favicons—adjusting colors, mark geometry, spacing, and typography with instant preview.',
    highlights: ['7 official okarina format templates', 'Light, dark, and grid stage contrast checks', 'Save custom versions directly to the Vault'],
    ctaLabel: 'Open Brand Editor',
    icon: PenTool,
  },
  {
    id: 'vault',
    title: 'Asset Vault',
    spec: '18 Official PNGs + Saved Projects',
    summary:
      'Access the complete original okarina brand kit alongside every custom logo version, Instagram graphic, and video project saved in your browser.',
    highlights: ['Inspect lockups, marks, icons & banners', 'Reload any original or saved preset to edit', 'One-tap desktop or mobile download'],
    ctaLabel: 'Open Asset Vault',
    icon: Archive,
  },
];

const BRAND_SHOWCASE = [
  {
    title: 'Primary Dark Lockup',
    src: '/assets/aistudio/Primary___dark_c4b81212.png',
    bg: 'bg-[#0B1120]',
    target: 'editor' as WorkspaceTab,
  },
  {
    title: 'Indigo App Icon',
    src: '/assets/aistudio/App_icon___indigo_91a9f20c.png',
    bg: 'bg-[#0B1120]',
    target: 'editor' as WorkspaceTab,
  },
  {
    title: 'Social Banner',
    src: '/assets/aistudio/Social_banner_80041671.png',
    bg: 'bg-[#0B1120]',
    target: 'instagram' as WorkspaceTab,
  },
  {
    title: 'Navy Profile Badge',
    src: '/assets/aistudio/Profile_picture___navy_86eeeda1.png',
    bg: 'bg-[#0B1120]',
    target: 'vault' as WorkspaceTab,
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  savedCount,
  onNavigate,
}) => {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12">
      {/* Hero Banner explaining site purpose */}
      <section
        className="relative overflow-hidden rounded-2xl border border-slate-800 p-6 sm:p-10 lg:p-12"
        style={{
          backgroundColor: '#0B1120',
          backgroundImage:
            'radial-gradient(circle at 84% 18%, rgba(41, 57, 240, 0.36) 0%, rgba(41, 57, 240, 0) 56%), radial-gradient(circle at 12% 88%, rgba(24, 213, 168, 0.16) 0%, rgba(24, 213, 168, 0) 50%)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] gap-8 lg:gap-12 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tabular text-[#18D5A8]">
              <span className="w-2 h-2 rounded-full bg-[#18D5A8]" />
              <span>okarina.dev · Official Brand & Media Studio</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-white leading-[1.12]">
              One workspace to create, edit, and export everything for okarina.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              <strong className="font-semibold text-white">okarina Brand Studio</strong> is built to keep{' '}
              <a
                href="https://okarina.dev"
                target="_blank"
                rel="noreferrer"
                className="text-[#5C7CFA] hover:underline font-medium inline-flex items-center gap-1"
              >
                okarina.dev
                <ExternalLink className="w-3.5 h-3.5" />
              </a>{' '}
              visually and sonically consistent without opening heavy external editors. Customize brand marks, build ready-to-post Instagram templates, render music-synced videos, source Mixkit sound effects, and export cleanly on desktop or phone.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('instagram')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
              >
                Open Instagram Studio
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('editor')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-700 bg-[#0F172A]/80 text-slate-100 hover:bg-slate-800 transition-colors"
              >
                Customize Brand Kit
              </button>

              <button
                type="button"
                onClick={() => onNavigate('vault')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Asset Vault
                <span className="font-mono-tabular text-xs text-slate-400">
                  ({18 + savedCount})
                </span>
              </button>
            </div>
          </div>

          {/* Right Showcase Panel */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <OkarinaMark
                  fill="#5C7CFA"
                  detailColor="#0B1120"
                  subtleDetailColor="#1E294B"
                  mouthpieceColor="#0B1120"
                  className="h-7 w-auto"
                />
                <div>
                  <div className="font-display text-sm font-semibold text-white">
                    Brand System Active
                  </div>
                  <div className="text-[11px] font-mono-tabular text-slate-400">
                    #2939F0 · #5C7CFA · #18D5A8 · #0B1120
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#18D5A8]">
                v1.0
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {BRAND_SHOWCASE.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className="group text-left rounded-xl border border-slate-800 bg-[#0B1120] hover:border-[#5C7CFA]/60 overflow-hidden transition-colors"
                >
                  <div className="h-24 p-3 flex items-center justify-center bg-[#080D1A]">
                    <img
                      src={item.src}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  </div>
                  <div className="px-2.5 py-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-slate-200 truncate">
                      {item.title}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-[#5C7CFA] shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why This Website Exists + 5 Studios */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-white">
              What you can build here
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Each studio shares the same okarina typography, mark proportions, and palette tokens—pick a workspace to begin.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-slate-400">
            5 Integrated Workspaces
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STUDIO_WORKSPACES.map((ws) => {
            const Icon = ws.icon;
            return (
              <div
                key={ws.id}
                className="bg-[#0F172A] border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-5 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#182342] border border-[#5C7CFA]/30 text-[#5C7CFA] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono-tabular text-slate-400 text-right">
                      {ws.spec}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {ws.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                      {ws.summary}
                    </p>
                  </div>

                  <ul className="space-y-1.5 pt-1">
                    {ws.highlights.map((point) => (
                      <li
                        key={point}
                        className="text-xs text-slate-400 flex items-start gap-2"
                      >
                        <span
                          aria-hidden="true"
                          className="w-1.5 h-1.5 rounded-full bg-[#18D5A8] mt-1.5 shrink-0"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(ws.id)}
                  className="w-full inline-flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-[#0B1120] border border-slate-800 text-slate-100 hover:border-[#5C7CFA] hover:bg-[#182342] transition-colors"
                >
                  <span>{ws.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#5C7CFA]" />
                </button>
              </div>
            );
          })}

          {/* Purpose & Export Reliability Card filling the 6th grid slot cleanly */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#18D5A8]/15 border border-[#18D5A8]/30 text-[#18D5A8] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono-tabular text-[#18D5A8]">
                  Built by okarina.dev
                </span>
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Why this studio exists
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Instead of rebuilding social templates, hunting for non-copyrighted audio, or guessing hex codes every time you ship an update, everything lives in one fast browser studio—ready to save or share straight from your phone.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#5C7CFA] shrink-0" />
                  <span>Browser-saved project versions in Asset Vault</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-[#5C7CFA] shrink-0" />
                  <span>Phone share-sheet & instant download tray</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-[#5C7CFA] shrink-0" />
                  <span>Clean PNG, SVG, WAV, MP3 & MP4/WebM exports</span>
                </div>
              </div>
            </div>

            <a
              href="https://okarina.dev"
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors"
            >
              <span>Visit okarina.dev</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
