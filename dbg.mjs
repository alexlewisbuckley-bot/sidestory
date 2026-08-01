import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:8899/index.html?v='+Date.now(), { waitUntil: 'load' });
console.log(await p.evaluate(() => {
  const a=document.querySelector('.brand'); const i=a.querySelector('img');
  const ca=getComputedStyle(a), ci=getComputedStyle(i);
  return {aClass:a.className, aWidth:ca.width, aDisplay:ca.display, imgWidth:ci.width, imgMax:ci.maxWidth,
          rect:Math.round(a.getBoundingClientRect().width), u:getComputedStyle(document.documentElement).getPropertyValue('--u')};
}));
await b.close();
