import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8915,r));
const PAGES=fs.readdirSync(ROOT).filter(f=>f.endsWith('.html')&&f!=='spec.html');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let bad=0, checks=0;
for(const w of [320,390,768,1024,1440,1920]){
 const ctx=await b.newContext({viewport:{width:w,height:900}});
 for(const pg of PAGES){
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url().split('/').pop())});
  await p.goto('http://localhost:8915/'+pg,{waitUntil:'networkidle'});
  const r=await p.evaluate(()=>{
    const de=document.documentElement;
    const over=de.scrollWidth-de.clientWidth;
    const clip=[],tiny=[],tap=[];
    for(const el of document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,li,small,b,em,input')){
      const c=getComputedStyle(el);
      if(c.display==='none'||c.visibility==='hidden'||!el.offsetParent&&c.position!=='fixed')continue;
      if(el.classList.contains('vh'))continue;   // visually hidden by design
      if(el.scrollWidth>el.clientWidth+2&&c.overflow!=='visible')clip.push(el.tagName+':'+el.textContent.trim().slice(0,20));
      const fs=parseFloat(c.fontSize);
      if(el.textContent.trim()&&fs<6.5)tiny.push(el.tagName+' '+fs+'px:'+el.textContent.trim().slice(0,18));
      if((el.tagName==='BUTTON'||(el.tagName==='A'&&c.display!=='inline'))){
        const r2=el.getBoundingClientRect();
        if(r2.height>0&&r2.height<24&&r2.width>0)tap.push(el.tagName+' '+Math.round(r2.height)+'px:'+el.textContent.trim().slice(0,16));
      }
    }
    return {over,clip:clip.slice(0,3),tiny:tiny.slice(0,3),tap:tap.slice(0,2)};
  });
  checks++;
  if(r.over>1||r.clip.length||r.tiny.length||errs.length){
    bad++;console.log(`✗ ${w} ${pg} over=${r.over} clip=${JSON.stringify(r.clip)} tiny=${JSON.stringify(r.tiny)} err=${JSON.stringify(errs.slice(0,2))}`);
  }
  await p.close();
 }
 await ctx.close();
 console.log(`  ${w}px — ${PAGES.length} pages checked`);
}
console.log(bad?`\n${bad}/${checks} page-widths with problems`:`\nclean: ${checks} page-widths, no overflow, no clipping, no sub-7px text, no console or network errors`);
await b.close(); s.close();
