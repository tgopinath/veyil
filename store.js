/* Veyil storefront — hash router, cart, views. */
(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const main = $('#main');

  /* products added or edited in admin.html override data.js by id; works
     without the API too (plain static hosting just skips this) */
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 2500);
    const r = await fetch('api/products', { signal: ctl.signal, cache: 'no-store' });
    const extra = r.ok ? await r.json() : [];
    if (Array.isArray(extra)) extra.forEach((x) => { const i = PRODUCTS.findIndex((p) => p.id === x.id); i >= 0 ? (PRODUCTS[i] = x) : PRODUCTS.push(x); });
  } catch {}
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  // hidden products stay addressable (boxes, old carts) but leave every list
  for (let i = PRODUCTS.length - 1; i >= 0; i--) if (PRODUCTS[i].hidden) PRODUCTS.splice(i, 1);
  const heroOf = (t) => (!byId[t.hero]?.hidden && byId[t.hero]) || PRODUCTS.find((p) => p.type === t.id) || PRODUCTS[0];
  const typeOf = (id) => TYPES.find((t) => t.id === id);
  const dishOf = (id) => DISHES.find((d) => d.id === id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rs = (n) => '₹' + n.toLocaleString('en-IN');
  const FREE = 499;

  /* ─── icons ─── */
  const I = {
    pot: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2"/>',
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c1-1 3-1 4 0s3 1 4 0"/>',
    cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/>',
    mortar: '<path d="M4 12h16l-2 7H6z"/><path d="m14 12 5-8"/>',
    box: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18M8 7V4h8v3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
    bag: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M4 12h15M14 6l6 6-6 6"/>',
    arrows: '<path d="m9 6-6 6 6 6M15 6l6 6-6 6"/>',
    hand: '<path d="M7 11V6a2 2 0 0 1 4 0v4M11 10V4a2 2 0 0 1 4 0v6M15 10V6a2 2 0 0 1 4 0v8a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-2.5-4a2 2 0 0 1 3.3-2.2L7 13"/>',
    knife: '<path d="M3 21 15 9l3 3-6 6z"/><path d="m15 9 4-4a2 2 0 0 1 3 3l-4 4"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const ic = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${I[n]}</svg>`;
  const starsHtml = (p) => !p.rating ? '' : `<span class="stars"><svg viewBox="0 0 24 24" aria-hidden="true">${I.star}</svg><b>${p.rating}</b> (${p.reviews})</span>`;
  const spiceHtml = (n) => `<span class="spice" aria-label="Spice ${n} of 3">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const readyText = (s) => /min/.test(s) ? `Soak ${s} and it is ready` : ({ 'Ready': 'Ready to eat', 'No soak': 'No soaking needed', 'Fry direct': 'Fry straight from the pack', 'Instant': 'Stirs in instantly', 'Simmer': 'Simmer to use' }[s] || s);
  const spiceWord = (n) => ['Not spicy', 'Mild', 'Medium', 'Hot'][n];
  const photoUrl = (k) => `img/${k}.jpg`;
  const hasFresh = (p) => !!p.freshImage || (p.photo && !NOT_FRESH.includes(p.photo));
  const freshSrc = (p) => p.freshImage || photoUrl(p.photo);
  const freshPic = (p) => hasFresh(p) ? `<img src="${esc(freshSrc(p))}" alt="Fresh produce" loading="lazy">` : `<div class="art">${art(p, 'fresh')}</div>`;

  /* each copy gets its own gradient/clip ids, otherwise a copy inside a
     hidden menu would own the ids and every visible copy would lose its fills */
  const cache = {};
  let copy = 0;
  const art = (p, kind = 'dried') => {
    if (kind === 'dried' && p.image) return `<img class="art-photo" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`;
    const svg = (cache[p.id + kind] ||= Art[kind === 'pack' ? 'pack' : kind === 'fresh' ? 'fresh' : 'dried'](p)), k = ++copy;
    return svg.replace(/(id="|url\(#)v(\d+)/g, (m, a, n) => `${a}v${n}x${k}`);
  };
  const thumb = (p) => `<div class="thumb art">${art(p)}</div>`;

  /* sizes */
  const sizes = (p) => p.type === 'boxes' ? [{ label: 'Box', g: 0, price: p.price }] :
    [{ g: p.g, price: p.price }, { g: p.g * 2.5, price: Math.round(p.price * 2.3 / 5) * 5 - 1 }, { g: p.g * 5, price: Math.round(p.price * 4.3 / 5) * 5 - 1 }]
      .map((s) => ({ ...s, label: s.g >= 1000 ? s.g / 1000 + ' kg' : s.g + ' g' }));

  /* ─── storage (never required) ─── */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('veyil.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('veyil.' + k, JSON.stringify(v)); } catch {} }
  };

  /* ─── theme ─── */
  const theme = store.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  $('#themeBtn').onclick = () => {
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', document.documentElement.dataset.theme);
  };

  /* ─── cart ─── */
  let cart = store.get('cart', []).filter((l) => byId[l.id]);
  const lineInfo = (l) => { const p = byId[l.id], s = sizes(p)[l.s] || sizes(p)[0]; return { p, s, total: s.price * l.q }; };
  const subtotal = () => cart.reduce((a, l) => a + lineInfo(l).total, 0);
  const count = () => cart.reduce((a, l) => a + l.q, 0);
  function saveCart() {
    store.set('cart', cart);
    $('#cartCount').textContent = count();
    if ($('#cart').classList.contains('open')) renderCart();
  }
  function addToCart(id, s = 0, q = 1) {
    const ex = cart.find((l) => l.id === id && l.s === s);
    ex ? (ex.q += q) : cart.push({ id, s, q });
    saveCart();
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    toast(`${byId[id].name} added`, 'View cart', openCart);
  }

  let toastT;
  function toast(msg, action, fn) {
    const t = $('#toast');
    t.innerHTML = esc(msg) + (action ? ` <button>${esc(action)}</button>` : '');
    if (fn) t.querySelector('button').onclick = () => { t.classList.remove('show'); fn(); };
    t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function shipBar() {
    const st = subtotal(), left = FREE - st;
    return `<div class="ship">${left > 0 ? `Add <b>${rs(left)}</b> more for free delivery` : '<b>Free delivery unlocked</b>'}<div class="bar"><i style="width:${Math.min(100, (st / FREE) * 100)}%"></i></div></div>`;
  }

  function renderCart() {
    const d = $('#cart');
    const lines = cart.map((l, i) => {
      const { p, s, total } = lineInfo(l);
      return `<div class="line">${thumb(p)}<div><b>${esc(p.name)}</b><small>${s.label}</small>
        <div class="qty" role="group" aria-label="Quantity"><button data-q="${i}" data-d="-1" aria-label="Decrease">−</button><span>${l.q}</span><button data-q="${i}" data-d="1" aria-label="Increase">+</button></div></div>
        <div class="lp">${rs(total)}<br><button class="rm" data-rm="${i}">Remove</button></div></div>`;
    }).join('');
    const ups = PRODUCTS.filter((p) => !cart.some((l) => l.id === p.id) && p.tags.includes('bestseller') && p.type !== 'boxes').slice(0, 2);
    d.innerHTML = `<div class="drawer-h"><h2>Your cart${count() ? ` · ${count()}` : ''}</h2><button class="icon-btn" id="cartClose" aria-label="Close cart">${ic('close')}</button></div>
      <div class="drawer-b">${cart.length ? lines + shipBar() : `<div class="cart-empty">${thumb(byId['tomato-flakes'])}<h3>Your pantry is empty</h3><p class="muted">Start with tomato and onion flakes. They go into almost everything.</p></div>`}
        ${ups.length ? `<div class="upsell"><h3>Most kitchens also add</h3>${ups.map((p) => `<div class="line">${thumb(p)}<div><b>${esc(p.name)}</b><small>${rs(p.price)} · ${p.g} g</small></div><button class="add" data-add="${p.id}">${ic('plus')}Add</button></div>`).join('')}</div>` : ''}
      </div>
      ${cart.length ? `<div class="drawer-f"><div class="tot"><span>Subtotal</span><span>${rs(subtotal())}</span></div><a class="btn btn-primary" href="#/checkout" id="toCheckout">Checkout ${ic('arrow')}</a></div>` : ''}`;
    $('#cartClose').onclick = closeCart;
    $$('[data-q]', d).forEach((b) => b.onclick = () => { const l = cart[b.dataset.q]; l.q += +b.dataset.d; if (l.q < 1) cart.splice(b.dataset.q, 1); saveCart(); renderCart(); });
    $$('[data-rm]', d).forEach((b) => b.onclick = () => { cart.splice(b.dataset.rm, 1); saveCart(); renderCart(); });
    $$('[data-add]', d).forEach((b) => b.onclick = () => { addToCart(b.dataset.add); renderCart(); });
    const tc = $('#toCheckout'); if (tc) tc.onclick = closeCart;
  }
  let lastFocus;
  function openCart() {
    lastFocus = document.activeElement;
    renderCart(); $('#scrim').hidden = false;
    const d = $('#cart'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    setTimeout(() => d.focus(), 50);
  }
  function closeCart() {
    $('#scrim').hidden = true; const d = $('#cart'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  $('#cartBtn').onclick = openCart;
  $('#scrim').onclick = () => { closeCart(); closeFilters(); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); closeMega(); closeFilters(); } });

  /* ─── product card ─── */
  function card(p) {
    const badge = p.was ? `<span class="badge save">Save ${Math.round((1 - p.price / p.was) * 100)}%</span>` : p.tags.includes('new') ? '<span class="badge new">New</span>' : p.tags.includes('bestseller') ? '<span class="badge best">Bestseller</span>' : '';
    const from = hasFresh(p) ? `<span class="from"><img src="${esc(freshSrc(p))}" alt="" loading="lazy">Made from ${esc(p.fresh.replace(/^[\d.,]+\s*(kg|g)\s*(of\s*)?/, ''))}</span>`
      : p.type !== 'boxes' ? `<span class="from"><span class="sw art" style="overflow:hidden">${art(p, 'fresh')}</span>Made from ${esc(p.fresh.replace(/^[\d.,]+\s*(kg|g)\s*(of\s*)?/, ''))}</span>` : '';
    return `<article class="card">
      <div class="art"><div class="main">${art(p)}</div><div class="alt">${art(p, 'pack')}</div>${badge}${from}<span class="peek">${p.type === 'boxes' ? 'In the box' : p.art.type === 'jar' ? 'The jar' : 'The pack'}</span></div>
      <div class="card-b">
        <h3>${esc(p.name)}</h3><span class="ta" lang="ta">${esc(p.ta)}</span>
        <span class="equiv">${ic('sun')}1 pack ≈ ${esc(p.fresh)}</span>
        <div class="chips"><span class="chip">${ic('clock')}${esc(p.soak)}</span>${p.spice ? `<span class="chip ${p.spice > 2 ? 'hot' : ''}">${spiceWord(p.spice)}</span>` : ''}${starsHtml(p)}</div>
        <div class="card-f"><span class="price">${rs(p.price)}${p.was ? `<s>${rs(p.was)}</s>` : `<small>${p.g} g</small>`}</span>
          <button class="add" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">${ic('plus')}Add</button></div>
      </div>
      <a class="card-link" href="#/p/${p.id}" aria-label="${esc(p.name)}, ${rs(p.price)}"></a>
    </article>`;
  }
  function bindAdds(root) { $$('[data-add]', root).forEach((b) => b.onclick = (e) => { e.preventDefault(); addToCart(b.dataset.add); }); }

  /* ─── header: mega menu, type strip, search ─── */
  const typeCount = (t) => PRODUCTS.filter((p) => p.type === t).length;
  $('#mega').innerHTML = `<div><h4>Shop by what it is</h4><div class="mega-types">${TYPES.map((t) => `<a class="mega-type" href="#/shop?type=${t.id}">${thumb(heroOf(t))}<div><b>${t.name}</b><span>${typeCount(t.id)} products · <span lang="ta">${t.ta}</span></span></div></a>`).join('')}</div></div>
    <div class="mega-dishes"><h4>Cook by dish</h4>${DISHES.map((d) => `<a href="#/shop?dish=${d.id}">${ic(d.icon)}${d.name}</a>`).join('')}</div>`;
  const megaBtn = $('#megaBtn');
  function closeMega() { $('#mega').hidden = true; megaBtn.setAttribute('aria-expanded', 'false'); }
  megaBtn.onclick = (e) => { e.stopPropagation(); const open = $('#mega').hidden; $('#mega').hidden = !open; megaBtn.setAttribute('aria-expanded', String(open)); };
  document.addEventListener('click', (e) => { if (!e.target.closest('.mega-wrap')) closeMega(); if (!e.target.closest('.search')) $('#suggest').hidden = true; });
  $('#mega').addEventListener('click', (e) => { if (e.target.closest('a')) closeMega(); });
  $('#typeStrip').innerHTML = TYPES.map((t) => `<a href="#/shop?type=${t.id}">${t.name}</a>`).join('');
  $('#footTypes').innerHTML = TYPES.map((t) => `<li><a href="#/shop?type=${t.id}">${t.name}</a></li>`).join('');

  const norm = (s) => s.toLowerCase();
  function search(q) {
    q = norm(q.trim()); if (!q) return [];
    return PRODUCTS.map((p) => {
      const hay = norm([p.name, p.ta, p.blurb, typeOf(p.type).name, p.dishes.map((d) => dishOf(d).name).join(' '), p.ingredients].join(' '));
      const score = norm(p.name).startsWith(q) ? 3 : norm(p.name).includes(q) ? 2 : hay.includes(q) ? 1 : 0;
      return { p, score };
    }).filter((x) => x.score).sort((a, b) => b.score - a.score).map((x) => x.p);
  }
  const si = $('#searchInput'), sg = $('#suggest');
  if (matchMedia('(max-width: 520px)').matches) si.placeholder = 'Search';
  let sel = -1;
  si.addEventListener('input', () => {
    const r = search(si.value).slice(0, 6); sel = -1;
    sg.innerHTML = r.map((p) => `<li><a href="#/p/${p.id}" role="option">${thumb(p)}<span><b>${esc(p.name)}</b><small>${typeOf(p.type).name} · ${rs(p.price)}</small></span></a></li>`).join('')
      || (si.value.trim() ? '<li class="muted" style="padding:12px">No match. Try “tomato”, “vathal” or “rasam”.</li>' : '');
    sg.hidden = !si.value.trim();
  });
  si.addEventListener('keydown', (e) => {
    const items = $$('a', sg); if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.setAttribute('aria-selected', String(i === sel)));
    }
    if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); items[sel].click(); }
  });
  sg.addEventListener('click', () => { sg.hidden = true; si.value = ''; });
  $('#searchForm').onsubmit = (e) => { e.preventDefault(); sg.hidden = true; location.hash = '#/shop?q=' + encodeURIComponent(si.value.trim()); };

  /* ─── dryer illustration (used twice) ─── */
  const dryer = `<svg viewBox="0 0 320 220" aria-hidden="true"><defs><linearGradient id="dh-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8f2" stop-opacity=".9"/><stop offset="1" stop-color="#a8d0e0" stop-opacity=".6"/></linearGradient></defs>
    <circle cx="262" cy="42" r="20" fill="#f2b44a"/><g stroke="#f2b44a" stroke-width="3" stroke-linecap="round"><path d="M262 12v-6M262 78v-6M232 42h-6M298 42h-6M241 21l-4-4M287 67l-4-4M241 63l-4 4M287 17l-4 4"/></g>
    <g stroke="#f2b44a" stroke-width="2" stroke-dasharray="4 6" opacity=".8"><path d="M240 60 190 100M250 70 210 112M228 52 170 92"/></g>
    <path d="M40 200V110Q120 40 200 110V200Z" fill="url(#dh-r)" stroke="#5a8aa0" stroke-width="2"/><path d="M80 75V200M120 60V200M160 75V200" stroke="#5a8aa0" stroke-width="1.2" opacity=".5"/>
    <rect x="34" y="198" width="172" height="8" rx="2" fill="#2a2a2a"/>
    <g fill="#c8341f"><rect x="58" y="150" width="124" height="5" rx="2" fill="#8a6a4a"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${64 + i * 10}" cy="146" r="4" fill="${['#c8341f', '#e8761e', '#4d7a31', '#e9cfd2'][i % 4]}"/>`).join('')}
    <rect x="58" y="176" width="124" height="5" rx="2" fill="#8a6a4a"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${64 + i * 10}" cy="172" r="4" fill="${['#e88a12', '#7a1238', '#f0dca0', '#5b7d2e'][i % 4]}"/>`).join('')}</g>
    <circle cx="120" cy="96" r="9" fill="none" stroke="#3a5a6a" stroke-width="2"/><path d="M120 87v18M111 96h18" stroke="#3a5a6a" stroke-width="2"/>
    <path d="M120 84q4-14 -2-24M128 82q8-12 4-26" stroke="#9cc0d0" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M10 196q10-4 22 0M210 196q10-4 22 0" stroke="#e39a12" stroke-width="2" fill="none" opacity=".6"/></svg>`;

  /* ─── reveal on scroll ─── */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -60px' }) : null;
  const reveal = () => $$('.rv', main).forEach((el) => io ? io.observe(el) : el.classList.add('in'));

  /* ─── views ─── */
  function home() {
    const best = PRODUCTS.filter((p) => p.tags.includes('bestseller') && p.type !== 'boxes');
    const tomato = byId['tomato-flakes'];
    main.innerHTML = `
    <section class="hero">
      <div class="hero-in">
        <div>
          <span class="eyebrow">Solar-dried in Tamil Nadu</span>
          <h1>The vegetable market, <em>sun-dried</em> into your pantry.</h1>
          <p class="lede">Vegetable flakes, root vegetables, green leaves, pickles and vathal. Dried in our solar house, nothing added. Soak ten minutes and cook as if it were fresh.</p>
          <div class="hero-ctas"><a class="btn btn-primary" href="#/shop">Shop the pantry ${ic('arrow')}</a><a class="btn btn-ghost" href="#what">What is sun-dried veg?</a></div>
          <div class="stats"><div class="stat"><b>10 kg → 1 kg</b><span>fresh tomatoes to flakes</span></div><div class="stat"><b>0</b><span>preservatives or colours</span></div><div class="stat"><b>9–12 mo</b><span>on your shelf</span></div></div>
        </div>
        <div class="collage" aria-label="Featured products">
          <a class="c c2" href="#/p/mango-pickle"><div class="art">${art(byId['mango-pickle'])}</div></a>
          <a class="c c1" href="#/p/tomato-flakes"><div class="art">${art(tomato)}</div><span class="tag-float"><b>Tomato Flakes</b>Soak 10 min · ${rs(tomato.price)}</span></a>
          <a class="c c4" href="#/p/onion-flakes"><div class="art">${art(byId['onion-flakes'], 'pack')}</div></a>
          <a class="c c3" href="#/p/curry-leaves"><div class="art">${art(byId['curry-leaves'])}</div><span class="tag-float"><b>Curry Leaves</b>Still green</span></a>
        </div>
      </div>
    </section>

    <section class="sec"><div class="wrap">
      <div class="sec-head rv"><div><span class="eyebrow">Shop by what it is</span><h2 class="h2">Seven shelves. One sun.</h2><p>Every product sits on exactly one shelf, so you always know where to look.</p></div><a class="btn btn-ghost btn-sm" href="#/shop">See all ${PRODUCTS.length} products</a></div>
      <div class="types">${TYPES.map((t) => `<a class="type-tile rv" href="#/shop?type=${t.id}"><div class="art">${art(heroOf(t))}</div><span class="count">${typeCount(t.id)}</span><div class="tt"><b>${t.name}</b><span class="ta" lang="ta">${t.ta}</span><p>${t.line}</p></div></a>`).join('')}</div>
    </div></section>

    <section class="sec explain" id="what"><div class="wrap explain-grid">
      <div class="compare rv" id="compare" style="--pos:50%">
        <img src="${photoUrl('onion')}" alt="Fresh red onion">
        <div class="after">${art(byId['onion-flakes'])}</div>
        <span class="lbl">Fresh</span><span class="lbl r">Sun-dried</span>
        <div class="handle"><span class="knob">${ic('arrows')}</span></div>
        <input type="range" min="0" max="100" value="50" aria-label="Compare fresh onion with sun-dried onion flakes">
      </div>
      <div class="rv">
        <span class="eyebrow">Not sure what it is?</span>
        <h2 class="h2">It is the same vegetable. Just without the water.</h2>
        <ol class="journey">
          <li><span class="ic">${ic('hand')}</span><div><b>Picked ripe, this week</b><p>From farms within 60 km. Only produce good enough to sell fresh.</p></div></li>
          <li><span class="ic">${ic('knife')}</span><div><b>Sliced and solar-dried</b><p>3–5 days on trays in our solar dry house at 45–55 °C. Clean air, no dust, no flies.</p></div></li>
          <li><span class="ic">${ic('clock')}</span><div><b>Soak, then cook as usual</b><p>Ten minutes in warm water and it is back to soft. Add it where you would add fresh.</p></div></li>
        </ol>
        <div class="ratio"><b>1 : 10</b><span>One 100 g pack of tomato flakes holds what was a full kilo of fresh tomatoes.</span></div>
      </div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head rv"><div><span class="eyebrow">Kitchen favourites</span><h2 class="h2">What people reorder</h2></div><a class="btn btn-ghost btn-sm" href="#/shop?sort=rating">Top rated</a></div>
      <div class="rail">${best.map(card).join('')}</div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap">
      <div class="sec-head rv"><div><span class="eyebrow">Cook by dish</span><h2 class="h2">What are you making tonight?</h2><p>Pick a dish and we will show only what goes into it.</p></div></div>
      <div class="dishes">${DISHES.map((d) => `<a class="dish rv" href="#/shop?dish=${d.id}"><span class="ic">${ic(d.icon)}</span><span><b>${d.name}</b><span>${PRODUCTS.filter((p) => p.dishes.includes(d.id)).length} products</span></span></a>`).join('')}</div>
    </div></section>

    <section class="sec" style="background:var(--cream)"><div class="wrap">
      <div class="sec-head rv"><div><span class="eyebrow">Pantry boxes</span><h2 class="h2">Start with a box</h2><p>New kitchen, hostel room, or a gift for amma. Each box saves up to 18%.</p></div></div>
      <div class="boxes">${PRODUCTS.filter((p) => p.type === 'boxes').map(card).join('')}</div>
    </div></section>

    <section class="sec band"><div class="wrap band-grid">
      <div class="house rv">${dryer}</div>
      <div class="rv">
        <span class="eyebrow">How it’s made</span>
        <h2 class="h2">A greenhouse that dries instead of grows</h2>
        <p>Sunlight warms a black floor under a clear roof. Fans draw that warm air across the trays and push the moisture out. The produce dries evenly, safe from rain, dust, birds and insects, and keeps its colour.</p>
        <div class="facts"><div><b>45–55 °C</b><span>gentle drying heat</span></div><div><b>3–5 days</b><span>from tray to pack</span></div><div><b>0 kWh</b><span>grid power for heat</span></div></div>
        <a class="btn btn-ghost" href="#/story">Inside the dry house ${ic('arrow')}</a>
      </div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head rv"><div><span class="eyebrow">From kitchens like yours</span><h2 class="h2">4.8 average across 4,900 reviews</h2></div></div>
      <div class="reviews">${REVIEWS.map((r) => `<figure class="review rv" style="margin:0"><q>${esc(r.text)}</q><figcaption class="who">${thumb(byId[r.p])}<span><b>${esc(r.name)}</b><small>${esc(r.place)} · bought ${esc(byId[r.p].name)}</small></span></figcaption></figure>`).join('')}</div>
    </div></section>`;
    bindAdds(main); bindCompare(); reveal();
  }

  function bindCompare() {
    const c = $('#compare'); if (!c) return;
    const r = $('input', c);
    r.oninput = () => c.style.setProperty('--pos', r.value + '%');
  }

  /* shop */
  let filtersOpen = false;
  function closeFilters() { const f = $('.filters'); if (f) f.classList.remove('open'); if (filtersOpen) $('#scrim').hidden = true; filtersOpen = false; }
  function shop(params) {
    const q = params.get('q') || '', type = params.get('type') || '', sort = params.get('sort') || 'featured';
    const dishes = (params.get('dish') || '').split(',').filter(Boolean), forms = (params.get('form') || '').split(',').filter(Boolean);
    const spice = params.get('spice') || '', ready = params.get('ready') === '1', view = params.get('view');
    let list = q ? search(q) : PRODUCTS.slice();
    if (type) list = list.filter((p) => p.type === type);
    if (dishes.length) list = list.filter((p) => dishes.some((d) => p.dishes.includes(d)));
    if (forms.length) list = list.filter((p) => forms.includes(p.form));
    if (spice === 'mild') list = list.filter((p) => p.spice <= 1);
    if (spice === 'hot') list = list.filter((p) => p.spice >= 2);
    if (ready) list = list.filter((p) => /no soak|instant|ready|fry direct/i.test(p.soak));
    const sorters = { price: (a, b) => a.price - b.price, rating: (a, b) => (b.rating || 0) - (a.rating || 0) || b.reviews - a.reviews, popular: (a, b) => b.reviews - a.reviews };
    if (sorters[sort]) list.sort(sorters[sort]);

    const t = typeOf(type), d1 = dishes.length === 1 ? dishOf(dishes[0]) : null;
    const title = q ? `Results for “${esc(q)}”` : t ? t.name : d1 ? `For ${d1.name.toLowerCase()}` : view === 'dish' ? 'Cook by dish' : 'The whole pantry';
    const sub = t ? t.line : d1 ? 'Everything that goes into it, across every shelf.' : 'Every product, dried in our solar house. Filter by shelf, by dish, or by how fast it is ready.';
    const link = (patch) => { const p = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k)); const s = p.toString(); return '#/shop' + (s ? '?' + s : ''); };
    const toggleIn = (key, arr, v) => link({ [key]: (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]).join(',') });
    const base = q ? search(q) : PRODUCTS;
    const n = (fn) => base.filter(fn).length;

    const chips = [
      type && [t.name, link({ type: '' })], ...dishes.map((d) => [dishOf(d).name, toggleIn('dish', dishes, d)]),
      ...forms.map((f) => [FORMS[f], toggleIn('form', forms, f)]), spice && [spice === 'mild' ? 'Mild' : 'Spicy', link({ spice: '' })],
      ready && ['Ready without soaking', link({ ready: '' })], q && [`“${q}”`, link({ q: '' })]
    ].filter(Boolean);

    main.innerHTML = `
    <section class="shop-head"><div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/shop">Shop</a>${t ? `<span>/</span><span>${t.name}</span>` : ''}</nav>
      <h1>${title}</h1>${t ? `<span class="ta" lang="ta" style="color:var(--ink-muted)">${t.ta}</span>` : ''}<p>${sub}</p>
      <div class="type-pills">${view === 'dish' || (d1 && !type)
        ? DISHES.map((d) => `<a class="pill no-thumb" href="#/shop?dish=${d.id}" aria-current="${dishes.includes(d.id)}">${d.name}</a>`).join('')
        : `<a class="pill no-thumb" href="${link({ type: '' })}" aria-current="${!type}">All</a>` + TYPES.map((x) => `<a class="pill" href="${link({ type: x.id })}" aria-current="${type === x.id}">${thumb(heroOf(x))}${x.name}</a>`).join('')}</div>
    </div></section>
    <div class="wrap shop">
      <aside class="filters" aria-label="Filters">
        <div class="filter-head" style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:20px">Filters</h2><a href="#/shop" class="muted" style="font-size:14px">Clear all</a></div>
        <div><h3>Shelf</h3>${TYPES.map((x) => `<a class="opt" href="${link({ type: type === x.id ? '' : x.id })}" style="text-decoration:none"><input type="radio" tabindex="-1" ${type === x.id ? 'checked' : ''} aria-hidden="true">${x.name}<span class="n">${n((p) => p.type === x.id)}</span></a>`).join('')}</div>
        <div><h3>Dish</h3>${DISHES.map((x) => `<a class="opt" href="${toggleIn('dish', dishes, x.id)}" style="text-decoration:none"><input type="checkbox" tabindex="-1" ${dishes.includes(x.id) ? 'checked' : ''} aria-hidden="true">${x.name}<span class="n">${n((p) => p.dishes.includes(x.id))}</span></a>`).join('')}</div>
        <div><h3>Form</h3>${Object.entries(FORMS).map(([k, v]) => `<a class="opt" href="${toggleIn('form', forms, k)}" style="text-decoration:none"><input type="checkbox" tabindex="-1" ${forms.includes(k) ? 'checked' : ''} aria-hidden="true">${v}<span class="n">${n((p) => p.form === k)}</span></a>`).join('')}</div>
        <div><h3>Spice</h3><a class="opt" href="${link({ spice: spice === 'mild' ? '' : 'mild' })}" style="text-decoration:none"><input type="radio" tabindex="-1" ${spice === 'mild' ? 'checked' : ''} aria-hidden="true">Mild or none</a><a class="opt" href="${link({ spice: spice === 'hot' ? '' : 'hot' })}" style="text-decoration:none"><input type="radio" tabindex="-1" ${spice === 'hot' ? 'checked' : ''} aria-hidden="true">Medium to hot</a></div>
        <div><h3>Speed</h3><a class="opt" href="${link({ ready: ready ? '' : '1' })}" style="text-decoration:none"><input type="checkbox" tabindex="-1" ${ready ? 'checked' : ''} aria-hidden="true">Ready without soaking</a></div>
        <button class="btn btn-primary filter-btn" id="filtersDone">Show ${list.length} products</button>
      </aside>
      <div>
        <div class="toolbar">
          <button class="btn btn-ghost btn-sm filter-btn" id="filtersOpen">${ic('filter')}Filters${chips.length ? ` · ${chips.length}` : ''}</button>
          <span class="count" aria-live="polite">${list.length} product${list.length === 1 ? '' : 's'}</span>
          <div class="active-chips">${chips.map(([l, h]) => `<a class="x-chip" href="${h}" aria-label="Remove filter ${esc(l)}">${esc(l)} ✕</a>`).join('')}</div>
          <select id="sort" aria-label="Sort by">${[['featured', 'Featured'], ['popular', 'Most reviewed'], ['rating', 'Top rated'], ['price', 'Price: low to high']].map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<div class="empty">${thumb(byId['sundakkai-vathal'])}<h3>Nothing on this shelf matches</h3><p>Try removing a filter.</p><a class="btn btn-primary" href="#/shop">See everything</a></div>`}
      </div>
    </div>`;
    $('#sort').onchange = (e) => { location.hash = link({ sort: e.target.value === 'featured' ? '' : e.target.value }); };
    $('#filtersOpen').onclick = () => { $('.filters').classList.add('open'); $('#scrim').hidden = false; filtersOpen = true; };
    $('#filtersDone').onclick = closeFilters;
    $$('.empty .thumb').forEach((e) => e.style.cssText = 'width:140px;margin:0 auto 16px;border-radius:50%;aspect-ratio:1');
    bindAdds(main);
  }

  /* product page */
  function product(id) {
    const p = byId[id];
    if (!p || p.hidden) { main.innerHTML = `<div class="wrap empty"><h1>That jar is empty</h1><p>We couldn’t find this product.</p><a class="btn btn-primary" href="#/shop">Back to the shop</a></div>`; return; }
    const t = typeOf(p.type), sz = sizes(p);
    let s = 0, q = 1, view = 'dried';
    const views = [['dried', p.type === 'boxes' ? 'Box' : p.art.type === 'jar' ? 'Jar' : 'Dried'], ...(p.type !== 'boxes' && !hasFresh(p) ? [['fresh', 'Fresh']] : []), ...(p.type === 'boxes' || p.art.type === 'jar' ? [] : [['pack', 'Pack']]), ...(p.photo ? [['photo', 'Photo']] : [])];
    const stage = () => view === 'photo'
      ? `<div class="art"><img src="${photoUrl(p.photo)}" alt="Reference photo: ${esc(CREDITS[p.photo]?.file || p.name)}"></div><span class="cap">Reference photo · ${esc(CREDITS[p.photo]?.author || '')}, ${esc(CREDITS[p.photo]?.license || '')}</span>`
      : `<div class="art">${art(p, view)}</div>`;
    const related = PRODUCTS.filter((x) => x.id !== p.id && x.type !== 'boxes' && x.dishes.some((d) => p.dishes.includes(d))).sort((a, b) => b.reviews - a.reviews).slice(0, 8);

    main.innerHTML = `<div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb" style="padding-top:24px"><a href="#/">Home</a><span>/</span><a href="#/shop">Shop</a><span>/</span><a href="#/shop?type=${t.id}">${t.name}</a><span>/</span><span>${esc(p.name)}</span></nav>
      <div class="pdp">
        <div class="gallery">
          <div class="stage" id="stage">${stage()}</div>
          ${views.length > 1 ? `<div class="thumbs" role="group" aria-label="Views">${views.map(([k, l]) => `<button data-v="${k}" aria-pressed="${k === view}">${k === 'photo' ? `<img src="${photoUrl(p.photo)}" alt="">` : `<div class="art">${art(p, k)}</div>`}<span>${l}</span></button>`).join('')}</div>` : ''}
        </div>
        <div class="buy">
          <span class="eyebrow">${t.name}</span>
          <h1>${esc(p.name)}</h1>
          <div class="ta-name" lang="ta">${esc(p.ta)}</div>
          <div style="display:flex;gap:16px;align-items:center;margin-top:12px;flex-wrap:wrap">${starsHtml(p)}${p.spice ? `<span class="chip ${p.spice > 2 ? 'hot' : ''}">${spiceHtml(p.spice)} ${spiceWord(p.spice)}</span>` : '<span class="chip">Not spicy</span>'}</div>
          <p class="blurb">${esc(p.blurb)}</p>
          <div class="is-card"><div class="eq"><span class="bub">${freshPic(p)}</span>${ic('arrow', 'arr')}<span class="bub"><span class="art">${art(p)}</span></span></div>
            <div><b>1 pack ≈ ${esc(p.fresh)}</b><span>${p.type === 'boxes' ? 'Across all packs in the box.' : `${esc(readyText(p.soak))}. Keeps ${esc(p.shelf)} sealed.`}</span></div></div>
          ${sz.length > 1 ? `<div class="muted" style="font-size:14px;font-weight:700">Pack size</div><div class="seg" role="group" aria-label="Pack size">${sz.map((x, i) => `<button data-s="${i}" aria-pressed="${i === s}"><b>${x.label}</b><small>${rs(x.price)}${i ? ` · save ${Math.round((1 - x.price / (p.price * x.g / p.g)) * 100)}%` : ''}</small></button>`).join('')}</div>` : ''}
          <div class="price" id="pPrice" style="font-size:30px;margin-bottom:16px">${rs(sz[s].price)}${p.was ? `<s>${rs(p.was)}</s>` : ''}</div>
          <div class="buy-row"><div class="qty" role="group" aria-label="Quantity"><button id="qm" aria-label="Decrease">−</button><span id="qv">1</span><button id="qp" aria-label="Increase">+</button></div>
            <button class="btn btn-primary" id="addBtn">${ic('plus')}Add to cart</button></div>
          <div id="shipBox">${shipBar()}</div>
          <div class="trust"><div><b>Nothing added</b>${esc(p.ingredients.length < 40 ? p.ingredients : 'See ingredients below')}</div><div><b>Dried this week</b>Packed within 48 h</div><div><b>Easy returns</b>Not happy? We refund.</div></div>
        </div>
      </div>
    </div>

    <section class="detail-sec"><div class="wrap">
      <span class="eyebrow">What it is</span><h2 class="h2" style="margin:8px 0 12px">From the farm to your kitchen</h2>
      <p style="max-width:720px;color:var(--ink-2);font-size:17px;margin:0 0 32px">${esc(p.what)}</p>
      ${p.type === 'boxes'
        ? `<div class="contains">${p.contains.map((cid) => `<a href="#/p/${cid}"><div class="art">${art(byId[cid])}</div><span>${esc(byId[cid].name)}</span></a>`).join('')}</div>`
        : `<div class="journey-strip">
          <figure><div class="pic">${freshPic(p)}</div><figcaption><b>Fresh</b>${esc(p.fresh)}</figcaption></figure>
          <div class="arrow">${ic('arrow')}${p.type === 'pickles' ? 'Sun-cured' : 'Sliced'}</div>
          <figure><div class="pic dryer-pic">${dryer}</div><figcaption><b>${p.type === 'pickles' ? '21 days in glass' : '3–5 days in the solar house'}</b>45–55 °C, clean air</figcaption></figure>
          <div class="arrow">${ic('arrow')}Packed</div>
          <figure><div class="pic art">${art(p, 'pack')}</div><figcaption><b>${p.g} g ${p.art.type === 'jar' ? 'jar' : 'pack'}</b>Keeps ${esc(p.shelf)}</figcaption></figure>
        </div>`}
    </div></section>

    <section class="detail-sec"><div class="wrap">
      <div class="spec"><div><span>Fresh equal</span><b>${esc(p.fresh)}</b></div><div><span>Ready in</span><b>${esc(p.soak)}</b></div><div><span>Shelf life</span><b>${esc(p.shelf)}</b></div><div><span>Spice</span><b>${spiceWord(p.spice)}</b></div><div><span>Ingredients</span><b style="font-size:15px">${esc(p.ingredients)}</b></div></div>
    </div></section>

    <section class="detail-sec"><div class="wrap">
      <span class="eyebrow">How to use</span><h2 class="h2" style="margin:8px 0 24px">Three steps, no guesswork</h2>
      <ol class="steps">${p.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <div style="margin-top:28px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b style="margin-right:8px">Good in</b>${p.dishes.map((d) => `<a class="pill no-thumb" href="#/shop?dish=${d}">${dishOf(d).name}</a>`).join('')}</div>
    </div></section>

    ${related.length ? `<section class="detail-sec"><div class="wrap"><div class="sec-head"><div><span class="eyebrow">Cooks well with</span><h2 class="h2">Goes into the same pot</h2></div></div><div class="rail">${related.map(card).join('')}</div></div></section>` : ''}`;

    $$('.thumbs button').forEach((b) => b.onclick = () => { view = b.dataset.v; $('#stage').innerHTML = stage(); $$('.thumbs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
    $$('.seg button').forEach((b) => b.onclick = () => { s = +b.dataset.s; $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('#pPrice').innerHTML = rs(sz[s].price * q); });
    const upd = () => { $('#qv').textContent = q; $('#pPrice').innerHTML = rs(sz[s].price * q) + (p.was ? `<s>${rs(p.was * q)}</s>` : ''); };
    $('#qm').onclick = () => { q = Math.max(1, q - 1); upd(); };
    $('#qp').onclick = () => { q++; upd(); };
    $('#addBtn').onclick = () => { addToCart(p.id, s, q); $('#shipBox').innerHTML = shipBar(); };
    bindAdds($$('.rail', main)[0] || main);
  }

  function story() {
    main.innerHTML = `<section class="shop-head"><div class="wrap"><nav class="crumbs"><a href="#/">Home</a><span>/</span><span>How it’s made</span></nav><h1>Inside the solar dry house</h1><p>Why sun-dried in a closed house is better than sun-dried on a terrace, and how to get the most out of every pack.</p></div></section>
    <section class="sec"><div class="wrap band-grid">
      <div style="background:linear-gradient(180deg,#fdf0d0,#f3d9a8);border-radius:28px;padding:24px">${dryer}</div>
      <div><span class="eyebrow">The house</span><h2 class="h2" style="margin:8px 0 16px">Sun in, water out</h2>
        <p>Open-air drying on a terrace takes a week, and every gust brings dust and every bird takes a share. Our dry house is a closed greenhouse with a polycarbonate roof and a black floor. Sunlight heats the floor; the floor heats the air; solar fans pull that warm air across mesh trays and push the damp air out the top.</p>
        <p>The result: produce dries in 3 to 5 days, evenly, at a gentle 45–55 °C that keeps colour and flavour. Leaves go on the shaded upper racks so they stay green.</p>
        <div class="facts" style="color:var(--ink)"><div><b>2×</b><span class="muted">faster than open sun</span></div><div><b>Mesh</b><span class="muted">food-grade trays</span></div><div><b>&lt; 8%</b><span class="muted">final moisture</span></div></div></div>
    </div></section>
    <section class="sec explain" id="faq"><div class="wrap"><span class="eyebrow">Good to know</span><h2 class="h2" style="margin:8px 0 24px">Soaking, storing and cooking</h2>
      <div class="faq">${[
        ['How long do I soak?', 'Flakes: 5–10 minutes in warm water. Root cubes: 20 minutes. Leaves and powders: no soaking, add straight in. Vathal: no soaking, fry straight from the pack. Every product page tells you exactly.'],
        ['Should I use the soaking water?', 'Yes. It holds flavour and colour. Pour it into the pan with the flakes.'],
        ['How much do I use instead of fresh?', 'Roughly one tenth by weight. A handful of tomato flakes (10 g) replaces one medium tomato.'],
        ['How do I store an opened pack?', 'Squeeze out the air and close the zip. Keep it away from steam and the stove. In monsoon, move it into an airtight jar.'],
        ['Is anything added?', 'Flakes, leaves and powders: only the vegetable. Vathal: salt and buttermilk, the traditional way. Pickles: gingelly oil, salt and spices. No preservatives, colours or anti-caking agents in anything.'],
        ['Why is the colour slightly different from fresh?', 'Natural drying darkens produce a little. Once soaked and cooked, it looks and tastes like fresh.']
      ].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div></section>`;
    if (location.hash.endsWith('#faq')) setTimeout(() => $('#faq').scrollIntoView(), 50);
  }

  function checkout() {
    if (!cart.length) { main.innerHTML = `<div class="wrap empty"><h1>Your cart is empty</h1><p>Add something from the pantry first.</p><a class="btn btn-primary" href="#/shop">Shop the pantry</a></div>`; return; }
    const st = subtotal(), ship = st >= FREE ? 0 : 49;
    main.innerHTML = `<div class="wrap"><nav class="crumbs" style="padding-top:24px"><a href="#/">Home</a><span>/</span><span>Checkout</span></nav>
      <div class="checkout">
        <form id="coForm" novalidate>
          <h1 style="font-size:32px;font-weight:900;margin-bottom:24px">Where should we send it?</h1>
          <div class="row2"><div class="field"><label for="f-name">Full name</label><input id="f-name" required autocomplete="name"></div>
            <div class="field"><label for="f-phone">Mobile number</label><input id="f-phone" required inputmode="tel" autocomplete="tel" pattern="[0-9 +]{10,14}"></div></div>
          <div class="field"><label for="f-addr">Address</label><textarea id="f-addr" required autocomplete="street-address"></textarea></div>
          <div class="row2"><div class="field"><label for="f-city">City</label><input id="f-city" required autocomplete="address-level2"></div>
            <div class="field"><label for="f-pin">PIN code</label><input id="f-pin" required inputmode="numeric" pattern="[0-9]{6}" autocomplete="postal-code"></div></div>
          <h2 style="font-size:20px;margin:16px 0 12px">Delivery</h2>
          <label class="radio-card"><input type="radio" name="ship" checked>Standard · 3–5 days<span>${ship ? rs(ship) : 'Free'}</span></label>
          <label class="radio-card"><input type="radio" name="ship">Chennai & Coimbatore · next day<span>${rs(79)}</span></label>
          <h2 style="font-size:20px;margin:16px 0 12px">Payment</h2>
          <label class="radio-card"><input type="radio" name="pay" checked>UPI or cash on delivery</label>
          <p class="muted" style="font-size:13px">This is a demo store. No payment is taken and no order is sent.</p>
          <p id="coErr" role="alert" style="color:var(--danger);font-weight:700"></p>
          <button class="btn btn-primary" style="width:100%">Place order · ${rs(st + ship)}</button>
        </form>
        <aside class="summary"><h2 style="font-size:20px;margin-bottom:8px">Order summary</h2>
          ${cart.map((l) => { const { p, s, total } = lineInfo(l); return `<div class="line">${thumb(p)}<div><b>${esc(p.name)}</b><small>${s.label} × ${l.q}</small></div><div class="lp">${rs(total)}</div></div>`; }).join('')}
          <div style="margin-top:12px"><div class="sumrow"><span>Subtotal</span><span>${rs(st)}</span></div><div class="sumrow"><span>Delivery</span><span>${ship ? rs(ship) : 'Free'}</span></div>
          <div class="sumrow tot" style="border-top:1px solid var(--line);margin-top:8px;padding-top:12px"><span>Total</span><span>${rs(st + ship)}</span></div></div>
        </aside>
      </div></div>`;
    $('#coForm').onsubmit = (e) => {
      e.preventDefault();
      const bad = $$('input[required],textarea[required]', e.target).find((i) => !i.checkValidity());
      if (bad) { $('#coErr').textContent = `Please check ${$(`label[for="${bad.id}"]`).textContent.toLowerCase()}.`; bad.focus(); return; }
      const name = $('#f-name').value.split(' ')[0];
      cart = []; saveCart();
      location.hash = '#/done?n=' + encodeURIComponent(name);
    };
  }

  function done(params) {
    main.innerHTML = `<div class="wrap done">${thumb(byId['curry-leaves'])}<span class="eyebrow">Order placed</span><h1 style="font-size:40px;font-weight:900;margin:12px 0">Nandri, ${esc(params.get('n') || 'friend')}!</h1>
      <p class="muted" style="font-size:18px">Your pantry is being packed in the dry house. In a real store you would get a WhatsApp message with tracking.</p>
      <a class="btn btn-primary" href="#/shop" style="margin-top:16px">Keep browsing</a></div>`;
    $('.done .thumb').classList.add('art');
  }

  /* credits */
  $('#creditsBtn').onclick = () => {
    const m = $('#credits');
    m.innerHTML = `<div class="modal-in"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:22px">Photo credits</h2><button class="icon-btn" aria-label="Close" onclick="this.closest('dialog').close()">${ic('close')}</button></div>
      <p class="muted">Product illustrations are drawn in code. Reference photos are from Wikimedia Commons:</p>
      <ul>${Object.entries(CREDITS).map(([k, c]) => `<li><a href="${c.page}" target="_blank" rel="noopener">${esc(c.file)}</a> by ${esc(c.author)} · ${esc(c.license)}</li>`).join('')}</ul></div>`;
    m.showModal();
  };

  /* router */
  function route() {
    const h = location.hash.slice(1) || '/';
    const [path, qs] = h.split('?');
    const params = new URLSearchParams((qs || '').split('#')[0]);
    closeMega(); closeFilters();
    if (path.startsWith('/p/')) product(path.slice(3));
    else if (path === '/shop') shop(params);
    else if (path === '/story') story();
    else if (path === '/checkout') checkout();
    else if (path === '/done') done(params);
    else home();
    if (!h.includes('#faq')) scrollTo({ top: 0, behavior: 'instant' });
    const t = main.querySelector('h1'); document.title = (t && path !== '/' ? t.textContent + ' · ' : '') + 'Veyil · Sun-dried pantry';
    main.focus({ preventScroll: true });
  }
  // in-page anchors like #what should not trigger routing
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && !a.getAttribute('href').startsWith('#/')) { e.preventDefault(); const el = document.getElementById(a.getAttribute('href').slice(1)); el && el.scrollIntoView({ behavior: 'smooth' }); }
  });
  addEventListener('hashchange', route);
  saveCart();
  route();
})();
