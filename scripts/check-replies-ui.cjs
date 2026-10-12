const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',r=>r.abort());
 await context.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:`
  window.qa={review:false,fail:false,calls:[],replies:[]};
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'reader'}}}}),onAuthStateChange:()=>({})},from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)};return q;},rpc:async(name,args)=>{
   qa.calls.push(name);
   if(name==='my_community_permissions')return {data:{forum:qa.review},error:null};
   if(name==='community_can_review')return {data:qa.review,error:null};
   if(name==='community_can_submit_event')return {data:false,error:null};
   if(name==='community_member_feed')return {data:[{id:'post-a',title:'如何开始量子计算？',body:'分享你第一次学习的过程。',category:'help',published_at:'2026-10-12',author_name:'提问者',badges:[{id:'L1',name:'开箱猫'}]}],error:null};
   if(name==='community_member_post_detail')return {data:qa.removed?null:{id:'post-a',title:'如何开始量子计算？',body:'分享你第一次学习的过程。',category:'help',status:'published',published_at:'2026-10-12',author_name:'提问者',badges:[{id:'L1',name:'开箱猫'}],can_reply:true,can_delete:true},error:null};
   if(name==='delete_community_post'){qa.removed=true;return {data:null,error:null};}
   if(name==='delete_community_reply'){if(qa.fail)return {error:{code:'42501'}};qa.replies=qa.replies.filter(r=>r.id!==args.reply_id);return {data:null,error:null};}
   if(name==='community_member_replies')return {data:[{id:'public-reply',body:'<img src=x onerror=alert(1)> 先运行第一个电路。',published_at:'2026-10-12',author_name:'回答者',badges:[{id:'T0',name:'开源研判师 · 铜阶'}]},...qa.replies.filter(r=>r.status==='published').map(r=>({...r,can_delete:true}))],error:null};
   if(name==='submit_community_reply'){if(qa.fail)return {error:{code:'P0001'}};qa.replies.push({id:'reply-new',post_id:'post-a',post_title:'如何开始量子计算？',author_name:'我的昵称',badges:[{name:'好奇猫'}],body:args.reply_body,status:'published',published_at:'2026-10-12',created_at:'2026-10-12',is_own:!qa.review});return {data:'reply-new',error:null};}
   if(name==='community_reply_submissions')return {data:qa.replies.map(r=>({...r,is_own:!qa.review})).filter(r=>!args.review_queue||r.status==='pending'),error:null};
   if(name==='review_community_reply'){const r=qa.replies.find(r=>r.id===args.reply_id);r.status=args.decision;r.review_note=args.note;r.published_at='2026-10-12';return {data:null,error:null};}
   return {data:false,error:null};
  }})};
 `}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/account.html#forum');await page.locator('.forum-post h3 a').waitFor();
 assert.equal(await page.locator('.reply-compose').count(),0);assert.equal(await page.evaluate(()=>qa.calls.includes('community_member_replies')),false);
 await page.locator('.forum-post h3 a').click();
 await page.locator('.forum-reply').waitFor();
 assert.match(await page.locator('.forum-post>.post-author').innerText(),/提问者.*开箱猫/s);
 assert.match(await page.locator('.forum-reply .post-author').innerText(),/回答者.*开源研判师/s);
 assert.equal(await page.locator('.reply-list img').count(),0);
 await page.locator('.reply-compose textarea').fill('这是我的补充，等待社区审核。');
 await page.evaluate(()=>qa.fail=true);await page.locator('.reply-compose button').click();await page.getByText('回复过于频繁，请稍后再试。').waitFor();assert.ok(await page.locator('.reply-compose textarea').inputValue());
 await page.evaluate(()=>qa.fail=false);await page.locator('.reply-compose button').click();await page.getByText('回复已发布。可在“我的投稿”查看或删除自己的回复。').waitFor();
 assert.equal(await page.locator('.reply-list').getByText('这是我的补充，等待社区审核。').count(),1);
 await page.locator('.member-tabs a[href="#submissions"]').click();await page.locator('.reply-submission').waitFor();assert.match(await page.locator('.reply-submission').innerText(),/已发布/);
 await page.evaluate(()=>qa.review=true);await page.evaluate(()=>location.hash='moderation');await page.getByRole('heading',{name:'投稿审核',exact:true}).waitFor();assert.equal(await page.locator('.reply-review').count(),0);
 await page.locator('.member-tabs a[href="#forum"]').click();await page.locator('.forum-post h3 a').click();await page.locator('.reply-list').getByText('这是我的补充，等待社区审核。').waitFor();
 assert.match(await page.locator('.forum-reply').last().locator('.post-author').innerText(),/我的昵称.*好奇猫/s);
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'spaceqat-forum-replies.png'),fullPage:true,animations:'disabled'});
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'reply overflow '+width);}
 page.once('dialog',d=>d.dismiss());await page.locator('.delete-reply').click();assert.equal(await page.evaluate(()=>qa.calls.includes('delete_community_reply')),false);
 await page.evaluate(()=>qa.fail=true);page.once('dialog',d=>d.accept());await page.locator('.delete-reply').click();await page.getByText('操作未完成，请刷新后重试。').waitFor();assert.equal(await page.locator('.delete-reply').count(),1);
 await page.evaluate(()=>qa.fail=false);page.once('dialog',d=>d.accept());await page.locator('.delete-reply').click();await page.getByText('回复已删除。',{exact:true}).waitFor();assert.equal(await page.locator('.delete-reply').count(),0);
 page.once('dialog',d=>d.accept());await page.locator('.delete-post').click();await page.waitForURL('**account.html#forum');
 await page.locator('.forum-post h3 a').click();await page.getByText('帖子不存在、已删除或暂未公开。').waitFor();
 await page.goto('http://127.0.0.1:8765/account.html?lang=en#forum/post-a');await page.getByRole('button',{name:'Publish reply'}).waitFor();
 assert.equal(await page.evaluate(()=>qa.calls.includes('submit_community_post')),false);
 assert.deepEqual(errors,[]);console.log('PASS: author badges, escaped text, retry draft, immediate publication, own reply status, deletion, mobile and English.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
