import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.click('.burger'); await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(()=>{
  const f=el=>{const c=getComputedStyle(el);return c.fontFamily.split(',')[0]+' '+c.fontSize};
  return {nav:f(document.querySelector('.mpnav a')),
    size:f(document.querySelector('.mpsizes a')),
    price:f(document.querySelector('.mpsizes a span')),
    story:f(document.querySelector('.mplinks a')),
    util:f(document.querySelector('.mputil a')),
    head:f(document.querySelector('.mpfh'))};
})));
await p.screenshot({path:'/tmp/menu.png'});
await b.close();
