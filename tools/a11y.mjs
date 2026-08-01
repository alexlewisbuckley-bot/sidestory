import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8991,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const R={};
let ctx=await b.newContext({viewport:{width:1440,height:900}});
let p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8991/product-hotel-lobby.html',{waitUntil:'networkidle'});
// skip link is first in tab order and becomes visible
await p.keyboard.press('Tab');
R.skip=await p.evaluate(()=>{const a=document.activeElement;
  const r=a.getBoundingClientRect();
  return {tag:a.tagName,cls:a.className,text:a.textContent.trim(),visible:r.top>=0}});
R.main=await p.evaluate(()=>({main:document.querySelectorAll('main').length,
  id:document.querySelector('main')?.id, h4:document.querySelectorAll('h4').length}));
// drawer as dialog
await p.click('.pdp .cta .btn-ink'); await p.waitForTimeout(900);
R.drawer=await p.evaluate(()=>{const d=document.getElementById('drawer');
  return {role:d.getAttribute('role'),modal:d.getAttribute('aria-modal'),
    focusInside:d.contains(document.activeElement),
    activeEl:document.activeElement.textContent.trim().slice(0,20),
    locked:getComputedStyle(document.documentElement).overflow==='hidden'}});
await p.keyboard.press('Escape'); await p.waitForTimeout(700);
R.drawer.escapeCloses=await p.evaluate(()=>!document.getElementById('drawer').classList.contains('open'));
R.drawer.focusReturned=await p.evaluate(()=>document.activeElement.classList.contains('btn-ink'));
R.drawer.unlocked=await p.evaluate(()=>getComputedStyle(document.documentElement).overflow!=='hidden');
// disabled state visible
await p.click('.pdp .cta .btn-ink'); await p.waitForTimeout(200);
R.disabled=await p.evaluate(()=>{const b=document.querySelector('.pdp .cta .btn-ink');
  return {disabled:b.disabled, opacity:getComputedStyle(b).opacity}});
// focus ring contrast
R.ring=await p.evaluate(()=>{
  const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
  const lum=a=>0.2126*lin(a[0])+0.7152*lin(a[1])+0.0722*lin(a[2]);
  const rt=(a,b)=>{const l1=lum(a),l2=lum(b),h=Math.max(l1,l2),l=Math.min(l1,l2);return +( (h+0.05)/(l+0.05) ).toFixed(2)};
  const ink=[43,46,45];
  return {onIvory:rt(ink,[241,240,232]),onSand:rt(ink,[239,235,225]),onPlaster:rt(ink,[233,229,218])}});
await ctx.close();
// mobile menu
ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
p=await ctx.newPage();
await p.goto('http://localhost:8991/index.html',{waitUntil:'networkidle'});
await p.click('.burger'); await p.waitForTimeout(400);
R.menu=await p.evaluate(()=>({expanded:document.querySelector('.burger').getAttribute('aria-expanded'),
  controls:document.querySelector('.burger').getAttribute('aria-controls'),
  locked:getComputedStyle(document.documentElement).overflow==='hidden',
  focusInNav:document.querySelector('.links').contains(document.activeElement)}));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
R.menu.escapeCloses=await p.evaluate(()=>!document.querySelector('.links').classList.contains('open'));
R.errors=errs;
console.log(JSON.stringify(R,null,1));
await b.close(); s.close();
