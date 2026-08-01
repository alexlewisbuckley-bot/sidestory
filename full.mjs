import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 0.34 });
await p.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle' });
await p.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,90));} window.scrollTo(0,0); });
await p.waitForTimeout(1000);
await p.screenshot({ path: '/home/claude/shot-full.png', fullPage: true });
await b.close(); console.log('ok');
