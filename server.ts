import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB cap

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  // Block private IPv4 ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  return false;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Audio proxy so external MP3/WAV/OGG URLs can be decoded by Web Audio API without CORS blocks
  app.get('/api/audio-proxy', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ error: 'Missing url query parameter.' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid audio URL.' });
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.status(400).json({ error: 'Only http and https URLs are supported.' });
      return;
    }

    if (isBlockedHostname(parsed.hostname)) {
      res.status(403).json({ error: 'Private or local addresses are not allowed.' });
      return;
    }

    try {
      const upstream = await fetch(parsed.toString(), {
        headers: {
          Accept: 'audio/*,application/ogg;q=0.9,*/*;q=0.5',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: `Upstream audio server returned ${upstream.status}.`,
        });
        return;
      }

      const contentLength = Number(upstream.headers.get('content-length') || 0);
      if (contentLength > MAX_AUDIO_BYTES) {
        res.status(413).json({ error: 'Audio file exceeds 25 MB limit.' });
        return;
      }

      const arrayBuf = await upstream.arrayBuffer();
      if (arrayBuf.byteLength > MAX_AUDIO_BYTES) {
        res.status(413).json({ error: 'Audio file exceeds 25 MB limit.' });
        return;
      }

      const contentType =
        upstream.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      if (req.query.download === '1') {
        const rawName =
          typeof req.query.filename === 'string'
            ? req.query.filename
            : 'okarina-audio.mp3';
        const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '-');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${safeName}"`
        );
      }
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch audio URL.';
      res.status(502).json({ error: message });
    }
  });

  // Search Internet Archive strictly for Public Domain / CC0 non-copyrighted audio files
  app.get('/api/cc0-search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : 'ambient';
    const sanitized = q.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').trim() || 'ambient';

    const queryStr = `mediatype:audio AND (licenseurl:*publicdomain* OR licenseurl:*zero*) AND item_size:[20000 TO 22000000] AND (${sanitized})`;
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      queryStr
    )}&fl[]=identifier,title,creator,licenseurl&sort[]=downloads+desc&rows=12&output=json`;

    try {
      const searchRes = await fetch(searchUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (!searchRes.ok) {
        res.status(502).json({ error: 'Public audio catalog unavailable.' });
        return;
      }

      const data = (await searchRes.json()) as {
        response?: {
          docs?: {
            identifier: string;
            title?: string;
            creator?: string | string[];
            licenseurl?: string;
          }[];
        };
      };

      const docs = data.response?.docs || [];
      const resolved = await Promise.all(
        docs.slice(0, 10).map(async (doc) => {
          try {
            const metaRes = await fetch(
              `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}/files`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (!metaRes.ok) return null;
            const metaJson = (await metaRes.json()) as {
              result?: {
                name?: string;
                size?: string;
                length?: string;
                format?: string;
              }[];
            };
            const files = metaJson.result || [];
            const audioFile = files.find((f) => {
              const name = (f.name || '').toLowerCase();
              const size = Number(f.size || 0);
              const isSupported =
                name.endsWith('.mp3') ||
                name.endsWith('.ogg') ||
                name.endsWith('.wav');
              return isSupported && size > 10000 && size <= 18 * 1024 * 1024;
            });

            if (!audioFile || !audioFile.name) return null;

            const creator = Array.isArray(doc.creator)
              ? doc.creator[0]
              : doc.creator || 'Public Domain';
            const sizeMb = (Number(audioFile.size || 0) / (1024 * 1024)).toFixed(1);
            const rawLen = audioFile.length ? Number(audioFile.length) : 0;
            const lengthLabel =
              rawLen > 0
                ? `${Math.floor(rawLen / 60)}:${String(
                    Math.round(rawLen % 60)
                  ).padStart(2, '0')}`
                : `${sizeMb} MB`;

            return {
              id: doc.identifier,
              title: doc.title || doc.identifier,
              creator,
              license: doc.licenseurl?.includes('zero')
                ? 'CC0 1.0'
                : 'Public Domain',
              lengthLabel,
              audioUrl: `https://archive.org/download/${encodeURIComponent(
                doc.identifier
              )}/${encodeURIComponent(audioFile.name)}`,
            };
          } catch {
            return null;
          }
        })
      );

      res.json({
        tracks: resolved.filter((item): item is NonNullable<typeof item> => item !== null),
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to search CC0 audio.';
      res.status(502).json({ error: msg });
    }
  });

  // Live catalog & search sourced from https://mixkit.co/free-sound-effects/
  app.get('/api/mixkit-sfx', async (req, res) => {
    const rawCat = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : 'all';
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const pageNum = Math.max(1, Math.min(5, Number(req.query.page) || 1));

    const decodeEntities = (str: string) =>
      str
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    const parseMixkitHtml = (html: string, pageUrl: string) => {
      const blocks = html.split('<div class="item-grid__item">').slice(1);
      const seen = new Set<string>();
      const items: {
        id: string;
        title: string;
        tags: string[];
        durationLabel: string;
        audioUrl: string;
        license: string;
        sourceUrl: string;
      }[] = [];

      for (const block of blocks) {
        const endIdx = block.indexOf('<div class="item-grid-card__actions');
        const chunk = endIdx > 0 ? block.slice(0, endIdx + 200) : block.slice(0, 3500);
        const idMatch = chunk.match(/data-audio-player-item-id-value="(\d+)"/);
        const urlMatch = chunk.match(/data-audio-player-preview-url-value="(https:\/\/[^"]+)"/);
        const titleMatch = chunk.match(/<h2 class="item-grid-card__title">\s*([\s\S]*?)\s*<\/h2>/);
        const durMatch = chunk.match(/data-test-id="duration">\s*([\s\S]*?)\s*<\/div>/);
        const tagMatches = [...chunk.matchAll(/<a class="meta-links__link"[^>]*>\s*([^<]+?)\s*<\/a>/g)].map((m) =>
          decodeEntities(m[1].replace(/\s+/g, ' ').trim())
        );

        if (idMatch && urlMatch && titleMatch) {
          const id = `mixkit-${idMatch[1]}`;
          if (seen.has(id)) continue;
          seen.add(id);
          items.push({
            id,
            title: decodeEntities(titleMatch[1].replace(/\s+/g, ' ').trim()),
            tags: [...new Set(tagMatches)].slice(0, 4),
            durationLabel: durMatch ? durMatch[1].trim() : '0:02',
            audioUrl: urlMatch[1],
            license: 'Mixkit Free License',
            sourceUrl: pageUrl,
          });
        }
      }
      return items;
    };

    const fetchMixkitPage = async (url: string) => {
      const upstream = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) return [];
      const html = await upstream.text();
      return parseMixkitHtml(html, url);
    };

    try {
      const pageQuery = pageNum > 1 ? `?page=${pageNum}` : '';
      let targetUrl = `https://mixkit.co/free-sound-effects/${pageQuery}`;
      let items: ReturnType<typeof parseMixkitHtml> = [];

      if (rawQ) {
        const slug = rawQ
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const words = rawQ
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 2);

        if (slug) {
          targetUrl = `https://mixkit.co/free-sound-effects/discover/${slug}/${pageQuery}`;
          items = await fetchMixkitPage(targetUrl);

          if (items.length === 0) {
            const catFallbackUrl = `https://mixkit.co/free-sound-effects/${slug}/${pageQuery}`;
            const catItems = await fetchMixkitPage(catFallbackUrl);
            if (catItems.length > 0) {
              targetUrl = catFallbackUrl;
              items = catItems;
            }
          }
        }

        // For multi-word queries where combined slug has no dedicated Mixkit page, search Mixkit per-word pages
        if (items.length === 0 && words.length > 1) {
          for (const word of words) {
            const wordDiscoverUrl = `https://mixkit.co/free-sound-effects/discover/${word}/${pageQuery}`;
            let wordItems = await fetchMixkitPage(wordDiscoverUrl);
            let usedUrl = wordDiscoverUrl;
            if (wordItems.length === 0) {
              const wordCatUrl = `https://mixkit.co/free-sound-effects/${word}/${pageQuery}`;
              wordItems = await fetchMixkitPage(wordCatUrl);
              usedUrl = wordCatUrl;
            }
            if (wordItems.length > 0) {
              targetUrl = usedUrl;
              items = wordItems.sort((a, b) => {
                const hayA = `${a.title} ${a.tags.join(' ')}`.toLowerCase();
                const hayB = `${b.title} ${b.tags.join(' ')}`.toLowerCase();
                const scoreA = words.filter((w) => hayA.includes(w)).length;
                const scoreB = words.filter((w) => hayB.includes(w)).length;
                return scoreB - scoreA;
              });
              break;
            }
          }
        }

        // Local fallback filter on Mixkit main featured page if no dedicated slug matched
        if (items.length === 0 && words.length > 0) {
          const pool = await fetchMixkitPage('https://mixkit.co/free-sound-effects/');
          items = pool.filter((item) => {
            const hay = `${item.title} ${item.tags.join(' ')}`.toLowerCase();
            return words.some((w) => hay.includes(w));
          });
          targetUrl = 'https://mixkit.co/free-sound-effects/';
        }
      } else if (rawCat && rawCat !== 'all' && /^[a-z0-9-]+$/.test(rawCat)) {
        targetUrl = `https://mixkit.co/free-sound-effects/${rawCat}/${pageQuery}`;
        items = await fetchMixkitPage(targetUrl);
      } else {
        items = await fetchMixkitPage(targetUrl);
      }

      res.json({
        items,
        sourceUrl: targetUrl,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to fetch Mixkit sound effects.';
      res.status(502).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`okarina Brand Studio server running on http://0.0.0.0:${port}`);
  });
}

startServer();
