import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8921,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:1108},deviceScaleFactor:1});
const p=await ctx.newPage();
await p.goto('http://localhost:8921/product-hotel-lobby.html',{waitUntil:'networkidle'});
await p.waitForTimeout(1800);
await p.evaluate(()=>document.querySelectorAll('.rev').forEach(e=>e.classList.add('in')));
await p.waitForTimeout(300);
await p.screenshot({path:'/tmp/pushtest/live-pdp.png'});
console.log(JSON.stringify(await p.evaluate(()=>{
 const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
   return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
 return {crumb:g('.crumb'), pdp:g('.pdp'), gal:g('.gal'), main:g('.gal .main'),
   thumb:g('.gal .strip button'), info:g('.pdp .info'), h1:g('.pdp h1'),
   size1:g('.sizes button'), tryfirst:g('.tryfirst'),
   addbag:g('.pdp .cta .btn'), pay:g('.applepay'), acc1:g('.acc summary')};
}),null,0));
await b.close(); s.close();
