/* Isolated browser tests: no real account or database writes. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const context=await browser.newContext({viewport:{width:1440,height:1050}});
 await context.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',r=>r.abort());
 await context.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:`
 const user={id:'guide-test',email:'guide@example.invalid'};
 const ids=[...Array.from({length:6},(_,i)=>'L'+i),...'TCOM'.split('').flatMap(r=>[0,1,2].map(i=>r+i)),...Array.from({length:12},(_,i)=>'A'+i),'campus','unknown'];
 const tables={member_profiles:[{id:user.id,display_name:'徽章测试会员',bio:'',points:420}],badge_catalog:ids.map(id=>({id,name:id==='unknown'?'<img src=x onerror=alert(1)>':id,description:'未知目录的正式说明',category:'Test',sort_order:0})),member_badges:[{user_id:user.id,badge_id:'L3',granted_at:'2026-10-12'}]};
 function query(table){let rows=tables[table]||[];const q={select:()=>q,order:()=>q,eq:(k,v)=>{rows=rows.filter(r=>r[k]===v);return q},single:async()=>({data:rows[0],error:null}),then:(ok,no)=>Promise.resolve({data:rows,error:null}).then(ok,no)};return q;}
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user}},error:null}),onAuthStateChange:()=>({})},from:query,rpc:async name=>({data:name==='community_permissions'?{}:null,error:null})})};
 `}));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/account.html#badges');
 await page.locator('.badge-rule-trigger').first().waitFor();
 assert.equal(await page.locator('.real-badge').count(),32);
 assert.equal(await page.locator('.real-badge.earned').count(),1);
 await page.locator('.guide-more>summary').click();
 await page.locator('.guide-more>details:not(.activity-xp-rules)>summary').click();
 assert.match(await page.locator('.xp-guide').innerText(),/发帖审核与积分审核是两回事/);
 await page.locator('.guide-more>details:not(.activity-xp-rules)>summary').click();
 await page.locator('.xp-guide .activity-xp-rules summary').click();
 const activityRules=await page.locator('.xp-guide .activity-xp-rules').innerText();
 for(const text of ['20 XP','10 XP','80 XP','组织与参与不叠加','不计为有效贡献','按活动完成日期','不能事后追认超额','尚无活动自动计分'])assert.ok(activityRules.includes(text),text);
 await page.locator('.xp-guide .activity-xp-rules summary').click();
 for(const id of await page.locator('[data-badge-rule]').evaluateAll(els=>els.map(el=>el.dataset.badgeRule))){
  const trigger=page.locator('[data-badge-rule="'+id+'"]');await trigger.click();
  assert.equal(await page.locator('#badge-rule-dialog').evaluate(d=>d.open),true);
  assert.match(await page.locator('#badge-rule-dialog').innerText(),/需要完成什么/);
  assert.equal(await page.locator('#badge-rule-dialog img').count(),0);
  if(id==='L3')assert.match(await page.locator('#badge-rule-dialog').innerText(),/L3 及以上可申请 Mini grant/);
  if(id==='L2')assert.match(await page.locator('#badge-rule-dialog').innerText(),/Mini grant 从 L3 开始/);
  if(id==='A1')assert.match(await page.locator('#badge-rule-dialog').innerText(),/历史纪念徽章/);
  if(id==='unknown')assert.match(await page.locator('#badge-rule-dialog').innerText(),/未知目录的正式说明/);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
 }
 await page.goto('http://127.0.0.1:8765/account.html#profile');
 await page.locator('.showcase-badge').first().click();await page.locator('#badge-rule-dialog[open]').waitFor();
 assert.match(page.url(),/#badges\/L3$/);await page.locator('.badge-rule-close').click();await page.waitForURL(/#badges$/);
 for(const lang of ['zh','en'])for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:950});
  await page.goto('http://127.0.0.1:8765/account.html'+(lang==='en'?'?lang=en':'')+'#badges');
  await page.locator('.badge-rule-trigger').first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,lang+' grid '+width);
  if(lang==='zh'&&width===1440){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(os.tmpdir(),'spaceqat-guide-desktop.png')});}
  await page.locator('[data-badge-rule="L3"]').click();
  assert.equal(await page.locator('#badge-rule-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,lang+' dialog '+width);
  assert.match(await page.locator('#badge-rule-dialog').innerText(),lang==='en'?/community expert review/:/社区专家评审/);
  if(lang==='zh'&&width===390){assert.equal(await page.locator('.badge-rule-detail>svg').evaluate(el=>el.getBoundingClientRect().width),110);await page.screenshot({path:path.join(os.tmpdir(),'spaceqat-guide-mobile.png')});}
  await page.keyboard.press('Escape');
 }
 await page.goto('http://127.0.0.1:8765/community-demo.html#badges');
 await page.locator('.xp-guide').waitFor();await page.locator('[data-action=badge][data-id=L3]').click();
 assert.match(await page.locator('#modal').innerText(),/社区专家评审/);
 assert.deepEqual(errors,[]);
 console.log('PASS: 32 badge details, earned/locked states, legacy rules, unknown catalog fallback, escaping, keyboard focus, profile deep links, 8 bilingual responsive layouts and Demo parity.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
