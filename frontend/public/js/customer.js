/* Customer pages: home, shop, orders, profile + cart & checkout */
(function () {
  'use strict';
  const { esc, money, icon } = UI;
  const { Products, Cart, Orders } = DB;
  let user = null;

  /* ---------- shared pieces ---------- */
  const bagButton = () => {
    const n = Cart.count(user.id);
    return `<button class="icon-btn" data-act="cart" aria-label="Cart">${icon('shop', 20)}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  };

  function productCard(p) {
    const out = p.stock <= 0;
    return `<article class="pcard">
      ${UI.productImg(p, 'pimg', out ? '<div class="sold">Sold out</div>' : '')}
      <div class="pmeta">${esc(p.category)} · ${esc(p.size)}${!out && p.stock <= Products.LOW_STOCK ? ` · <b style="color:var(--warn)">${p.stock} left</b>` : ''}</div>
      <div class="pname">${esc(p.name)}</div>
      <div class="pfoot"><span class="price">${money(p.price)}</span>
        <button class="plus-btn" data-act="add" data-id="${p.id}" ${out ? 'disabled' : ''} aria-label="Add ${esc(p.name)} to cart">${icon('plus', 16)}</button></div>
    </article>`;
  }

  function chips(active, extra) {
    const cats = ['All'].concat(Products.categories());
    return `<div class="chips">${cats.map(c => `<button class="chip ${c === active ? 'active' : ''}" data-act="${extra}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  }

  /* ---------- cart + checkout ---------- */
  function cartHtml() {
    const lines = Cart.lines(user.id);
    const body = lines.length ? lines.map(l => `<div class="cart-item">
        <div class="th">${UI.productImg(l.p)}</div>
        <div style="flex:1;min-width:0"><div class="pname">${esc(l.p.name)}</div><div class="pmeta">${esc(l.p.size)} · ${money(l.p.price)}</div>
          <div class="qty"><button data-act="qty" data-id="${l.p.id}" data-d="-1" aria-label="Less">${icon('minus', 12)}</button><span>${l.qty}</span><button data-act="qty" data-id="${l.p.id}" data-d="1" aria-label="More">${icon('plus', 12)}</button></div></div>
        <div class="price">${money(l.p.price * l.qty)}</div></div>`).join('')
      : `<div class="empty"><div class="ring">${icon('shop', 30)}</div><h3>Your cart is empty</h3><p>Add a few essentials and they’ll show up here.</p></div>`;
    return `<div class="drawer-head"><h2>Your cart</h2><button class="icon-btn" data-close aria-label="Close">${icon('x', 18)}</button></div>
      <div class="drawer-body">${body}</div>
      ${lines.length ? `<div class="drawer-foot"><div class="row between" style="margin-bottom:14px"><span class="muted">Total</span><b style="font-size:20px">${money(Cart.total(user.id))}</b></div>
        <button class="btn btn-primary btn-lg btn-block" data-act="checkout">Checkout ${icon('arrow', 16)}</button></div>` : ''}`;
  }
  function openCart() { UI.drawer(cartHtml()); }

  UI.on('cart', openCart);
  UI.on('qty', t => {
    const l = Cart.get(user.id).find(x => x.productId === t.dataset.id);
    if (!l) return;
    const next = l.qty + Number(t.dataset.d);
    if (Number(t.dataset.d) > 0 && next > Products.get(l.productId).stock) { UI.toast('No more stock available', true); return; }
    Cart.setQty(user.id, l.productId, next);
    UI.refreshDrawer(cartHtml());
  });
  UI.on('add', t => {
    if (Cart.add(user.id, t.dataset.id)) UI.toast('Added to cart'); else UI.toast('Not enough stock', true);
  });

  UI.on('checkout', () => {
    const u = DB.Auth.current();
    const m = UI.modal(`<h2>Checkout</h2><p class="sub">Where should we deliver your order?</p>
      <form data-form="checkout" novalidate>
        <div class="field"><label>Mobile number</label><input name="phone" inputmode="tel" placeholder="09XXXXXXXXX" value="${esc(u.phone)}"></div>
        <div class="field"><label>Delivery address</label><textarea name="address" placeholder="House no., street, barangay, city">${esc(u.address)}</textarea></div>
        <div class="field"><label>Note for the rider (optional)</label><input name="notes" placeholder="e.g. Blue gate, call when outside"></div>
        <label style="font-size:12.5px;font-weight:600;color:var(--blue)">Payment</label>
        <div class="pay-opt" style="margin-top:7px"><div style="flex:1"><div class="t">Cash on delivery</div><div class="s">Pay the rider when your order arrives</div></div>${icon('check', 18)}</div>
        <div class="pay-opt off"><div style="flex:1"><div class="t">GCash / Maya</div><div class="s">Coming soon</div></div></div>
        <div class="row between" style="margin-top:16px"><span class="muted">Total</span><b style="font-size:20px">${money(Cart.total(u.id))}</b></div>
        <div id="cerr" class="err-text" style="margin-top:10px"></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Back</button><button class="btn btn-primary" type="submit">Place order</button></div>
      </form>`);
    m.querySelector('input[name=phone]').focus();
  });
  UI.form('checkout', f => {
    const phone = f.phone.value.replace(/[\s-]/g, ''), address = f.address.value.trim();
    const err = m => { document.getElementById('cerr').textContent = m; };
    if (!/^(09|\+639)\d{9}$/.test(phone)) return err('Enter a valid mobile number, e.g. 09171234567.');
    if (address.length < 10) return err('Please enter your complete delivery address.');
    const r = Orders.place(user, { phone, address, notes: f.notes.value.trim() });
    if (r.error) return err(r.error);
    UI.close(); UI.toast('Order placed! The store will confirm it shortly.');
    setTimeout(() => location.href = 'orders.html', 900);
  });

  /* ---------- Home ---------- */
  function home() {
    user = DB.Auth.require('customer'); if (!user) return;
    let cat = 'All';
    const render = () => {
      const list = Products.list({ activeOnly: true }).filter(p => cat === 'All' || p.category === cat).slice(0, 8);
      UI.mount(UI.shell({
        role: 'customer', active: 'home', eyebrow: UI.greeting(), title: 'Make home feel<br>fresh.', right: bagButton(),
        body: `<form class="search" data-form="homesearch">${icon('search', 18)}<input name="q" placeholder="Search cleaning essentials"></form>
          <section class="hero"><div class="hero-copy"><span class="tag">${icon('spark', 13)} Mighty clean</span>
            <h2>Cleaner spaces,<br>happier days.</h2><p>Everyday essentials that work hard, priced for every home.</p>
            <a class="btn btn-primary" href="shop.html">Shop now ${icon('arrow', 15)}</a></div>
            <div class="hero-img"><img src="../images/hero.jpg" alt="" onerror="this.remove()"></div></section>
          <div class="section-head"><h2>Shop by category</h2><a class="link" href="shop.html">View all</a></div>
          ${chips(cat, 'homecat')}
          <div class="eyebrow" style="margin:26px 0 4px">Customer favorites</div><h2 style="margin-bottom:16px">Made for everyday messes</h2>
          <div class="products">${list.map(productCard).join('') || '<p class="muted">No products yet.</p>'}</div>`
      }));
    };
    UI.on('homecat', t => { cat = t.dataset.cat; render(); });
    UI.form('homesearch', f => { location.href = 'shop.html?q=' + encodeURIComponent(f.q.value.trim()); });
    DB.onChange(() => { if (!UI.isOpen()) render(); else if (document.querySelector('.drawer')) UI.refreshDrawer(cartHtml()); });
    render();
  }

  /* ---------- Shop ---------- */
  function shop() {
    user = DB.Auth.require('customer'); if (!user) return;
    let cat = 'All', q = new URLSearchParams(location.search).get('q') || '';
    const filtered = () => Products.list({ activeOnly: true }).filter(p =>
      (cat === 'All' || p.category === cat) && (!q || (p.name + ' ' + p.category).toLowerCase().includes(q.toLowerCase())));
    const gridHtml = () => {
      const l = filtered();
      return `<div class="small muted" style="margin:16px 0">${l.length} product${l.length === 1 ? '' : 's'} available</div>
        ${l.length ? `<div class="products">${l.map(productCard).join('')}</div>` : `<div class="empty"><div class="ring">${icon('search', 30)}</div><h3>Nothing found</h3><p>Try a different word or category.</p></div>`}`;
    };
    const render = () => UI.mount(UI.shell({
      role: 'customer', active: 'shop', eyebrow: 'Mighty essentials', title: 'Shop all', right: bagButton(),
      body: `<div class="search">${icon('search', 18)}<input data-input="shopq" value="${esc(q)}" placeholder="What are you looking for?"></div>
        ${chips(cat, 'shopcat')}<div id="grid">${gridHtml()}</div>`
    }));
    UI.on('shopcat', t => { cat = t.dataset.cat; render(); });
    UI.input('shopq', t => { q = t.value; document.getElementById('grid').innerHTML = gridHtml(); });
    DB.onChange(() => { if (!UI.isOpen()) render(); else if (document.querySelector('.drawer')) UI.refreshDrawer(cartHtml()); });
    render();
  }

  /* ---------- Orders ---------- */
  const STEPS = ['Placed', 'Preparing', 'On the way', 'Delivered'];
  const stepIndex = o => ({ new: 0, preparing: 1, for_delivery: o.riderStatus === 'picked_up' ? 2 : 1, delivered: 3 }[o.status] ?? 0);

  function orderCard(o) {
    const cancelled = o.status === 'cancelled', idx = stepIndex(o);
    const track = cancelled ? '' : `<div class="track">${STEPS.map((s, i) => `<div class="step ${i <= idx ? 'done' : ''}">${s}</div>`).join('')}</div>`;
    const label = o.status === 'for_delivery' && o.riderStatus === 'picked_up' ? 'On the way' : UI.esc(Orders.STATUS_LABEL[o.status]);
    const rider = o.riderId && o.status === 'for_delivery' ? `<div class="note-line">${icon('truck', 14)} Rider: ${esc(DB.Riders.name(o.riderId))}</div>` : '';
    return `<div class="ocard">
      <div class="top"><div><div class="oid">${Orders.code(o)}</div><div class="ago">${UI.timeAgo(o.createdAt)}</div></div><span class="badge b-${o.status}">${label}</span></div>
      <div>${o.items.map(i => `<div class="row between small" style="padding:3px 0"><span>${i.qty} × ${esc(i.name)}</span><span class="muted">${money(i.qty * i.price)}</span></div>`).join('')}</div>
      ${track}${rider}
      <div class="row between" style="border-top:1px solid var(--line);padding-top:12px"><span class="muted small">Cash on delivery</span><b>${money(o.total)}</b></div>
      ${o.status === 'new' ? `<button class="btn btn-danger btn-sm" data-act="cancelorder" data-id="${o.id}">Cancel order</button>` : ''}
    </div>`;
  }

  function orders() {
    user = DB.Auth.require('customer'); if (!user) return;
    const render = () => {
      const list = Orders.forCustomer(user.id).slice(0, 30);
      UI.mount(UI.shell({
        role: 'customer', active: 'orders', eyebrow: 'Order updates', title: 'Your orders',
        body: list.length ? `<div class="grid-2">${list.map(orderCard).join('')}</div>`
          : `<div class="empty"><div class="ring">${icon('orders', 32)}</div><h3>No orders yet</h3><p>When you place an order, you can track every step of its journey here.</p>
             <a class="btn btn-primary" href="shop.html">Browse products ${icon('arrow', 15)}</a></div>`
      }));
    };
    UI.on('cancelorder', t => UI.confirm('Cancel this order?', 'The items will go back to stock.', 'Cancel order', () => { Orders.cancel(t.dataset.id); UI.toast('Order cancelled'); }, true));
    DB.onChange(() => { if (!UI.isOpen()) render(); });
    setInterval(() => { if (!UI.isOpen()) render(); }, 30000);
    render();
  }

  /* ---------- Profile ---------- */
  function profile() {
    user = DB.Auth.require('customer'); if (!user) return;
    const render = () => {
      user = DB.Auth.current();
      UI.mount(UI.shell({
        role: 'customer', active: 'profile', eyebrow: 'Your account', title: 'Hello, ' + esc(user.name.split(' ')[0]),
        body: `<div class="profile-card"><div class="avatar">${esc(UI.initials(user.name))}</div><div><div style="font-weight:600">${esc(user.name)}</div><div class="small muted">${esc(user.email)}</div></div></div>
          <button class="menu-row" data-act="addr"><span>Delivery addresses</span>${icon('arrow', 16)}</button>
          <button class="menu-row" data-act="pay"><span>Payment methods</span>${icon('arrow', 16)}</button>
          <a class="menu-row" href="orders.html"><span>Order history</span>${icon('arrow', 16)}</a>
          <button class="menu-row" data-act="help"><span>Help &amp; support</span>${icon('arrow', 16)}</button>`
      }));
    };
    UI.on('addr', () => UI.modal(`<h2>Delivery address</h2><p class="sub">We’ll use this by default at checkout.</p>
      <form data-form="addr" novalidate><div class="field"><label>Mobile number</label><input name="phone" value="${esc(user.phone)}" placeholder="09XXXXXXXXX"></div>
      <div class="field"><label>Address</label><textarea name="address" placeholder="House no., street, barangay, city">${esc(user.address)}</textarea></div>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>`));
    UI.form('addr', f => { DB.Auth.updateProfile(user.id, { phone: f.phone.value.trim(), address: f.address.value.trim() }); UI.close(); UI.toast('Address saved'); render(); });
    UI.on('pay', () => UI.modal(`<h2>Payment methods</h2><p class="sub">How you can pay for your orders.</p>
      <div class="pay-opt"><div style="flex:1"><div class="t">Cash on delivery</div><div class="s">Pay the rider when your order arrives</div></div>${icon('check', 18)}</div>
      <div class="pay-opt off"><div style="flex:1"><div class="t">GCash / Maya</div><div class="s">Coming soon</div></div></div>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Done</button></div>`));
    UI.on('help', () => UI.modal(`<h2>Help &amp; support</h2><p class="sub">Need a hand with an order? Reach the store and mention your order number.</p>
      <div class="kv"><span>Mobile</span><span>09XX XXX XXXX</span></div><div class="kv"><span>Email</span><span>admin@gmail.com</span></div><div class="kv"><span>Store hours</span><span>8:00 AM – 8:00 PM</span></div>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Close</button></div>`));
    render();
  }

  window.Customer = { home, shop, orders, profile };
})();
