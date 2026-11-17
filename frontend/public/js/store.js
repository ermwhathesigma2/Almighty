/*
 * Allmighty data layer (DEMO BACKEND).
 * Everything lives in this browser's localStorage so the whole system works
 * without a server. Every page talks to the data ONLY through the functions
 * exported here (Auth, Products, Orders, Riders, Payroll, Reports, Cart),
 * so later you can replace the insides with real API calls (Firebase,
 * Supabase, Node/PHP + MySQL...) without touching the pages.
 */
(function (global) {
  'use strict';

  const KEY = 'allmighty_db_v1';
  const SESSION_KEY = 'allmighty_session';
  const DAY = 864e5;
  const LOW_STOCK = 10;

  // Built-in admin account (not stored in the users list, cannot be signed up for)
  const ADMIN = { id: 'admin', name: 'Alex Dela Cruz', email: 'admin@gmail.com', password: 'admin123', role: 'admin' };

  /* ---------- helpers ---------- */
  function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function uid(p) { return p + Math.random().toString(36).slice(2, 9); }
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  /* ---------- seed data ---------- */
  function seed() {
    const now = Date.now();
    const r = rng(42);
    const img = f => '../images/products/' + f;
    const products = [
      { id: 'p1', name: 'All-Purpose Cleaner', category: 'Home care', size: '1 liter', price: 89, stock: 18, active: true, image: img('all-purpose-cleaner.jpg') },
      { id: 'p2', name: 'Fresh Laundry Wash', category: 'Laundry', size: '2 liters', price: 149, stock: 6, active: true, image: img('fresh-laundry-wash.jpg') },
      { id: 'p3', name: 'Dishwashing Liquid', category: 'Kitchen', size: '1 liter', price: 79, stock: 14, active: true, image: img('dishwashing-liquid.jpg') },
      { id: 'p4', name: 'Fabric Softener', category: 'Laundry', size: '1 liter', price: 115, stock: 12, active: true, image: img('fabric-softener.jpg') }
    ];
    const users = [
      { id: 'c1', name: 'Maria Reyes', email: 'maria.reyes@gmail.com', password: 'maria123', role: 'customer', phone: '09171234567', address: '42 Mabini St., Brgy. San Roque, Quezon City' },
      { id: 'c2', name: 'Paolo Santos', email: 'paolo@gmail.com', password: 'paolo123', role: 'customer', phone: '09181234567', address: '18 Rizal Ave., Brgy. Poblacion' },
      { id: 'c3', name: 'Ana Cruz', email: 'ana@gmail.com', password: 'ana12345', role: 'customer', phone: '09191234567', address: '7 Bonifacio St., Brgy. Central' },
      { id: 'c4', name: 'Liza Garcia', email: 'liza@gmail.com', password: 'liza1234', role: 'customer', phone: '09201234567', address: '25 Luna St., Brgy. Santo Niño' },
      { id: 'r1', name: 'Jeremy Rivera', email: 'rider@gmail.com', password: 'rider123', role: 'rider', phone: '09301234567' },
      { id: 'r2', name: 'Noel Garcia', email: 'noel@gmail.com', password: 'rider123', role: 'rider', phone: '09311234567' }
    ];
    const staff = [
      { id: 's1', name: 'Jeremy Rivera', role: 'Delivery staff', rate: 650, userId: 'r1' },
      { id: 's2', name: 'Mike Santos', role: 'Store staff', rate: 600 },
      { id: 's3', name: 'Noel Garcia', role: 'Delivery staff', rate: 650, userId: 'r2' },
      { id: 's4', name: 'Lina Cruz', role: 'Store staff', rate: 550 }
    ];
    const customers = users.filter(u => u.role === 'customer');
    const riderIds = ['r1', 'r2'];
    const orders = [];
    let num = 1000;
    const mkItems = () => {
      const n = 1 + Math.floor(r() * 3), pool = products.slice(), out = [];
      for (let i = 0; i < n; i++) {
        const p = pool.splice(Math.floor(r() * pool.length), 1)[0];
        out.push({ productId: p.id, name: p.name, price: p.price, qty: 1 + Math.floor(r() * 2) });
      }
      return out;
    };
    const total = items => sum(items, i => i.price * i.qty);

    // delivered history (35 days) so reports have something to show
    for (let d = 34; d >= 0; d--) {
      const count = 9 + Math.floor(r() * 5);
      for (let k = 0; k < count; k++) {
        const c = customers[Math.floor(r() * customers.length)];
        const items = mkItems();
        let created = startOfDay(now - d * DAY) + (8 + k + Math.floor(r() * 2)) * 3600e3;
        if (created > now - 3 * 3600e3) created = now - (3 + k) * 3600e3;
        num++;
        orders.push({
          id: 'o' + num, num, customerId: c.id, customerName: c.name, phone: c.phone, address: c.address,
          items, total: total(items), payment: 'COD', status: 'delivered',
          riderId: riderIds[(num + d) % 2], riderStatus: 'delivered',
          createdAt: created, deliveredAt: created + 90 * 60e3, remitted: d > 2
        });
      }
    }
    // active orders
    const active = (cid, items, status, extra, minsAgo) => {
      const c = customers.find(x => x.id === cid);
      num++;
      orders.push(Object.assign({
        id: 'o' + num, num, customerId: c.id, customerName: c.name, phone: c.phone, address: c.address,
        items, total: total(items), payment: 'COD', status, riderId: null, riderStatus: null,
        createdAt: now - minsAgo * 60e3
      }, extra));
    };
    const it = (pid, qty) => { const p = products.find(x => x.id === pid); return { productId: pid, name: p.name, price: p.price, qty }; };
    active('c3', [it('p1', 2), it('p4', 2)], 'for_delivery', { riderId: 'r1', riderStatus: 'accepted' }, 32);
    active('c2', [it('p3', 1), it('p4', 1)], 'preparing', {}, 15);
    active('c1', [it('p1', 1), it('p2', 1)], 'new', {}, 4);

    // payroll: last 14 days for everyone; today only 3 staff so the "not recorded" state is visible
    const payroll = [];
    for (let d = 14; d >= 0; d--) {
      staff.forEach(s => {
        if (d === 0 && s.id === 's4') return;
        payroll.push({ id: uid('pr'), date: dayKey(now - d * DAY), staffId: s.id, amount: s.rate, note: '' });
      });
    }
    return { v: 1, users, products, orders, staff, payroll, carts: {}, nextNum: num + 1 };
  }

  /* ---------- storage ---------- */
  let cache = null;
  function db() {
    if (cache) return cache;
    try { cache = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { cache = null; }
    if (!cache) { cache = seed(); persist(); }
    return cache;
  }
  const listeners = [];
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); }
    catch (e) { alert('Storage is full. Try using smaller product images.'); }
  }
  function commit() { persist(); listeners.forEach(f => f()); }
  window.addEventListener('storage', e => {
    if (e.key === KEY) { cache = null; listeners.forEach(f => f()); }
  });
  function onChange(fn) { listeners.push(fn); }
  function reset() { cache = seed(); persist(); listeners.forEach(f => f()); }

  /* ---------- Auth ---------- */
  const HOME = { customer: 'home.html', admin: 'admin-overview.html', rider: 'rider-today.html' };
  const pub = u => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone || '', address: u.address || '' });
  const findUser = id => id === ADMIN.id ? ADMIN : db().users.find(u => u.id === id);

  const Auth = {
    home: role => HOME[role] || 'login.html',
    login(email, password, remember) {
      email = (email || '').trim().toLowerCase();
      if (!email || !password) return { error: 'Please enter your email and password.' };
      const u = email === ADMIN.email ? ADMIN : db().users.find(x => x.email === email);
      if (!u || u.password !== password) return { error: 'Incorrect email or password.' };
      localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ id: u.id }));
      return { user: pub(u) };
    },
    signup({ name, email, password }) {
      name = (name || '').trim(); email = (email || '').trim().toLowerCase();
      if (name.length < 2) return { error: 'Please enter your full name.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
      if ((password || '').length < 8) return { error: 'Password must be at least 8 characters.' };
      if (email === ADMIN.email || db().users.some(u => u.email === email)) return { error: 'That email is already registered. Try logging in.' };
      const u = { id: uid('c'), name, email, password, role: 'customer', phone: '', address: '' };
      db().users.push(u); commit();
      return { user: pub(u) };
    },
    current() {
      let raw = null;
      try { raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); } catch (e) { /* ignore */ }
      if (!raw) return null;
      try { return pub(findUser(JSON.parse(raw).id)) || null; } catch (e) { return null; }
    },
    require(role) {
      const u = Auth.current();
      if (!u) { location.replace('login.html'); return null; }
      if (u.role !== role) { location.replace(Auth.home(u.role)); return null; }
      return u;
    },
    logout() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); location.replace('login.html'); },
    updateProfile(id, patch) {
      const u = db().users.find(x => x.id === id);
      if (!u) return;
      Object.assign(u, patch); commit();
    }
  };

  /* ---------- Products ---------- */
  const Products = {
    LOW_STOCK,
    list(opts = {}) {
      let l = db().products.slice();
      if (opts.activeOnly) l = l.filter(p => p.active);
      return l;
    },
    categories() { return Array.from(new Set(db().products.filter(p => p.active).map(p => p.category))).sort(); },
    get: id => db().products.find(p => p.id === id),
    isLow: p => p.stock <= LOW_STOCK,
    lowList() { return db().products.filter(p => p.stock <= LOW_STOCK).sort((a, b) => a.stock - b.stock); },
    save(p) {
      const list = db().products;
      if (p.id) { Object.assign(list.find(x => x.id === p.id), p); }
      else { p.id = uid('p'); list.push(p); }
      commit(); return p;
    },
    remove(id) { const d = db(); d.products = d.products.filter(p => p.id !== id); commit(); },
    receive(id, qty) { const p = Products.get(id); if (!p) return false; p.stock += qty; commit(); return true; }
  };

  /* ---------- Cart (per customer) ---------- */
  const Cart = {
    get(uid_) { return (db().carts[uid_] || []).filter(l => Products.get(l.productId)); },
    count(uid_) { return sum(Cart.get(uid_), l => l.qty); },
    lines(uid_) { return Cart.get(uid_).map(l => ({ p: Products.get(l.productId), qty: l.qty })); },
    total(uid_) { return sum(Cart.lines(uid_), l => l.p.price * l.qty); },
    add(uid_, pid) {
      const p = Products.get(pid); if (!p) return false;
      const cart = db().carts[uid_] = db().carts[uid_] || [];
      const line = cart.find(l => l.productId === pid);
      if ((line ? line.qty : 0) + 1 > p.stock) return false;
      if (line) line.qty++; else cart.push({ productId: pid, qty: 1 });
      commit(); return true;
    },
    setQty(uid_, pid, qty) {
      const cart = db().carts[uid_] || [], p = Products.get(pid);
      const i = cart.findIndex(l => l.productId === pid); if (i < 0) return;
      if (qty <= 0) cart.splice(i, 1); else cart[i].qty = Math.min(qty, p ? p.stock : qty);
      commit();
    },
    clear(uid_) { db().carts[uid_] = []; commit(); }
  };

  /* ---------- Orders ---------- */
  const ACTIVE = ['new', 'preparing', 'for_delivery'];
  const STATUS_LABEL = { new: 'New', preparing: 'Preparing', for_delivery: 'For delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
  const code = o => '#AM-' + o.num;

  const Orders = {
    ACTIVE, STATUS_LABEL, code,
    all() { return db().orders.slice().sort((a, b) => b.createdAt - a.createdAt); },
    get: id => db().orders.find(o => o.id === id),
    forCustomer: cid => Orders.all().filter(o => o.customerId === cid),
    byStatus(group) {
      const l = Orders.all();
      if (group === 'active') return l.filter(o => ACTIVE.includes(o.status));
      if (group === 'completed') return l.filter(o => o.status === 'delivered');
      if (group === 'cancelled') return l.filter(o => o.status === 'cancelled');
      return l;
    },
    count(status) { return db().orders.filter(o => o.status === status).length; },
    place(user, info) {
      const lines = Cart.lines(user.id);
      if (!lines.length) return { error: 'Your cart is empty.' };
      for (const l of lines) if (l.qty > l.p.stock) return { error: l.p.name + ' only has ' + l.p.stock + ' left.' };
      const d = db();
      const items = lines.map(l => ({ productId: l.p.id, name: l.p.name, price: l.p.price, qty: l.qty }));
      lines.forEach(l => { l.p.stock -= l.qty; });
      const num = d.nextNum++;
      const o = {
        id: 'o' + num, num, customerId: user.id, customerName: user.name,
        phone: info.phone, address: info.address, notes: info.notes || '',
        items, total: sum(items, i => i.price * i.qty), payment: 'COD',
        status: 'new', riderId: null, riderStatus: null, createdAt: Date.now()
      };
      d.orders.push(o);
      d.carts[user.id] = [];
      const u = d.users.find(x => x.id === user.id);
      if (u) { u.phone = info.phone; u.address = info.address; }
      commit(); return { order: o };
    },
    accept(id) { const o = Orders.get(id); if (o && o.status === 'new') { o.status = 'preparing'; o.acceptedAt = Date.now(); commit(); } },
    assign(id, riderId) {
      const o = Orders.get(id);
      if (!o || !['preparing', 'for_delivery'].includes(o.status) || o.riderStatus === 'picked_up') return false;
      o.status = 'for_delivery'; o.riderId = riderId; o.riderStatus = 'requested'; o.assignedAt = Date.now();
      commit(); return true;
    },
    riderRespond(id, accept) {
      const o = Orders.get(id); if (!o || o.riderStatus !== 'requested') return;
      if (accept) { o.riderStatus = 'accepted'; }
      else { o.riderId = null; o.riderStatus = null; o.status = 'preparing'; o.declinedNote = true; }
      commit();
    },
    pickup(id) { const o = Orders.get(id); if (o && o.riderStatus === 'accepted') { o.riderStatus = 'picked_up'; o.pickedUpAt = Date.now(); commit(); } },
    deliver(id) {
      const o = Orders.get(id);
      if (o && o.riderStatus === 'picked_up') { o.status = 'delivered'; o.riderStatus = 'delivered'; o.deliveredAt = Date.now(); o.remitted = false; commit(); }
    },
    cancel(id) {
      const o = Orders.get(id);
      if (!o || !ACTIVE.includes(o.status)) return false;
      o.items.forEach(i => { const p = Products.get(i.productId); if (p) p.stock += i.qty; });
      o.status = 'cancelled'; o.cancelledAt = Date.now(); o.riderStatus = null;
      commit(); return true;
    },
    // rider helpers
    forRider: rid => Orders.all().filter(o => o.riderId === rid),
    riderActive: rid => Orders.forRider(rid).filter(o => ['accepted', 'picked_up'].includes(o.riderStatus)).sort((a, b) => a.createdAt - b.createdAt),
    riderRequests: rid => Orders.forRider(rid).filter(o => o.riderStatus === 'requested'),
    riderDone: rid => Orders.forRider(rid).filter(o => o.status === 'delivered').sort((a, b) => b.deliveredAt - a.deliveredAt)
  };

  /* ---------- Riders ---------- */
  const Riders = {
    list() { return db().users.filter(u => u.role === 'rider').map(pub); },
    get: id => pub(db().users.find(u => u.id === id && u.role === 'rider')),
    name: id => { const u = db().users.find(x => x.id === id); return u ? u.name : '—'; },
    add({ name, email, phone, password }) {
      name = (name || '').trim(); email = (email || '').trim().toLowerCase();
      if (name.length < 2) return { error: 'Enter the rider’s name.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email.' };
      if ((password || '').length < 6) return { error: 'Password must be at least 6 characters.' };
      if (email === ADMIN.email || db().users.some(u => u.email === email)) return { error: 'That email is already used.' };
      const u = { id: uid('r'), name, email, password, role: 'rider', phone: (phone || '').trim() };
      db().users.push(u);
      db().staff.push({ id: uid('s'), name, role: 'Delivery staff', rate: 650, userId: u.id });
      commit(); return { user: pub(u) };
    },
    activeCount: id => Orders.forRider(id).filter(o => ['requested', 'accepted', 'picked_up'].includes(o.riderStatus)).length,
    // COD cash collected but not yet handed to the store
    toRemit: id => sum(Orders.riderDone(id).filter(o => !o.remitted), o => o.total),
    collected: id => sum(Orders.riderDone(id), o => o.total),
    remit(id) { Orders.riderDone(id).forEach(o => { o.remitted = true; }); commit(); }
  };

  /* ---------- Payroll ---------- */
  const Payroll = {
    staff: () => db().staff.slice(),
    recordFor: (date, staffId) => db().payroll.find(p => p.date === date && p.staffId === staffId),
    byDate: date => db().payroll.filter(p => p.date === date),
    totalFor: date => sum(Payroll.byDate(date), p => p.amount),
    record(date, staffId, amount, note) {
      const ex = Payroll.recordFor(date, staffId);
      if (ex) { ex.amount = amount; ex.note = note || ''; }
      else db().payroll.push({ id: uid('pr'), date, staffId, amount, note: note || '' });
      commit();
    },
    history(limitDays = 30) {
      const byDay = {};
      db().payroll.forEach(p => { (byDay[p.date] = byDay[p.date] || []).push(p); });
      return Object.keys(byDay).sort().reverse().slice(0, limitDays).map(date => ({ date, records: byDay[date], total: sum(byDay[date], p => p.amount) }));
    },
    staffName: id => { const s = db().staff.find(x => x.id === id); return s ? s.name : '—'; }
  };

  /* ---------- Reports ---------- */
  const Reports = {
    today() { return dayKey(Date.now()); },
    dayKey,
    revenueOn(date) { return sum(db().orders.filter(o => o.status === 'delivered' && dayKey(o.deliveredAt) === date), o => o.total); },
    summary(period) {
      const now = Date.now(), today = startOfDay(now);
      let buckets = [];
      if (period === 'week') {
        for (let i = 6; i >= 0; i--) { const s = today - i * DAY; buckets.push({ s, e: s + DAY, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(s).getDay()], tip: new Date(s).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) }); }
      } else if (period === 'month') {
        for (let i = 29; i >= 0; i--) { const s = today - i * DAY; buckets.push({ s, e: s + DAY, label: i % 5 === 0 ? String(new Date(s).getDate()) : '', tip: new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) }); }
      } else {
        const t = new Date(now);
        for (let i = 11; i >= 0; i--) {
          const s = new Date(t.getFullYear(), t.getMonth() - i, 1).getTime();
          const e = new Date(t.getFullYear(), t.getMonth() - i + 1, 1).getTime();
          buckets.push({ s, e, label: new Date(s).toLocaleDateString('en-PH', { month: 'short' })[0], tip: new Date(s).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) });
        }
      }
      const start = buckets[0].s, end = buckets[buckets.length - 1].e, span = end - start;
      const delivered = db().orders.filter(o => o.status === 'delivered');
      const inRange = (o, a, b) => o.deliveredAt >= a && o.deliveredAt < b;
      buckets.forEach(b => { b.value = sum(delivered.filter(o => inRange(o, b.s, b.e)), o => o.total); });
      const cur = delivered.filter(o => inRange(o, start, end));
      const prev = delivered.filter(o => inRange(o, start - span, start));
      const revenue = sum(cur, o => o.total), prevRevenue = sum(prev, o => o.total);
      const keyOf = ts => dayKey(ts), a = keyOf(start), b = keyOf(end - 1);
      const expenses = sum(db().payroll.filter(p => p.date >= a && p.date <= b), p => p.amount);
      const prod = {};
      cur.forEach(o => o.items.forEach(i => {
        const x = prod[i.productId] = prod[i.productId] || { id: i.productId, name: i.name, qty: 0, revenue: 0 };
        x.qty += i.qty; x.revenue += i.qty * i.price;
      }));
      return {
        buckets, revenue, expenses, net: revenue - expenses, orders: cur.length,
        change: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
        top: Object.values(prod).sort((x, y) => y.revenue - x.revenue).slice(0, 5)
      };
    }
  };

  global.DB = { onChange, reset, Auth, Products, Cart, Orders, Riders, Payroll, Reports, util: { dayKey, startOfDay, sum } };
})(window);
