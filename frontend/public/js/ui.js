/* Shared UI helpers: icons, app shell, modal, drawer, toast, event routing. */
(function (global) {
  'use strict';

  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    shop: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    orders: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6M10 16h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2"/>',
    chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h5l3 3v4h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c.8-3.5 3.3-5 7-5s6.2 1.5 7 5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2 .6 3.4 2 4 5"/>',
    logout: '<path d="M10 4H5v16h5"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3M20 14v6h-6M17 20v-3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevL: '<path d="M15 5l-7 7 7 7"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    nav: '<path d="M4 11l16-7-7 16-2-7z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
  };
  function icon(name, size = 18) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  function timeAgo(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' hr ago';
    return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }
  const shortDate = ts => new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  const longDate = ts => new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

  function productImg(p, cls = 'pimg', extra = '') {
    const ph = `<div class="ph">${icon('box', 34)}</div>`;
    if (!p.image) return `<div class="${cls}">${ph}${extra}</div>`;
    return `<div class="${cls}" data-ph="${esc(ph)}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.outerHTML=this.parentNode.dataset.ph">${extra}</div>`;
  }

  /* ---------- navigation ---------- */
  const NAV = {
    customer: [
      { key: 'home', label: 'Home', icon: 'home', href: 'home.html' },
      { key: 'shop', label: 'Shop', icon: 'shop', href: 'shop.html' },
      { key: 'orders', label: 'Orders', icon: 'orders', href: 'orders.html' },
      { key: 'profile', label: 'Profile', icon: 'user', href: 'profile.html' }
    ],
    admin: [
      { key: 'overview', label: 'Overview', icon: 'grid', href: 'admin-overview.html' },
      { key: 'orders', label: 'Orders', icon: 'orders', href: 'admin-orders.html' },
      { key: 'products', label: 'Products', icon: 'box', href: 'admin-products.html' },
      { key: 'riders', label: 'Riders', icon: 'users', href: 'admin-riders.html' },
      { key: 'payroll', label: 'Payroll', icon: 'wallet', href: 'admin-payroll.html' },
      { key: 'reports', label: 'Reports', icon: 'chart', href: 'admin-reports.html' }
    ],
    rider: [
      { key: 'today', label: 'Today', icon: 'home', href: 'rider-today.html' },
      { key: 'deliveries', label: 'Deliveries', icon: 'truck', href: 'rider-deliveries.html' },
      { key: 'history', label: 'History', icon: 'orders', href: 'rider-history.html' },
      { key: 'profile', label: 'Profile', icon: 'user', href: 'rider-profile.html' }
    ]
  };

  function shell(o) {
    const user = DB.Auth.current();
    const badge = o.role === 'admin' ? DB.Orders.count('new') : 0;
    const nav = NAV[o.role].map(n => {
      const b = n.key === 'orders' && badge ? `<em class="nav-badge">${badge}</em>` : '';
      return `<a class="nav-item ${n.key === o.active ? 'active' : ''}" href="${n.href}">${icon(n.icon, 18)}<span>${n.label}</span>${b}</a>`;
    }).join('');
    const avatar = o.role === 'customer' ? '' : `<div class="avatar">${esc(initials(user.name))}</div>`;
    return `<div class="layout">
      <aside class="sidebar"><div class="brand">ALLMIGHTY</div><nav>${nav}</nav></aside>
      <main class="main">
        <header class="topbar"><div class="topbar-brand">ALLMIGHTY</div>
          <button class="btn btn-ghost" data-act="logout">${icon('logout', 14)} Log out</button>${avatar}</header>
        <div class="head"><div><div class="eyebrow">${o.eyebrow || ''}</div><h1>${o.title}</h1></div>${o.right || ''}</div>
        ${o.body || ''}
      </main></div>`;
  }
  function mount(html) {
    const y = window.scrollY;
    document.getElementById('app').innerHTML = html;
    window.scrollTo(0, y);
  }

  /* ---------- modal / drawer / toast ---------- */
  let overlay = null;
  function closeOverlay() { if (overlay) { overlay.remove(); overlay = null; document.body.style.overflow = ''; } }
  function openOverlay(inner, cls) {
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'overlay ' + (cls || '');
    overlay.innerHTML = inner;
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeOverlay(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    return overlay;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });
  const modal = html => openOverlay(`<div class="modal" role="dialog">${html}</div>`);
  const drawer = html => openOverlay(`<div class="drawer">${html}</div>`, 'drawer-wrap');
  const refreshDrawer = html => { const d = overlay && overlay.querySelector('.drawer'); if (d) d.innerHTML = html; };
  const isOpen = () => !!overlay;

  function toast(msg, isErr) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function confirmBox(title, text, okLabel, onOk, danger) {
    const m = modal(`<h2>${esc(title)}</h2><p class="sub">${esc(text)}</p>
      <div class="modal-actions"><button class="btn btn-outline" data-close>Keep it</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okLabel)}</button></div>`);
    m.querySelector('[data-ok]').onclick = () => { closeOverlay(); onOk(); };
  }

  /* ---------- event routing ---------- */
  const acts = {}, forms = {}, inputs = {};
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (c) { closeOverlay(); return; }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const fn = acts[t.dataset.act];
    if (fn) { e.preventDefault(); fn(t, e); }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = forms[f.dataset.form];
    if (fn) fn(f, e);
  });
  document.addEventListener('input', e => {
    const t = e.target.closest('[data-input]');
    if (t && inputs[t.dataset.input]) inputs[t.dataset.input](t, e);
  });
  acts.logout = () => DB.Auth.logout();

  global.UI = {
    icon, esc, money, initials, timeAgo, shortDate, longDate, greeting, productImg,
    shell, mount, modal, drawer, refreshDrawer, close: closeOverlay, isOpen, toast, confirm: confirmBox,
    on: (n, f) => { acts[n] = f; }, form: (n, f) => { forms[n] = f; }, input: (n, f) => { inputs[n] = f; }
  };
})(window);
