import {chromium} from 'playwright';
import fs from 'fs';
const W=+(process.env.PW||390);
const PAGES=process.argv.slice(2).length?process.argv.slice(2)
  :fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:W,height:844},deviceScaleFactor:2,
  isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const p=await ctx.newPage();
fs.mkdirSync('/tmp/phone',{recursive:true});
for(const pg of PAGES){
  await p.goto('http://localhost:8801/'+pg,{waitUntil:'networkidle'});
  await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));document.querySelectorAll('.enter-veil').forEach(e=>e.remove());});
  await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
  await p.waitForTimeout(150);
  const h=await p.evaluate(()=>document.documentElement.scrollHeight);
  await p.screenshot({path:`/tmp/phone/${pg.replace('.html','')}.png`,fullPage:true});
  console.log(pg.padEnd(30), h+'px', (h/844).toFixed(1)+' screens');
}
await b.close();
