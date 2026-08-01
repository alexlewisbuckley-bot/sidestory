import {chromium} from 'playwright';
import fs from 'fs';
const W=+(process.env.PW||390);
const PAGES=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:W,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const p=await ctx.newPage();
const R={gutter:[],pad:[],gap:[],type:[],measure:[],crop:[],wrap:[],overflow:[]};

const PROBE=`(()=>{
  const out={gutter:{},pad:{},gap:[],type:{},measure:[],crop:[],wrap:[],overflow:[]};
  const de=document.documentElement, VW=de.clientWidth;
  const vis=el=>{const cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity)>0.05};
  const inFullBleed=el=>!!el.closest('.hero,.campaign,.banner,.gift,.storyband,.shero,.yfeat,.sbecame,.drawer,.sheet,.mega,.links');

  // 1. left edge of every text-bearing block: the page's effective margins
  document.querySelectorAll('p,h1,h2,h3,h4,li,figcaption,blockquote').forEach(el=>{
    if(!vis(el)||inFullBleed(el))return;
    if(!el.textContent.trim())return;
    const r=el.getBoundingClientRect(); if(r.width<40)return;
    const L=Math.round(r.left);
    (out.gutter[L]=out.gutter[L]||[]).push(el.tagName+'.'+[...el.classList].slice(0,2).join('.'));
  });

  // 2. section padding rhythm
  document.querySelectorAll('main>*').forEach(el=>{
    if(!vis(el))return; const cs=getComputedStyle(el);
    const k=cs.paddingTop+'/'+cs.paddingBottom;
    (out.pad[k]=out.pad[k]||[]).push(el.tagName+'.'+[...el.classList].filter(c=>c!=='rev').slice(0,2).join('.'));
  });

  // 3. adjacent interactive controls closer than 8px
  const ctrl=[...document.querySelectorAll('a[href],button,summary,[role=button]')].filter(vis)
    .map(el=>({el,r:el.getBoundingClientRect()})).filter(x=>x.r.width>1&&x.r.height>1);
  for(let i=0;i<ctrl.length;i++)for(let j=i+1;j<ctrl.length;j++){
    const a=ctrl[i].r,c=ctrl[j].r;
    if(ctrl[i].el.contains(ctrl[j].el)||ctrl[j].el.contains(ctrl[i].el))continue;
    const dx=Math.max(0,Math.max(a.left,c.left)-Math.min(a.right,c.right));
    const dy=Math.max(0,Math.max(a.top,c.top)-Math.min(a.bottom,c.bottom));
    if(dx===0&&dy===0)continue;
    const d=Math.hypot(dx,dy);
    if(d<8) out.gap.push({a:(ctrl[i].el.textContent||'').trim().slice(0,14),
      b:(ctrl[j].el.textContent||'').trim().slice(0,14),d:+d.toFixed(1)});
  }

  // 4. rendered type sizes on text nodes
  document.querySelectorAll('body *').forEach(el=>{
    if(!vis(el))return;
    const has=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);
    if(!has)return;
    const cs=getComputedStyle(el); const fs=Math.round(parseFloat(cs.fontSize)*10)/10;
    (out.type[fs]=out.type[fs]||0); out.type[fs]++;
    // 5. measure: characters per line for running copy
    if(parseFloat(cs.fontSize)>=12&&el.textContent.trim().length>90&&/p|li|blockquote/i.test(el.tagName)&&el.getBoundingClientRect().width>40&&!el.closest('[hidden]')){
      // count the element's OWN text lines with a Range: block children like
      // a <small> label were being counted as extra lines and halving the cpl
      const rg=document.createRange(); rg.selectNodeContents(el);
      const tops=new Set([...rg.getClientRects()].filter(x=>x.height>1&&x.width>1)
        .map(x=>Math.round(x.top)));
      const lines=Math.max(1,tops.size);
      const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
      const cpl=Math.round((own.length||el.textContent.trim().length)/lines);
      if(cpl<26||cpl>52) out.measure.push({s:el.tagName+'.'+[...el.classList].slice(0,2).join('.'),cpl,
        w:Math.round(r.width),t:el.textContent.trim().slice(0,22)});
    }
  });

  // 6. image cropping: rendered box vs intrinsic
  document.querySelectorAll('img').forEach(im=>{
    if(!vis(im)||!im.naturalWidth)return;
    const r=im.getBoundingClientRect(); if(r.width<40)return;
    const cs=getComputedStyle(im); if(cs.objectFit!=='cover')return;
    const nat=im.naturalWidth/im.naturalHeight, box=r.width/r.height;
    const lost=1-Math.min(nat,box)/Math.max(nat,box);
    if(lost>0.34) out.crop.push({src:(im.currentSrc||im.src).split('/').pop().slice(0,26),
      nat:+nat.toFixed(2),box:+box.toFixed(2),lostPct:Math.round(lost*100)});
  });

  // 7. one- or two-word last lines in headings, and any wrapped button label
  document.querySelectorAll('.btn').forEach(el=>{
    if(!vis(el)||!el.textContent.trim())return;
    const rg=document.createRange(); rg.selectNodeContents(el);
    const tops=new Set([...rg.getClientRects()].filter(x=>x.height>1&&x.width>1)
      .map(x=>Math.round(x.top)));
    if(tops.size>1)
      out.wrap.push({kind:'button wraps',s:el.className,t:el.textContent.trim().slice(0,26),lines:tops.size});
  });

  // 8. horizontal overflow
  document.querySelectorAll('body *').forEach(el=>{
    if(!vis(el))return;
    let clip=false;let n=el.parentElement;
    while(n&&n!==de){const o=getComputedStyle(n);
      if(o.overflow!=='visible'||o.overflowX!=='visible'){clip=true;break} n=n.parentElement}
    if(clip)return;
    const r=el.getBoundingClientRect();
    if(r.right>VW+1||r.left<-1) out.overflow.push({s:el.tagName+'.'+[...el.classList].slice(0,2).join('.'),
      l:Math.round(r.left),r:Math.round(r.right)});
  });
  return out;})()`;

