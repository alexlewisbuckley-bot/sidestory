import {chromium} from 'playwright';
import fs from 'fs';
const W=+(process.env.PW||390);
const [pg,...sels]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await (await b.newContext({viewport:{width:W,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
await p.goto('http://localhost:8801/'+pg,{waitUntil:'networkidle'});
await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));document.querySelectorAll('.enter-veil').forEach(e=>e.remove());});
await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
await p.waitForTimeout(200);
fs.mkdirSync('/tmp/slice',{recursive:true});
for(const s of sels){
  const el=await p.$(s);
  if(!el){console.log('MISSING',s);continue}
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(120);
  await el.screenshot({path:`/tmp/slice/${pg.replace('.html','')}-${s.replace(/\W/g,'')}.png`});
}
await b.close();
