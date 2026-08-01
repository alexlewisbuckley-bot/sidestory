import {chromium} from 'playwright';
import fs from 'fs';
const PAGES=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const R={skip:[],noname:[],nomain:[],dupid:[],alt:[],lang:[]};
for(const pg of PAGES){
  await p.goto('http://localhost:8801/'+pg,{waitUntil:'networkidle'});
  const o=await p.evaluate(()=>{
    const out={skip:[],noname:[],main:0,dup:[],alt:0,lang:document.documentElement.lang||''};
    let last=0;
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h=>{
      if(getComputedStyle(h).display==='none'&&!h.closest('[hidden]'))return;
      const l=+h.tagName[1];
      if(last&&l>last+1) out.skip.push(`h${last}->h${l}: ${h.textContent.trim().slice(0,24)}`);
      last=l;});
    document.querySelectorAll('a[href],button,[role=button],input,select,textarea').forEach(e=>{
      if(e.type==='hidden')return;
      if(getComputedStyle(e).display==='none')return;
      const n=(e.textContent||'').trim()||e.getAttribute('aria-label')||e.getAttribute('title')
        ||(e.labels&&e.labels.length?e.labels[0].textContent.trim():'')
        ||(e.getAttribute('aria-labelledby')&&document.getElementById(e.getAttribute('aria-labelledby'))?'x':'')
        ||(e.querySelector('img[alt]')?e.querySelector('img[alt]').alt:'')
        ||e.getAttribute('placeholder')||'';
      if(!n) out.noname.push(e.tagName+'.'+[...e.classList].slice(0,2).join('.'));});
    out.main=document.querySelectorAll('main').length;
    const ids={}; document.querySelectorAll('[id]').forEach(e=>{ids[e.id]=(ids[e.id]||0)+1});
    out.dup=Object.entries(ids).filter(([,n])=>n>1).map(([k])=>k);
    out.alt=[...document.querySelectorAll('img')].filter(i=>!i.hasAttribute('alt')).length;
    return out;});
  o.skip.forEach(x=>R.skip.push(pg+' '+x));
  o.noname.forEach(x=>R.noname.push(pg+' '+x));
  if(o.main!==1) R.nomain.push(pg+' main='+o.main);
  o.dup.forEach(x=>R.dupid.push(pg+' #'+x));
  if(o.alt) R.alt.push(pg+' '+o.alt);
  if(!o.lang) R.lang.push(pg);
}
for(const k of Object.keys(R)) console.log(k.padEnd(8), R[k].length, R[k].slice(0,4).join(' | '));
await b.close();
