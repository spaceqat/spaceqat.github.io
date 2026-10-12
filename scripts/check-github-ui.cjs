const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',r=>r.abort());
 await page.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:`
 const user={id:'member-1',email:'test@example.invalid'};window.calls=[];window.testRole=new URLSearchParams(location.search).get('test_role')||'member';window.linked=false;
 const rows={member_profiles:[{id:user.id,display_name:'测试会员',bio:'开源与好奇心',points:0}],badge_catalog:[{id:'L0',name:'好奇猫',sort_order:0}],member_badges:[],contribution_rules:[],community_audit:[],github_sync_state:[{id:true,page:1,completed_at:null,last_error:null}],github_contributions:[{id:'pending-1',user_id:'member-2',github_login:'other',pr_number:12,title:'待核验的 FatQat 修复',merged_at:'2026-10-01T00:00:00Z',created_at:'2026-10-02T00:00:00Z',status:'pending',route:'T',points:0,review_note:''}]};
 function query(table){let data=rows[table]||[];const q={select:()=>q,eq:(k,v)=>{data=data.filter(r=>r[k]===v);return q},order:()=>q,limit:()=>q,single:async()=>({data:data[0],error:null}),then:(a,b)=>Promise.resolve({data,error:null}).then(a,b)};return q;}
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user}}}),onAuthStateChange:()=>{},linkIdentity:async args=>{calls.push(['linkIdentity',args]);return {data:{},error:null}}},from:query,functions:{invoke:async()=>({data:{imported:1,next_page:2},error:null})},rpc:async(name,args)=>{
 calls.push([name,args]);if(name==='my_community_permissions')return {data:{admin:testRole==='admin',forum:['admin','forum'].includes(testRole),contributions:['admin','reviewer'].includes(testRole)},error:null};
 if(name==='sync_my_github_identity')return {data:linked?{login:'test-github',github_id:'123'}:null,error:null};
 if(name==='my_contribution_summary')return {data:{count:0,span_days:0,recent:[]},error:null};
 if(name==='admin_member_access')return {data:{name:'目标会员',points:0,roles:[],forum:false,badges:[]},error:null};
 if(name==='review_github_contribution'){const item=rows.github_contributions.find(c=>c.id===args.item);item.status=args.decision;item.points=args.award_points;item.review_note=args.note;return {error:null};}
 if(name==='admin_reverse_contribution'){rows.github_contributions.find(c=>c.id===args.item).status='reversed';return {error:null};}
 if(name==='admin_set_contribution_rule'){rows.contribution_rules.push({label:args.rule_label,route:args.rule_route,points:args.rule_points,description:args.rule_description,enabled:args.rule_enabled});return {error:null};}
 return {data:null,error:null};}})};
 `}));
 const go=async(route,role='member',en=false)=>{await page.goto('http://127.0.0.1:8765/account.html?test_role='+role+(en?'&lang=en':'')+'#'+route);};
 await go('contributions');await page.locator('#link-github').click();assert.equal(await page.evaluate(()=>calls.find(c=>c[0]==='linkIdentity')[1].provider),'github');
 await page.reload();await page.locator('#link-github').waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('spaceqat-github-link-user')),null);
 assert.equal(await page.locator('[data-staff]').count(),0);
 await go('admin');await page.getByText('此页面仅向社区管理员开放。').waitFor();
 await go('contribution-review');await page.getByText('此页面仅向贡献审核员开放。').waitFor();
 await go('admin','admin');await page.locator('#role-form').waitFor();await page.locator('[data-staff=admin]').waitFor();
 await page.locator('#member-lookup [name=email]').fill('target@example.invalid');await page.locator('#member-lookup button').click();await page.locator('#member-access').filter({hasText:'目标会员'}).waitFor();
 await page.locator('#role-form [name=email]').fill('target@example.invalid');await page.locator('#role-form [name=role]').selectOption('forum_reviewer');await page.locator('#role-form [name=reason]').fill('负责社区稿件审核');await page.locator('#role-form button').click();assert.equal(await page.evaluate(()=>calls.find(c=>c[0]==='admin_set_member_role')[1].role_name),'forum_reviewer');
 await page.locator('#badge-form [name=email]').fill('target@example.invalid');await page.locator('#badge-form [name=reason]').fill('已核验参与约定');await page.locator('#badge-form button').click();await page.getByText('徽章认证已保存。').waitFor();
 await page.locator('#rule-form [name=label]').fill('spaceqat:test');await page.locator('#rule-form [name=points]').fill('40');await page.locator('#rule-form [name=description]').fill('测试规则，不用于生产');await page.locator('#rule-form button').click();await page.getByText('规则已保存。').waitFor();
 await page.locator('#sync-github').click();await page.getByText('本批已同步 1 项贡献，下次从第 2 批继续。').waitFor();
 await page.screenshot({path:'C:/Users/Administrator/AppData/Local/Temp/spaceqat-admin-workspace.png',fullPage:true});
 await go('contribution-review','admin');await page.locator('.contribution-review [name=points]').fill('40');await page.locator('.contribution-review [name=reason]').fill('已核验 PR 与贡献证据');await page.locator('.contribution-review button[value=approved]').click();await page.getByText('贡献审核已保存。').waitFor();
 await page.locator('#contribution-filter').selectOption('approved');await page.locator('.contribution-item details summary').click();await page.locator('.contribution-reverse [name=reason]').fill('重复成果，撤销这笔积分');await page.locator('.contribution-reverse button').click();await page.getByText('积分已撤销，原记录保留。').waitFor();
 await go('profile','admin');await page.locator('#github-count').filter({hasText:'0'}).waitFor();
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});for(const route of ['admin','contributions','contribution-review']){await go(route,'admin',true);await page.locator(route==='admin'?'#role-form':route==='contributions'?'#link-github':'#contribution-filter').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+route+' '+width);}}
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: GitHub bind request, role-gated navigation/screens, member lookup, role/badge/rule forms, sync, contribution approval/reversal, real summary and English desktop/mobile layouts (mock service).');
})().catch(e=>{console.error(e);process.exit(1)});
