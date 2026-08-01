import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8911,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const SEL=[
 ['announcement','.ann, .announce, .promo-top, header .k'],
 ['nav link','.links a'],
 ['hero kicker','.hero .k'],
 ['hero h1','.hero h1'],
 ['hero lede','.hero .copy > p:not(.k)'],
 ['btn primary','.hero .btn'],
 ['strip kicker','.strip .k'],
 ['strip title','.strip h3'],
 ['section kicker','.seven .k'],
 ['section h2','.seven .head h2'],
 ['ul link','.seven .ul'],
 ['badge','.badge'],
 ['card stone','.card .stone'],
 ['card h3','.card .meta h3'],
 ['card notes','.card .notes'],
 ['card price','.card .price span'],
 ['house h2','.house h2'],
 ['body p','.making p, .mater p, section p'],
 ['footer head','footer .k, footer h4'],
 ['footer link','footer nav a, footer li a'],
];
for(const w of [1440,390]){
 const ctx=await b.newContext({viewport:{width:w,height:900}});
 const p=await ctx.newPage();
 await p.goto('http://localhost:8911/index.html',{waitUntil:'networkidle'});
 const out=await p.evaluate(SELS=>{
  const px=v=>Math.round(parseFloat(v)*10)/10;
  return SELS.map(([label,sel])=>{
   const el=document.querySelector(sel); if(!el) return [label,'—'];
   const c=getComputedStyle(el);
   const fam=c.fontFamily.split(',')[0].replace(/["']/g,'');
   const short={'Libre Caslon Display':'LCD','Libre Caslon Text':'LCT','Montserrat':'M','Cormorant Garamond':'CG'}[fam]||fam;
   const em=parseFloat(c.fontSize);
   return [label, short+(c.fontStyle==='italic'?'i':'')+' '+c.fontWeight, px(c.fontSize),
     c.lineHeight==='normal'?'a':Math.round(parseFloat(c.lineHeight)/em*100)/100,
     c.letterSpacing==='normal'?0:Math.round(parseFloat(c.letterSpacing)/em*100)];
  });
 },SEL);
 console.log('\n=== live @'+w+' ===');
 for(const r of out) console.log('  '+String(r[0]).padEnd(16)+r.slice(1).join('  '));
 // geometry
 const geo=await p.evaluate(()=>{
   const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();const c=getComputedStyle(e);return {w:Math.round(r.width),h:Math.round(r.height),pt:c.paddingTop,pb:c.paddingBottom}};
   return {inner:g('.inner'), seven:g('.seven'), card:g('.card'), cardimg:g('.card .ph'), hero:g('.hero')};
 });
 console.log('  geom '+JSON.stringify(geo));
 await ctx.close();
}
await b.close(); s.close();
