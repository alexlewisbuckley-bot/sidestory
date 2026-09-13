import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1280,height:800}});
await p.goto('http://localhost:8802/our-house.html');
await p.waitForTimeout(400);
const r = await p.evaluate(()=>{
  const banner=document.querySelector('.banner.tall');
  const h1=banner?.querySelector('h1')?.textContent||'';
  const sub=banner?.querySelector('.c p:not(.k)');
  const credo=document.querySelectorAll('.credo li').length;
  const aside=document.querySelector('.artaside');
  const making=document.getElementById('making');
  const stones=document.getElementById('stones');
  const promise=document.getElementById('promise');
  const pbg=promise?getComputedStyle(promise).backgroundColor:'';
  return {bannerH:banner?Math.round(banner.getBoundingClientRect().height):0,
    winH:innerHeight, h1len:h1.length, hasSub:!!sub, credo, aside:!!aside,
    making:!!making, stones:!!stones, pbg,
    heroImg:banner?.querySelector('img')?.getAttribute('src')||''};
});
console.log(JSON.stringify(r));
await b.close();
