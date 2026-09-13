import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>{const m=document.getElementById('mega'); m.hidden=false; m.style.opacity=1; m.style.visibility='visible'; m.style.pointerEvents='auto';});
await p.waitForTimeout(500);
const cols = await p.evaluate(()=>{
  const d=[...document.querySelectorAll('.mega .inner > div')].find(x=>x.querySelector('.fh')?.textContent==='Shop by stories');
  return [...d.querySelectorAll('a.ml')].map(a=>({n:a.textContent.trim(), c:getComputedStyle(a.querySelector('.chip')).backgroundColor}));
});
console.log(JSON.stringify(cols));
await p.locator('#mega').screenshot({path:'/tmp/mega.png'});
await b.close();
