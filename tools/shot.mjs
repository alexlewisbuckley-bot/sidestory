import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8917,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const p=await ctx.newPage();
await p.goto('http://localhost:8917/index.html',{waitUntil:'networkidle'});
await p.waitForTimeout(2200);
await p.evaluate(()=>document.querySelectorAll('.rev').forEach(e=>e.classList.add('in')));
await p.waitForTimeout(400);
await p.screenshot({path:'/tmp/pushtest/live-top.png'});
await p.evaluate(()=>window.scrollTo(0,1450)); await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/pushtest/live-seven.png'});
await b.close(); s.close();
