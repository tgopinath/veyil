/* Veyil native app mode.
   Inside the Android app the shop takes Material Design 3 (Kolam M3 kit); inside the iOS app it takes
   Apple's HIG look (Kolam iOS kit). In any browser both kits stay off and the Kolam website is unchanged.
   The apps are the shopper store only: admin stays on the website and has no link here. */
(function () {
  const BAG = '<svg class="ios-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
  const POT = '<svg class="ios-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2"/></svg>';
  const ROOTS = { '/': 'home', '/story': 'story' };
  let hooks = { openCart() {}, count: () => 0 };
  let current = { path: '/', params: new URLSearchParams() };

  // iOS wins if both kits would switch on.
  const ios = window.KolamIOS ? KolamIOS.init({
    appName: 'Veyil', uaTokens: ['Veyil-iOS'],
    tint: { light: '#A63A17', dark: '#F6A882' },
    tabs: [
      { id: 'home', label: 'Home', icon: 'house', href: '#/' },
      { id: 'shop', label: 'Shop', icon: 'square.grid.2x2', href: '#/shop' },
      { id: 'dish', label: 'Dishes', icon: POT, href: '#/shop?view=dish' },
      { id: 'story', label: 'Our story', icon: 'sun.max', href: '#/story' },
    ],
    currentTab: 'home', content: '#main',
  }) : null;
  if (ios) document.documentElement.classList.remove('k-android', 'k-app');

  const m3 = !ios && window.KolamM3 ? KolamM3.init({
    primary: '#b5401b', title: 'Veyil', home: '#/',
    destinations: [
      { id: 'home', label: 'Home', icon: 'home', href: '#/' },
      { id: 'shop', label: 'Shop', icon: 'storefront', href: '#/shop' },
      { id: 'dish', label: 'Dishes', icon: 'skillet', href: '#/shop?view=dish' },
      { id: 'story', label: 'Our story', icon: 'wb_sunny', href: '#/story' },
    ],
    actions: [{ id: 'vyCart', icon: 'shopping_bag', label: 'Cart', onClick: () => hooks.openCart() }],
    hide: ['.ribbon', '.top', '.foot-in'],
    isRoot: () => isRoot(current.path),
  }) : { enabled: false, setTitle() {}, setActive() {}, setBack() {} };

  const on = !!ios || m3.enabled;
  if (on) document.documentElement.classList.add('vy-app');

  function isRoot(path) { return path === '/' || path === '/shop' || path === '/story'; }
  function tabFor(path, params) {
    if (path === '/shop') return params.get('view') === 'dish' || (params.get('dish') && !params.get('type')) ? 'dish' : 'shop';
    if (path.startsWith('/p/') || path === '/checkout' || path === '/done') return 'shop';
    return ROOTS[path] || 'home';
  }
  function titleFor(path) {
    const h1 = document.querySelector('#main h1');
    if (path === '/') return 'Veyil';
    if (path === '/story') return 'Our story';
    if (path === '/checkout') return 'Checkout (demo)';
    if (path === '/done') return 'Order placed';
    return h1 ? h1.textContent.trim() : 'Veyil';
  }

  // The search field lives in the website header, which the apps hide: move it to the top of Home and Shop.
  function placeSearch(path) {
    const form = document.getElementById('searchForm'), main = document.getElementById('main');
    if (!form || !main) return;
    const want = path === '/' || path === '/shop';
    if (want) {
      let slot = main.querySelector('.vy-search-slot');
      if (!slot) { slot = document.createElement('div'); slot.className = 'vy-search-slot'; main.prepend(slot); }
      slot.appendChild(form);
    } else if (form.parentElement?.classList.contains('vy-search-slot')) {
      document.querySelector('.top-in')?.insertBefore(form, document.getElementById('themeBtn'));
    }
  }

  function badge() {
    const n = hooks.count();
    const btn = document.getElementById(ios ? 'vyCartIos' : 'vyCart');
    if (!btn) return;
    btn.style.position = 'relative';
    let b = btn.querySelector('.vy-badge');
    if (!b) { b = document.createElement('span'); b.className = 'vy-badge'; b.setAttribute('aria-hidden', 'true'); btn.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n);
    b.hidden = !n;
    btn.setAttribute('aria-label', n ? `Cart, ${n} item${n === 1 ? '' : 's'}` : 'Cart, empty');
  }

  function route(path, params) {
    current = { path, params };
    if (!on) return;
    placeSearch(path);
    const tab = tabFor(path, params), root = isRoot(path), title = titleFor(path);
    // The kits reset their per-screen state on every route change, so set ours just after them.
    setTimeout(() => {
      if (ios) {
        const cartAction = { id: 'vyCartIos', icon: BAG, label: 'Cart', onClick: () => hooks.openCart() };
        KolamIOS.tabBar.select(tab);
        if (root) KolamIOS.navBar.set({ title, large: true, actions: [cartAction], keepTitle: true });
        else KolamIOS.navBar.set({ title, back: { label: path === '/done' ? 'Shop' : 'Back', onClick: () => (history.length > 1 && path !== '/done' ? history.back() : (location.hash = '#/shop')) }, actions: [cartAction], keepTitle: true });
        KolamIOS.enhance(document.getElementById('main'));
      } else {
        m3.setTitle(title);
        m3.setActive(tab);
        m3.setBack(root ? false : path === '/done' ? '#/shop' : tab === 'dish' ? '#/shop?view=dish' : '#/shop');
      }
      badge();
    });
  }

  window.VeyilApp = {
    get on() { return on; }, ios: !!ios, android: !!m3.enabled,
    connect(h) { hooks = Object.assign(hooks, h); },
    route, cart: badge,
  };
})();
