import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Share2, X } from 'lucide-react';
import {
  canShareFile,
  clearReadyDownload,
  ReadyDownload,
  shareReadyDownload,
  subscribeToDownloads,
} from '../utils/downloadHelper';

export const DownloadTray: React.FC = () => {
  const [item, setItem] = useState<ReadyDownload | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToDownloads((next) => {
      setItem(next);
      setShareNote(null);
    });
  }, []);

  if (!item) return null;

  const supportsFileShare = canShareFile(item);

  const handleShare = async () => {
    setShareNote(null);
    const result = await shareReadyDownload(item);
    if (result === 'unsupported') {
      setShareNote('Use Download or Open to save on this browser.');
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 md:inset-x-auto md:right-5 md:bottom-5 md:w-[390px] z-50 bg-[#0F172A] text-white border border-slate-700/80 rounded-2xl shadow-2xl p-3.5"
    >
      <div className="flex items-start gap-3">
        {item.kind === 'image' || item.kind === 'svg' ? (
          <img
            src={item.blobUrl}
            alt={item.filename}
            className="w-12 h-12 rounded-lg object-contain bg-white/10 border border-white/10 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#18D5A8]/15 text-[#18D5A8] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {item.filename}
              </p>
              <p className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                Ready · {item.sizeLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={clearReadyDownload}
              aria-label="Dismiss download bar"
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {supportsFileShare && (
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2939F0] text-white hover:bg-[#1E2CD4] transition-colors whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5" />
                Save to Phone
              </button>
            )}

            <a
              href={item.blobUrl}
              download={item.filename}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                supportsFileShare
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-[#2939F0] text-white hover:bg-[#1E2CD4]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>

            <a
              href={item.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </a>
          </div>

          {shareNote && (
            <p className="text-[11px] text-amber-300 mt-1.5">{shareNote}</p>
          )}
        </div>
      </div>
    </div>
  );
};
