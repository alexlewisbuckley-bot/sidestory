import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const srv=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';
 const f=path.join(ROOT,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.writeHead(404);return rs.end('x')}
 rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});rs.end(fs.readFileSync(f))});
await new Promise(r=>srv.listen(8901,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const PAGES=['index.html','collection.html','product-hotel-lobby.html','our-house.html','bag.html','stories.html'];
const W=[320,390,768,1024,1440,1920,2560];
let bad=0;
for(const w of W){
  const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:1});
  for(const pg of PAGES){
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto(`http://localhost:8901/${pg}`,{waitUntil:'networkidle'});
    const r=await p.evaluate(()=>{
      const cs=getComputedStyle(document.documentElement);
      const g=n=>cs.getPropertyValue(n).trim();
      const over=document.documentElement.scrollWidth-document.documentElement.clientWidth;
      // clipped text
      let clipped=[];
      for(const el of document.querySelectorAll('h1,h2,h3,p,a,button,span,li')){
        if(el.scrollWidth>el.clientWidth+2 && getComputedStyle(el).overflow!=='visible') clipped.push(el.tagName+':'+el.textContent.slice(0,24));
      }
      const h1=document.querySelector('h1');
      return {over, hero:g('--fs-hero'), h2:g('--fs-h2'), margin:g('--layout-margin'),
        body:getComputedStyle(document.body).fontSize,
        h1px: h1?getComputedStyle(h1).fontSize:null,
        clipped:clipped.slice(0,3)};
    });
    const flag = r.over>1 || r.clipped.length || errs.length;
    if(flag){bad++;console.log(`✗ ${w} ${pg} overflow=${r.over} clip=${JSON.stringify(r.clipped)} err=${errs.slice(0,1)}`)}
    if(pg==='index.html')console.log(`  ${String(w).padStart(4)} hero=${r.hero} h2=${r.h2} margin=${r.margin} body=${r.body} h1=${r.h1px}`);
    await p.close();
  }
  await ctx.close();
}
console.log(bad? `\n${bad} problems`:'\nno overflow, no clipping, no console errors');
await b.close(); srv.close();
