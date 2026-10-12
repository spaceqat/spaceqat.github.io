/* Design regression fixtures only. Blocks all live Supabase traffic. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  await context.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',r=>r.abort());
  await context.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:`
   const user={id:'studio-test',email:'studio@example.invalid'};
   const names=['好奇猫','开箱猫','叠加猫','纠缠猫','跃迁猫','星图猫'];
   const qas=JSON.parse(sessionStorage.getItem('studio-fixture')||'{}');
   const tables={member_profiles:[{id:user.id,display_name:'zlianghahaha',bio:'在代码与好奇心之间，寻找量子的更多可能。',points:qas.points??120}],badge_catalog:names.map((name,i)=>({id:'L'+i,name,category:'个人等级',sort_order:i})),member_badges:[{user_id:user.id,badge_id:qas.level||'L1',granted_at:'2026-10-12'}]};
   function query(table){let rows=tables[table]||[];const q={select:()=>q,order:()=>q,eq:(k,v)=>{rows=rows.filter(r=>r[k]===v);return q},single:async()=>({data:rows[0],error:null}),then:(a,b)=>Promise.resolve({data:rows,error:null}).then(a,b),update:d=>({eq:async()=>{Object.assign(rows[0],d);return {error:null}}})};return q;}
   window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user}}}),onAuthStateChange:()=>({})},from:query,rpc:async name=>name==='my_contribution_summary'?{data:qas.fail?null:{count:0,span_days:0,recent:[]},error:qas.fail?{}:null}:{data:false,error:null}})};
  `}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/account.html#profile');
  await page.locator('.contribution-cta').waitFor();
  assert.equal(await page.locator('#profile-editor').isVisible(),false);
  assert.equal(await page.locator('.growth-card [role=progressbar]').getAttribute('aria-valuenow'),'120');
  assert.equal(await page.locator('.growth-card [role=progressbar]').getAttribute('aria-valuemax'),'160');
  assert.match(await page.locator('.progress-caption').innerText(),/40 XP/);
  assert.match(await page.locator('.dashboard-head h1').innerText(),/👋/);
  assert.equal(await page.locator('#github-count').innerText(),'0');
  await page.locator('.companion-hello').click();
  assert.match(await page.locator('.companion-speech').innerText(),/新发现/);
  await page.locator('.explore-next').click();
  assert.equal(await page.locator('.explore-deck').getAttribute('data-track'),'C');
  assert.equal(await page.locator('.explore-destination').getAttribute('href'),'#forum');
  await page.locator('.explore-routes button').first().click();
  assert.equal(await page.locator('.explore-destination').getAttribute('href'),'#contributions');
  assert.equal(await page.locator('.explore-deck').count(),1);
  await page.locator('#edit-profile').click();assert.equal(await page.locator('#profile-editor').isVisible(),true);
  await page.locator('#close-profile-editor').click();assert.equal(await page.locator('#edit-profile').evaluate(e=>e===document.activeElement),true);
  await page.screenshot({path:path.join(os.tmpdir(),'spaceqat-studio-profile.png'),fullPage:true,animations:'disabled'});
  await page.goto('http://127.0.0.1:8765/account.html#badges');await page.locator('.real-badge').first().waitFor();
  assert.equal(await page.locator('.guide-more').getAttribute('open'),null);
  assert.equal(await page.locator('.route-metric').count(),4);
  assert.equal(await page.locator('.real-badge.earned').count(),1);
  assert.match(await page.locator('.real-badge.earned>strong').innerText(),/2026/);
  // Motion is decorative: a preview must not turn a locked badge into an award.
  await page.locator('.real-badge.earned').hover();
  await page.waitForFunction(()=>document.querySelector('.real-badge.earned').classList.contains('is-tilting'));
  const locked=page.locator('[data-badge-rule="L2"]');
  await locked.hover();await page.waitForFunction(()=>document.querySelector('[data-badge-rule="L2"]').closest('article').querySelector('.motion-badge-tip').textContent.includes('120 / 160'));
  await locked.click();await page.locator('.motion-preview').click();
  assert.equal(await page.locator('.motion-particles i').count(),10);
  assert.equal(await page.locator('.real-badge.earned').count(),1);
  assert.match(await page.locator('.motion-preview-note').innerText(),/不会授予/);
  await page.keyboard.press('Escape');
  await page.mouse.move(0,0);
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.motion-particles').count(),0);
  assert.equal(await page.locator('[data-count-display]').count(),0);
  await page.screenshot({path:path.join(os.tmpdir(),'spaceqat-studio-badges.png'),fullPage:true,animations:'disabled'});
  // AA text contrast of token pairs; muted text is never faded with card opacity.
  const palettes=await page.evaluate(()=>['paper','sage','dusk'].map(p=>{document.body.dataset.deskPalette=p;const s=getComputedStyle(document.body);return ['--desk-muted','--desk-bg','--desk-accent','--desk-tint'].map(k=>s.getPropertyValue(k).trim());}));
  const lum=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  for(const [muted,bg,accent,tint] of palettes){assert.ok(contrast(muted,bg)>=4.5);assert.ok(contrast(accent,tint)>=4.5);}
  for(const lang of ['zh','en'])for(const width of [1440,1024,768,390,320])for(const view of ['profile','badges']){
   await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:8765/account.html'+(lang==='en'?'?lang=en':'')+'#'+view);
   await page.locator(view==='profile'?'.contribution-cta':'.real-badge').first().waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' '+width+' '+view);
   if(view==='profile'){await page.locator('.companion-hello').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'speech overflow '+width);}
   if(width===390&&lang==='zh'){await page.waitForTimeout(700);const indicator=await page.locator('.motion-nav-indicator').boundingBox(),nav=await page.locator('.member-tabs').boundingBox();assert.ok(indicator.y>=nav.y&&indicator.y+indicator.height<=nav.y+nav.height+1,'indicator stays inside mobile navigation');await page.screenshot({path:path.join(os.tmpdir(),'spaceqat-studio-'+view+'-mobile.png'),animations:'disabled'});}
  }
  await page.evaluate(()=>sessionStorage.setItem('studio-fixture',JSON.stringify({points:200,level:'L1'})));
  await page.goto('http://127.0.0.1:8765/account.html#profile');await page.locator('.contribution-cta').waitFor();
  assert.match(await page.locator('.progress-caption').innerText(),/其他条件仍需核验/);
  assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuenow'),'160');
  await page.evaluate(()=>sessionStorage.setItem('studio-fixture',JSON.stringify({points:1800,level:'L5',fail:true})));
  await page.reload();await page.getByText('贡献记录暂时无法加载，请稍后重试。').waitFor();
  assert.equal(await page.locator('.growth-card [role=progressbar]').count(),0);
  assert.equal(await page.locator('#github-count').innerText(),'—');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.greeting-wave').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.goto('http://127.0.0.1:8765/account.html#badges');await page.locator('[data-badge-rule="L2"]').click();await page.locator('.motion-preview').click();
  assert.equal(await page.locator('.motion-particles').count(),0);
  assert.equal(await page.locator('.motion-nav-indicator').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  assert.deepEqual(errors,[]);
  console.log('PASS: studio editor, verified level progress, capped display, top tier, empty vs error, award date, 20 bilingual layouts, AA token contrast, reduced motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
