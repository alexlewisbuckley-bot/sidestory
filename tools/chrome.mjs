import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8913,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
await p.goto('http://localhost:8913/index.html',{waitUntil:'networkidle'});
console.log(JSON.stringify(await p.evaluate(()=>{
 const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {h:Math.round(r.height),w:Math.round(r.width)}};
 return {cols:g('footer .cols'), fmid:g('.fmid'), fbrand:g('.fbrand'), fbot:g('.fbot'), fcopy:g('.fcopy'),
   strip:g('.strip'), house:g('.house'), seven:g('.seven'), footer:g('footer'),
   news:g('.news'), card:g('.card'), cards:g('.cards')};
}),null,0));
await b.close(); s.close();
