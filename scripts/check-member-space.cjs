const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1050}});
 await context.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',r=>r.abort());
 await context.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:`
 const member={id:'member-a',email:'test@example.invalid'};const callbacks=[];
 const session=()=>localStorage.getItem('test-member-session')?{user:member}:null;
 const notify=event=>callbacks.forEach(fn=>fn(event,session()));
 window.addEventListener('storage',()=>notify('SIGNED_OUT'));
 const tables={member_profiles:[{id:member.id,display_name:'测试会员',bio:'量子开源爱好者',points:0}],badge_catalog:[{id:'L0',name:'好奇猫',category:'个人等级',description:'完成账户与参与约定。',sort_order:0},{id:'L1',name:'开箱猫',category:'个人等级',description:'完成已核验的贡献。',sort_order:1}],member_badges:[],community_posts:[]};
 function query(table){let rows=tables[table]||[];const builder={select:()=>builder,eq:(k,v)=>{rows=rows.filter(row=>row[k]===v);return builder},order:()=>builder,limit:()=>builder,single:async()=>({data:rows[0],error:null}),then:(ok,bad)=>Promise.resolve({data:rows,error:null}).then(ok,bad),update:data=>({eq:async()=>{Object.assign(rows[0],data);return {error:null}}})};return builder;}
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:session()}}),onAuthStateChange:fn=>{callbacks.push(fn);return{}},signInWithPassword:async()=>{localStorage.setItem('test-member-session','yes');notify('SIGNED_IN');return {data:session(),error:null}},signOut:async()=>{localStorage.removeItem('test-member-session');notify('SIGNED_OUT');return {error:null}}},from:query,rpc:async(name,args)=>{
 if(name==='community_can_review')return {data:false,error:null};
 if(name==='community_feed')return {data:[{id:'public-post',title:'第一篇量子分享',body:'<img src=x onerror=alert(1)> 这里是经过审核的内容。',category:'help',published_at:'2026-10-12T00:00:00Z',author_name:'社区成员',badges:[{name:'好奇猫'}]}],error:null};
 if(name==='submit_community_post'){tables.community_posts.push({id:'pending-post',author_id:member.id,title:args.post_title,body:args.post_body,category:args.post_category,status:'pending',created_at:'2026-10-12T00:00:00Z',review_note:''});return {data:'pending-post',error:null};}
 return {data:null,error:{message:'unexpected RPC'}};
 }})};` }));
 const page=await context.newPage();const faults=[];page.on('pageerror',e=>faults.push(e.message));
 await page.goto('http://127.0.0.1:8765/account.html#login');
 await page.locator('[name=email]').fill('test@example.invalid');await page.locator('[name=password]').fill('Example-password');await page.locator('#auth button').click();await page.locator('.profile-hero').waitFor();
 await page.screenshot({path:'C:/Users/Administrator/AppData/Local/Temp/spaceqat-dashboard.png',fullPage:true});
 await page.locator('#edit-profile').click();await page.locator('[name=display_name]').fill('修改后的会员');await page.locator('#profile button').click();await page.getByText('资料已保存。',{exact:true}).waitFor();assert.equal(await page.locator('#hero-name').textContent(),'修改后的会员');
 await page.locator('#home').click();await page.getByRole('link',{name:'我的个人空间',exact:true}).first().waitFor();
 assert.equal(await page.locator('.nav-cta').getAttribute('href'),'account.html#profile');
 await page.locator('.nav-cta').click();await page.locator('.profile-hero').waitFor();
 await page.locator('.member-tabs a[href="#badges"]').click();await page.locator('.real-badge').first().waitFor();
 assert.equal(await page.locator('.real-badge.earned').count(),0);assert.equal(await page.locator('.real-badge.locked').count(),2);
 await page.screenshot({path:'C:/Users/Administrator/AppData/Local/Temp/spaceqat-real-badges.png',fullPage:true});
 await page.locator('.member-tabs a[href="#forum"]').click();await page.getByRole('heading',{name:'第一篇量子分享'}).waitFor();
 assert.equal(await page.locator('.post-body img').count(),0);await page.getByText('社区成员',{exact:false}).waitFor();await page.getByText('好奇猫',{exact:true}).waitFor();
 await page.locator('summary').click();await page.locator('[name=title]').fill('我的真实投稿测试');await page.locator('[name=body]').fill('这是一篇需要社区审核后才能公开展示的测试稿件。');await page.locator('#post-form button').click();await page.getByText('投稿已提交，审核通过后会显示在论坛。可在“我的投稿”查看状态。').waitFor();
 assert.equal(await page.locator('#feed').getByText('我的真实投稿测试',{exact:true}).count(),0);
 await page.locator('.member-tabs a[href="#submissions"]').click();await page.getByRole('heading',{name:'我的真实投稿测试'}).waitFor();await page.getByText('待审核',{exact:false}).waitFor();
 await page.goto('http://127.0.0.1:8765/account.html#moderation');await page.getByText('此页面仅向社区审核员开放。').waitFor();
 await page.goto('http://127.0.0.1:8765/en.html');await page.locator('.nav-cta').filter({hasText:'My space'}).waitFor();
 await page.setViewportSize({width:390,height:950});await page.locator('.member-mobile-entry').filter({hasText:'My space'}).waitFor({state:'visible'});
 const other=await context.newPage();await other.goto('http://127.0.0.1:8765/account.html');await other.locator('.profile-hero').waitFor();await other.locator('#logout').click();
 await page.locator('.member-mobile-entry').filter({hasText:'Join / Sign in'}).waitFor();
 await other.locator('[name=email]').fill('test@example.invalid');await other.locator('[name=password]').fill('Example-password');await other.locator('#auth button').click();await other.locator('.profile-hero').waitFor();
 await page.locator('.member-mobile-entry').filter({hasText:'My space'}).waitFor();
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1050});
  for(const view of ['profile','badges','forum','submissions']){
    await page.goto('http://127.0.0.1:8765/account.html#'+view);await page.locator('.member-tabs').waitFor();
    if(view==='profile')await page.locator('.profile-hero').waitFor();
    if(view==='badges')await page.locator('.real-badge').first().waitFor();
    if(view==='forum')await page.locator('.forum-post').first().waitFor();
    if(view==='submissions')await page.getByText('显示最近 100 条投稿。').waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+view+' '+width);
  }
 }
 assert.deepEqual(faults,[]);await browser.close();console.log('PASS: home return, bilingual/mobile session navigation, cross-tab login/logout, real-data badge empty state, safe forum text, pending submission UI, reviewer denial and 16 member-page layout checks (mocked service).');
})().catch(e=>{console.error(e);process.exit(1)});
