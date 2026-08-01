import {chromium} from 'playwright';
import fs from 'fs';
const PAGES=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const WIDTHS=(process.env.W||'390,768,1440').split(',').map(Number);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const R={overflow:[],contrast:[],tap:[],console:[],broken:[]};

const PROBE=`(()=>{
  const out={overflow:[],contrast:[],tap:[]};
  const lum=c=>{const [r,g,b]=c;const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
    return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const parse=s=>{const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;
    const p=m[1].split(',').map(Number);return {c:[p[0],p[1],p[2]],a:p.length>3?p[3]:1}};
  const blend=(fg,a,bg)=>fg.map((v,i)=>a*v+(1-a)*bg[i]);
  // A ground is only measurable if nothing between the text and it is a
  // photograph, a gradient veil or an absolutely-positioned image. Reporting
  // a number for text over art is worse than reporting nothing: the last
  // sweep called 390 nodes clean that way.
  const overArt=el=>{let n=el;while(n&&n!==document.documentElement){
      const cs=getComputedStyle(n);
      if(cs.backgroundImage!=='none') return true;
      if(n.querySelector&&n.querySelector(':scope>img,:scope>picture>img,:scope>.v,:scope>.veil'))
        { const k=n.querySelector(':scope>img,:scope>picture>img,:scope>.v,:scope>.veil');
          if(getComputedStyle(k).position==='absolute') return true; }
      const bgc=parse(cs.backgroundColor); if(bgc&&bgc.a>=.85) return false;
      n=n.parentElement;}
    return false};
  const groundOf=el=>{let n=el;while(n&&n!==document.documentElement){
      const bgc=parse(getComputedStyle(n).backgroundColor);
      if(bgc&&bgc.a>=.85) return bgc.c; n=n.parentElement;}
    return [241,240,232]};
  // effective alpha = product of every ancestor opacity
  const alphaOf=el=>{let a=1,n=el;while(n&&n!==document.documentElement){
      const o=parseFloat(getComputedStyle(n).opacity);if(!isNaN(o))a*=o;n=n.parentElement;}
    return a};
  const de=document.documentElement;
  document.querySelectorAll('body *').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')return;
    if(el.closest('[aria-hidden="true"]'))return;
    const r=el.getBoundingClientRect();
    if(r.width===0&&r.height===0)return;
    // a box that sticks out of a clipping ancestor is not overflow
    let clipped=false; {let n=el.parentElement;
      while(n&&n!==document.documentElement){const o=getComputedStyle(n);
        if(o.overflow!=='visible'||o.overflowX!=='visible'){clipped=true;break;} n=n.parentElement;}}
    if(!clipped&&(r.right>de.clientWidth+1||r.left<-1))
      out.overflow.push({s:el.tagName+'.'+[...el.classList].slice(0,2).join('.'),
        l:Math.round(r.left),r:Math.round(r.right)});
    // text nodes only
    const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);
    if(hasText){
      const fg=parse(cs.color); const a=alphaOf(el); const bg=groundOf(el);
      if(fg&&a>0.02&&!overArt(el)){
        const eff=blend(fg.c,fg.a*a,bg);
        const L1=Math.max(lum(eff),lum(bg))+.05, L2=Math.min(lum(eff),lum(bg))+.05;
        const ratio=L1/L2;
        const fs=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight)>=700;
        const need=(fs>=24||(fs>=18.66&&bold))?3:4.5;
        if(ratio<need-0.03) out.contrast.push({s:el.tagName+'.'+[...el.classList].slice(0,2).join('.'),
          ratio:+ratio.toFixed(2),need,fs:+fs.toFixed(1),a:+a.toFixed(2),
          t:el.textContent.trim().slice(0,26)});
      }
    }
    if(el.matches('a[href],button,summary,input,select,textarea,[role=button]')){
      if(r.width<24||r.height<24) out.tap.push({s:el.tagName+'.'+[...el.classList].slice(0,2).join('.'),
        w:Math.round(r.width),h:Math.round(r.height),t:(el.textContent||'').trim().slice(0,20)});
    }
  });
  return out;})()`;

for(const w of WIDTHS){
  const ctx=await b.newContext({viewport:{width:w,height:900}});
  const p=await ctx.newPage();
  p.on('console',m=>{if(m.type()==='error')R.console.push(`${w} ${m.text().slice(0,90)}`)});
  p.on('pageerror',e=>R.console.push(`${w} PAGEERROR ${e.message.slice(0,90)}`));
  for(const pg of PAGES){
    await p.goto('http://localhost:8801/'+pg,{waitUntil:'networkidle'});
    // reveal, then stop all motion, so nothing is measured mid-transition —
    // the previous probe caught .rev elements at alpha .14 and called them
    // contrast failures
    await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
    await p.evaluate(()=>document.querySelectorAll('.rev').forEach(e=>e.classList.add('in')));
    await p.waitForTimeout(60);
    const o=await p.evaluate(PROBE);
    o.overflow.forEach(x=>R.overflow.push({pg,w,...x}));
    o.contrast.forEach(x=>R.contrast.push({pg,w,...x}));
    if(w<=390) o.tap.forEach(x=>R.tap.push({pg,w,...x}));
  }
  await ctx.close();
}
await b.close();
const key=a=>JSON.stringify([a.s,a.ratio||a.w,a.t]);
const uniq=arr=>{const m=new Map();arr.forEach(x=>{if(!m.has(key(x)))m.set(key(x),{...x,n:0});m.get(key(x)).n++});return [...m.values()]};
console.log('PAGES',PAGES.length,'WIDTHS',WIDTHS.length,'= ',PAGES.length*WIDTHS.length,'page-widths');
console.log('\n--- OVERFLOW',R.overflow.length,'---'); console.table(uniq(R.overflow).slice(0,14));
console.log('\n--- CONTRAST (opacity-aware)',R.contrast.length,'---'); console.table(uniq(R.contrast).sort((a,b)=>a.ratio-b.ratio).slice(0,20));
console.log('\n--- TAP <24px',R.tap.length,'---'); console.table(uniq(R.tap).slice(0,14));
console.log('\n--- CONSOLE',R.console.length,'---',[...new Set(R.console)].slice(0,8));
