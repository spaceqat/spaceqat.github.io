// Isolated artwork regression: no account data or remote requests.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:960,height:650}});
  await page.route('**/*',r=>r.abort());
  await page.setContent('<style>body{margin:32px;background:#f7f9fa;font:15px sans-serif;color:#334b55}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}article{background:white;border:1px solid #dce4e7;border-radius:18px;padding:22px 8px;text-align:center}svg{width:110px;display:block;margin:0 auto 12px}small{display:block;margin-top:8px;color:#687e87}</style><main></main>');
  await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'../assets/badge-life.css'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../assets/badge-art.js'),'utf8')});
  await page.evaluate(()=>{
   const names={committee_member:'委员单位成员',committee_representative:'委员单位代表',partner_member:'共建单位成员',partner_representative:'共建单位代表'};
   document.querySelector('main').innerHTML=[false,true].map(earned=>Object.entries(names).map(([id,name])=>`<article>${window.spaceqatBadgeArt(id,earned)}${name}<small>${earned?'已点亮':'未点亮'}</small></article>`).join('')).join('');
   document.querySelectorAll('svg').forEach(e=>e.classList.add('motion-visible'));
  });
  assert.equal(await page.locator('.badge-route-other').count(),0);
  const shapes=await page.locator('.is-unearned .badge-symbol').evaluateAll(es=>es.map(e=>e.innerHTML));
  assert.equal(new Set(shapes).size,4);
  const colors=await page.locator('.is-earned .badge-enamel').evaluateAll(es=>es.map(e=>getComputedStyle(e).fill));
  assert.equal(new Set(colors).size,4);
  assert.equal(await page.locator('.is-unearned').evaluateAll(es=>es.some(e=>e.getAnimations({subtree:true}).length>0)),false);
  assert.ok(await page.locator('.is-earned').evaluateAll(es=>es.every(e=>e.getAnimations({subtree:true}).length>0)));
  await page.screenshot({path:path.join(os.tmpdir(),'spaceqat-organization-badges.png'),animations:'disabled'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('svg').evaluateAll(es=>es.some(e=>e.getAnimations({subtree:true}).length>0)),false);
  console.log('PASS: four distinct silhouettes, four earned palettes, locked/reduced-motion static. Screenshot:',path.join(os.tmpdir(),'spaceqat-organization-badges.png'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
