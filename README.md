# Veyil · Sun-dried pantry

E-commerce storefront for solar-dried vegetable flakes, powders, root vegetables, leaves, pickles and vathal.

- **Store**: `index.html` — vanilla JS, hash routes, cart in localStorage. Product art is drawn in code (`art.js`).
- **Admin**: `admin.html` — add, edit, hide and delete products with a live preview.
- **API**: `api/products.js`, `api/upload.js` — Vercel functions. Data lives in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise in `data/`.

## Run locally

```bash
node server.mjs
```

Put `ADMIN_USER` and `ADMIN_PASSWORD` in `.env.local`. Store at http://localhost:5310, admin at `/admin.html`.

## Deploy

Vercel project with env vars `ADMIN_USER`, `ADMIN_PASSWORD` and a connected Blob store.

Reference photos: Wikimedia Commons, see `credits.js`.

Architecture: see [ARCHITECTURE.md](ARCHITECTURE.md).
