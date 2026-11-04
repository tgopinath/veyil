// Local dev server: serves the store and runs the same /api handlers Vercel runs.
//   node server.mjs        → http://localhost:5310  (admin at /admin.html)
// Admin login comes from .env.local (ADMIN_USER / ADMIN_PASSWORD); data lands in data/.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 5310;
try {
  for (const line of (await readFile(join(ROOT, '.env.local'), 'utf8')).split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {}
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) console.warn('No ADMIN_USER / ADMIN_PASSWORD in .env.local — admin login will fail.');

const api = { '/api/products': await import('./api/products.js'), '/api/upload': await import('./api/upload.js') };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const PRIVATE = /^\/(\.env|\.git|api\/|server\.mjs|node_modules|package)/;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    const mod = api[url.pathname];
    if (mod) {
      const fn = mod[req.method];
      if (!fn) { res.writeHead(405).end(); return; }
      const chunks = []; for await (const c of req) chunks.push(c);
      const r = await fn(new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let path = normalize(decodeURIComponent(url.pathname));
    if (path.endsWith('/')) path += 'index.html';
    if (PRIVATE.test(path) || path.includes('..')) { res.writeHead(404).end('Not found'); return; }
    const file = join(ROOT, path);
    if (!(await stat(file)).isFile()) throw 0;
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(await readFile(file));
  } catch (e) {
    if (e) console.error(e);
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Veyil on http://localhost:${PORT}  ·  admin: http://localhost:${PORT}/admin.html`));
