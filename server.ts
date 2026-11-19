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
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch audio URL.';
      res.status(502).json({ error: message });
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
