import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8951,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const shots=[];
for(const slug of ['hotel-lobby','pillow-talk','third-date','road-trip','4pm-matinee','sunday-service','sibling-rivalry']){
  const p=await ctx.newPage();
  await p.goto(`http://localhost:8951/story-${slug}.html`,{waitUntil:'networkidle'});
  await p.locator('.sbecame').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await p.locator('.sbecame').screenshot({path:`/tmp/pushtest/f-${slug}.png`});
  shots.push(`f-${slug}.png`);
  await p.close();
}
console.log(shots.join(' '));
await b.close(); s.close();
