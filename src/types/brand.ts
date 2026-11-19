export type WorkspaceTab = 'editor' | 'instagram' | 'video' | 'vault';

export type BrandAssetFormat =
  | 'primary'
  | 'horizontal'
  | 'mark'
  | 'app-icon'
  | 'profile'
  | 'banner'
  | 'favicon';

export interface BrandConfig {
  id?: string;
  name: string;
  format: BrandAssetFormat;
  brandText: string;
  tagline: string;
  showTagline: boolean;
  bgColor: string;
  transparentBg: boolean;
  containerColor: string;
  markFill: string;
  markDetailColor: string;
  markSubtleDetailColor: string;
  mouthpieceColor: string;
  wordmarkColor: string;
  accentColor: string;
  showAccentBar: boolean;
  markScale: number; // 0.6 to 1.35
  letterSpacing: number; // -0.04 to 0.14 em
  cornerRadius: number; // 0 to 50 (% for app icon)
  padding: number; // 0.6 to 1.4 multiplier
  showSafeZone: boolean;
}

export interface SavedBrandVersion extends BrandConfig {
  id: string;
  savedAt: string;
}

export type InstagramFormat = 'story' | 'post-square' | 'post-portrait';

export type InstagramTemplateId =
  | 'editorial-photo'
  | 'launch-poster'
  | 'quote-card'
  | 'product-spotlight'
  | 'event-drop'
  | 'minimal-mark'
  | 'polaroid-frame'
  | 'studio-note';

export type BackdropStyle =
  | 'midnight-mesh'
  | 'indigo-aura'
  | 'cool-mist'
  | 'mint-horizon'
  | 'navy-grid'
  | 'solid';

export interface InstagramConfig {
  id?: string;
  name: string;
  format: InstagramFormat;
  templateId: InstagramTemplateId;
  eyebrow: string;
  headline: string;
  body: string;
  footerHandle: string;
  dateLabel: string;
  ctaText: string;
  // Styling
  bgColor: string;
  backdropStyle: BackdropStyle;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  markFill: string;
  markDetailColor: string;
  markSubtleDetailColor: string;
  mouthpieceColor: string;
  // Layout
  logoVariant: 'horizontal' | 'stacked' | 'mark' | 'none';
  logoPosition: 'top' | 'bottom';
  textAlign: 'left' | 'center';
  headlineScale: number; // 0.75 to 1.35
  showMintAccent: boolean;
  showSafeZones: boolean;
  // Photo
  photoDataUrl: string | null;
  photoZoom: number; // 1 to 2.2
  photoOffsetX: number; // -50 to 50
  photoOffsetY: number; // -50 to 50
  scrimOpacity: number; // 0 to 0.9
}

export interface SavedInstagramDesign extends InstagramConfig {
  id: string;
  savedAt: string;
}

export type VideoFormat = 'reel' | 'square' | 'portrait' | 'landscape';

export type VideoTemplateId =
  | 'midnight-pulse'
  | 'okarina-kinetic'
  | 'waveform-showcase'
  | 'launch-teaser'
  | 'editorial-reel';

export type AudioSourceMode = 'studio' | 'upload' | 'url' | 'none';

export type StudioAudioTrackId =
  | 'okarina-breeze'
  | 'midnight-mesh'
  | 'indigo-pulse'
  | 'quiet-studio'
  | 'mint-horizon';

export interface VideoConfig {
  id?: string;
  name: string;
  format: VideoFormat;
  templateId: VideoTemplateId;
  durationSec: number; // 5, 10, 15, 30
  eyebrow: string;
  headline: string;
  body: string;
  footerHandle: string;
  dateLabel: string;
  ctaText: string;
  // Styling
  bgColor: string;
  backdropStyle: BackdropStyle;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  markFill: string;
  markDetailColor: string;
  markSubtleDetailColor: string;
  mouthpieceColor: string;
  // Motion & Audio reactivity
  logoVariant: 'horizontal' | 'stacked' | 'mark' | 'none';
  textAlign: 'left' | 'center';
  headlineScale: number;
  showMintAccent: boolean;
  showWaveform: boolean;
  motionIntensity: number; // 0.3 to 1.6
  // Photo backdrop
  photoDataUrl: string | null;
  scrimOpacity: number;
  // Audio settings
  audioMode: AudioSourceMode;
  studioTrackId: StudioAudioTrackId;
  audioUrl: string;
  uploadedAudioName: string;
  audioVolume: number; // 0 to 1
  audioStartSec: number;
  audioFadeInOut: boolean;
}

export interface SavedVideoDesign extends VideoConfig {
  id: string;
  savedAt: string;
}

export interface OriginalAssetItem {
  id: string;
  title: string;
  category: 'lockups' | 'marks' | 'icons' | 'social';
  path: string;
  dimensionsLabel: string;
  theme: 'light' | 'dark' | 'indigo' | 'transparent';
  editorPreset: Partial<BrandConfig>;
}
