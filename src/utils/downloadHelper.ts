export interface ReadyDownload {
  id: string;
  blob: Blob;
  blobUrl: string;
  filename: string;
  mimeType: string;
  sizeLabel: string;
  kind: 'image' | 'video' | 'audio' | 'svg';
}

type Listener = (item: ReadyDownload | null) => void;

const listeners = new Set<Listener>();
let currentDownload: ReadyDownload | null = null;
let revokeTimer: number | null = null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectKind(filename: string, mimeType: string): ReadyDownload['kind'] {
  const lower = filename.toLowerCase();
  const mime = mimeType.toLowerCase();
  if (lower.endsWith('.svg') || mime.includes('svg')) return 'svg';
  if (mime.startsWith('video/') || lower.endsWith('.mp4') || lower.endsWith('.webm')) {
    return 'video';
  }
  if (
    mime.startsWith('audio/') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.ogg')
  ) {
    return 'audio';
  }
  return 'image';
}

function notify() {
  listeners.forEach((cb) => cb(currentDownload));
}

export function subscribeToDownloads(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentDownload);
  return () => {
    listeners.delete(listener);
  };
}

export function clearReadyDownload() {
  if (revokeTimer !== null) {
    window.clearTimeout(revokeTimer);
    revokeTimer = null;
  }
  if (currentDownload) {
    const oldUrl = currentDownload.blobUrl;
    currentDownload = null;
    notify();
    window.setTimeout(() => URL.revokeObjectURL(oldUrl), 1000);
  }
}

function triggerAnchorDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  }, 250);
}

/**
 * Publishes a Blob to the mobile-friendly DownloadTray (for native Share / Save to Photos & Files
 * and direct user-tapped anchor links) and also triggers a browser download immediately.
 * Keeps the object URL alive for 3 minutes so slower mobile download sheets never hit a revoked URL.
 */
export function saveBlobFile(blob: Blob, filename: string) {
  if (revokeTimer !== null) {
    window.clearTimeout(revokeTimer);
    revokeTimer = null;
  }
  if (currentDownload) {
    const prevUrl = currentDownload.blobUrl;
    window.setTimeout(() => URL.revokeObjectURL(prevUrl), 1000);
  }

  const blobUrl = URL.createObjectURL(blob);
  const mimeType = blob.type || 'application/octet-stream';

  currentDownload = {
    id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    blob,
    blobUrl,
    filename,
    mimeType,
    sizeLabel: formatBytes(blob.size),
    kind: detectKind(filename, mimeType),
  };
  notify();

  // Attempt direct download right away (works on desktop & most Android browsers)
  triggerAnchorDownload(blobUrl, filename);

  // Keep blob URL valid for 3 minutes for iOS/mobile confirmation dialogs & manual taps
  revokeTimer = window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    if (currentDownload?.blobUrl === blobUrl) {
      currentDownload = null;
      notify();
    }
  }, 180_000);
}

/**
 * Converts a canvas to a PNG Blob (much lighter & more reliable on mobile than multi-MB data URLs)
 * and saves it via saveBlobFile.
 */
export function saveCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          saveBlobFile(blob, filename);
          resolve();
          return;
        }
        // Fallback if canvas.toBlob returns null
        const dataUrl = canvas.toDataURL('image/png');
        fetch(dataUrl)
          .then((r) => r.blob())
          .then((b) => saveBlobFile(b, filename))
          .catch(() => triggerAnchorDownload(dataUrl, filename))
          .finally(resolve);
      },
      'image/png',
      1
    );
  });
}

/**
 * Fetches a same-origin or proxied file into a Blob so mobile browsers can save/share it natively.
 */
export async function saveUrlAsFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    saveBlobFile(blob, filename);
  } catch {
    triggerAnchorDownload(url, filename);
  }
}

export function canShareFile(item: ReadyDownload): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  try {
    const file = new File([item.blob], item.filename, { type: item.mimeType });
    if (typeof navigator.canShare === 'function') {
      return navigator.canShare({ files: [file] });
    }
    return true;
  } catch {
    return false;
  }
}

export async function shareReadyDownload(item: ReadyDownload): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  try {
    const file = new File([item.blob], item.filename, { type: item.mimeType });
    await navigator.share({
      files: [file],
      title: item.filename,
    });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}
