import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const pg of process.argv.slice(2)){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,downloadThroughput:1.6*1024*1024/8,
    uploadThroughput:750*1024/8,latency:150});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  let bytes=0,reqs=0;
  p.on('response',async r=>{reqs++;try{const h=r.headers();bytes+=+(h['content-length']||0)}catch{}});
  await p.evaluateOnNewDocument?.(()=>{});
  const t0=Date.now();
  await p.goto('http://localhost:8801/'+pg,{waitUntil:'load'});
  const m=await p.evaluate(()=>new Promise(res=>{
    let cls=0; let lcp=0;
    new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) cls+=e.value})
      .observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(l=>{const e=l.getEntries();lcp=e[e.length-1].startTime})
      .observe({type:'largest-contentful-paint',buffered:true});
    setTimeout(()=>{
      const fcp=performance.getEntriesByName('first-contentful-paint')[0];
      res({cls:+cls.toFixed(4),lcp:Math.round(lcp),fcp:Math.round(fcp?fcp.startTime:0),
        dom:Math.round(performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart)});
    },3200);}));
  // second pass: scroll to trigger lazy loads and re-read CLS
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40))}});
  await p.waitForTimeout(700);
  const cls2=await p.evaluate(()=>new Promise(res=>{let c=0;
    new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) c+=e.value})
      .observe({type:'layout-shift',buffered:true});
    setTimeout(()=>res(+c.toFixed(4)),300)}));
  console.log(pg.padEnd(28), 'fcp',String(m.fcp).padStart(5),'lcp',String(m.lcp).padStart(5),
    'cls(load)',String(m.cls).padStart(7),'cls(scrolled)',String(cls2).padStart(7),
    'reqs',String(reqs).padStart(3),'kB',Math.round(bytes/1024));
  await ctx.close();
}
await b.close();
