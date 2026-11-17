/* Rider pages: today, deliveries, history, profile */
(function () {
  'use strict';
  const { esc, money, icon } = UI;
  const { Orders, Riders } = DB;
  let me = null;
  const guard = () => { me = DB.Auth.require('rider'); return !!me; };
  const refreshOnChange = render => DB.onChange(() => { if (!UI.isOpen()) render(); });
  const mapsUrl = a => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
  const itemCount = o => o.items.reduce((s, i) => s + i.qty, 0);
  const WEEK = 7 * 864e5;

  // the main action button for an order, depending on where it is in the rider flow
  function actionBtn(o, big) {
    const cls = 'btn btn-primary ' + (big ? 'btn-lg btn-block' : 'btn-block');
    if (o.riderStatus === 'requested') return `<div class="actions" style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px"><button class="btn btn-outline" data-act="decline" data-id="${o.id}">Decline</button><button class="btn btn-primary" data-act="raccept" data-id="${o.id}">Accept</button></div>`;
    if (o.riderStatus === 'accepted') return `<button class="${cls}" data-act="pickup" data-id="${o.id}">Confirm pickup ${icon('arrow', 16)}</button>`;
    if (o.riderStatus === 'picked_up') return `<button class="${cls}" data-act="deliver" data-id="${o.id}">${icon('check', 16)} Mark as delivered</button>`;
    return '';
  }
  function register() {
    UI.on('raccept', t => { Orders.riderRespond(t.dataset.id, true); UI.close(); UI.toast('Delivery accepted'); });
    UI.on('decline', t => UI.confirm('Decline this delivery?', 'The store will assign it to another rider.', 'Decline', () => { Orders.riderRespond(t.dataset.id, false); UI.toast('Delivery declined'); }, true));
    UI.on('pickup', t => { Orders.pickup(t.dataset.id); UI.close(); UI.toast('Pickup confirmed — safe trip!'); });
    UI.on('deliver', t => {
      const o = Orders.get(t.dataset.id);
      UI.confirm('Delivered and paid?', 'Confirm that you collected ' + money(o.total) + ' from ' + o.customerName + '.', 'Yes, delivered', () => { Orders.deliver(o.id); UI.toast('Delivery completed. Nice work!'); });
    });
    UI.on('viewdel', t => showDelivery(t.dataset.id));
  }
  function showDelivery(id) {
    const o = Orders.get(id); if (!o) return;
    UI.modal(`<div class="row between"><h2>${Orders.code(o)}</h2><span class="badge b-cod">COD</span></div><p class="sub">${esc(o.customerName)}</p>
      <div class="kv"><span>Address</span><span>${esc(o.address)}</span></div>
      <div class="kv"><span>Mobile</span><span><a class="link" href="tel:${esc(o.phone)}">${esc(o.phone)}</a></span></div>
      ${o.notes ? `<div class="kv"><span>Note</span><span>${esc(o.notes)}</span></div>` : ''}
      <div style="margin:14px 0 4px;font-weight:600;font-size:13px">Items</div>
      ${o.items.map(i => `<div class="kv"><span>${i.qty} × ${esc(i.name)}</span><span>${money(i.qty * i.price)}</span></div>`).join('')}
      <div class="collect"><span>Amount to collect</span><b>${money(o.total)}</b></div>
      <div class="stack" style="gap:10px">${actionBtn(o, true)}
        <a class="btn btn-outline btn-block" href="${mapsUrl(o.address)}" target="_blank" rel="noopener">${icon('pin', 16)} Open directions</a>
        <button class="btn btn-outline btn-block" data-close>Close</button></div>`);
  }

  /* ---------- Today ---------- */
  function today() {
    if (!guard()) return; register();
    let idx = 0;
    UI.on('nextstop', t => { idx += Number(t.dataset.d); render(); });
    const render = () => {
      const act = Orders.riderActive(me.id), req = Orders.riderRequests(me.id);
      if (idx >= act.length) idx = Math.max(0, act.length - 1);
      if (idx < 0) idx = 0;
      const o = act[idx];
      const doneToday = Orders.riderDone(me.id).filter(x => DB.util.dayKey(x.deliveredAt) === DB.util.dayKey(Date.now())).length;
      const next = o ? `<div class="section-head"><h2>Next delivery</h2>
          <span class="row small muted" style="gap:6px">${act.length > 1 ? `<button class="plus-btn" style="width:26px;height:26px" data-act="nextstop" data-d="-1" ${idx === 0 ? 'disabled' : ''}>${icon('chevL', 14)}</button>` : ''}${idx + 1} of ${act.length}${act.length > 1 ? `<button class="plus-btn" style="width:26px;height:26px" data-act="nextstop" data-d="1" ${idx === act.length - 1 ? 'disabled' : ''}>${icon('chevR', 14)}</button>` : ''}</span></div>
        <div class="card" style="max-width:640px"><div class="row between"><div class="row"><div class="avatar soft" style="width:40px;height:40px;font-size:11px">${esc(UI.initials(o.customerName))}</div>
            <div><div style="font-weight:600;font-size:14px">${esc(o.customerName)}</div><div class="small muted">Order ${Orders.code(o)} · ${itemCount(o)} items</div></div></div><span class="badge b-cod">COD</span></div>
          <div class="row" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line);align-items:flex-start"><span style="color:var(--blue);margin-top:2px">${icon('pin', 18)}</span>
            <div><div style="font-weight:600;font-size:13.5px">${esc(o.address)}</div><div class="small muted">${esc(o.phone)}</div></div></div>
          <div class="collect"><span>Amount to collect</span><b>${money(o.total)}</b></div>
          <div class="stack" style="gap:10px">${actionBtn(o, true)}<a class="btn btn-outline btn-block btn-lg" href="${mapsUrl(o.address)}" target="_blank" rel="noopener">${icon('pin', 16)} Open directions</a></div></div>
        <div class="reminder" style="max-width:640px"><span style="color:var(--muted)">${icon('clock', 18)}</span><div><div class="t">Remember</div><div class="s">Check the order and collect proof of delivery before leaving.</div></div></div>`
        : `<div class="empty"><div class="ring">${icon('truck', 30)}</div><h3>No deliveries right now</h3><p>${req.length ? 'You have a new request waiting for you.' : 'New orders from the store will show up here.'}</p></div>`;
      UI.mount(UI.shell({
        role: 'rider', active: 'today', eyebrow: UI.longDate(Date.now()), title: 'Ready to deliver?',
        body: `${req.length ? `<a class="action-bar" style="margin-bottom:14px" href="rider-deliveries.html"><div class="ic">${icon('truck', 18)}</div><div class="grow"><div class="t">${req.length} new delivery request${req.length > 1 ? 's' : ''}</div><div class="s">Tap to review and accept</div></div><span class="link">Review</span></a>` : ''}
          <div class="banner-blue"><div class="label">Today’s route</div><div class="big">${act.length} stop${act.length === 1 ? '' : 's'}</div><div class="sub">${doneToday} delivered today</div><div class="deco">${icon('truck', 44)}</div></div>${next}`
      }));
    };
    refreshOnChange(render); render();
  }

  /* ---------- Deliveries ---------- */
  function deliveries() {
    if (!guard()) return; register();
    let tab = 'active';
    const card = o => `<div class="ocard"><div class="row between"><span class="small muted" style="font-weight:600">${Orders.code(o)}</span><span class="small" style="color:var(--blue);font-weight:700">${money(o.total)} COD</span></div>
      <div><div style="font-size:17px;font-weight:500">${esc(o.customerName)}</div><div class="note-line" style="margin-top:4px">${icon('pin', 14)} ${esc(o.address)}</div></div>
      ${o.riderStatus === 'requested' ? actionBtn(o) : `<button class="btn btn-primary btn-block" data-act="viewdel" data-id="${o.id}">View delivery ${icon('arrow', 15)}</button>`}</div>`;
    const render = () => {
      const act = Orders.riderActive(me.id), req = Orders.riderRequests(me.id), l = tab === 'active' ? act : req;
      UI.mount(UI.shell({
        role: 'rider', active: 'deliveries', eyebrow: 'Assigned to you', title: 'My deliveries',
        body: `${req.length ? `<div class="action-bar" style="margin-bottom:14px"><div class="ic white">${icon('truck', 18)}</div><div class="grow"><div class="t">New delivery request</div><div class="s">${Orders.code(req[0])} · ${esc(req[0].customerName)}</div></div><button class="btn btn-primary btn-sm" data-act="raccept" data-id="${req[0].id}">Accept</button></div>` : ''}
          <div class="chips" style="margin-bottom:16px"><button class="chip ${tab === 'active' ? 'active' : ''}" data-act="dtab" data-tab="active">Active <small>${act.length}</small></button><button class="chip ${tab === 'upcoming' ? 'active' : ''}" data-act="dtab" data-tab="upcoming">Upcoming <small>${req.length}</small></button></div>
          ${l.length ? `<div class="grid-2">${l.map(card).join('')}</div>` : `<div class="empty"><div class="ring">${icon('truck', 30)}</div><h3>Nothing here</h3><p>${tab === 'active' ? 'Accepted deliveries will appear here.' : 'No pending requests.'}</p></div>`}`
      }));
    };
    UI.on('dtab', t => { tab = t.dataset.tab; render(); });
    refreshOnChange(render); render();
  }

  /* ---------- History ---------- */
  function history() {
    if (!guard()) return;
    const render = () => {
      const done = Orders.riderDone(me.id), wk = done.filter(o => Date.now() - o.deliveredAt < WEEK);
      const cod = wk.reduce((s, o) => s + o.total, 0), owe = Riders.toRemit(me.id);
      UI.mount(UI.shell({
        role: 'rider', active: 'history', eyebrow: 'Delivery records', title: 'History',
        body: `<div class="stats-split"><div><div class="k">This week</div><div class="v">${wk.length}</div><div class="small muted">Completed</div></div>
          <div><div class="k">COD collected</div><div class="v">${money(cod).replace('.00', '')}</div><div class="small muted">${owe ? 'To remit ' + money(owe) : 'All remitted'}</div></div></div>
          <div class="section-head"><h2>Recent deliveries</h2></div>
          ${done.slice(0, 25).map(o => `<div class="list-row"><div class="avatar" style="width:32px;height:32px">${icon('check', 16)}</div>
            <div class="grow"><div class="t">${esc(o.customerName)}</div><div class="s">${Orders.code(o)} · ${UI.shortDate(o.deliveredAt)}</div></div><b>${money(o.total)}</b></div>`).join('') || '<p class="muted">No completed deliveries yet.</p>'}`
      }));
    };
    refreshOnChange(render); render();
  }

  /* ---------- Profile ---------- */
  function profile() {
    if (!guard()) return;
    const render = () => {
      me = DB.Auth.current();
      UI.mount(UI.shell({
        role: 'rider', active: 'profile', eyebrow: 'Delivery partner', title: 'My profile',
        body: `<div class="profile-hero"><div class="avatar">${esc(UI.initials(me.name))}</div><div style="font-size:17px;font-weight:600">${esc(me.name)}</div>
          <div style="font-size:12px;opacity:.85">Verified delivery staff</div><span class="pill">${icon('check', 12)} Active today</span></div>
          <button class="menu-row" data-act="pcontact"><span>Contact information</span>${icon('arrow', 16)}</button>
          <button class="menu-row" data-act="pperf"><span>Delivery performance</span>${icon('arrow', 16)}</button>
          <button class="menu-row" data-act="pcash"><span>Cash remittance</span>${icon('arrow', 16)}</button>
          <button class="menu-row" data-act="phelp"><span>Help &amp; support</span>${icon('arrow', 16)}</button>`
      }));
    };
    UI.on('pcontact', () => UI.modal(`<h2>Contact information</h2><p class="sub">The store uses this to reach you.</p>
      <form data-form="pcontact" novalidate><div class="kv"><span>Email</span><span>${esc(me.email)}</span></div>
      <div class="field" style="margin-top:14px"><label>Mobile number</label><input name="phone" value="${esc(me.phone)}" placeholder="09XXXXXXXXX"></div>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>`));
    UI.form('pcontact', f => { DB.Auth.updateProfile(me.id, { phone: f.phone.value.trim() }); UI.close(); UI.toast('Saved'); render(); });
    UI.on('pperf', () => {
      const done = Orders.riderDone(me.id), t = Date.now();
      const wk = done.filter(o => t - o.deliveredAt < WEEK).length, mo = done.filter(o => t - o.deliveredAt < 30 * 864e5).length;
      UI.modal(`<h2>Delivery performance</h2><p class="sub">Your completed deliveries.</p>
        <div class="kv"><span>This week</span><span>${wk}</span></div><div class="kv"><span>Last 30 days</span><span>${mo}</span></div><div class="kv"><span>All time</span><span>${done.length}</span></div>
        <div class="modal-actions"><button class="btn btn-primary" data-close>Close</button></div>`);
    });
    UI.on('pcash', () => {
      const all = Riders.collected(me.id), owe = Riders.toRemit(me.id);
      UI.modal(`<h2>Cash remittance</h2><p class="sub">COD cash you collect must be handed to the store. The admin marks it as received.</p>
        <div class="kv"><span>Total collected</span><span>${money(all)}</span></div><div class="kv"><span>Already remitted</span><span>${money(all - owe)}</span></div>
        <div class="kv"><span><b>To remit</b></span><span><b style="font-size:17px;color:${owe ? 'var(--warn)' : 'var(--ok)'}">${money(owe)}</b></span></div>
        <div class="modal-actions"><button class="btn btn-primary" data-close>Close</button></div>`);
    });
    UI.on('phelp', () => UI.modal(`<h2>Help &amp; support</h2><p class="sub">Problem with a delivery? Contact the store admin right away.</p>
      <div class="kv"><span>Admin email</span><span>admin@gmail.com</span></div><div class="kv"><span>Store hours</span><span>8:00 AM – 8:00 PM</span></div>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Close</button></div>`));
    render();
  }

  window.Rider = { today, deliveries, history, profile };
})();
