const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',r=>r.abort());
 await context.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:`
 window.qa={following:false,fail:false,calls:[]};
 const post={id:'post-a',title:'量子读书会的小发现',body:'欢迎分享你的思考。',category:'help',status:'published',published_at:'2026-10-12',author_name:'林小满',author_profile_id:'public-other',badges:[{id:'L1',name:'开箱猫'}],can_reply:true};
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'private-reader',email:'private@example.invalid'}}}}),onAuthStateChange:()=>({})},from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,single:async()=>({data:{display_name:'我的昵称',bio:'我的介绍',points:0}}),then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)};return q;},rpc:async(name,args)=>{
 qa.calls.push({name,args});
 const identityBadges=[{id:'L0',name:'好奇猫'},{id:'committee_member',name:'委员单位成员'},{id:'committee_representative',name:'委员单位代表'},{id:'partner_member',name:'共建单位成员'},{id:'partner_representative',name:'共建单位代表'}];post.badges=identityBadges;
 if(name==='community_member_feed')return {data:args.category_filter&&args.category_filter!=='help'?[]:[post]};
 if(name==='community_member_post_detail')return {data:post};
 if(name==='community_member_replies')return {data:[{id:'reply-a',body:'谢谢分享',author_name:'另一位伙伴',author_profile_id:'public-replier',published_at:'2026-10-12',badges:identityBadges}]};
 if(name==='community_member_profile'){if(args.member_id==='missing')return {data:null};const own=!args.member_id||args.member_id==='public-me';return {data:{id:own?'public-me':args.member_id,display_name:own?'我的昵称':'林小满',bio:'<img src=x onerror=alert(1)> 对量子充满好奇。',is_self:own,following_count:3,follower_count:qa.following?6:5,is_following:qa.following,badges:[{id:'L1',name:'开箱猫'},{id:'L0',name:'好奇猫'}]}};}
 if(name==='set_member_follow'){if(qa.fail)return {error:{code:'42501'}};qa.following=args.following;return {data:qa.following};}
 if(name==='community_member_posts')return {data:args.page_offset?[]:[post]};
 if(name==='my_member_connections')return {data:Array.from({length:args.page_offset?1:20},(_,i)=>({id:'public-person-'+(args.page_offset+i),display_name:'伙伴 '+(args.page_offset+i),bio:'一起探索'}))};
 if(name==='my_contribution_summary')return {data:{count:0,span_days:0,recent:[]}};
 return {data:false,error:null};
 }})};`}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/account.html#forum');await page.locator('.post-author a').waitFor();
 const tagColors=await page.locator('.post-author .badge-tag').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));assert.equal(new Set(tagColors).size,5,'identity badges have distinct colours');
 assert.equal(await page.locator('.forum-board[data-board]').count(),6);
 await page.locator('[data-board="knowledge"]').click();await page.waitForFunction(()=>document.querySelector('#post-form select[name=category]')?.value==='knowledge');
 assert.equal(await page.locator('#feed .forum-post').count(),0);await page.waitForFunction(()=>document.querySelector('#post-form button')?.textContent==='提交审核');
 await page.locator('[data-board="help"]').click();await page.locator('#feed .forum-post').waitFor();assert.equal(await page.locator('#post-form select[name=category]').inputValue(),'help');
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'spaceqat-forum-boards.png'),fullPage:true,animations:'disabled'});
 await page.locator('.post-author a').click();await page.locator('.visitor-hero').waitFor();
 assert.equal(await page.locator('.social-counts a[href^="#connections"]').count(),0);assert.equal(await page.locator('.visitor-badges .earned').count(),2);assert.equal(await page.locator('.desk-tools,.explore-deck').count(),0);
 assert.equal(await page.locator('.profile-bio img').count(),0);assert.equal(await page.getByText('private@example.invalid').count(),0);
 await page.evaluate(()=>qa.fail=true);await page.locator('.follow-button').click();await page.getByText('操作未完成，请重试。',{exact:true}).waitFor();assert.equal(await page.locator('.follow-button').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>qa.fail=false);await page.locator('.follow-button').click();await page.getByText('已关注这位伙伴。',{exact:true}).waitFor();assert.equal(await page.locator('.social-counts b').nth(1).textContent(),'6');
 await page.locator('.follow-button').click();await page.getByText('已取消关注。',{exact:true}).waitFor();assert.equal(await page.locator('.social-counts b').nth(1).textContent(),'5');
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width);}
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'spaceqat-visitor-profile.png'),fullPage:true,animations:'disabled'});
 await page.locator('.social-post h3 a').click();await page.locator('.reply-compose').waitFor();await page.locator('.forum-reply .post-author a').click();await page.waitForURL('**#member/public-replier');await page.locator('.visitor-hero').waitFor();
 await page.locator('.member-tabs a[href="#profile"]').click();await page.locator('.social-home a[href="#connections/following"]').click();await page.locator('.social-person').first().waitFor();assert.equal(await page.locator('.social-person').count(),20);await page.locator('.social-more').click();await page.getByText('伙伴 20',{exact:true}).waitFor();assert.equal(await page.locator('.social-person').count(),21);
 await page.locator('.social-person h3 a').first().click();await page.locator('.visitor-hero').waitFor();
 await page.locator('.member-tabs a[href="#profile"]').click();await page.locator('.social-home a[href$="/preview"]').click();await page.locator('.visitor-hero').waitFor();assert.equal(await page.locator('.social-counts a[href^="#connections"]').count(),0);assert.equal(await page.locator('.follow-button').count(),0);
 await page.goto('http://127.0.0.1:8765/account.html?lang=en#member/public-other');await page.getByRole('button',{name:'＋ Follow',exact:true}).waitFor();
 await page.goto('http://127.0.0.1:8765/account.html#member/missing');await page.getByText('该会员主页不存在或不可访问。').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: forum author/replier links, visitor badges/bio/posts, safe text, follow/unfollow failure and success, own private lists/pagination, visitor preview, bilingual and responsive layouts.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
