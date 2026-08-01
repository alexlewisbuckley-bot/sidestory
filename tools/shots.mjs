import { chromium } from 'playwright';
const [file, ...ws] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of ws) {
  const p = await b.newPage({ viewport:{width:+w,height:1000}, deviceScaleFactor: Math.min(1, 900/+w) });
  await p.goto('http://localhost:8899/'+file, { waitUntil:'networkidle' });
  await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(()=>{const s=document.createElement('style');s.textContent='.rev,.rev.in{opacity:1!important;transform:none!important}';document.head.appendChild(s);
    document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');});
  await p.waitForTimeout(1200);
  await p.screenshot({ path:`/home/claude/w${w}-${file.replace('.html','')}.png`, fullPage:true });
  await p.close();
}
await b.close(); console.log('ok');
