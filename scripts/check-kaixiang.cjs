const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict'),os=require('node:os');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync('kaixiang/index.html'))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(()=>{window.drawnText=[];const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(!window.drawnText.includes(text))window.drawnText.push(text);return draw.call(this,text,...args)}});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForTimeout(800);
  assert.match(await page.title(),/太空量子猫猫局/);assert.ok((await page.evaluate(()=>drawnText)).some(t=>t.includes('登船短训练')));
  await page.mouse.click(1200,53);await page.waitForTimeout(400);
  assert.ok((await page.evaluate(()=>drawnText)).includes('开始航行'));
  const nameInput=page.getByPlaceholder('输入名字，最多 8 个字');
  for(const blocked of ['傻1逼','賭場']){
   await nameInput.fill(blocked);await page.mouse.click(580,760);await page.waitForTimeout(100);
   assert.ok(await nameInput.isVisible(),'Blocked nickname must stay on title screen');
   assert.notEqual(await page.evaluate(()=>localStorage.getItem('qcat.name')),blocked);
  }
  await nameInput.fill('测试猫猫');assert.equal(await nameInput.getAttribute('maxlength'),'8');
  const menu=await page.evaluate(()=>drawnText.map(String));assert.ok(menu.includes('9')&&menu.includes('10'),'Nine and ten cat options');
  await page.screenshot({path:os.tmpdir()+'/kaixiang-menu.png'});
  await page.evaluate(()=>{drawnText=[]});await page.mouse.click(665,360);await page.waitForTimeout(300);
  assert.equal(await page.getByPlaceholder('最多 8 个字',{exact:true}).inputValue(),'测试猫猫');
  assert.ok(!(await page.evaluate(()=>drawnText.join(' '))).includes('Claude'),'Obsolete preview notice removed');
  await page.screenshot({path:os.tmpdir()+'/kaixiang-network.png'});
  await page.mouse.click(540,360);await page.waitForTimeout(200);
  await page.mouse.click(850,490);
  await page.mouse.click(590,555);await page.evaluate(()=>{drawnText=[]});await page.mouse.click(580,760);await page.waitForTimeout(800);
  assert.ok((await page.evaluate(()=>drawnText)).length>10,'Solo game renders');
  assert.equal(await page.evaluate(()=>localStorage.getItem('qcat.name')),'测试猫猫');
  await page.keyboard.press('d');await page.screenshot({path:os.tmpdir()+'/kaixiang-solo.png'});
  await page.mouse.click(720,800);await page.waitForTimeout(600);
  await page.screenshot({path:os.tmpdir()+'/kaixiang-playing.png'});
  await page.evaluate(()=>{drawnText=[]});await page.waitForTimeout(100);
  assert.ok((await page.evaluate(()=>drawnText)).some(t=>String(t).includes('[Tab]')),'Task panel initially collapsed');
  await page.evaluate(()=>{drawnText=[]});await page.keyboard.press('Tab');await page.waitForTimeout(100);
  assert.ok((await page.evaluate(()=>drawnText)).includes('收起'),'Tab expands task panel');
  await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
  await page.evaluate(()=>{drawnText=[]});await page.waitForTimeout(100);
  assert.ok((await page.evaluate(()=>drawnText)).some(t=>String(t).includes('[Tab]')),'Movement collapses task panel');
  await page.evaluate(()=>{drawnText=[]});await page.mouse.click(100,35);await page.waitForTimeout(100);
  assert.ok((await page.evaluate(()=>drawnText)).includes('收起'),'Click expands task panel');
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await page.locator('#game').boundingBox();assert.equal(Math.round(box.width),width)}
  assert.deepEqual(errors,[]);console.log('PASS training rendering, menu interaction, desktop/mobile canvas and no runtime errors');
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
