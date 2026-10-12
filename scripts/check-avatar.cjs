const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.request().url()==='https://avatar.test/'?r.fulfill({body:'<!doctype html><html></html>',contentType:'text/html'}):r.abort());await page.goto('https://avatar.test/');
 await page.setContent('<div id="content"><section id="profile-editor"></section><div class="identity"><span class="avatar">A</span></div><span id="hero-name">Alice</span></div>');
 await page.evaluate(()=>{
  window.saved=[];window.uploads=[];window.removed=[];window.fail=false;
  const image=document.createElement('canvas');image.width=image.height=1;window.testImage=image.toDataURL();
  window.spaceqatClient={storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:window.testImage}}),upload:async(path,blob)=>{window.uploads.push({path,type:blob.type,size:blob.size});return {error:window.fail?{}:null}},remove:async paths=>{window.removed.push(...paths);return {error:null}}})},from:()=>({update:d=>({eq:()=>({select:()=>({single:async()=>{window.saved.push(d);return {data:d,error:null}}})})})}),rpc:async()=>({data:[]})};
 });
 await page.addScriptTag({content:fs.readFileSync('assets/account-avatar.js','utf8')});
 await page.evaluate(()=>window.mountSpaceQatAvatar({client:window.spaceqatClient,user:{id:'user'},data:{public_id:'10000000-0000-0000-0000-000000000001',display_name:'Alice'},content:document.querySelector('#content'),t:(zh,en)=>en,current:()=>true}));
 await page.locator('input').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
 assert.match(await page.locator('.avatar-status').innerText(),/valid/);assert.equal(await page.locator('.avatar-upload').isDisabled(),true);
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=32;c.getContext('2d').fillRect(0,0,64,32);return c.toDataURL().split(',')[1]}),'base64');
 await page.locator('input').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.querySelector('.avatar-upload').disabled);
 await page.locator('.avatar-upload').click();await page.waitForFunction(()=>document.querySelector('.avatar-status').textContent==='Photo updated.');
 await page.locator('.identity img').waitFor();assert.equal(await page.evaluate(()=>uploads[0].type),'image/webp');assert.equal(await page.evaluate(()=>saved.length),1);
 await page.locator('.avatar-remove').click();await page.waitForFunction(()=>window.saved.length===2);assert.equal(await page.evaluate(()=>saved[1].avatar_path),null);
 assert.equal(await page.locator('.identity .avatar').innerText(),'A');
 await page.evaluate(()=>window.fail=true);await page.locator('input').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.querySelector('.avatar-upload').disabled);await page.locator('.avatar-upload').click();await page.waitForFunction(()=>document.querySelector('.avatar-status').textContent.startsWith('Unable'));
 assert.equal(await page.evaluate(()=>saved.length),2);
 console.log('PASS: image validation, WebP re-encoding, preview/save/remove, upload failure preserves profile.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
