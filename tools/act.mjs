import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8923,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8923/product-hotel-lobby.html',{waitUntil:'networkidle'});
const R={};
// size selector
await p.click('.sizes button:nth-child(2)'); await p.waitForTimeout(200);
R.sizeSelects = await p.$eval('.sizes button:nth-child(2)', e=>e.getAttribute('aria-current')==='true');
R.ctaPriceUpdates = await p.$eval('.pdp .cta .btn', e=>e.textContent.includes('110'));
// thumbnail swap
const before = await p.$eval('#pdpmain', e=>e.src);
await p.click('.gal .strip button:nth-child(3)'); await p.waitForTimeout(600);
R.thumbSwaps = (await p.$eval('#pdpmain', e=>e.src)) !== before;
R.thumbMarks = await p.$eval('.gal .strip button:nth-child(3)', e=>e.getAttribute('aria-current')==='true');
// add to bag -> drawer
await p.click('.pdp .cta .btn'); await p.waitForTimeout(800);
R.drawerOpens = await p.$eval('.drawer', e=>e.classList.contains('on')||getComputedStyle(e).transform==='none');
R.bagCount = await p.$eval('#bagcount', e=>e.textContent);
// close the drawer, then the accordion
await p.keyboard.press('Escape'); await p.waitForTimeout(700);
R.drawerCloses = await p.$eval('.drawer', e=>!e.classList.contains('open'));
await p.click('.acc details:nth-child(2) summary'); await p.waitForTimeout(300);
R.accordionOpens = await p.$eval('.acc details:nth-child(2)', e=>e.open);
R.errors = errs;
console.log(JSON.stringify(R,null,1));
await b.close(); s.close();
