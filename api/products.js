// GET  /api/products → products added or changed in the admin (public, merged by the store)
// POST /api/products → { action: 'login' } | { action: 'save', product } | { action: 'delete', id }   (admin only)
// A saved product whose id matches a built-in one overrides it; deleting that override restores the original.
import { readProducts, writeProducts, isAdmin, json } from './_store.js';

const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const TYPES = ['flakes', 'powders', 'roots', 'leaves', 'pickles', 'vathal', 'boxes'];
const FORMS = ['flake', 'powder', 'slice', 'leaf', 'pickle', 'crisp', 'box'];
const DISHES = ['curry', 'kuzhambu', 'rasam', 'chutney', 'rice', 'snack', 'drinks', 'travel'];
const ART = ['flake', 'ring', 'slice', 'cube', 'leaf', 'leaflet', 'crumble', 'powder', 'berry', 'chili', 'okra', 'gourd', 'bean', 'clove', 'jar', 'box'];
const PIECES = ['cube', 'wedge', 'clove', 'berry', 'paste'];
const FRESH = ['round', 'root', 'sprig', 'berries', 'pod'];

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };
const hex = (v, d) => (HEX.test(v || '') ? v.toLowerCase() : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const img = (v) => { const s = str(v, 600); return /^https:\/\//.test(s) || /^data\/uploads\/[\w.-]+$/.test(s) ? s : ''; };

// Keeps only known fields so the stored file always has the store's product shape.
function clean(p) {
  const a = p.art || {};
  const colors = (Array.isArray(a.colors) ? a.colors : []).filter((c) => HEX.test(c)).slice(0, 4).map((c) => c.toLowerCase());
  const art = {
    type: oneOf(a.type, ART, 'flake'), colors: colors.length ? colors : ['#c8341f'], bg: hex(a.bg, '#f3ead6'),
    skin: hex(a.skin, '#a07a48'), oil: hex(a.oil, '#a8301a'), cloth: hex(a.cloth, '#c0392b'),
    piece: oneOf(a.piece, PIECES, 'cube'), fresh: oneOf(a.fresh, FRESH, 'round'),
    flat: !!a.flat, round: !!a.round, tiny: !!a.tiny, fibre: !!a.fibre
  };
  const type = oneOf(p.type, TYPES, '');
  return {
    id: str(p.id, 41).toLowerCase(), name: str(p.name, 60), ta: str(p.ta, 60), type,
    form: type === 'boxes' ? 'box' : oneOf(p.form, FORMS, 'flake'),
    dishes: (Array.isArray(p.dishes) ? p.dishes : []).filter((d) => DISHES.includes(d)),
    price: num(p.price, 1, 99999), was: num(p.was, 0, 99999) || null, g: num(p.g, 0, 10000) ?? 100,
    spice: num(p.spice, 0, 3) ?? 0, tags: (Array.isArray(p.tags) ? p.tags : []).filter((t) => ['bestseller', 'new'].includes(t)),
    rating: num(p.rating, 0, 5) || null, reviews: num(p.reviews, 0, 1e6) || 0,
    fresh: str(p.fresh, 60), soak: str(p.soak, 24), shelf: str(p.shelf, 24),
    blurb: str(p.blurb, 160), what: str(p.what, 800), ingredients: str(p.ingredients, 300),
    steps: (Array.isArray(p.steps) ? p.steps : []).map((s) => str(s, 200)).filter(Boolean).slice(0, 3),
    contains: type === 'boxes' ? (Array.isArray(p.contains) ? p.contains : []).map((x) => str(x, 41)).filter((x) => ID.test(x)).slice(0, 9) : undefined,
    image: img(p.image), freshImage: img(p.freshImage), hidden: !!p.hidden,
    art: type === 'boxes' ? { type: 'box', bg: art.bg } : art,
    admin: true, updated: new Date().toISOString()
  };
}

export async function GET() {
  try { return json(await readProducts(), 200, { 'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' }); }
  catch { return json({ error: 'Could not read products' }, 500); }
}

export async function POST(req) {
  if (!(await isAdmin(req))) return json({ error: 'Wrong username or password' }, 401);
  let body; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (body.action === 'login') return json({ ok: true });
  const items = await readProducts();
  if (body.action === 'delete') {
    const next = items.filter((p) => p.id !== body.id);
    await writeProducts(next);
    return json({ ok: true, count: next.length });
  }
  if (body.action === 'save') {
    const p = clean(body.product || {});
    const missing = [['id', 'Web address'], ['name', 'Name'], ['type', 'Shelf'], ['price', 'Price'], ['blurb', 'Short line']].filter(([k]) => !p[k]).map(([, l]) => l);
    if (missing.length) return json({ error: `Missing: ${missing.join(', ')}` }, 400);
    if (!ID.test(p.id)) return json({ error: 'Web address must be lowercase letters, numbers and dashes' }, 400);
    if (p.type === 'boxes' && (p.contains || []).length < 2) return json({ error: 'A box needs at least 2 products' }, 400);
    const i = items.findIndex((x) => x.id === p.id);
    if (i >= 0) items[i] = p; else items.push(p);
    await writeProducts(items);
    return json({ ok: true, product: p });
  }
  return json({ error: 'Unknown action' }, 400);
}
