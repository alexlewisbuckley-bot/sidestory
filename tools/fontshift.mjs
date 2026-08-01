import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const pg of process.argv.slice(2)){
  const runs=[];
  for(const block of [true,false]){
    const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true});
    const p=await ctx.newPage();
    if(block) await p.route('**/*.woff2',r=>r.abort());
    await p.goto('http://localhost:8802/'+pg,{waitUntil:'networkidle'});
    await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));
      document.querySelectorAll('.enter-veil').forEach(e=>e.remove());});
    await p.evaluate(async()=>{await document.fonts.ready.catch(()=>{});});
    await p.waitForTimeout(600);
    runs.push(await p.evaluate(()=>{
      const o={};
      document.querySelectorAll('h1,h2,h3,p,li,blockquote,figcaption,.btn,.k,span,td').forEach((el,i)=>{
        const r=el.getBoundingClientRect(); if(r.height<1)return;
        o[i+':'+el.tagName+'.'+[...el.classList].slice(0,1).join('')]=Math.round(r.height);});
      o['#doc']=document.documentElement.scrollHeight; return o;}));
    await ctx.close();
  }
  const [a,c]=runs;
  const diff=Object.keys(a).filter(k=>k!=='#doc'&&a[k]!==c[k]);
  console.log(pg.padEnd(28),'doc',a['#doc'],'->',c['#doc'],
    '| text boxes differing:',diff.length,'/',Object.keys(a).length-1,
    diff.slice(0,4).map(k=>`${k} ${a[k]}->${c[k]}`).join('  '));
}
await b.close();
