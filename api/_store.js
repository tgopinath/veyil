// Storage for admin-made products. On Vercel (BLOB_READ_WRITE_TOKEN set) it is one
// JSON file in Vercel Blob; on your Mac (node server.mjs) it is data/products.json.
import { timingSafeEqual, createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = process.env.PRODUCTS_PATH || 'products.json';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blob = () => import('@vercel/blob');

export async function readProducts() {
  if (!useBlob()) {
    try { return JSON.parse(await readFile(join(ROOT, 'data', FILE), 'utf8')); } catch { return []; }
  }
  const { list } = await blob();
  const { blobs } = await list({ prefix: FILE, limit: 5 });
  const b = blobs.find((x) => x.pathname === FILE);
  if (!b) return [];
  // the upload time gives every version its own CDN cache key
  const r = await fetch(`${b.url}?v=${new Date(b.uploadedAt).getTime()}`, { cache: 'no-store' });
  return r.ok ? r.json() : [];
}

export async function writeProducts(items) {
  const body = JSON.stringify(items, null, 1);
  if (!useBlob()) {
    await mkdir(join(ROOT, 'data'), { recursive: true });
    return writeFile(join(ROOT, 'data', FILE), body);
  }
  const { put } = await blob();
  await put(FILE, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

export async function saveImage(base, ext, type, buf) {
  const name = `${base}-${randomBytes(4).toString('hex')}.${ext}`;
  if (!useBlob()) {
    await mkdir(join(ROOT, 'data', 'uploads'), { recursive: true });
    await writeFile(join(ROOT, 'data', 'uploads', name), buf);
    return `data/uploads/${name}`;
  }
  const { put } = await blob();
  return (await put(`photos/${name}`, buf, { access: 'public', contentType: type, addRandomSuffix: false })).url;
}

const same = (a, b) => {
  const h = (s) => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(h(a), h(b));
};

// Basic auth against ADMIN_USER / ADMIN_PASSWORD (Vercel env, or .env.local on your Mac).
export async function isAdmin(req) {
  const u = process.env.ADMIN_USER, p = process.env.ADMIN_PASSWORD;
  if (!u || !p) return false;
  const m = /^Basic (.+)$/.exec(req.headers.get('authorization') || '');
  if (!m) return false;
  const [user, ...rest] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
  const ok = same(user, u) & same(rest.join(':'), p);
  if (!ok) await new Promise((r) => setTimeout(r, 800)); // slow down password guessing
  return !!ok;
}

export const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
});
