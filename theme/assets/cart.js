
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
        <div class="act"><span class="meta">${money(i.final_line_price)}</span>
          <button class="ul" data-remove="${i.key}">Remove</button></div></div></div>`;
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
      line.textContent = money(p);
    });
  }
  fixPrices();
  /* longer store-currency strings need a touch more room in the 50/50 row */
  const st = document.createElement('style');
  st.textContent = '.quick .r .btn{letter-spacing:.02em;font-size:min(var(--t-btn),3.6vw)}'
    + '.ditem .act{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--s-3);margin-top:var(--s-2)}'
    + '.line .act{align-items:baseline;justify-content:space-between}'
    + '.ditem .act .ul,.line .act .ul{font-size:var(--t-2xs);letter-spacing:var(--track-micro);color:var(--txt-2)}'
    + '.ditem .act .ul:hover,.line .act .ul:hover{color:var(--txt)}'
    + '.quick small,.szi{font-family:var(--font-serif);font-style:italic;font-size:var(--t-xs);letter-spacing:0;text-transform:none;color:var(--txt-2)}'
    /* ink and charcoal-900 are three points apart: a hover only a colour picker sees */
    + '.btn-ink:hover{background:#3e4442}'
    + '.btn-ink[disabled]:hover{background:var(--ink)}'
    + '.btn-ivory[disabled]:hover{background:var(--ivory)}'
    + '.btn-ghost[disabled]:hover,.btn-ghostink[disabled]:hover{background:transparent}'
    + '.gift{background:#3e5147}'
    + '.shero.tall .c{max-width:44rem}'
    + '.shero.tall h1{font-size:var(--t-4)}'
    + '.artgrid{grid-template-columns:minmax(0,1fr)}'
    /* the closing note at the foot of a plain page, with room before the footer */
    + '.pfoot{margin-top:var(--s-7);padding-block:var(--s-6) var(--s-7);border-top:1px solid var(--line);max-width:var(--measure)}'
    + '.pfoot .k{color:var(--brass-text)}'
    /* stockist flags */
    + '.flg{display:inline-block;width:1.25rem;height:.8334rem;margin-right:.55em;vertical-align:-.08em;line-height:0}'
    + '.flg svg{width:100%;height:100%;display:block}'
    + '.tile .cty{white-space:nowrap}'
    /* the atelier drawer */
    + '@supports (interpolate-size: allow-keywords){:root{interpolate-size:allow-keywords}}'
    + '.unfold{margin-top:var(--s-6)}'
    + '.unfold>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:var(--s-5);padding-block:var(--s-4)}'
    + '.unfold>summary::-webkit-details-marker{display:none}'
    + '.unfold>summary::before,.unfold>summary::after{content:"";flex:1;height:1px;background:var(--line)}'
    + '.unfold .lbl{display:inline-flex;align-items:center;gap:.7em;white-space:nowrap;font-size:var(--t-2xs);letter-spacing:var(--track-kicker);text-transform:uppercase;color:var(--brass-text);transition:color .3s var(--settle)}'
    + '.unfold>summary:hover .lbl{color:var(--ink)}'
    + '.unfold .less{display:none}.unfold[open] .more{display:none}.unfold[open] .less{display:inline}'
    + '.unfold .sgn{position:relative;width:.7rem;height:.7rem;flex:none}'
    + '.unfold .sgn::before,.unfold .sgn::after{content:"";position:absolute;inset:0;margin:auto;background:currentColor;transition:transform .45s var(--settle),opacity .45s var(--settle)}'
    + '.unfold .sgn::before{width:100%;height:1px}'
    + '.unfold .sgn::after{width:1px;height:100%}'
    + '.unfold[open] .sgn::after{transform:rotate(90deg);opacity:0}'
    + '.unfold .dbody{margin-top:0;padding-bottom:var(--s-5)}'
    + '.unfold .dbody p{font-size:var(--t-md);line-height:1.85}'
    + '.unfold .dbody b{display:block;font-family:var(--font-sans);font-weight:400;font-size:var(--t-2xs);letter-spacing:var(--track-kicker);text-transform:uppercase;color:var(--txt-2);margin-bottom:var(--s-3)}'
    + '.unfold::details-content{block-size:0;overflow:hidden;transition:block-size .55s var(--settle),content-visibility .55s allow-discrete}'
    + '.unfold[open]::details-content{block-size:auto}'
    + '@media (prefers-reduced-motion:reduce){.unfold::details-content{transition:none}}'
    + '.pfoot :where(p:not(.k)){font-size:var(--t-md);line-height:1.8;margin-top:var(--s-3)}'
    + '.inner > :where(.acc,.artgrid,.pfoot,.acct,.grid-3,.table,.scrollx):last-child{padding-bottom:var(--s-7)}'
    /* the focused accordion row is washed and its rule thickened, not boxed */
    + '.acc summary:focus-visible{outline:none;border-radius:0;background:rgba(43,46,45,.06);box-shadow:inset 0 -2px 0 0 var(--ink)}'
    /* the press attributions are mastheads, each capped at its own height */
    + '.plogo{display:block;width:auto;max-width:min(100%,11rem);filter:brightness(0) saturate(0);opacity:.72}'
    + '.pl-conde{height:.875rem}.pl-forbes{height:1rem}.pl-grazia{height:1.25rem}'
    /* the stone travels with the name in the mega panel */
    + '.mega a.ml .chip{width:.5rem;height:.5rem;margin-right:.7em;transition:transform var(--d-quick) var(--settle)}'
    + '.mega a.ml:hover .chip{transform:scale(1.25)}'
    /* the phone menu: destinations lead, the shelf follows, utilities at the foot */
    + '.mpnav a{display:flex;align-items:center;justify-content:space-between;gap:var(--s-3);min-height:3.25rem;font-family:var(--font-serif);font-size:var(--t-2);line-height:1.25;color:var(--ink);border-bottom:1px solid var(--line);transition:color var(--d-quick) var(--settle)}'
    + '.mpnav a:first-child{border-top:1px solid var(--line)}'
    + '.mpnav .arw{width:1.5rem;height:1px;background:var(--brass);opacity:.5;flex:none;position:relative;transition:opacity var(--d-quick) var(--settle),transform var(--d-quick) var(--settle)}'
    + '.mpnav .arw::after{content:"";position:absolute;right:0;top:-.1875rem;width:.375rem;height:.375rem;border-top:1px solid var(--brass);border-right:1px solid var(--brass);transform:rotate(45deg)}'
    + '.mpnav a:active .arw,.mpnav a:hover .arw{opacity:1;transform:translateX(.1875rem)}'
    + '.mpnav a[aria-current="page"]{color:var(--brass-text)}'
    + '.mpshop{margin-top:var(--s-6)}'
    + '.mpshop>.mpfh:first-child{margin-top:0}'
    + '.mplinks .chip{width:.4375rem;height:.4375rem;margin-right:.75em;flex:none}'
    + '.mputil{margin-top:var(--s-6);padding-top:var(--s-3);border-top:1px solid var(--line)}'
    + '@media (min-width:40em){'
    +   '.mpnav{grid-column:1;grid-row:1}'
    +   '.mpshop{grid-column:2;grid-row:1;margin-top:0}'
    +   '.mputil{grid-column:1 / -1;grid-row:2}}'
    + '.cred figcaption:has(.plogo){padding-top:var(--s-5)}'
    /* contact: a split page, chips for the subject, a ruled reach strip */
    + '.cform{display:grid;grid-template-columns:minmax(0,1fr)}'
    + '.cpic{display:none}'
    + '.cform .cwrap .inner{margin-inline:0;max-width:50rem}'
    + '.cform .form{grid-template-columns:minmax(0,1fr);padding-block:var(--s-5) var(--s-6)}'
    + '.cform .field textarea{min-height:8.5rem}'
    + '@media (min-width:64em){'
    +   '.cform{grid-template-columns:minmax(0,34%) minmax(0,1fr);align-items:stretch}'
    +   '.cpic{display:block;position:relative;background:var(--ink);overflow:hidden}'
    +   '.cpic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
    +   '.cform .cwrap .inner{padding-inline:var(--s-7)}}'
    + '.chips{border:0;padding:0;margin:var(--s-6) 0 0;min-inline-size:0}'
    + '.chips legend{padding:0;font-family:var(--font-sans);font-weight:500;font-size:var(--t-2xs);letter-spacing:var(--track-micro);text-transform:uppercase;color:var(--txt-2)}'
    + '.chips .cr{display:flex;flex-wrap:wrap;gap:var(--s-2);margin-top:var(--s-3)}'
    + '.chips label{display:inline-flex;position:relative}'
    + '.chips input{position:absolute;inset:0;opacity:0;cursor:pointer}'
    + '.chips span{display:inline-block;padding:.55rem .95rem;border:1px solid rgba(43,46,45,.3);font-family:var(--font-sans);font-weight:500;font-size:var(--t-2xs);letter-spacing:var(--track-micro);text-transform:uppercase;color:var(--txt-2);cursor:pointer;transition:background var(--d-quick) var(--settle),color var(--d-quick) var(--settle),border-color var(--d-quick) var(--settle)}'
    + '.chips label:hover span{border-color:var(--ink);color:var(--ink)}'
    + '.chips input:checked+span{background:var(--ink);border-color:var(--ink);color:var(--ivory)}'
    + '.chips input:focus-visible+span{outline:2px solid var(--ink);outline-offset:2px}'
    + '.creach{display:grid;gap:var(--s-5) var(--s-6);align-items:start;grid-template-columns:minmax(0,1fr);border-top:1px solid var(--line);padding-block:var(--s-6) var(--s-7)}'
    + '@media (min-width:48em){.creach{grid-template-columns:repeat(3,minmax(0,1fr))}}'
    + '.creach .k{white-space:nowrap}'
    + '.creach a{overflow-wrap:anywhere}'
    + '.creach .k{color:var(--brass-text)}'
    + '.creach :where(p:not(.k)){margin-top:var(--s-3);font-size:var(--t-xs);line-height:1.85}'
    + '.creach a{border-bottom:1px solid rgba(43,46,45,.25)}'
    + '.creach a:hover{border-bottom-color:var(--ink)}'
    /* the credo: two marked positions to a row, the closing line spanning */
    + '.credo{list-style:none;margin:var(--s-6) 0 0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);column-gap:var(--s-7)}'
    + '@media (min-width:60em){.credo{grid-template-columns:repeat(2,minmax(0,1fr))}'
    +   '.credo li:last-child{grid-column:1 / -1}}'
    + '.credo li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--s-4);align-items:start;padding:var(--s-4) 0;border-top:1px solid var(--line)}'
    + '.credo li:last-child{border-bottom:1px solid var(--line)}'
    + '.credo .ci{width:1.75rem;height:1.75rem;color:var(--brass);margin-top:-.1rem}'
    + '.credo .ci svg{width:100%;height:100%;display:block;vector-effect:non-scaling-stroke}'
    + '.credo p{font-size:var(--t-md);line-height:1.75;margin:0;max-width:40ch}'
    /* the closing line runs the full width, centred, as a coda */
    + '@media (min-width:60em){'
    +   '.credo li:last-child{grid-template-columns:auto auto;justify-content:center;align-items:center;padding-block:var(--s-5)}'
    +   '.credo li:last-child p{font-family:var(--font-serif);font-style:italic;font-size:var(--t-lg);max-width:none}}'
    + '.gift>video{width:100%;aspect-ratio:3/2;object-fit:cover;order:-1}'
    /* a square plate must not set the height of the promise band */
    + '@media (min-width:52em){.gift>img,.gift>picture>img{object-fit:cover;max-height:clamp(24rem,40vw,35rem)}}'
    + '.yfeat>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:var(--z-art)}'
    + '.yfeat>video{opacity:0;transition:opacity 1.2s var(--settle)}'
    + '.yfeat>video.ready{opacity:1}'
    /* hero carousel blends over 2s */
    + '.hero .shots img{transition:opacity 2s var(--settle)}'
    /* browsers without svh/dvh dropped these declarations entirely; the
       plain-vh equivalents apply only where the modern units are missing */
    + '@supports not (height:100svh){'
    +   '.hero{min-height:max(28rem,calc(100vh - var(--chromeh,calc(var(--annh) + var(--navh)))))}'
    +   '.campaign{min-height:clamp(22rem,48vh,35rem)}'
    +   '.banner{min-height:clamp(18rem,40vh,30rem)}'
    +   '.sheet{max-height:80vh}'
    +   '.notfound{min-height:60vh}'
    +   '.storyband{min-height:clamp(24rem,52vh,36rem)}'
    + '}'
    + '@supports not (height:100dvh){'
    +   '.drawer{height:100vh}'
    +   '.srch{max-height:calc(100vh - var(--srch-top,var(--navh)))}'
    +   '@media (max-width:71.875em){.srch{height:100vh;max-height:none}}'
    + '}';
  document.head.appendChild(st);
  document.addEventListener('click', e=>{
    const b = e.target.closest('[data-remove]'); if(!b) return;
    fetch('/cart/change.js',{method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({id:b.dataset.remove, quantity:0})}).then(refresh);
  });
  refresh();
})();
