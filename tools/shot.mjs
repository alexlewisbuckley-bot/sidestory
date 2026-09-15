import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.locator('footer').scrollIntoViewIfNeeded();
await p.waitForTimeout(900);
await p.locator('footer').screenshot({path:'/tmp/footer.png'});
await b.close();
