import {chromium} from 'playwright';
import fs from 'fs';
const W=+(process.env.PW||390);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await (await b.newContext({viewport:{width:W,height:844},isMobile:true,hasTouch:true})).newPage();
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
  return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const out=[];
for(const pg of process.argv.slice(2)){
  await p.goto('http://localhost:8801/'+pg,{waitUntil:'networkidle'});
  await p.evaluate(()=>{document.querySelectorAll('.enter-veil').forEach(e=>e.remove());
    document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));});
  await p.waitForTimeout(700);
  const targets=await p.evaluate(()=>{
    const t=[];
    document.querySelectorAll('.hero,.banner,.campaign,.gift,.storyband,.shero,.yfeat').forEach(sec=>{
      sec.querySelectorAll('h1,h2,p,blockquote,.k,a').forEach(el=>{
        const txt=el.textContent.trim(); if(txt.length<4)return;
        const r=el.getBoundingClientRect(); if(r.width<40||r.height<6)return;
        const cs=getComputedStyle(el);
        t.push({sel:sec.className.split(' ')[0]+' '+el.tagName+'.'+[...el.classList][0],
          box:{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)},
          color:cs.color,fs:parseFloat(cs.fontSize),bold:parseInt(cs.fontWeight)>=700,
          t:txt.slice(0,22)});});});
    return t;});
  if(!targets.length) continue;
  await p.screenshot({path:'/tmp/_art.png'});
  const {createCanvas,loadImage}=await import('canvas').catch(()=>({}));
  // no canvas dep: use sharp-free raw sampling via CDP screenshot of each box
  for(const t of targets){
    if(t.box.y<0||t.box.y+t.box.h>844) continue;
    const buf=await p.screenshot({clip:{x:t.box.x,y:t.box.y,width:Math.min(t.box.w,W-t.box.x),height:t.box.h}});
    // decode PNG minimally with zlib
    const png=await import('zlib');
    // fall back: use the browser to sample instead
    const sample=await p.evaluate(async(box)=>{
      const c=document.createElement('canvas');c.width=box.w;c.height=box.h;
      return null;},t.box);
    void buf; void png; void sample;
  }
}
await b.close();
console.log('needs a pixel decoder');
