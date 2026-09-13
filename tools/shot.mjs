import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await p.goto('http://localhost:8802/our-house.html'); await p.waitForTimeout(600);
await p.locator('#credo').screenshot({path:'/tmp/credo.png'});
await b.close();
