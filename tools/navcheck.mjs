import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:8802/index.html',{waitUntil:'domcontentloaded'});
const links = await p.evaluate(()=>[...document.querySelectorAll('.mega .inner > div')]
  .filter(d=>d.querySelector('.fh')?.textContent==='Read')
  .flatMap(d=>[...d.querySelectorAll('a.ml')].map(a=>({t:a.textContent,h:a.getAttribute('href')}))));
let fails=0;
for (const l of links){
  const [file,hash] = l.h.split('#');
  const res = await p.goto('http://localhost:8802/'+file,{waitUntil:'domcontentloaded'});
  const ok = res.status()===200 && (!hash || await p.evaluate(id=>!!document.getElementById(id), hash));
  if(!ok) fails++;
  console.log((ok?'OK  ':'FAIL')+'  '+l.t.padEnd(14)+' -> '+l.h+'  ['+res.status()+']');
}
console.log(fails?`\n${fails} BROKEN`:'\nevery Read link resolves');
await b.close(); process.exit(fails?1:0);
