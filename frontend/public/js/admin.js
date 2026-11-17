/* Admin pages: overview, orders (+ rider assignment), products, riders, payroll, reports */
(function () {
  'use strict';
  const { esc, money, icon } = UI;
  const { Products, Orders, Riders, Payroll, Reports } = DB;
  let admin = null;
  const guard = () => { admin = DB.Auth.require('admin'); return !!admin; };
  const refreshOnChange = render => DB.onChange(() => { if (!UI.isOpen()) render(); });

  const badgeFor = o => {
    let label = Orders.STATUS_LABEL[o.status];
    if (o.status === 'for_delivery') label = o.riderStatus === 'picked_up' ? 'On the way' : o.riderStatus === 'accepted' ? 'Rider accepted' : 'Awaiting rider';
    return `<span class="badge b-${o.status}">${label}</span>`;
  };
  const itemCount = o => o.items.reduce((s, i) => s + i.qty, 0);

  /* ---------- order details + assignment (shared) ---------- */
  function showOrder(id) {
    const o = Orders.get(id); if (!o) return;
    const canAssign = ['preparing', 'for_delivery'].includes(o.status) && o.riderStatus !== 'picked_up';
    const m = UI.modal(`<div class="row between"><h2>${Orders.code(o)}</h2>${badgeFor(o)}</div>
      <p class="sub">${UI.timeAgo(o.createdAt)} · Cash on delivery</p>
      <div class="kv"><span>Customer</span><span>${esc(o.customerName)}</span></div>
      <div class="kv"><span>Mobile</span><span><a class="link" href="tel:${esc(o.phone)}">${esc(o.phone)}</a></span></div>
      <div class="kv"><span>Address</span><span>${esc(o.address)}</span></div>
      ${o.notes ? `<div class="kv"><span>Note</span><span>${esc(o.notes)}</span></div>` : ''}
      <div class="kv"><span>Rider</span><span>${o.riderId ? esc(Riders.name(o.riderId)) : '<span class="muted">Not assigned</span>'}</span></div>
      <div style="margin:14px 0 4px;font-weight:600;font-size:13px">Items</div>
      ${o.items.map(i => `<div class="kv"><span>${i.qty} × ${esc(i.name)}</span><span>${money(i.qty * i.price)}</span></div>`).join('')}
      <div class="row between" style="margin-top:12px"><b>Total to collect</b><b style="font-size:19px">${money(o.total)}</b></div>
      <div class="modal-actions" style="flex-wrap:wrap">
        <button class="btn btn-outline" data-close>Close</button>
        ${['new', 'preparing', 'for_delivery'].includes(o.status) && o.riderStatus !== 'picked_up' ? `<button class="btn btn-danger" data-act="cancelorder" data-id="${o.id}">Cancel order</button>` : ''}
        ${o.status === 'new' ? `<button class="btn btn-primary" data-act="accept" data-id="${o.id}">Accept order</button>` : ''}
        ${canAssign ? `<button class="btn btn-primary" data-act="assign" data-id="${o.id}">${o.riderId ? 'Reassign rider' : 'Assign rider'}</button>` : ''}
      </div>`);
    return m;
  }
  function showAssign(id) {
    const o = Orders.get(id); if (!o) return;
    const riders = Riders.list().sort((a, b) => Riders.activeCount(a.id) - Riders.activeCount(b.id));
    UI.modal(`<h2>Assign a rider</h2><p class="sub">${Orders.code(o)} · ${esc(o.customerName)} · ${esc(o.address)}</p>
      <form data-form="assign" data-id="${o.id}" novalidate>
        ${riders.length ? riders.map((r, i) => {
          const n = Riders.activeCount(r.id), checked = o.riderId ? o.riderId === r.id : i === 0;
          return `<label class="radio-card"><input type="radio" name="rider" value="${r.id}" ${checked ? 'checked' : ''}>
            <div class="avatar soft" style="width:38px;height:38px;font-size:12px">${esc(UI.initials(r.name))}</div>
            <div class="grow"><div class="t" style="font-weight:600;font-size:14px">${esc(r.name)}</div>
            <div class="small muted">${n === 0 ? 'Free right now' : n + ' active ' + (n === 1 ? 'delivery' : 'deliveries')}</div></div>
            ${n === 0 ? '<span class="badge b-ok">Available</span>' : ''}</label>`;
        }).join('') : `<p class="muted">No riders yet. Add one in the Riders page first.</p>`}
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Later</button>
        ${riders.length ? '<button class="btn btn-primary" type="submit">Send to rider</button>' : ''}</div>
      </form>`);
  }
  function registerOrderActions() {
    UI.on('vieworder', t => showOrder(t.dataset.id));
    UI.on('accept', t => { Orders.accept(t.dataset.id); UI.toast('Order accepted — now assign a rider'); showAssign(t.dataset.id); });
    UI.on('assign', t => showAssign(t.dataset.id));
    UI.form('assign', f => {
      const r = f.querySelector('input[name=rider]:checked');
      if (!r) return;
      if (Orders.assign(f.dataset.id, r.value)) { UI.close(); UI.toast('Sent to ' + Riders.name(r.value)); }
      else UI.toast('Could not assign this order', true);
    });
    UI.on('cancelorder', t => UI.confirm('Cancel this order?', 'The items will go back to stock and the customer will see it as cancelled.', 'Cancel order', () => { Orders.cancel(t.dataset.id); UI.toast('Order cancelled'); }, true));
  }

  /* ---------- Overview ---------- */
  function overview() {
    if (!guard()) return;
    registerOrderActions();
    const render = () => {
      const today = Reports.today(), yest = Reports.dayKey(Date.now() - 864e5);
      const t = Reports.revenueOn(today), y = Reports.revenueOn(yest);
      const change = y > 0 ? ((t - y) / y * 100) : null;
      const news = Orders.count('new'), prep = Orders.byStatus('active').filter(o => o.status === 'preparing').length;
      const low = Products.lowList(), recent = Orders.all().slice(0, 5);
      UI.mount(UI.shell({
        role: 'admin', active: 'overview', eyebrow: UI.longDate(Date.now()), title: UI.greeting() + ', ' + esc(admin.name.split(' ')[0]),
        body: `<div class="banner-blue"><div class="label">Today’s sales</div><div class="big">${money(t)}</div>
            <div class="sub">${change === null ? 'Delivered orders today' : (change >= 0 ? '+' : '') + change.toFixed(1) + '% from yesterday'}</div><div class="deco">${icon('chart', 44)}</div></div>
          <div class="grid-2" style="margin-top:14px">
            <a class="stat" href="admin-orders.html">${icon('orders', 20)}<div class="k" style="margin-top:12px">New orders</div><div class="v">${news}</div><div class="d">${news + prep} need action</div></a>
            <a class="stat" href="admin-products.html">${icon('box', 20)}<div class="k" style="margin-top:12px">Low stock</div><div class="v">${low.length}</div><div class="d">${low.length ? 'Restock soon' : 'All good'}</div></a>
          </div>
          <div class="section-head"><h2>Recent orders</h2><a class="link" href="admin-orders.html">View all</a></div>
          ${recent.map(o => `<button class="list-row" style="width:100%;text-align:left" data-act="vieworder" data-id="${o.id}">
            <div class="avatar soft" style="width:38px;height:38px;font-size:11px">${esc(UI.initials(o.customerName))}</div>
            <div class="grow"><div class="t">${esc(o.customerName)}</div><div class="s">${Orders.code(o)} · ${itemCount(o)} items</div></div>
            <div style="text-align:right"><div class="t">${money(o.total)}</div><div class="s">${Orders.STATUS_LABEL[o.status]}</div></div></button>`).join('') || '<p class="muted">No orders yet.</p>'}
          ${prep ? `<a class="action-bar" style="margin-top:18px" href="admin-orders.html"><div class="ic white">${icon('truck', 18)}</div><div class="grow"><div class="t">Rider needed</div><div class="s">${prep} accepted order${prep > 1 ? 's' : ''} waiting for a rider</div></div><span class="link">Assign</span></a>` : ''}
          ${low.length ? `<a class="action-bar" style="margin-top:12px" href="admin-products.html"><div class="ic white">${icon('box', 18)}</div><div class="grow"><div class="t">Inventory alert</div><div class="s">${esc(low[0].name)} is running low (${low[0].stock} left).</div></div><span class="link">Review</span></a>` : ''}`
      }));
    };
    refreshOnChange(render); render();
  }

  /* ---------- Orders ---------- */
  function orders() {
    if (!guard()) return;
    registerOrderActions();
    let tab = 'active';
    const card = o => {
      const rider = o.riderId ? `<div class="note-line">${icon('truck', 14)} ${esc(Riders.name(o.riderId))}${o.riderStatus === 'requested' ? ' · waiting to accept' : o.riderStatus === 'picked_up' ? ' · on the way' : o.riderStatus === 'accepted' ? ' · accepted' : ''}</div>` : '';
      let primary = '';
      if (o.status === 'new') primary = `<button class="btn btn-primary" data-act="accept" data-id="${o.id}">Accept order</button>`;
      else if (o.status === 'preparing') primary = `<button class="btn btn-primary" data-act="assign" data-id="${o.id}">${icon('truck', 16)} Assign rider</button>`;
      else if (o.status === 'for_delivery' && o.riderStatus !== 'picked_up') primary = `<button class="btn btn-primary" data-act="assign" data-id="${o.id}">Reassign rider</button>`;
      return `<div class="ocard"><div class="top"><div><div class="oid">${Orders.code(o)}</div><div class="ago">${UI.timeAgo(o.createdAt)}</div></div>${badgeFor(o)}</div>
        <div class="who"><div class="avatar soft" style="width:40px;height:40px;font-size:11px">${esc(UI.initials(o.customerName))}</div>
          <div class="grow"><div class="t" style="font-weight:600;font-size:14px">${esc(o.customerName)}</div><div class="small muted">${itemCount(o)} items · Cash on delivery</div></div><b>${money(o.total)}</b></div>
        ${rider}
        <div class="actions ${primary ? '' : 'one'}"><button class="btn btn-outline" data-act="vieworder" data-id="${o.id}">View details</button>${primary}</div></div>`;
    };
    const render = () => {
      const lists = { active: Orders.byStatus('active'), completed: Orders.byStatus('completed'), cancelled: Orders.byStatus('cancelled') };
      const l = lists[tab].slice(0, 60);
      UI.mount(UI.shell({
        role: 'admin', active: 'orders', eyebrow: 'Order management', title: 'Customer orders',
        body: `<div class="chips" style="margin-bottom:18px">${[['active', 'Active'], ['completed', 'Completed'], ['cancelled', 'Cancelled']].map(([k, n]) =>
          `<button class="chip ${tab === k ? 'active' : ''}" data-act="otab" data-tab="${k}">${n}${k === 'active' ? ` <small>${lists.active.length}</small>` : ''}</button>`).join('')}</div>
          ${l.length ? `<div class="grid-2">${l.map(card).join('')}</div>` : `<div class="empty"><div class="ring">${icon('orders', 30)}</div><h3>Nothing here</h3><p>Orders in this tab will show up here.</p></div>`}`
      }));
    };
    UI.on('otab', t => { tab = t.dataset.tab; render(); });
    refreshOnChange(render); render();
  }

  /* ---------- Products ---------- */
  function resizeImage(file, cb) {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  function products() {
    if (!guard()) return;
    let pending = null, editing = null, stream = null;
    const status = p => !p.active ? ['Hidden', 'b-cancelled'] : p.stock <= 0 ? ['Out', 'b-bad'] : p.stock <= Products.LOW_STOCK ? ['Low', 'b-low'] : ['Active', 'b-ok'];
    const render = () => {
      const l = Products.list(), low = Products.lowList().length;
      UI.mount(UI.shell({
        role: 'admin', active: 'products', eyebrow: 'Inventory', title: 'Products',
        body: `<button class="action-bar" data-act="receive"><div class="ic">${icon('qr', 20)}</div><div class="grow"><div class="t">Scan delivery QR code</div><div class="s">Receive and record incoming inventory</div></div>${icon('arrow', 16)}</button>
          <div class="stats-split" style="margin:14px 0"><div><div class="k">Total products</div><div class="v">${l.length}</div></div><div><div class="k">Low stock</div><div class="v" style="color:var(--blue)">${low}</div></div></div>
          <button class="btn btn-primary btn-lg btn-block" data-act="editp" data-id="">${icon('plus', 16)} Add new product</button>
          <div class="grid-2" style="margin-top:14px">${l.map(p => { const [t, c] = status(p); return `<button class="ocard" style="flex-direction:row;align-items:center;gap:14px;text-align:left;padding:14px" data-act="editp" data-id="${p.id}">
            ${UI.productImg(p, 'pimg')}<div style="flex:1;min-width:0"><div class="pname">${esc(p.name)}</div><div class="small muted">${money(p.price)} · ${p.stock} in stock</div></div><span class="badge ${c}">${t}</span></button>`; }).join('')}</div>`
      }));
      document.querySelectorAll('.ocard .pimg').forEach(e => { e.style.cssText = 'width:52px;height:52px;margin:0;border-radius:12px;flex-shrink:0'; });
    };
    UI.on('editp', t => {
      editing = t.dataset.id ? Products.get(t.dataset.id) : null; pending = null;
      const p = editing || { name: '', category: 'Home care', size: '', price: '', stock: '', image: '', active: true };
      const cats = Array.from(new Set(['Laundry', 'Kitchen', 'Home care'].concat(Products.categories(), p.category)));
      UI.modal(`<h2>${editing ? 'Edit product' : 'Add new product'}</h2><p class="sub">${editing ? 'Update the details below.' : 'Fill in the product details.'}</p>
        <form data-form="product" novalidate>
          <div class="field"><label>Photo</label><div class="img-pick"><div class="pv" id="pv">${UI.productImg(p, 'pimg')}</div><input type="file" id="pfile" accept="image/*"></div><span class="hint">Optional. Photos are shrunk automatically.</span></div>
          <div class="field"><label>Product name</label><input name="name" value="${esc(p.name)}" placeholder="e.g. Bleach"></div>
          <div class="form-2"><div class="field"><label>Category</label><select name="category">${cats.map(c => `<option ${c === p.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
            <div class="field"><label>Size</label><input name="size" value="${esc(p.size)}" placeholder="e.g. 1 liter"></div></div>
          <div class="form-2"><div class="field"><label>Price (₱)</label><input name="price" type="number" min="0" step="0.01" value="${esc(p.price)}"></div>
            <div class="field"><label>Stock</label><input name="stock" type="number" min="0" step="1" value="${esc(p.stock)}"></div></div>
          <label class="check" style="font-size:14px;color:var(--ink)"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Show in the shop</label>
          <div id="perr" class="err-text" style="margin-top:12px"></div>
          <div class="modal-actions" style="flex-wrap:wrap"><button type="button" class="btn btn-outline" data-close>Cancel</button>
            ${editing ? '<button type="button" class="btn btn-danger" data-act="delp">Delete</button>' : ''}<button class="btn btn-primary" type="submit">Save</button></div>
        </form>`);
      document.getElementById('pfile').addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        resizeImage(file, url => { pending = url; document.getElementById('pv').innerHTML = `<div class="pimg"><img src="${url}" alt=""></div>`; });
      });
    });
    UI.form('product', f => {
      const name = f.name.value.trim(), price = parseFloat(f.price.value), stock = parseInt(f.stock.value, 10);
      const err = m => { document.getElementById('perr').textContent = m; };
      if (!name) return err('Enter a product name.');
      if (!(price >= 0)) return err('Enter a valid price.');
      if (!(stock >= 0)) return err('Enter the stock count.');
      Products.save({ id: editing ? editing.id : undefined, name, category: f.category.value, size: f.size.value.trim(), price, stock, active: f.active.checked, image: pending || (editing ? editing.image : '') });
      UI.close(); UI.toast('Product saved');
    });
    UI.on('delp', () => UI.confirm('Delete this product?', 'Past orders keep their record. This cannot be undone.', 'Delete', () => { Products.remove(editing.id); UI.toast('Product deleted'); }, true));

    // receive stock (manual + optional QR scan)
    const stopCam = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
    UI.on('receive', async () => {
      const list = Products.list();
      const hasScan = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      UI.modal(`<h2>Receive stock</h2><p class="sub">${hasScan ? 'Scan the delivery QR code, or enter the quantity by hand.' : 'Choose the product and the quantity you received.'}</p>
        ${hasScan ? '<video class="scan" id="cam" playsinline muted hidden></video><button class="btn btn-outline btn-block" id="startcam" style="margin-bottom:16px" type="button">' + icon('qr', 16) + ' Start camera</button>' : ''}
        <form data-form="receive" novalidate>
          <div class="field"><label>Product</label><select name="pid">${list.map(p => `<option value="${p.id}">${esc(p.name)} (${p.stock} in stock)</option>`).join('')}</select></div>
          <div class="field"><label>Quantity received</label><input name="qty" type="number" min="1" step="1" placeholder="e.g. 24"></div>
          <div class="hint small muted" style="margin-bottom:6px">QR format: <code>ALLMIGHTY|productId|quantity</code></div>
          <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Add to stock</button></div>
        </form>`);
      const btn = document.getElementById('startcam');
      if (btn) btn.onclick = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const v = document.getElementById('cam'); v.srcObject = stream; v.hidden = false; await v.play(); btn.hidden = true;
          const det = new BarcodeDetector({ formats: ['qr_code'] });
          const tick = async () => {
            if (!stream) return;
            try {
              const r = await det.detect(v);
              if (r.length) {
                const [tag, pid, qty] = r[0].rawValue.split('|');
                if (tag === 'ALLMIGHTY' && Products.get(pid) && parseInt(qty, 10) > 0) {
                  Products.receive(pid, parseInt(qty, 10)); stopCam(); UI.close(); UI.toast('Received ' + qty + ' × ' + Products.get(pid).name); return;
                }
              }
            } catch (e) { /* keep scanning */ }
            requestAnimationFrame(tick);
          };
          tick();
        } catch (e) { UI.toast('Camera not available — enter the quantity by hand', true); }
      };
    });
    UI.form('receive', f => {
      const qty = parseInt(f.qty.value, 10);
      if (!(qty > 0)) { UI.toast('Enter a quantity', true); return; }
      stopCam(); Products.receive(f.pid.value, qty); UI.close(); UI.toast('Stock updated');
    });
    document.addEventListener('click', e => { if (e.target.matches('.overlay') || e.target.closest('[data-close]')) stopCam(); });
    refreshOnChange(render); render();
  }

  /* ---------- Riders ---------- */
  function riders() {
    if (!guard()) return;
    const render = () => {
      const l = Riders.list();
      UI.mount(UI.shell({
        role: 'admin', active: 'riders', eyebrow: 'Delivery team', title: 'Riders',
        body: `<button class="btn btn-primary btn-lg btn-block" data-act="addrider">${icon('plus', 16)} Add rider</button>
          <div class="grid-2" style="margin-top:14px">${l.map(r => {
            const n = Riders.activeCount(r.id), owe = Riders.toRemit(r.id), done = Orders.riderDone(r.id).length;
            return `<div class="ocard"><div class="who" style="border:0;padding:0"><div class="avatar" style="width:46px;height:46px">${esc(UI.initials(r.name))}</div>
              <div class="grow"><div style="font-weight:600">${esc(r.name)}</div><div class="small muted">${esc(r.email)}${r.phone ? ' · ' + esc(r.phone) : ''}</div></div>
              <span class="badge ${n ? 'b-for_delivery' : 'b-ok'}">${n ? n + ' active' : 'Free'}</span></div>
              <div class="stats-split"><div><div class="k">Delivered</div><div class="v">${done}</div></div><div><div class="k">Cash to remit</div><div class="v" style="color:${owe ? 'var(--warn)' : 'inherit'}">${money(owe)}</div></div></div>
              <button class="btn btn-outline" data-act="remit" data-id="${r.id}" ${owe ? '' : 'disabled style="opacity:.5"'}>${icon('check', 16)} Mark cash as remitted</button></div>`;
          }).join('')}</div>`
      }));
    };
    UI.on('addrider', () => UI.modal(`<h2>Add rider</h2><p class="sub">The rider uses this email and password to log in.</p>
      <form data-form="rider" novalidate>
        <div class="field"><label>Full name</label><input name="name" placeholder="e.g. Jeremy Rivera"></div>
        <div class="field"><label>Email</label><input name="email" type="email" placeholder="rider@gmail.com"></div>
        <div class="form-2"><div class="field"><label>Mobile</label><input name="phone" placeholder="09XXXXXXXXX"></div><div class="field"><label>Password</label><input name="password" type="text" placeholder="min. 6 characters"></div></div>
        <div id="rerr" class="err-text"></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Add rider</button></div></form>`));
    UI.form('rider', f => {
      const r = Riders.add({ name: f.name.value, email: f.email.value, phone: f.phone.value, password: f.password.value });
      if (r.error) { document.getElementById('rerr').textContent = r.error; return; }
      UI.close(); UI.toast('Rider added');
    });
    UI.on('remit', t => UI.confirm('Mark cash as remitted?', Riders.name(t.dataset.id) + ' handed over ' + money(Riders.toRemit(t.dataset.id)) + ' of COD cash.', 'Yes, received', () => { Riders.remit(t.dataset.id); UI.toast('Marked as remitted'); }));
    refreshOnChange(render); render();
  }

  /* ---------- Payroll ---------- */
  function payroll() {
    if (!guard()) return;
    let date = Reports.today();
    const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const render = () => {
      const staff = Payroll.staff(), total = Payroll.totalFor(date), n = Payroll.byDate(date).length;
      UI.mount(UI.shell({
        role: 'admin', active: 'payroll', eyebrow: 'Payroll management', title: 'Daily salary',
        body: `<div class="action-bar" style="background:#fff;border-color:var(--line)"><span style="color:var(--blue)">${icon('clock', 18)}</span><div class="grow"><b style="font-size:13px">${fmt(date)}</b></div><button class="link" data-act="pdate">Change</button></div>
          <div class="banner-blue" style="margin-top:14px;padding:22px 26px"><div class="label">Today’s total payroll</div><div class="big">${money(total)}</div><div class="sub">${n} of ${staff.length} staff recorded</div></div>
          <div class="section-head"><h2>Staff attendance</h2><button class="link" data-act="phist">View history</button></div>
          <div class="grid-2">${staff.map(s => { const r = Payroll.recordFor(date, s.id); return `<button class="ocard" style="flex-direction:row;align-items:center;gap:14px;text-align:left;padding:16px" data-act="rec" data-id="${s.id}">
            <div class="avatar soft" style="width:42px;height:42px;font-size:12px">${esc(UI.initials(s.name))}</div>
            <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${esc(s.name)}</div><div class="small muted">${esc(s.role)}${r && r.note ? ' · ' + esc(r.note) : ''}</div></div>
            <div style="text-align:right"><div style="font-weight:600">${r ? money(r.amount) : '<span class="muted">—</span>'}</div>${r ? '<div class="small" style="color:var(--ok)">✓ Recorded</div>' : '<div class="small" style="color:var(--warn)">Not recorded</div>'}</div></button>`; }).join('')}</div>
          <button class="btn btn-primary btn-lg btn-block" style="margin-top:14px" data-act="rec" data-id="">${icon('plus', 16)} Record salary</button>`
      }));
    };
    UI.on('pdate', () => UI.modal(`<h2>Choose a date</h2><p class="sub">View or record salaries for another day.</p>
      <form data-form="pdate"><div class="field"><input type="date" name="d" value="${date}" max="${Reports.today()}"></div>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Go</button></div></form>`));
    UI.form('pdate', f => { if (f.d.value) { date = f.d.value; UI.close(); render(); } });
    UI.on('rec', t => {
      const staff = Payroll.staff(), sel = t.dataset.id || (staff.find(s => !Payroll.recordFor(date, s.id)) || staff[0]).id;
      const cur = Payroll.recordFor(date, sel), s0 = staff.find(s => s.id === sel);
      UI.modal(`<h2>Record salary</h2><p class="sub">${fmt(date)}</p>
        <form data-form="rec" novalidate>
          <div class="field"><label>Staff</label><select name="sid" data-input="recstaff">${staff.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)} · ${esc(s.role)}</option>`).join('')}</select></div>
          <div class="form-2"><div class="field"><label>Amount (₱)</label><input name="amount" type="number" min="0" step="0.01" value="${cur ? cur.amount : s0.rate}"></div>
            <div class="field"><label>Note</label><input name="note" placeholder="e.g. 8 hrs / half day" value="${cur ? esc(cur.note) : ''}"></div></div>
          <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>`);
    });
    UI.input('recstaff', sel => {
      const s = Payroll.staff().find(x => x.id === sel.value), r = Payroll.recordFor(date, sel.value), f = sel.form;
      f.amount.value = r ? r.amount : s.rate; f.note.value = r ? r.note : '';
    });
    UI.form('rec', f => {
      const amt = parseFloat(f.amount.value);
      if (!(amt >= 0)) { UI.toast('Enter a valid amount', true); return; }
      Payroll.record(date, f.sid.value, amt, f.note.value.trim()); UI.close(); UI.toast('Salary recorded');
    });
    UI.on('phist', () => {
      const h = Payroll.history(30);
      UI.modal(`<h2>Payroll history</h2><p class="sub">Last ${h.length} days with records.</p>
        ${h.map(d => `<div class="list-row" style="padding:12px 0"><div class="grow"><div class="t">${new Date(d.date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div class="s">${d.records.map(r => esc(Payroll.staffName(r.staffId).split(' ')[0])).join(', ')}</div></div><b>${money(d.total)}</b></div>`).join('') || '<p class="muted">No records yet.</p>'}
        <div class="modal-actions"><button class="btn btn-primary" data-close>Close</button></div>`);
    });
    refreshOnChange(render); render();
  }

  /* ---------- Reports ---------- */
  function reports() {
    if (!guard()) return;
    let period = 'week';
    const render = () => {
      const s = Reports.summary(period), max = Math.max(1, ...s.buckets.map(b => b.value));
      const ch = s.change === null ? '' : `${s.change >= 0 ? '↑' : '↓'} ${Math.abs(s.change).toFixed(1)}% from last ${period}`;
      UI.mount(UI.shell({
        role: 'admin', active: 'reports', eyebrow: 'Business reports', title: 'Sales overview',
        body: `<div class="chips" style="margin-bottom:16px">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([k, n]) => `<button class="chip ${period === k ? 'active' : ''}" data-act="period" data-p="${k}">${n}</button>`).join('')}</div>
          <div class="grid-stat">
            <div class="stat"><div class="k">Gross sales</div><div class="v" style="font-size:24px">${money(s.revenue)}</div></div>
            <div class="stat"><div class="k">Expenses (payroll)</div><div class="v" style="font-size:24px">${money(s.expenses)}</div></div>
            <div class="stat hl"><div class="k">Net profit</div><div class="v" style="font-size:24px">${money(s.net)}</div></div></div>
          <div class="banner-blue" style="margin-top:14px;padding:26px 28px 20px"><div class="label">Total revenue · ${s.orders} delivered order${s.orders === 1 ? '' : 's'}</div><div class="big">${money(s.revenue)}</div><div class="sub">${ch}</div>
            <div class="bars ${s.buckets.length > 12 ? 'thin' : ''}">${s.buckets.map(b => `<div class="col" title="${esc(b.tip)}: ${money(b.value)}"><div class="bar" style="height:${Math.max(2, b.value / max * 100)}%"></div><div class="lbl">${esc(b.label)}</div></div>`).join('')}</div></div>
          <div class="section-head"><h2>Top-selling products</h2></div>
          ${s.top.map((p, i) => { const pr = Products.get(p.id); return `<div class="list-row"><span class="muted small" style="width:20px">${String(i + 1).padStart(2, '0')}</span>
            <div style="width:44px;height:44px;flex-shrink:0">${pr ? UI.productImg(pr, 'pimg') : ''}</div>
            <div class="grow"><div class="t">${esc(p.name)}</div><div class="s">${p.qty} sold</div></div><b>${money(p.revenue)}</b></div>`; }).join('') || '<p class="muted">No sales in this period yet.</p>'}`
      }));
      document.querySelectorAll('.list-row .pimg').forEach(e => { e.style.cssText = 'width:44px;height:44px;margin:0;border-radius:10px'; });
    };
    UI.on('period', t => { period = t.dataset.p; render(); });
    refreshOnChange(render); render();
  }

  window.Admin = { overview, orders, products, riders, payroll, reports };
})();
