
(function(){
  'use strict';
  const fmt = (window.SS_MONEY || 'Dhs. {{amount}}');
  /* whole amounts drop the ".00" — matches the site's price typography */
  const money = c => fmt.replace(/\{\{\s*amount[^}]*\}\}/,
    (c/100).toLocaleString('en', {minimumFractionDigits: c%100 ? 2 : 0,
                                  maximumFractionDigits: 2}));
  const FREE = window.SS_FREE_CENTS || 15000;
  let cart = null;

  function paint(){
    if(!cart) return;
    const n = cart.item_count;
    document.querySelectorAll('#bagcount,[data-bagcount]').forEach(e=>e.textContent=n);
    const line = i => `<div class="ditem">
      <img src="${i.image||''}" alt="" width="112" height="112">
      <div><h3>${i.product_title}${i.variant_title&&i.variant_title!=='Default Title'?' — '+i.variant_title:''}</h3>
        <p class="meta">QTY ${i.quantity}</p>
        <span class="price">${money(i.final_line_price)}</span>
        <button class="ul" data-remove="${i.key}">Remove</button></div></div>`;
    const items = document.getElementById('ditems');
    if(items) items.innerHTML = cart.items.length ? cart.items.map(line).join('')
      : '<p class="crumb" style="padding-block:var(--s-5)">Empty — every story starts somewhere.</p>';
    const wrap = document.getElementById('baglines');
    if(wrap) wrap.innerHTML = cart.items.length ? cart.items.map(i=>`<div class="line">
      <img src="${i.image||''}" alt="" width="112" height="112">
      <div><h3>${i.product_title}${i.variant_title&&i.variant_title!=='Default Title'?' — '+i.variant_title:''}</h3>
        <p class="meta">QTY ${i.quantity}</p>
        <div class="act"><span class="meta">${money(i.final_line_price)}</span>
          <button class="ul" data-remove="${i.key}">Remove</button></div></div></div>`).join('')
      : `<div class="empty"><p class="k">Nothing here yet</p>
         <p>Your bag is empty. The shelf is seven stories long.</p>
         <div class="tagrow"><a href="/collections/the-fragrances">See the fragrances</a><a href="/products/discovery-set">Begin with the set</a></div></div>`;
    const t = cart.total_price;
    ['dtotal','subtotal','bagsub','cosub','grandtotal','bagtotal','cototal']
      .forEach(id=>{const e=document.getElementById(id); if(e) e.textContent=money(t);});
    document.querySelectorAll('[data-bagtotal]').forEach(e=>e.textContent=money(t));
    const pct = Math.min(100, Math.round(t/FREE*100));
    const fill = document.getElementById('tfill'); if(fill) fill.style.width=pct+'%';
    const th = document.getElementById('thresh');
    if(th) th.textContent = t>=FREE ? 'Complimentary delivery — unlocked'
      : 'Complimentary delivery at '+money(FREE)+' — '+money(FREE-t)+' away';
  }

  async function refresh(){
    try{ cart = await (await fetch('/cart.js',{headers:{'Accept':'application/json'}})).json(); }
    catch(e){ return; }
    paint();
  }

  window.addToBag = function(slug, kind, btn){
    const key = kind==='full' ? (slug==='set' ? 'full' : '100ml') : kind;
    const v = window.SS_VAR && window.SS_VAR[slug] && window.SS_VAR[slug][key];
    if(!v || !v.id){ location.href = slug==='set' ? '/products/discovery-set' : '/products/'+slug; return; }
    if(btn){ const t=btn.textContent, w=btn.getBoundingClientRect().width;
      btn.style.minWidth=Math.round(w)+'px'; btn.textContent='In the bag'; btn.disabled=true;
      setTimeout(()=>{btn.textContent=t;btn.disabled=false;btn.style.minWidth='';},1400); }
    fetch('/cart/add.js',{method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({items:[{id:v.id,quantity:1}]})})
      .then(refresh)
      .then(()=>{ const c=document.getElementById('bagcount');
        if(c){c.classList.add('tick');setTimeout(()=>c.classList.remove('tick'),300);}
        setTimeout(window.openDrawer, 420); });
  };
  window.SSremove = function(){ /* superseded by data-remove delegation */ };

  /* live prices over the baked ones ------------------------------------ */
  const VP = (slug, key) => {
    if(slug==='discovery-set'||slug==='set'){
      const v = window.SS_VAR && SS_VAR.set && SS_VAR.set.full;
      return v && v.id ? v.price : null;
    }
    const v = window.SS_VAR && SS_VAR[slug] && SS_VAR[slug][key];
    return v && v.id ? v.price : null;
  };
  window.SSP = (slug, key, fb) => {
    const p = VP(slug, key); return p==null ? '£'+fb : money(p);
  };
  function fixPrices(){
    if(!window.SS_VAR) return;
    const slug = document.body.dataset.slug;
    if(slug){
      document.querySelectorAll('.sizes button[data-size]').forEach(b=>{
        const p = VP(slug, b.dataset.size); if(p==null) return;
        b.dataset.price = money(p);
        const s = b.querySelector('.szp'); if(s) s.textContent = money(p);
      });
      const cur = document.querySelector('.sizes button[aria-current]')
               || document.querySelector('.sizes button[data-size]');
      if(cur && cur.dataset.price && /[^0-9.]/.test(cur.dataset.price)){
        const add = document.querySelector('.pdp .cta .btn-ink');
        if(add && /—/.test(add.textContent))
          add.textContent = 'Add to bag — ' + cur.dataset.price;
        const bp = document.querySelector('[data-barprice]');
        if(bp){ const l = cur.querySelector('.szl');
          bp.textContent = cur.dataset.price + (l ? ' · ' + l.textContent : ''); }
      }
    }
    /* every quick-buy button repaints from its own size, not just the first */
    document.querySelectorAll('[data-buy][data-size]').forEach(b=>{
      const card = b.closest('[data-slug]');
      const s = card ? card.dataset.slug : document.body.dataset.slug;
      const p = VP(s, b.dataset.size); if(p==null) return;
      if(/—/.test(b.textContent))
        b.textContent = b.textContent.split('—')[0].trim() + ' — ' + money(p);
    });
    document.querySelectorAll('[data-priceline]').forEach(line=>{
      const card = line.closest('[data-slug]'); if(!card) return;
      const buy = card.querySelector('[data-buy]');
      const key = (buy && buy.dataset.size) || '100ml';
      const p = VP(card.dataset.slug, key); if(p==null) return;
      const lbl = (line.textContent.split('·')[1] || '').trim();
      line.textContent = money(p) + (lbl ? ' · ' + lbl : '');
    });
  }
  fixPrices();
  /* longer store-currency strings need a touch more room in the 50/50 row */
  const st = document.createElement('style');
  st.textContent = '.quick .r .btn{letter-spacing:.02em;font-size:min(var(--t-btn),3.6vw)}'
    + '.btn-ink[disabled]:hover{background:var(--ink)}'
    + '.btn-ivory[disabled]:hover{background:var(--ivory)}'
    + '.btn-ghost[disabled]:hover,.btn-ghostink[disabled]:hover{background:transparent}';
  document.head.appendChild(st);
  document.addEventListener('click', e=>{
    const b = e.target.closest('[data-remove]'); if(!b) return;
    fetch('/cart/change.js',{method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({id:b.dataset.remove, quantity:0})}).then(refresh);
  });
  refresh();
})();
