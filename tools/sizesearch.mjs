import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const p = await (await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})).newPage();
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.click('.util a[href="search.html"]'); await p.waitForTimeout(500);
let fails=0;
const cases = [['100ml','100 ml'],['100 ml','100 ml'],['7.5ml','7.5 ml'],['7.5','7.5 ml'],
  ['7ml','7.5 ml'],['travel','7.5 ml'],['2ml','Samples'],['sample','Samples'],
  ['tester','Samples'],['full size','100 ml'],['small','7.5 ml'],['miniature','7.5 ml'],
  ['160','100 ml'],['40','7.5 ml']];
for (const [q, want] of cases) {
  await p.fill('#srchq', q); await p.waitForTimeout(110);
  const titles = await p.evaluate(()=>[...document.querySelectorAll('#srchres .srchlist a span:first-child')].map(x=>x.textContent));
  const hit = titles.some(t=>t.trim()===want);
  if(!hit) fails++;
  console.log((hit?'PASS ':'FAIL ')+`"${q}" → ${want}` + (hit?'':'   got '+JSON.stringify(titles)));
}
// the two Close/Clear controls line up
await p.fill('#srchq','hotel'); await p.waitForTimeout(120);
const align = await p.evaluate(()=>{
  const a=document.getElementById('srchclose').getBoundingClientRect();
  const c=document.getElementById('srchclear').getBoundingClientRect();
  return { close:Math.round(a.right), clear:Math.round(c.right) };});
const ok = Math.abs(align.close-align.clear)<=1;
if(!ok) fails++;
console.log((ok?'PASS ':'FAIL ')+'Close and Clear share a right edge  '+JSON.stringify(align));
await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall size-search checks pass');
process.exit(fails?1:0);
