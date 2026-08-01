import {chromium} from 'playwright';
const [,,port,...specs]=process.argv;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const s of specs){
  const [page,w,h,full]=s.split(':');
  const ctx=await b.newContext({viewport:{width:+w,height:+(h||900)},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.goto(`http://localhost:${port}/${page}`,{waitUntil:'networkidle'});
  await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));
    document.documentElement.classList.add('noanim');});
  await p.waitForTimeout(700);
  await p.screenshot({path:`/tmp/s-${page.replace(/\W/g,'_')}-${w}${full?'-full':''}.png`,fullPage:!!full});
  await ctx.close();
}
await b.close();
