import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8941,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [pg,out] of process.argv.slice(2).map(a=>a.split(':'))){
  const ctx=await b.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:1});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8941/'+pg,{waitUntil:'networkidle'});
  // scroll the page so lazy plates decode before the shot
  await p.evaluate(async ()=>{const H=document.body.scrollHeight;
    for(let y=0;y<H;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}
    window.scrollTo(0,0);});
  await p.waitForTimeout(1600);
  await p.evaluate(()=>document.querySelectorAll('.rev').forEach(e=>e.classList.add('in')));
  await p.waitForTimeout(400);
  await p.screenshot({path:`/tmp/pushtest/${out}.png`, fullPage:true});
  if(errs.length) console.log(pg,'ERRORS',errs.slice(0,3));
  await ctx.close();
}
await b.close(); s.close(); console.log('shots done');
