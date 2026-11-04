/* Veyil product art — every packshot is drawn here, procedurally, from the
   product's art spec. Same seed → same picture, so a product always looks the
   same everywhere. Three scenes: bowl (dried), jar (pickles), pouch (pack),
   plus a kraft box that nests mini bowls for the pantry boxes. */
(function () {
  let uid = 0;

  function rng(seed) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      return h / 4294967296;
    };
  }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (h, t, amt) => { const a = hex(h), b = hex(t); return toHex(a.map((v, i) => v + (b[i] - v) * amt)); };
  const dark = (h, a) => mix(h, '#1a0f08', a);
  const light = (h, a) => mix(h, '#ffffff', a);
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const f = (n) => Math.round(n * 10) / 10;

  /* ─── pieces: each returns markup centred on 0,0 ─── */
  const P = {
    flake(r, s, c) {
      const n = 7 + Math.floor(r() * 4), sx = 1 + r() * 0.6, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, rr = s * (0.55 + r() * 0.45);
        pts.push(f(Math.cos(a) * rr * sx) + ',' + f(Math.sin(a) * rr));
      }
      const inner = pts.map((p) => p.split(',').map((v) => f(v * 0.5)).join(',')).join(' ');
      return `<polygon points="${pts.join(' ')}" fill="${c}" stroke="${dark(c, 0.28)}" stroke-width="1.2" stroke-linejoin="round"/>
        <polygon points="${inner}" fill="${light(c, 0.35)}" opacity=".35"/>
        <path d="M${f(-s * 0.4 * sx)} ${f(s * 0.1)}q${f(s * 0.4)} ${f(-s * 0.3)} ${f(s * 0.8 * sx)} ${f(-s * 0.1)}" stroke="${dark(c, 0.35)}" stroke-width=".8" fill="none" opacity=".5"/>`;
    },
    ring(r, s, c, pal) {
      const a0 = r() * 6.28, span = 2.6 + r() * 2.8, out = [];
      const arc = (rad, col, w) => {
        const x0 = Math.cos(a0) * rad, y0 = Math.sin(a0) * rad * 0.82;
        const x1 = Math.cos(a0 + span) * rad, y1 = Math.sin(a0 + span) * rad * 0.82;
        return `<path d="M${f(x0)} ${f(y0)}A${f(rad)} ${f(rad * 0.82)} 0 ${span > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}" stroke="${col}" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`;
      };
      out.push(arc(s, light(c, 0.2), s * 0.3), arc(s * 1.12, pal[1], s * 0.09));
      if (r() > 0.4) out.push(arc(s * 0.62, light(c, 0.3), s * 0.2), arc(s * 0.7, pal[3], s * 0.05));
      return out.join('');
    },
    slice(r, s, c, pal, art) {
      const sy = 0.78 + r() * 0.22;
      let m = `<ellipse rx="${f(s)}" ry="${f(s * sy)}" fill="${c}" stroke="${art.skin}" stroke-width="${f(s * 0.11)}"/>
        <ellipse rx="${f(s * 0.7)}" ry="${f(s * 0.7 * sy)}" fill="none" stroke="${dark(c, 0.18)}" stroke-width="1" opacity=".45"/>
        <ellipse cx="${f(-s * 0.25)}" cy="${f(-s * 0.25 * sy)}" rx="${f(s * 0.35)}" ry="${f(s * 0.2)}" fill="#fff" opacity=".22"/>`;
      if (art.fibre) for (let i = 0; i < 9; i++) {
        const a = r() * 6.28, l = s * (0.3 + r() * 0.5);
        m += `<line x1="0" y1="0" x2="${f(Math.cos(a) * l)}" y2="${f(Math.sin(a) * l * sy)}" stroke="${dark(c, 0.25)}" stroke-width=".8" opacity=".5"/>`;
      }
      return m;
    },
    cube(r, s, c) {
      const w = s * (1 + r() * 0.3), h = s * (0.9 + r() * 0.3);
      return `<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(s * 0.22)}" fill="${c}" stroke="${dark(c, 0.3)}" stroke-width="1.1"/>
        <path d="M${f(-w / 2 + 3)} ${f(-h / 2 + 3)}h${f(w * 0.6)}" stroke="${light(c, 0.5)}" stroke-width="${f(s * 0.12)}" stroke-linecap="round" opacity=".6"/>`;
    },
    leaf(r, s, c, pal, art) {
      const L = art.round ? s * 0.95 : s * 1.4, w = (art.round ? 0.66 : 0.56) * s * (0.8 + r() * 0.3), bend = (r() - 0.5) * w * 0.8;
      return `<path d="M0 ${f(-L)}C${f(w + bend)} ${f(-L * 0.5)} ${f(w + bend)} ${f(L * 0.5)} 0 ${f(L)}C${f(-w + bend)} ${f(L * 0.5)} ${f(-w + bend)} ${f(-L * 0.5)} 0 ${f(-L)}z" fill="${c}" stroke="${dark(c, 0.3)}" stroke-width="1"/>
        <path d="M0 ${f(-L * 0.9)}Q${f(bend * 0.6)} 0 0 ${f(L * 1.15)}" stroke="${light(c, 0.35)}" stroke-width="1.1" fill="none" opacity=".8"/>
        <path d="M0 ${f(-L * 0.3)}l${f(w * 0.6)} ${f(-L * 0.18)}M0 ${f(L * 0.2)}l${f(-w * 0.6)} ${f(-L * 0.18)}M0 ${f(-L * 0.05)}l${f(-w * 0.55)} ${f(-L * 0.16)}M0 ${f(L * 0.45)}l${f(w * 0.5)} ${f(-L * 0.15)}" stroke="${light(c, 0.25)}" stroke-width=".7" opacity=".55"/>`;
    },
    leaflet(r, s, c) {
      const L = s * 0.62, w = s * 0.38;
      return `<ellipse rx="${f(w)}" ry="${f(L)}" fill="${c}" stroke="${dark(c, 0.3)}" stroke-width=".9"/><line y1="${f(-L * 0.8)}" y2="${f(L * 0.8)}" stroke="${light(c, 0.3)}" stroke-width=".7" opacity=".7"/>`;
    },
    crumble(r, s, c) {
      const n = 5 + Math.floor(r() * 3), pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * 6.28, rr = s * 0.42 * (0.4 + r() * 0.6); pts.push(f(Math.cos(a) * rr) + ',' + f(Math.sin(a) * rr)); }
      return `<polygon points="${pts.join(' ')}" fill="${c}" stroke="${dark(c, 0.25)}" stroke-width=".6"/>`;
    },
    berry(r, s, c, pal, art) {
      const rr = s * (art.tiny ? 0.36 : 0.55) * (0.85 + r() * 0.3);
      return `<circle r="${f(rr)}" fill="${c}" stroke="${dark(c, 0.4)}" stroke-width=".8"/>
        <path d="M${f(-rr * 0.5)} ${f(rr * 0.1)}q${f(rr * 0.5)} ${f(rr * 0.4)} ${f(rr)} 0" stroke="${dark(c, 0.45)}" stroke-width=".8" fill="none" opacity=".7"/>
        <ellipse cx="${f(-rr * 0.32)}" cy="${f(-rr * 0.35)}" rx="${f(rr * 0.32)}" ry="${f(rr * 0.2)}" fill="#fff" opacity=".35"/>`;
    },
    chili(r, s, c) {
      const L = s * 1.6, bow = (r() - 0.3) * s * 0.9;
      return `<path d="M${f(-L)} 0Q0 ${f(bow)} ${f(L)} ${f(-s * 0.15)}" stroke="${dark(c, 0.25)}" stroke-width="${f(s * 0.68)}" fill="none" stroke-linecap="round"/>
        <path d="M${f(-L)} 0Q0 ${f(bow)} ${f(L)} ${f(-s * 0.15)}" stroke="${c}" stroke-width="${f(s * 0.58)}" fill="none" stroke-linecap="round"/>
        <path d="M${f(-L * 0.7)} ${f(-s * 0.08)}Q0 ${f(bow - s * 0.12)} ${f(L * 0.6)} ${f(-s * 0.22)}" stroke="#fff" stroke-width="${f(s * 0.08)}" fill="none" stroke-linecap="round" opacity=".55"/>
        <path d="M${f(-L - s * 0.1)} 0l${f(-s * 0.35)} ${f(-s * 0.2)}" stroke="#8a7a40" stroke-width="${f(s * 0.16)}" stroke-linecap="round"/>`;
    },
    okra(r, s, c) {
      const rr = s * 0.62, star = [];
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28, d = i % 2 ? rr * 0.35 : rr * 0.62; star.push(f(Math.cos(a) * d) + ',' + f(Math.sin(a) * d)); }
      let seeds = '';
      for (let i = 0; i < 5; i++) { const a = ((i + 0.5) / 5) * 6.28; seeds += `<circle cx="${f(Math.cos(a) * rr * 0.6)}" cy="${f(Math.sin(a) * rr * 0.6)}" r="${f(rr * 0.12)}" fill="${dark(c, 0.3)}"/>`; }
      return `<circle r="${f(rr)}" fill="${c}" stroke="${dark(c, 0.35)}" stroke-width="1.4"/><polygon points="${star.join(' ')}" fill="${light(c, 0.45)}"/>${seeds}`;
    },
    gourd(r, s, c) {
      const rr = s * 0.78; let bumps = '';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28; bumps += `<circle cx="${f(Math.cos(a) * rr)}" cy="${f(Math.sin(a) * rr)}" r="${f(rr * 0.13)}" fill="${c}"/>`; }
      let seeds = '';
      for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = rr * 0.25 * r(); seeds += `<ellipse cx="${f(Math.cos(a) * d)}" cy="${f(Math.sin(a) * d)}" rx="${f(rr * 0.09)}" ry="${f(rr * 0.05)}" fill="#c9a86a"/>`; }
      return `${bumps}<circle r="${f(rr)}" fill="${c}" stroke="${dark(c, 0.3)}" stroke-width="1"/><circle r="${f(rr * 0.55)}" fill="${light(c, 0.55)}"/>${seeds}`;
    },
    bean(r, s, c) {
      const L = s * 1.3, w = s * 0.24;
      let seg = '';
      for (let i = -2; i <= 2; i++) seg += `<ellipse cx="${f(i * L * 0.36)}" rx="${f(L * 0.15)}" ry="${f(w * 0.7)}" fill="${light(c, 0.2)}" opacity=".7"/>`;
      return `<rect x="${f(-L)}" y="${f(-w)}" width="${f(L * 2)}" height="${f(w * 2)}" rx="${f(w)}" fill="${c}" stroke="${dark(c, 0.3)}" stroke-width="1"/>${seg}`;
    },
    clove(r, s, c, pal, art) {
      if (art.flat) {
        const w = s * 0.75, h = s * 0.52;
        return `<ellipse rx="${f(w)}" ry="${f(h)}" fill="${c}" stroke="${dark(c, 0.22)}" stroke-width="1"/><ellipse rx="${f(w * 0.55)}" ry="${f(h * 0.25)}" fill="${light(c, 0.5)}" opacity=".6"/>`;
      }
      const h = s * 0.9;
      return `<path d="M0 ${f(-h)}C${f(s * 0.6)} ${f(-h * 0.3)} ${f(s * 0.55)} ${f(h)} 0 ${f(h)}C${f(-s * 0.55)} ${f(h)} ${f(-s * 0.6)} ${f(-h * 0.3)} 0 ${f(-h)}z" fill="${c}" stroke="${dark(c, 0.3)}" stroke-width="1"/><path d="M${f(-s * 0.15)} ${f(-h * 0.5)}q-3 ${f(h * 0.6)} 2 ${f(h * 1.1)}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5"/>`;
    },
    wedge(r, s, c) {
      const R = s * 0.9;
      return `<path d="M0 0L${f(R)} 0A${f(R)} ${f(R)} 0 0 1 ${f(-R)} 0z" fill="${dark(c, 0.15)}" stroke="${dark(c, 0.4)}" stroke-width="1.2"/>
        <path d="M0 0L${f(R * 0.8)} 0A${f(R * 0.8)} ${f(R * 0.8)} 0 0 1 ${f(-R * 0.8)} 0z" fill="${light(c, 0.15)}"/>
        <path d="M0 0L${f(R * 0.55)} ${f(R * 0.55)}M0 0V${f(R * 0.8)}M0 0L${f(-R * 0.55)} ${f(R * 0.55)}" stroke="${dark(c, 0.2)}" stroke-width="1"/>`;
    }
  };

  /* scatter count/size per type */
  const DENSITY = {
    flake: [150, 15], ring: [96, 18], slice: [62, 22], cube: [96, 15], leaf: [120, 15], leaflet: [380, 9],
    crumble: [620, 13], berry: [280, 14], chili: [60, 16], okra: [120, 15], gourd: [58, 20], bean: [92, 13],
    clove: [170, 13], wedge: [28, 22]
  };

  function scatter(r, art, cx, cy, R, count, size, type) {
    const draw = P[type || art.type];
    let out = '';
    for (let i = 0; i < count; i++) {
      // sqrt for even spread; a little denser in the middle for a heaped look
      const a = r() * 6.28, d = Math.sqrt(r()) * R * (1 - (i / count) * 0.38);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      const s = size * (0.75 + r() * 0.5), c = pick(r, art.colors);
      out += `<g transform="translate(${f(x)} ${f(y)}) rotate(${Math.round(r() * 360)})">${draw(r, s, c, art.colors, art)}</g>`;
    }
    return out;
  }

  const BOWLS = {
    ceramic: { rim: '#fbf7f0', in: '#efe6d8', edge: '#d9ccb6' },
    stone:   { rim: '#4a4744', in: '#2f2c2a', edge: '#1f1d1b' },
    clay:    { rim: '#c0663e', in: '#9c4c2c', edge: '#7a3a20' },
    brass:   { rim: '#e3c26a', in: '#b88a2c', edge: '#8a6418' },
    wood:    { rim: '#a8744a', in: '#7f5432', edge: '#5e3b22' }
  };
  const bowlFor = (p) => p.art.bowl || ({ flakes: p.id === 'garlic-flakes' ? 'stone' : 'ceramic', powders: 'ceramic', roots: p.id === 'tapioca-chips' ? 'stone' : 'wood', leaves: 'clay', vathal: 'brass' }[p.type] || 'ceramic');

  function defsCommon(id, bg) {
    return `<radialGradient id="${id}l" cx=".3" cy=".22" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient>
      <linearGradient id="${id}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light(bg, 0.25)}"/><stop offset="1" stop-color="${dark(bg, 0.06)}"/></linearGradient>`;
  }
  const backdrop = (id) => `<rect width="400" height="400" fill="url(#${id}bg)"/><rect width="400" height="400" filter="url(#vy-grain)" opacity=".5"/>`;

  /* ─── scenes ─── */
  function bowlScene(p, opt = {}) {
    const id = 'v' + (++uid), art = p.art, r = rng(p.id), B = BOWLS[bowlFor(p)];
    const [count, size] = DENSITY[art.type] || [60, 14];
    let content;
    if (art.type === 'powder') {
      const [c0, c1, c2] = art.colors;
      let specks = '';
      for (let i = 0; i < 260; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * 112;
        specks += `<circle cx="${f(200 + Math.cos(a) * d)}" cy="${f(200 + Math.sin(a) * d)}" r="${f(0.6 + r() * 1.4)}" fill="${i % 7 === 0 && art.specks ? art.specks : pick(r, [dark(c0, 0.25), light(c0, 0.2), c2])}" opacity=".85"/>`;
      }
      content = `<radialGradient id="${id}m" cx=".42" cy=".4" r=".6"><stop offset="0" stop-color="${light(c1, 0.18)}"/><stop offset=".7" stop-color="${c0}"/><stop offset="1" stop-color="${dark(c2, 0.15)}"/></radialGradient>
        <circle cx="200" cy="200" r="124" fill="url(#${id}m)"/>
        <ellipse cx="186" cy="182" rx="60" ry="44" fill="#fff" opacity=".1"/>${specks}`;
    } else {
      content = scatter(r, art, 200, 200, 140, art.tiny ? count * 1.6 : count, size);
    }
    // a few pieces spilled on the table
    const spill = art.type === 'powder'
      ? `<ellipse cx="338" cy="352" rx="26" ry="9" fill="${art.colors[0]}" opacity=".85" filter="url(#vy-grain-c)"/><ellipse cx="320" cy="360" rx="8" ry="3" fill="${art.colors[2]}" opacity=".7"/>`
      : scatter(rng(p.id + 's'), art, 338, 344, 30, 5, size, null);
    const spoon = art.type === 'powder'
      ? `<g transform="translate(300 96) rotate(38)"><rect x="-6" y="-110" width="12" height="120" rx="6" fill="#9a6a3e"/><rect x="-2" y="-106" width="3" height="110" rx="1.5" fill="#c99868" opacity=".6"/><ellipse cy="26" rx="24" ry="30" fill="#8a5c34"/><ellipse cy="28" rx="18" ry="23" fill="${art.colors[0]}"/><ellipse cx="-4" cy="22" rx="8" ry="10" fill="#fff" opacity=".12"/></g>`
      : '';
    return svg(id, `<defs>${defsCommon(id, art.bg)}
        <radialGradient id="${id}b" cx=".45" cy=".42" r=".6"><stop offset="0" stop-color="${B.in}"/><stop offset=".85" stop-color="${dark(B.in, 0.1)}"/><stop offset="1" stop-color="${dark(B.in, 0.28)}"/></radialGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(B.rim, 0.25)}"/><stop offset=".6" stop-color="${B.rim}"/><stop offset="1" stop-color="${B.edge}"/></linearGradient>
        <clipPath id="${id}c"><circle cx="200" cy="200" r="132"/></clipPath></defs>
      ${backdrop(id)}
      <ellipse cx="216" cy="226" rx="160" ry="150" fill="#2a1a0c" opacity=".22" filter="url(#vy-blur)"/>
      <circle cx="200" cy="200" r="158" fill="url(#${id}r)"/>
      <circle cx="200" cy="200" r="134" fill="url(#${id}b)"/>
      <g clip-path="url(#${id}c)"><g filter="url(#vy-drop)">${content}</g>
        <circle cx="200" cy="200" r="133" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="14" filter="url(#vy-blur-s)"/></g>
      <path d="M78 120A150 150 0 0 1 200 48" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g filter="url(#vy-drop)">${spill}${spoon}</g>
      <rect width="400" height="400" fill="url(#${id}l)"/>`, opt);
  }

  function jarScene(p, opt = {}) {
    const id = 'v' + (++uid), art = p.art, r = rng(p.id);
    const body = 'M118 150Q112 150 112 166V334Q112 358 140 358H260Q288 358 288 334V166Q288 150 282 150Z';
    let pieces = '';
    if (art.piece === 'paste') {
      for (let i = 0; i < 180; i++) pieces += `<circle cx="${f(116 + r() * 168)}" cy="${f(196 + r() * 160)}" r="${f(2 + r() * 7)}" fill="${pick(r, art.colors)}" opacity=".85"/>`;
      for (let i = 0; i < 80; i++) pieces += `<circle cx="${f(116 + r() * 168)}" cy="${f(196 + r() * 160)}" r="${f(0.8 + r() * 1.4)}" fill="${pick(r, ['#2a1a10', '#f0d070', '#5a1a0a'])}"/>`;
    } else {
      const sz = { cube: 22, wedge: 26, clove: 18, berry: 30 }[art.piece] || 20;
      for (let i = 0; i < 30; i++) {
        const x = 124 + r() * 152, y = 200 + r() * 150, c = pick(r, art.colors);
        pieces += `<g transform="translate(${f(x)} ${f(y)}) rotate(${Math.round(r() * 360)})">${P[art.piece](r, sz * (0.8 + r() * 0.4), c, art.colors, art)}</g>`;
      }
      for (let i = 0; i < 90; i++) pieces += `<circle cx="${f(116 + r() * 168)}" cy="${f(190 + r() * 165)}" r="${f(0.8 + r() * 1.6)}" fill="${pick(r, ['#2a1a10', '#3a2010', '#f0c060', '#b03010'])}" opacity=".9"/>`;
    }
    const ta = p.ta.length > 12 ? p.ta.slice(0, 12) + '…' : p.ta;
    return svg(id, `<defs>${defsCommon(id, art.bg)}
        <clipPath id="${id}c"><path d="${body}"/></clipPath>
        <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light(art.oil, 0.15)}" stop-opacity=".95"/><stop offset="1" stop-color="${dark(art.oil, 0.35)}"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".12" stop-color="#fff" stop-opacity=".55"/><stop offset=".2" stop-color="#fff" stop-opacity=".05"/><stop offset=".82" stop-color="#fff" stop-opacity="0"/><stop offset=".9" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
        <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light(art.cloth, 0.15)}"/><stop offset="1" stop-color="${dark(art.cloth, 0.25)}"/></linearGradient></defs>
      ${backdrop(id)}
      <ellipse cx="206" cy="362" rx="118" ry="16" fill="#2a1a0c" opacity=".3" filter="url(#vy-blur)"/>
      <g clip-path="url(#${id}c)"><rect x="100" y="150" width="200" height="220" fill="#fff" opacity=".18"/>
        <rect x="100" y="186" width="200" height="190" fill="url(#${id}o)"/>
        <ellipse cx="200" cy="186" rx="100" ry="6" fill="${light(art.oil, 0.35)}" opacity=".7"/>
        <g filter="url(#vy-drop)">${pieces}</g></g>
      <path d="${body}" fill="url(#${id}g)" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
      <rect x="126" y="128" width="148" height="26" rx="6" fill="#d9d3c8" stroke="#a49c8e"/>
      <path d="M100 132Q102 82 200 78Q298 82 300 132L312 168Q290 160 278 172Q262 160 246 174Q228 160 212 174Q196 162 182 174Q166 160 150 174Q136 160 122 172Q108 160 88 168Z" fill="url(#${id}k)"/>
      <path d="M128 100Q160 92 170 128M228 92Q252 100 262 128M196 82Q200 108 206 132" stroke="${dark(art.cloth, 0.3)}" stroke-width="1.6" fill="none" opacity=".45"/>
      <path d="M104 148Q200 160 296 148" stroke="#c9a46a" stroke-width="5" fill="none"/><path d="M104 148Q200 160 296 148" stroke="#8a6a3a" stroke-width="5" stroke-dasharray="3 5" fill="none" opacity=".6"/>
      <path d="M200 156q-14 20 -8 44M200 156q12 18 12 40" stroke="#c9a46a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g transform="translate(140 238)"><rect width="120" height="74" rx="6" fill="#e8d6b4" stroke="#b89a6a"/><rect x="5" y="5" width="110" height="64" rx="4" fill="none" stroke="#b89a6a" stroke-dasharray="2 3"/>
        <text x="60" y="26" text-anchor="middle" font-family="Lato,sans-serif" font-weight="900" font-size="12" letter-spacing="3" fill="#5a3a1a">VEYIL</text>
        <text x="60" y="46" text-anchor="middle" font-family="'Noto Sans Tamil',Lato,sans-serif" font-weight="700" font-size="11" fill="#7a3a1a">${ta}</text>
        <text x="60" y="61" text-anchor="middle" font-family="Lato,sans-serif" font-size="8" fill="#7a5a3a">${p.g} g · sun-cured</text></g>
      <rect width="400" height="400" fill="url(#${id}l)"/>`, opt);
  }

  function pouchScene(p, opt = {}) {
    if (p.art.type === 'jar') return jarScene(p, opt);
    const id = 'v' + (++uid), art = p.art, r = rng(p.id + 'p');
    const shape = 'M110 70Q110 58 122 58H278Q290 58 290 70L296 340Q297 360 276 360H124Q103 360 104 340Z';
    const win = art.type === 'powder'
      ? `<rect x="140" y="110" width="120" height="96" fill="${art.colors[0]}"/>${scatter(r, { type: 'crumble', colors: [dark(art.colors[0], 0.15), light(art.colors[1], 0.15)] }, 200, 158, 60, 120, 6)}`
      : `<rect x="140" y="110" width="120" height="96" fill="${dark(art.colors[0], 0.35)}"/>${scatter(r, art, 200, 158, 70, Math.round((DENSITY[art.type] || [60])[0] * 0.55), (DENSITY[art.type] || [0, 14])[1] * 0.8)}`;
    const typeName = (window.TYPES.find((t) => t.id === p.type) || {}).name || '';
    return svg(id, `<defs>${defsCommon(id, art.bg)}
        <linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b98d5e"/><stop offset=".15" stop-color="#d2a878"/><stop offset=".5" stop-color="#c99c6a"/><stop offset=".88" stop-color="#b48656"/><stop offset="1" stop-color="#9a7046"/></linearGradient>
        <clipPath id="${id}w"><rect x="140" y="110" width="120" height="96" rx="48"/></clipPath></defs>
      ${backdrop(id)}
      <ellipse cx="206" cy="362" rx="112" ry="14" fill="#2a1a0c" opacity=".32" filter="url(#vy-blur)"/>
      <path d="${shape}" fill="url(#${id}k)"/>
      <path d="${shape}" fill="#000" filter="url(#vy-grain)" opacity=".25"/>
      <path d="M112 84H288" stroke="#8a6440" stroke-width="2" opacity=".5"/><path d="M112 88H288" stroke="#e8c898" stroke-width="1" opacity=".6"/>
      <circle cx="200" cy="70" r="5" fill="${art.bg}" stroke="#8a6440" opacity=".7"/>
      <g clip-path="url(#${id}w)"><g filter="url(#vy-drop)">${win}</g></g>
      <rect x="140" y="110" width="120" height="96" rx="48" fill="none" stroke="#7a5432" stroke-width="2.5"/>
      <path d="M150 128Q160 116 176 114" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55" fill="none"/>
      <g font-family="Lato,sans-serif" text-anchor="middle">
        <circle cx="200" cy="232" r="10" fill="#e8a020"/><g stroke="#e8a020" stroke-width="2.5" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${f(200 + Math.cos(a / 57.3) * 14)}" y1="${f(232 + Math.sin(a / 57.3) * 14)}" x2="${f(200 + Math.cos(a / 57.3) * 19)}" y2="${f(232 + Math.sin(a / 57.3) * 19)}"/>`).join('')}</g>
        <text x="200" y="270" font-weight="900" font-size="15" letter-spacing="5" fill="#3a2410">VEYIL</text>
        <text x="200" y="294" font-weight="900" font-size="17" fill="#2a1808">${esc(p.name)}</text>
        <text x="200" y="314" font-family="'Noto Sans Tamil',Lato,sans-serif" font-weight="700" font-size="12" fill="#5a3418">${esc(p.ta)}</text>
        <text x="200" y="336" font-size="10" letter-spacing="1.5" fill="#5a3a1a">${esc(typeName.toUpperCase())} · ${p.g} g</text></g>
      <path d="M120 64V352" stroke="#fff" stroke-width="10" opacity=".12"/>
      <rect width="400" height="400" fill="url(#${id}l)"/>`, opt);
  }

  function boxScene(p, opt = {}) {
    const id = 'v' + (++uid), items = (p.contains || []).map((cid) => window.PRODUCTS.find((x) => x.id === cid)).filter(Boolean);
    const cols = items.length > 4 ? 3 : 2, rows = Math.ceil(items.length / cols), cell = 270 / Math.max(cols, rows);
    const ox = 200 - (cols * cell) / 2, oy = 200 - (rows * cell) / 2;
    const minis = items.map((it, i) => {
      const x = ox + (i % cols) * cell, y = oy + Math.floor(i / cols) * cell;
      const inner = it.art.type === 'jar' ? jarScene(it, { bare: true }) : bowlScene(it, { bare: true, nobg: true });
      return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(cell / 400 * 100) / 100})">${inner}</g>`;
    }).join('');
    return svg(id, `<defs>${defsCommon(id, p.art.bg)}
        <linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6b07e"/><stop offset="1" stop-color="#a87c4c"/></linearGradient></defs>
      ${backdrop(id)}
      <rect x="40" y="44" width="330" height="330" rx="10" fill="#2a1a0c" opacity=".25" filter="url(#vy-blur)"/>
      <rect x="30" y="30" width="340" height="340" rx="10" fill="url(#${id}k)"/>
      <rect x="30" y="30" width="340" height="340" rx="10" fill="#000" filter="url(#vy-grain)" opacity=".2"/>
      <rect x="48" y="48" width="304" height="304" rx="6" fill="#efe2c8" stroke="#8a6440" stroke-width="2"/>
      <rect x="48" y="48" width="304" height="304" rx="6" fill="#c9a26e" opacity=".25"/>
      ${minis}
      <g transform="translate(300 330) rotate(-8)"><rect x="-58" y="-16" width="116" height="32" rx="4" fill="#fbf4e6" stroke="#b89a6a"/><text text-anchor="middle" y="5" font-family="Lato,sans-serif" font-weight="900" font-size="12" letter-spacing="2" fill="#7a3a1a">${items.length} PACKS</text></g>
      <rect width="400" height="400" fill="url(#${id}l)"/>`, opt);
  }


  /* fresh produce, for products without a true fresh photo */
  const FRESH = {
    'tomato-flakes': ['round', '#d7301c'], 'tomato-powder': ['round', '#d7301c'], 'tomato-thokku': ['round', '#d7301c'],
    'beetroot-flakes': ['root', '#7a1238'], 'beet-powder': ['root', '#7a1238'], 'senai-cubes': ['root', '#8a6a4a'],
    'moringa-powder': ['sprig', '#5b7d2e'], 'moringa-leaves': ['sprig', '#5b7d2e'], 'mint-leaves': ['sprig', '#4f8a3a'], 'kasuri-methi': ['sprig', '#6b8d34'],
    'mango-pickle': ['round', '#7aa83a'], 'lime-pickle': ['round', '#a8c43a'], 'raw-banana-vathal': ['pod', '#6d8a3a'],
    'sundakkai-vathal': ['berries', '#5f9a3a'], 'manathakkali-vathal': ['berries', '#2f2a38'], 'mor-milagai': ['pod', '#3f8a2a']
  };
  function freshScene(p) {
    const id = 'v' + (++uid), [shape, c] = FRESH[p.id] || [p.art.fresh || 'round', p.art.freshColor || (p.art.colors || ['#c99c6a'])[0]], r = rng(p.id + 'f');
    const ball = (x, y, R, col, calyx) => `<g transform="translate(${x} ${y})"><circle r="${R}" fill="url(#${id}g${col === c ? 'a' : 'b'})"/><ellipse cx="${-R * 0.35}" cy="${-R * 0.4}" rx="${R * 0.3}" ry="${R * 0.18}" fill="#fff" opacity=".45" transform="rotate(-30 ${-R * 0.35} ${-R * 0.4})"/>${calyx ? `<path d="M0 ${-R * 0.85}l${R * 0.28} ${-R * 0.1}-${R * 0.18} ${R * 0.2} ${R * 0.3} ${R * 0.14}-${R * 0.36} 0 ${R * 0.06} ${R * 0.3}-${R * 0.22}-${R * 0.24}-${R * 0.24} ${R * 0.22} ${R * 0.06}-${R * 0.3}-${R * 0.34}-${R * 0.02} ${R * 0.3}-${R * 0.16}-${R * 0.2}-${R * 0.18}z" fill="#3f7a2a"/>` : ''}</g>`;
    let body = '';
    if (shape === 'round') body = ball(150, 230, 92, c, true) + ball(268, 196, 70, c, true) + ball(250, 300, 52, c, true);
    else if (shape === 'root') body = [[170, 210, 90], [272, 250, 64]].map(([x, y, R]) => `<path d="M${x - 10} ${y + R * 0.9}Q${x} ${y + R * 2} ${x + 30} ${y + R * 2.1}" stroke="${dark(c, 0.2)}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${x} ${y - R * 0.9}q-20 -60 -40 -80M${x} ${y - R * 0.9}q10 -70 30 -90" stroke="#4a7a2a" stroke-width="8" fill="none" stroke-linecap="round"/>${ball(x, y, R, c, false)}`).join('');
    else if (shape === 'sprig' || shape === 'berries') {
      body = `<path d="M90 330Q200 240 320 90" stroke="${dark(c, 0.3)}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      for (let i = 0; i < 9; i++) {
        const t = 0.1 + i * 0.1, x = 90 + 230 * t, y = 330 - 240 * t - Math.sin(t * 3) * 20;
        if (shape === 'sprig') [-1, 1].forEach((side) => { body += `<g transform="translate(${f(x)} ${f(y)}) rotate(${-40 + side * 60})"><g transform="translate(0 ${-28})">${P.leaf(r, 22, i % 2 ? c : light(c, 0.12), [c], {})}</g></g>`; });
        else body += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + 20 * (i % 2 ? 1 : -1))}" y2="${f(y + 26)}" stroke="${dark(c, 0.2)}" stroke-width="2.5"/>${ball(f(x + 20 * (i % 2 ? 1 : -1)), f(y + 40), 18, c, false)}`;
      }
    } else body = [[120, 150, 30], [150, 210, 18], [110, 270, 26]].map(([x, y, a]) => `<g transform="translate(${x + 80} ${y}) rotate(${a})"><path d="M-110 0Q0 26 110 -6" stroke="${dark(c, 0.25)}" stroke-width="44" fill="none" stroke-linecap="round"/><path d="M-110 0Q0 26 110 -6" stroke="${c}" stroke-width="36" fill="none" stroke-linecap="round"/><path d="M-80 -8Q0 12 90 -14" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".4"/><path d="M110 -6l22 -10" stroke="#5a6a2a" stroke-width="10" stroke-linecap="round"/></g>`).join('');
    return svg(id, `<defs>${defsCommon(id, '#f4f1e6')}
        <radialGradient id="${id}ga" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="${light(c, 0.3)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${dark(c, 0.35)}"/></radialGradient>
        <radialGradient id="${id}gb" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="${light(c, 0.3)}"/><stop offset="1" stop-color="${dark(c, 0.3)}"/></radialGradient></defs>
      ${backdrop(id)}<ellipse cx="210" cy="350" rx="150" ry="18" fill="#2a1a0c" opacity=".2" filter="url(#vy-blur)"/>
      <g filter="url(#vy-drop)">${body}</g><rect width="400" height="400" fill="url(#${id}l)"/>`, { label: 'Fresh ' + p.name.replace(/ (Flakes|Powder|Pickle|Vathal|Leaves|Leaf Powder|Thokku|Cubes|Slices)$/,'').toLowerCase() });
  }

  function svg(id, body, opt) {
    if (opt.bare) {
      // nested in a box: drop backdrop + lighting so it reads as an object
      return body.replace(/<rect width="400" height="400"[^>]*\/>/g, '');
    }
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opt.label || '')}" class="art-svg" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.Art = {
    dried(p, label) {
      const t = p.art.type, o = { label: label || p.name + ', dried, shown in a bowl' };
      if (t === 'jar') return jarScene(p, o);
      if (t === 'box') return boxScene(p, o);
      return bowlScene(p, o);
    },
    fresh: freshScene,
    pack(p) {
      if (p.art.type === 'box') return boxScene(p, { label: p.name + ' box' });
      return pouchScene(p, { label: p.name + ' pack' });
    }
  };
})();
