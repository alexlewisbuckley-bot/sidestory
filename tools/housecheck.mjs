import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:8802/our-house.html');
await p.waitForTimeout(500);
const r = await p.evaluate(()=>{
  const h=document.querySelector('.shero.tall');
  const btn=h?.querySelector('.cta .btn');
  const c=h?.querySelector('.c');
  const cb=c?.getBoundingClientRect();
  return {heroH:Math.round(h.getBoundingClientRect().height), winH:innerHeight,
    img:h.querySelector('img')?.getAttribute('src'),
    kicker:h.querySelector('.k')?.textContent,
    h1px:getComputedStyle(h.querySelector('h1')).fontSize,
    btnText:btn?.textContent, btnHref:btn?.getAttribute('href'),
    btnBg:btn?getComputedStyle(btn).backgroundColor:'',
    textLeft:Math.round(cb.left), textTop:Math.round(cb.top), textBottom:Math.round(cb.bottom),
    credo:document.querySelectorAll('.credo li').length,
    overflow:document.documentElement.scrollWidth>innerWidth};
});
console.log(JSON.stringify(r,null,1), 'errors:', errs.filter(e=>!/ERR_TUNNEL/.test(e)));
await b.close();
