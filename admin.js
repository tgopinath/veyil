/* Veyil admin — add, edit, hide and remove products. Built-in products live in
   data.js; anything saved here goes to /api/products and overrides by id. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rs = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  const BUILTIN = clone(PRODUCTS);
  const builtById = Object.fromEntries(BUILTIN.map((p) => [p.id, p]));
  let saved = [];          // admin items from the API
  let current = null;      // id being edited (null = new)
  let draft = null;        // working copy
  let dirty = false;
  let pvView = 'dried';

  /* ─── auth ─── */
  let auth = (() => { try { return sessionStorage.getItem('veyil.admin') || ''; } catch { return ''; } })();
  const setAuth = (v) => { auth = v; try { v ? sessionStorage.setItem('veyil.admin', v) : sessionStorage.removeItem('veyil.admin'); } catch {} };
  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { authorization: 'Basic ' + auth, ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { setAuth(''); showLogin('Your session ended. Please sign in again.'); throw new Error('auth'); }
    if (!r.ok) throw new Error(data.error || 'Something went wrong (' + r.status + ')');
    return data;
  }
  function showLogin(msg = '') { $('#shell').hidden = true; $('#login').hidden = false; $('#loginErr').textContent = msg; $('#lu').focus(); }
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true; $('#loginErr').textContent = '';
    setAuth(btoa(unescape(encodeURIComponent($('#lu').value + ':' + $('#lp').value))));
    try { await api('/api/products', { method: 'POST', body: JSON.stringify({ action: 'login' }) }); $('#lp').value = ''; start(); }
    catch (err) { if (err.message !== 'auth') $('#loginErr').textContent = err.message === 'Failed to fetch' ? 'The admin server is not running. Start it with: node server.mjs' : err.message; else $('#loginErr').textContent = 'Wrong username or password.'; }
    finally { btn.disabled = false; }
  };
  $('#logout').onclick = () => { if (!confirmLeave()) return; setAuth(''); showLogin(); };

  /* ─── merged catalogue ─── */
  const savedById = () => Object.fromEntries(saved.map((p) => [p.id, p]));
  function all() {
    const s = savedById();
    const list = BUILTIN.map((p) => s[p.id] || p);
    saved.forEach((p) => { if (!builtById[p.id]) list.push(p); });
    return list;
  }
  const status = (id) => !savedById()[id] ? 'built-in' : builtById[id] ? 'edited' : 'added';

  async function load() {
    const r = await fetch('/api/products', { cache: 'no-store' });
    saved = r.ok ? await r.json() : [];
  }
  async function start() {
    $('#login').hidden = true; $('#shell').hidden = false;
    try { await load(); } catch { toast('Could not load saved products'); }
    $('#shelfFilter').innerHTML = `<option value="">All shelves</option>` + TYPES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
    renderList();
    const want = location.hash.slice(1);
    want && all().some((p) => p.id === want) ? edit(want) : edit(null);
  }

  /* ─── list ─── */
  const artCache = {};
  const thumbOf = (p) => p.image ? `<img src="${esc(p.image)}" alt="">` : (artCache[p.id + (p.updated || '')] ||= Art.dried(p));
  function renderList() {
    const q = $('#q').value.trim().toLowerCase(), shelf = $('#shelfFilter').value;
    const items = all().filter((p) => (!shelf || p.type === shelf) && (!q || (p.name + ' ' + p.ta + ' ' + p.id).toLowerCase().includes(q)));
    const n = all(), s = saved;
    $('#stats').textContent = `${n.filter((p) => !p.hidden).length} live · ${s.filter((p) => !builtById[p.id]).length} added · ${s.filter((p) => builtById[p.id]).length} edited`;
    $('#list').innerHTML = items.map((p) => {
      const st = status(p.id);
      return `<li><button class="a-item${p.id === current ? ' on' : ''}" data-id="${esc(p.id)}"><span class="a-thumb art">${thumbOf(p)}</span>
        <span class="a-meta"><b>${esc(p.name)}</b><small>${esc((TYPES.find((t) => t.id === p.type) || {}).name || '')} · ${rs(p.price)}</small></span>
        <span class="a-tags">${p.hidden ? '<i class="t-hidden">Hidden</i>' : ''}${st !== 'built-in' ? `<i class="t-${st}">${st === 'added' ? 'New' : 'Edited'}</i>` : ''}</span></button></li>`;
    }).join('') || '<li class="muted" style="padding:16px">No products match.</li>';
    $$('.a-item').forEach((b) => b.onclick = () => edit(b.dataset.id));
  }
  $('#q').oninput = renderList;
  $('#shelfFilter').onchange = renderList;
  $('#newBtn').onclick = () => edit(null);

  /* ─── defaults & presets ─── */
  const LOOKS = [
    ['Tomato red', ['#c8341f', '#d9472b', '#b02b19', '#e0603a'], '#f6e2d4'],
    ['Onion pink', ['#e9cfd2', '#c98a9c', '#f2e2e2', '#b8708a'], '#f3e6ea'],
    ['Carrot orange', ['#e8761e', '#f08a2c', '#d8661a', '#f5a04a'], '#f8e7d3'],
    ['Beet ruby', ['#7a1238', '#931a47', '#5e0d2b', '#a8285a'], '#f2e0e7'],
    ['Leaf green', ['#3f6b2a', '#4d7a31', '#355c22', '#5a8a3a'], '#e5ecd9'],
    ['Turmeric gold', ['#e88a12', '#f09a1a', '#de7c0c', '#f5b040'], '#f8e8c8'],
    ['Root cream', ['#f0dca0', '#e8cf86', '#f4e3b2', '#e2c477'], '#f4ecd8'],
    ['Garlic ivory', ['#f1e4c4', '#e6d3a8', '#f8efd9', '#dcc592'], '#efe8da'],
    ['Berry dark', ['#5f5c3c', '#4f4c30', '#6e6a46', '#3f3d26'], '#ebe7d6'],
    ['Chilli red', ['#b8231a', '#cc2e20', '#9a1c14', '#de4a2a'], '#f5e0d6']
  ];
  const STYLES = [
    ['flake', 'Flakes'], ['ring', 'Rings'], ['slice', 'Round slices'], ['cube', 'Cubes'], ['leaf', 'Leaves'], ['leaflet', 'Small leaves'],
    ['crumble', 'Crumbled'], ['powder', 'Powder'], ['berry', 'Berries'], ['chili', 'Chillies'], ['okra', 'Okra rounds'], ['gourd', 'Gourd rings'],
    ['bean', 'Beans'], ['clove', 'Cloves'], ['jar', 'Pickle jar']
  ];
  const FORM_FOR = { flakes: 'flake', powders: 'powder', roots: 'slice', leaves: 'leaf', pickles: 'pickle', vathal: 'crisp', boxes: 'box' };
  const STYLE_FOR = { flakes: 'flake', powders: 'powder', roots: 'slice', leaves: 'leaf', pickles: 'jar', vathal: 'berry' };
  const READY = ['5 min', '10 min', '20 min', 'No soak', 'Instant', 'Fry direct', 'Simmer', 'Ready'];
  const blank = () => ({
    id: '', name: '', ta: '', type: 'flakes', form: 'flake', dishes: [], price: 129, was: null, g: 100, spice: 0, tags: ['new'],
    rating: null, reviews: 0, fresh: '', soak: '10 min', shelf: '9 months', blurb: '', what: '', ingredients: '', steps: ['', '', ''],
    image: '', freshImage: '', hidden: false, contains: [],
    art: { type: 'flake', colors: LOOKS[0][1].slice(), bg: LOOKS[0][2], skin: '#a07a48', oil: '#a8301a', cloth: '#c0392b', piece: 'cube', fresh: 'round' }
  });

  /* ─── editor ─── */
  function confirmLeave() { return !dirty || confirm('You have unsaved changes. Leave without saving?'); }
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  function edit(id) {
    if (id === current && draft) return;
    if (!confirmLeave()) return;
    current = id;
    const src = id ? all().find((p) => p.id === id) : null;
    draft = Object.assign(blank(), src ? clone(src) : {});
    draft.art = Object.assign(blank().art, draft.art || {});
    draft.steps = [0, 1, 2].map((i) => (draft.steps || [])[i] || '');
    draft.contains ||= [];
    dirty = false;
    history.replaceState(null, '', id ? '#' + id : location.pathname);
    pvView = 'dried';
    renderEditor(); renderList(); preview();
  }

  const field = (id, label, input, hint = '') => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<small class="hint">${hint}</small>` : ''}</div>`;
  const text = (k, opts = {}) => `<input id="f-${k}" data-k="${k}" value="${esc(draft[k] ?? '')}" ${opts.max ? `maxlength="${opts.max}"` : ''} ${opts.ph ? `placeholder="${esc(opts.ph)}"` : ''} ${opts.lang ? `lang="${opts.lang}"` : ''}>`;
  const numIn = (k, opts = {}) => `<input id="f-${k}" data-k="${k}" data-num type="number" inputmode="numeric" min="${opts.min ?? 0}" ${opts.step ? `step="${opts.step}"` : ''} value="${draft[k] ?? ''}" ${opts.ph ? `placeholder="${opts.ph}"` : ''}>`;
  const area = (k, max, ph = '') => `<textarea id="f-${k}" data-k="${k}" maxlength="${max}" placeholder="${esc(ph)}">${esc(draft[k] ?? '')}</textarea><span class="count" data-count="${k}">${(draft[k] || '').length}/${max}</span>`;

  function renderEditor() {
    const st = current ? status(current) : 'new', isBox = draft.type === 'boxes', isJar = draft.art.type === 'jar';
    const others = all().filter((p) => p.type !== 'boxes' && p.id !== draft.id);
    $('#editor').innerHTML = `
    <div class="e-head">
      <div><span class="eyebrow">${st === 'new' ? 'New product' : st === 'built-in' ? 'Built-in product' : st === 'edited' ? 'Built-in · edited' : 'Added in admin'}</span>
        <h1>${esc(draft.name || 'Untitled product')}</h1></div>
      <div class="e-actions">
        ${st === 'edited' ? '<button class="btn btn-ghost btn-sm" id="resetBtn">Reset to original</button>' : ''}
        ${st === 'added' ? '<button class="btn btn-ghost btn-sm danger" id="delBtn">Delete</button>' : ''}
        <button class="btn btn-primary" id="saveBtn">${st === 'new' ? 'Add to store' : 'Save changes'}</button>
      </div>
    </div>
    <p class="err" id="formErr" role="alert"></p>

    <section class="e-sec"><h2>Basics</h2>
      <div class="row2">${field('f-name', 'Name', text('name', { max: 60, ph: 'Drumstick Flakes' }))}${field('f-ta', 'Tamil name', text('ta', { max: 60, ph: 'முருங்கைக்காய் செதில்கள்', lang: 'ta' }))}</div>
      ${field('f-id', 'Web address', `<div class="prefix"><span>#/p/</span><input id="f-id" data-k="id" value="${esc(draft.id)}" ${st !== 'new' ? 'readonly' : ''} pattern="[a-z0-9-]+" placeholder="filled from the name"></div>`, st === 'new' ? 'Lowercase letters, numbers and dashes. Can’t change after saving.' : 'Fixed once saved.')}
      <div class="row2">${field('f-type', 'Shelf', `<select id="f-type" data-k="type">${TYPES.map((t) => `<option value="${t.id}" ${draft.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>`, 'Where it sits in the main menu.')}
        ${isBox ? '' : field('f-form', 'Form', `<select id="f-form" data-k="form">${Object.entries(FORMS).filter(([k]) => k !== 'box').map(([k, v]) => `<option value="${k}" ${draft.form === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`, 'Used by the Form filter.')}</div>
      <div class="field"><span class="lbl">Good for dishes</span><div class="toggles">${DISHES.map((d) => `<button type="button" class="tg" data-dish="${d.id}" aria-pressed="${draft.dishes.includes(d.id)}">${d.name}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Badges & visibility</span><div class="toggles">
        <button type="button" class="tg" data-tag="bestseller" aria-pressed="${draft.tags.includes('bestseller')}">Bestseller</button>
        <button type="button" class="tg" data-tag="new" aria-pressed="${draft.tags.includes('new')}">New</button>
        <button type="button" class="tg tg-hide" id="hideTg" aria-pressed="${!!draft.hidden}">Hidden from store</button></div></div>
    </section>

    <section class="e-sec"><h2>Price & pack</h2>
      <div class="row3">${field('f-price', 'Price (₹)', numIn('price', { min: 1 }))}
        ${isBox ? field('f-was', 'Price if bought separately (₹)', numIn('was', { ph: 'optional' }), 'Shows a “Save %” badge.') : field('f-g', isJar ? 'Jar weight (g)' : 'Pack weight (g)', numIn('g', { min: 1 }), 'Bigger sizes are worked out automatically.')}
        <div class="field"><span class="lbl">Spice</span><div class="seg-sm">${['None', 'Mild', 'Medium', 'Hot'].map((l, i) => `<button type="button" data-spice="${i}" aria-pressed="${draft.spice === i}">${l}</button>`).join('')}</div></div></div>
    </section>

    ${isBox ? `<section class="e-sec"><h2>What’s in the box <small class="muted">${draft.contains.length} picked</small></h2>
      <div class="picker">${others.map((p) => `<button type="button" class="pk" data-contain="${esc(p.id)}" aria-pressed="${draft.contains.includes(p.id)}"><span class="art">${p.image ? `<img src="${esc(p.image)}" alt="">` : (artCache[p.id + (p.updated || '')] ||= Art.dried(p))}</span>${esc(p.name)}</button>`).join('')}</div></section>` : ''}

    <section class="e-sec"><h2>Tell people what it is</h2>
      <div class="row3">${field('f-fresh', isBox ? 'Fresh produce in the box' : 'One pack equals', text('fresh', { max: 60, ph: '1 kg ripe tomatoes' }), 'Shown as “1 pack ≈ …”.')}
        ${field('f-soak', 'Ready in', `<input id="f-soak" data-k="soak" list="readyList" value="${esc(draft.soak)}" maxlength="24"><datalist id="readyList">${READY.map((r) => `<option value="${r}">`).join('')}</datalist>`)}
        ${field('f-shelf', 'Shelf life', text('shelf', { max: 24, ph: '9 months' }))}</div>
      ${field('f-blurb', 'Short line', area('blurb', 160, 'One sentence a shopper reads on the card.'))}
      ${field('f-what', 'What it is', area('what', 800, 'How it is grown, cut and dried, and what it tastes like.'))}
      ${field('f-ingredients', 'Ingredients', text('ingredients', { max: 300, ph: 'Drumsticks.' }))}
      <div class="field"><span class="lbl">How to use, in 3 steps</span>${[0, 1, 2].map((i) => `<div class="step"><span>${i + 1}</span><input data-step="${i}" value="${esc(draft.steps[i])}" maxlength="200" aria-label="Step ${i + 1}"></div>`).join('')}</div>
    </section>

    <section class="e-sec"><h2>Pictures</h2>
      <div class="row2">
        ${upload('image', 'Product photo', 'Optional. Replaces the drawing as the main picture. Square works best.')}
        ${isBox ? '' : upload('freshImage', 'Fresh produce photo', 'Optional. Shown as “Made from …”. If empty, a drawing is used.')}
      </div>
      ${isBox ? '' : `
      <div class="field"><span class="lbl">Drawing style ${draft.image ? '<small class="muted">· still used for the pack and thumbnails</small>' : ''}</span>
        <div class="styles">${STYLES.map(([k, l]) => `<button type="button" class="sty" data-style="${k}" aria-pressed="${draft.art.type === k}"><span class="art">${styleThumb(k)}</span>${l}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Colour presets</span><div class="toggles">${LOOKS.map(([l, c], i) => `<button type="button" class="tg look" data-look="${i}"><i style="background:linear-gradient(135deg,${c[0]} 50%,${c[1]} 50%)"></i>${l}</button>`).join('')}</div></div>
      <div class="colors">${[0, 1, 2, 3].map((i) => `<label class="sw">Colour ${i + 1}<input type="color" data-color="${i}" value="${draft.art.colors[i] || draft.art.colors[0]}"></label>`).join('')}
        <label class="sw">Background<input type="color" data-art="bg" value="${draft.art.bg}"></label>
        ${draft.art.type === 'slice' ? `<label class="sw">Skin<input type="color" data-art="skin" value="${draft.art.skin}"></label>` : ''}
        ${isJar ? `<label class="sw">Oil<input type="color" data-art="oil" value="${draft.art.oil}"></label><label class="sw">Cloth<input type="color" data-art="cloth" value="${draft.art.cloth}"></label>` : ''}</div>
      ${isJar ? field('f-piece', 'Pieces in the jar', `<select id="f-piece" data-art-sel="piece">${[['cube', 'Cubes (mango)'], ['wedge', 'Wedges (lime)'], ['clove', 'Cloves (garlic)'], ['berry', 'Whole berries (amla)'], ['paste', 'Paste (thokku)']].map(([k, l]) => `<option value="${k}" ${draft.art.piece === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`) : ''}
      ${draft.freshImage ? '' : field('f-freshshape', 'Fresh drawing', `<select id="f-freshshape" data-art-sel="fresh">${[['round', 'Round (tomato, mango, lime)'], ['root', 'Root (beet, yam)'], ['sprig', 'Sprig of leaves'], ['berries', 'Berries on a stem'], ['pod', 'Long pods (chilli, banana)']].map(([k, l]) => `<option value="${k}" ${draft.art.fresh === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`, 'Shown when there is no fresh photo.')}`}
    </section>
    <div class="e-foot"><button class="btn btn-primary" id="saveBtn2">${st === 'new' ? 'Add to store' : 'Save changes'}</button></div>`;
    bindEditor();
  }
  function upload(k, label, hint) {
    return `<div class="field"><span class="lbl">${label}</span>
      <div class="up">${draft[k] ? `<img src="${esc(draft[k])}" alt="">` : '<span class="up-empty">No photo</span>'}
        <div><label class="btn btn-ghost btn-sm up-btn">${draft[k] ? 'Replace' : 'Upload'}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${k}" hidden></label>
        ${draft[k] ? `<button type="button" class="link" data-clear="${k}">Remove</button>` : ''}<small class="hint">${hint}</small></div></div></div>`;
  }
  const styleCache = {};
  function styleThumb(k) {
    return styleCache[k] ||= Art.dried({ id: 'sty-' + k, name: k, ta: '', g: 100, type: k === 'jar' ? 'pickles' : 'flakes',
      art: { type: k, colors: ['#b98a5e', '#c99c6a', '#a8784a', '#d8b080'], bg: '#efe6d6', skin: '#7a5432', oil: '#a8301a', cloth: '#8a6a4a', piece: 'cube' } });
  }

  function change() {
    dirty = true;
    $('#editor h1').textContent = draft.name || 'Untitled product';
    clearTimeout(change.t); change.t = setTimeout(preview, 120);
  }
  function bindEditor() {
    const ed = $('#editor');
    $$('[data-k]', ed).forEach((el) => el.addEventListener('input', () => {
      const k = el.dataset.k;
      draft[k] = el.hasAttribute('data-num') ? (el.value === '' ? null : Number(el.value)) : el.value;
      if (k === 'name' && !current) { draft.id = slug(el.value); $('#f-id').value = draft.id; }
      if (k === 'id') { el.value = el.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); draft.id = el.value; }
      const c = $(`[data-count="${k}"]`, ed); if (c) c.textContent = `${el.value.length}/${el.maxLength}`;
      if (k === 'type') {
        draft.form = FORM_FOR[el.value]; if (STYLE_FOR[el.value]) draft.art.type = STYLE_FOR[el.value];
        if (el.value === 'boxes') { draft.art = { ...draft.art, type: 'box' }; draft.g = 0; } else if (draft.art.type === 'box') draft.art.type = STYLE_FOR[el.value];
        if (el.value !== 'boxes' && !draft.g) draft.g = 100;
        renderEditor();
      }
      change();
    }));
    $$('[data-step]', ed).forEach((el) => el.oninput = () => { draft.steps[el.dataset.step] = el.value; change(); });
    const toggle = (el, arr, v) => { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); el.setAttribute('aria-pressed', String(i < 0)); change(); };
    $$('[data-dish]', ed).forEach((b) => b.onclick = () => toggle(b, draft.dishes, b.dataset.dish));
    $$('[data-tag]', ed).forEach((b) => b.onclick = () => toggle(b, draft.tags, b.dataset.tag));
    $$('[data-contain]', ed).forEach((b) => b.onclick = () => { toggle(b, draft.contains, b.dataset.contain); $('.e-sec h2 small', ed) && ($$('.e-sec h2 small', ed)[0].textContent = draft.contains.length + ' picked'); });
    $('#hideTg').onclick = (e) => { draft.hidden = !draft.hidden; e.currentTarget.setAttribute('aria-pressed', String(draft.hidden)); change(); };
    $$('[data-spice]', ed).forEach((b) => b.onclick = () => { draft.spice = +b.dataset.spice; $$('[data-spice]', ed).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); change(); });
    $$('[data-style]', ed).forEach((b) => b.onclick = () => {
      draft.art.type = b.dataset.style;
      if (b.dataset.style === 'jar') draft.form = 'pickle';
      renderEditor(); change();
    });
    $$('[data-look]', ed).forEach((b) => b.onclick = () => {
      const [, c, bg] = LOOKS[b.dataset.look]; draft.art.colors = c.slice(); draft.art.bg = bg;
      $$('[data-color]', ed).forEach((inp) => inp.value = c[inp.dataset.color]); $('[data-art="bg"]', ed).value = bg; change();
    });
    $$('[data-color]', ed).forEach((inp) => inp.oninput = () => { draft.art.colors[inp.dataset.color] = inp.value; change(); });
    $$('[data-art]', ed).forEach((inp) => inp.oninput = () => { draft.art[inp.dataset.art] = inp.value; change(); });
    $$('[data-art-sel]', ed).forEach((sel) => sel.onchange = () => { draft.art[sel.dataset.artSel] = sel.value; if (sel.dataset.artSel === 'fresh') pvView = 'fresh'; change(); });
    $$('[data-upload]', ed).forEach((inp) => inp.onchange = () => uploadImage(inp.dataset.upload, inp.files[0]));
    $$('[data-clear]', ed).forEach((b) => b.onclick = () => { draft[b.dataset.clear] = ''; renderEditor(); change(); });
    $('#saveBtn').onclick = save; $('#saveBtn2').onclick = save;
    const del = $('#delBtn'); if (del) del.onclick = () => remove(`Delete “${draft.name}” from the store? This can’t be undone.`);
    const rst = $('#resetBtn'); if (rst) rst.onclick = () => remove(`Undo all your changes to “${draft.name}” and go back to the original?`);
  }

  /* ─── photos: resized in the browser before upload ─── */
  async function uploadImage(k, file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('Use a JPEG, PNG or WebP photo'); return; }
    toast('Uploading photo…');
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
      const { url } = await api(`/api/upload?name=${encodeURIComponent((draft.id || 'product') + (k === 'freshImage' ? '-fresh' : ''))}`, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob });
      draft[k] = url; if (k === 'image') pvView = 'dried';
      renderEditor(); change(); toast('Photo added. Save to publish it.');
    } catch (e) { if (e.message !== 'auth') toast(e.message); }
  }

  /* ─── save / delete ─── */
  function validate() {
    const miss = [];
    if (!draft.name.trim()) miss.push(['f-name', 'a name']);
    if (!current && !/^[a-z0-9][a-z0-9-]{1,40}$/.test(draft.id)) miss.push(['f-id', 'a web address']);
    if (!current && all().some((p) => p.id === draft.id)) return [['f-id', null, 'That web address is already used by another product.']];
    if (!draft.price) miss.push(['f-price', 'a price']);
    if (!draft.blurb.trim()) miss.push(['f-blurb', 'a short line']);
    if (draft.type === 'boxes' && draft.contains.length < 2) miss.push([null, 'at least 2 products in the box']);
    return miss;
  }
  async function save() {
    const miss = validate();
    if (miss.length) {
      $('#formErr').textContent = miss[0][2] || 'Please add ' + miss.map((m) => m[1]).join(', ') + '.';
      const el = miss[0][0] && $('#' + miss[0][0]); el ? el.focus() : $('#formErr').scrollIntoView({ block: 'center' });
      return;
    }
    $('#formErr').textContent = '';
    const btns = $$('#saveBtn,#saveBtn2'); btns.forEach((b) => b.disabled = true);
    try {
      const out = { ...draft, steps: draft.steps.filter((s) => s.trim()) };
      const { product } = await api('/api/products', { method: 'POST', body: JSON.stringify({ action: 'save', product: out }) });
      const i = saved.findIndex((p) => p.id === product.id); i >= 0 ? (saved[i] = product) : saved.push(product);
      dirty = false; const wasNew = !current; current = null; draft = null;
      edit(product.id);
      toast(wasNew ? `${product.name} is now in the store` : 'Saved. The store shows it on next load.');
    } catch (e) { if (e.message !== 'auth') $('#formErr').textContent = e.message; }
    finally { btns.forEach((b) => b.disabled = false); }
  }
  async function remove(question) {
    if (!confirm(question)) return;
    try {
      await api('/api/products', { method: 'POST', body: JSON.stringify({ action: 'delete', id: draft.id }) });
      const wasBuiltIn = !!builtById[draft.id], id = draft.id;
      saved = saved.filter((p) => p.id !== id);
      dirty = false; current = null; draft = null;
      edit(wasBuiltIn ? id : null);
      toast(wasBuiltIn ? 'Back to the original' : 'Deleted');
    } catch (e) { if (e.message !== 'auth') toast(e.message); }
  }

  /* ─── live preview: same drawing + card markup as the store ─── */
  function preview() {
    if (!draft) return;
    const p = { ...draft, id: draft.id || 'preview', name: draft.name || 'Untitled product', rating: draft.rating || null };
    if (p.type === 'boxes') p.art = { type: 'box', bg: draft.art.bg || '#efe2cc' };
    const views = [['dried', p.type === 'boxes' ? 'Box' : p.art.type === 'jar' ? 'Jar' : 'Main'], ...(p.type === 'boxes' || p.art.type === 'jar' ? [] : [['pack', 'Pack']]), ...(p.type === 'boxes' ? [] : [['fresh', 'Fresh']])];
    if (!views.some(([k]) => k === pvView)) pvView = 'dried';
    $('#pvTabs').innerHTML = views.map(([k, l]) => `<button type="button" data-pv="${k}" aria-pressed="${k === pvView}">${l}</button>`).join('');
    $$('[data-pv]').forEach((b) => b.onclick = () => { pvView = b.dataset.pv; preview(); });
    const big = (v) => v === 'dried' && p.image ? `<img src="${esc(p.image)}" alt="">` : v === 'fresh' && p.freshImage ? `<img src="${esc(p.freshImage)}" alt="">` : Art[v === 'pack' ? 'pack' : v === 'fresh' ? 'fresh' : 'dried'](p);
    $('#pvStage').innerHTML = `<div class="art">${big(pvView)}</div>`;
    const badge = p.was ? `<span class="badge save">Save ${Math.max(0, Math.round((1 - p.price / p.was) * 100))}%</span>` : p.tags.includes('new') ? '<span class="badge new">New</span>' : p.tags.includes('bestseller') ? '<span class="badge best">Bestseller</span>' : '';
    const made = (p.fresh || '').replace(/^[\d.,]+\s*(kg|g)\s*(of\s*)?/, '');
    $('#pvCard').innerHTML = `<article class="card${p.hidden ? ' is-hidden' : ''}">
      <div class="art"><div class="main">${big('dried')}</div>${badge}${p.type !== 'boxes' && made ? `<span class="from">${p.freshImage ? `<img src="${esc(p.freshImage)}" alt="">` : `<span class="sw art">${Art.fresh(p)}</span>`}Made from ${esc(made)}</span>` : ''}</div>
      <div class="card-b"><h3>${esc(p.name)}</h3><span class="ta" lang="ta">${esc(p.ta)}</span>
        ${p.fresh ? `<span class="equiv"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>1 pack ≈ ${esc(p.fresh)}</span>` : ''}
        <div class="chips">${p.soak ? `<span class="chip">${esc(p.soak)}</span>` : ''}${p.spice ? `<span class="chip ${p.spice > 2 ? 'hot' : ''}">${['', 'Mild', 'Medium', 'Hot'][p.spice]}</span>` : ''}</div>
        <div class="card-f"><span class="price">${rs(p.price)}${p.was ? `<s>${rs(p.was)}</s>` : p.g ? `<small>${p.g} g</small>` : ''}</span><span class="add">+ Add</span></div>
      </div></article>${p.hidden ? '<p class="pv-note">Hidden: shoppers won’t see this product.</p>' : ''}`;
  }

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000); }

  auth ? api('/api/products', { method: 'POST', body: JSON.stringify({ action: 'login' }) }).then(start).catch((e) => { if (e.message !== 'auth') showLogin('The admin server is not running. Start it with: node server.mjs'); }) : showLogin();
})();
