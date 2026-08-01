import {chromium} from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/tmp/pushtest';
const M={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.ico':'image/x-icon','.avif':'image/avif','.webp':'image/webp'};
const s=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
await new Promise(r=>s.listen(8995,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
async function weigh(pg,w){
  const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:w<500?2:1});
  const q=await ctx.newPage(); let total=0,img=0,fmt={};
  q.on('response',async r=>{try{const bb=await r.body();total+=bb.length;
    const ct=r.headers()['content-type']||'';
    if(/image/.test(ct)){img+=bb.length;fmt[ct]=(fmt[ct]||0)+bb.length}}catch(e){}});
  await q.goto('http://localhost:8995/'+pg,{waitUntil:'networkidle'});
  await q.evaluate(async()=>{const H=document.body.scrollHeight;
    for(let y=0;y<H;y+=800){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}});
  await q.waitForTimeout(900);
  const cls=await q.evaluate(()=>new Promise(res=>{let v=0;
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)v+=e.value}).observe({type:'layout-shift',buffered:true})}catch(e){}
    setTimeout(()=>res(+v.toFixed(4)),400)}));
  await ctx.close();
  return {kb:Math.round(total/1024), imgKb:Math.round(img/1024), cls,
    fmt:Object.fromEntries(Object.entries(fmt).map(([k,v])=>[k.split('/')[1],Math.round(v/1024)]))};
}
const out={};
for(const [n,pg] of [['home','index.html'],['collection','collection.html'],['pdp','product-hotel-lobby.html'],['story','story-hotel-lobby.html']]){
  out[n]={mobile:await weigh(pg,390), desktop:await weigh(pg,1440)};
}
console.log(JSON.stringify(out,null,1));
await b.close(); s.close();
