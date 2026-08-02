import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const out = {};
for (const W of [1440, 390]) {
  const ctx = await b.newContext({viewport:{width:W,height:W>900?900:844}, hasTouch:W<900, isMobile:W<900});
  const p = await ctx.newPage();
  const o = out[W] = {};

  // PDP: sticky CTA, tap targets, gallery, accordions
  await p.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'networkidle'});
  o.pdp = await p.evaluate(()=>{
    const buy=document.querySelector('.buy .btn-ink,[data-size].btn-ink,button.btn-ink');
    const r=buy&&buy.getBoundingClientRect();
    const small=[...document.querySelectorAll('a,button')].filter(el=>{
      const b=el.getBoundingClientRect(), cs=getComputedStyle(el);
      return b.width>0&&b.height>0&&cs.visibility!=='hidden'&&(b.height<24||b.width<24);
    }).map(el=>(el.textContent.trim()||el.className).slice(0,30));
    return { buyVisibleInFirstViewport: !!r && r.top < innerHeight,
      buyText:buy&&buy.textContent.trim(),
      sticky: !!document.querySelector('.pdpsticky,[data-sticky-buy]'),
      smallTargets:[...new Set(small)].slice(0,8), nSmall:new Set(small).size,
      gallery: document.querySelectorAll('.pdp .thumbs button,.pdp [onclick*=pdpSwap]').length,
      reviews: !!document.querySelector('[class*=review],[class*=rating]'),
      payments: /klarna|paypal|apple pay|visa|mastercard/i.test(document.body.textContent) };
  });
  // scroll deep: does the CTA leave reach?
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight*0.5));
  await p.waitForTimeout(300);
  o.pdp.buyReachableMidPage = await p.evaluate(()=>{
    const b=[...document.querySelectorAll('button')].find(x=>/Add to bag/.test(x.textContent));
    if(!b) return false; const r=b.getBoundingClientRect(); return r.top>0&&r.bottom<innerHeight; });

  // bag empty state + drawer
  await p.goto('http://localhost:8802/bag.html',{waitUntil:'networkidle'});
  o.bagEmpty = await p.evaluate(()=>({
    empty: !!document.querySelector('.empty'),
    cta: [...document.querySelectorAll('.empty a')].map(a=>a.textContent.trim()) }));

  // checkout trust
  await p.goto('http://localhost:8802/checkout.html',{waitUntil:'networkidle'});
  o.checkout = await p.evaluate(()=>({
    fields: document.querySelectorAll('input,select').length,
    labelled: [...document.querySelectorAll('input,select')].every(i=>
      i.labels?.length || i.getAttribute('aria-label') || i.type==='submit'),
    express: /apple pay|shop pay|paypal/i.test(document.body.textContent),
    security: /secure|ssl|encrypted/i.test(document.body.textContent),
    guest: true,
    dedication: /dedication/i.test(document.body.textContent),
    steps: !!document.querySelector('.steps,[class*=progress]') }));

  // 404
  await p.goto('http://localhost:8802/404.html',{waitUntil:'networkidle'});
  o.notfound = await p.evaluate(()=>({
    h1: document.querySelector('h1')?.textContent.trim(),
    links: document.querySelectorAll('main a').length,
    search: !!document.querySelector('main input[type=search],main form') }));

  // account
  await p.goto('http://localhost:8802/account.html',{waitUntil:'networkidle'});
  o.account = await p.evaluate(()=>({
    h1: document.querySelector('h1')?.textContent.trim(),
    forms: document.querySelectorAll('form').length,
    honest: /demo|coming|not (yet )?available/i.test(document.body.textContent) }));

  // confirmation
  await p.goto('http://localhost:8802/confirmation.html',{waitUntil:'networkidle'});
  o.confirmation = await p.evaluate(()=>({
    h1: document.querySelector('h1')?.textContent.trim(),
    next: document.querySelectorAll('main a').length }));

  // contrast spot check on body text + hints
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  o.contrast = await p.evaluate(()=>{
    const L=c=>{const m=c.match(/\d+/g).map(Number);
      const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};
      return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
    const ratio=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
    const bg=getComputedStyle(document.body).backgroundColor;
    const out=[];
    for(const sel of ['p','.k','.hint','small','.note']){
      const el=document.querySelector(sel); if(!el) continue;
      const cs=getComputedStyle(el);
      out.push({sel, r:+ratio(cs.color,bg).toFixed(2), size:parseFloat(cs.fontSize)});
    }
    return out;
  });
  await ctx.close();
}
console.log(JSON.stringify(out,null,1));
await b.close();