for(const pg of PAGES){
  await p.goto('http://localhost:8801/'+pg,{waitUntil:'networkidle'});
  await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));
    document.querySelectorAll('.enter-veil').forEach(e=>e.remove());});
  await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
  await p.waitForTimeout(120);
  const o=await p.evaluate(PROBE);
  R.gutter.push([pg,Object.fromEntries(Object.entries(o.gutter).map(([k,v])=>[k,v.length]))]);
  R.pad.push([pg,Object.fromEntries(Object.entries(o.pad).map(([k,v])=>[k,v.length]))]);
  o.gap.forEach(x=>R.gap.push({pg,...x}));
  R.type.push([pg,o.type]);
  o.measure.forEach(x=>R.measure.push({pg,...x}));
  o.crop.forEach(x=>R.crop.push({pg,...x}));
  o.wrap.forEach(x=>R.wrap.push({pg,...x}));
  o.overflow.forEach(x=>R.overflow.push({pg,...x}));
}
await b.close();

console.log('\n===== LEFT EDGES (page margins actually used) =====');
const allG={}; R.gutter.forEach(([,g])=>Object.entries(g).forEach(([k,n])=>allG[k]=(allG[k]||0)+n));
console.log(Object.entries(allG).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}px×${v}`).join('  '));
R.gutter.filter(([,g])=>Object.keys(g).length>2).slice(0,10)
  .forEach(([pg,g])=>console.log('  multi:',pg,JSON.stringify(g)));

console.log('\n===== SECTION PADDING =====');
const allP={}; R.pad.forEach(([,g])=>Object.entries(g).forEach(([k,n])=>allP[k]=(allP[k]||0)+n));
console.log(Object.entries(allP).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}×${v}`).join('  '));

console.log('\n===== TYPE SIZES IN USE =====');
const allT={}; R.type.forEach(([,g])=>Object.entries(g).forEach(([k,n])=>allT[k]=(allT[k]||0)+n));
console.log(Object.entries(allT).sort((a,b)=>+a[0]-+b[0]).map(([k,v])=>`${k}px×${v}`).join('  '));

const uniq=(a,f)=>{const m=new Map();a.forEach(x=>{const k=f(x);if(!m.has(k))m.set(k,{...x,n:0});m.get(k).n++});return [...m.values()]};
console.log('\n===== CONTROLS <8px APART ====='); console.table(uniq(R.gap,x=>x.a+x.b).slice(0,12));
console.log('\n===== MEASURE OUT OF RANGE (26–52 cpl) ====='); console.table(uniq(R.measure,x=>x.s+x.cpl).slice(0,14));
console.log('\n===== IMAGE CROP >34% ====='); console.table(uniq(R.crop,x=>x.src+x.box).slice(0,14));
console.log('\n===== BUTTON LABELS WRAPPING ====='); console.table(uniq(R.wrap,x=>x.t).slice(0,12));
console.log('\n===== OVERFLOW ====='); console.table(uniq(R.overflow,x=>x.s).slice(0,10));
