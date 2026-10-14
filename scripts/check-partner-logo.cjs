// Isolated bilingual homepage check; no production requests or account access.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({reducedMotion:'reduce'}),base='http://127.0.0.1:'+server.address().port;
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  for(const [filename,label] of [['index.html','中国工商银行软件开发中心'],['en.html','ICBC Software Development Center']]){
   await page.goto(base+'/'+filename);
   const card=page.locator('.partner-logo-card:visible').filter({hasText:label}).first(),img=card.locator('img');
   assert.equal(await img.getAttribute('src'),'assets/partners/icbc-software-center.jpg');
   for(const width of [1366,768,390,320]){
    await page.setViewportSize({width,height:960});await card.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());
    assert.ok(await img.evaluate(img=>img.naturalWidth>0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+filename+' '+width);
    assert.equal(await card.locator('.partner-logo-name').innerText(),label);
    if(width===1366||width===390)await card.screenshot({path:path.join(os.tmpdir(),'spaceqat-icbc-'+filename+'-'+width+'.png')});
   }
  }
  console.log('PASS: supplied ICBC logo loads on both homepages, names preserved, 1366/768/390/320px layouts.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
