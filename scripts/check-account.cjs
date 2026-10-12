const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 const faults=[];page.on('pageerror',e=>faults.push(e.message));
 // Read-only real-service smoke check. Does not register accounts or send mail.
 await page.goto('http://127.0.0.1:8765/account.html');
 await page.locator('#auth').waitFor({timeout:30000});
 assert.equal(await page.locator('input[name=email]').count(),1);
 console.log('PASS: real SDK loaded and signed-out page initialized.');
 const result=await page.request.get('https://hvwsqebpeabfnndoxmwh.supabase.co/auth/v1/settings',{headers:{apikey:'sb_publishable_NfSbd12D_UQwwPfnAPVKIw_CKyxv0-Y'}});
 assert.equal(result.status(),200);console.log('PASS: public project key accepted by Auth settings endpoint.');
 const settings=await result.json();console.log('Auth settings:',JSON.stringify({emailEnabled:settings.external?.email,signupDisabled:settings.disable_signup,emailAutoconfirm:settings.mailer_autoconfirm}));
 // Mock service responses test UI branches only, NOT cloud authorization or delivery.
 await page.route('https://hvwsqebpeabfnndoxmwh.supabase.co/**',route=>route.abort());
 await page.route('**/supabase.js',route=>route.fulfill({contentType:'application/javascript',body:`
 const member={id:'test-id',email:'test@example.invalid'};let current=location.hash.includes('type=recovery')?{user:member}:null;
 window.calls=[];window.supabase={createClient:()=>({auth:{
 onAuthStateChange:()=>{},getSession:async()=>({data:{session:current}}),
 signUp:async args=>{calls.push(['signup',args]);return {data:{session:null},error:null}},
 signInWithPassword:async args=>{calls.push(['login',args]);current={user:member};return {data:current,error:null}},
 resetPasswordForEmail:async()=>{calls.push(['reset']);return {error:null}},resend:async()=>{calls.push(['resend']);return {error:null}},
 updateUser:async()=>{calls.push(['password']);return {error:null}},signOut:async()=>{current=null;return {error:null}}
 },from:()=>({select:()=>({eq:()=>({single:async()=>location.search.includes('profile_missing=1')?{data:null,error:{code:'PGRST205'}}:{data:{display_name:'Test member',bio:'',points:0},error:null}})}),update:args=>({eq:async()=>{calls.push(['profile',args]);return {error:null}}})})})};` }));
 await page.goto('http://127.0.0.1:8765/account.html#signup');
 await page.reload();
 await page.locator('[name=name]').fill('测试会员');await page.locator('[name=email]').fill('test@example.invalid');await page.locator('[name=password]').fill('Test-password-123');await page.locator('#auth button').click();
 await page.getByText('请求已提交。',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>calls[0][1].options.data.display_name),'测试会员');
 await page.locator('a[href="#login"]').click();await page.getByRole('heading',{name:'欢迎回来'}).waitFor();await page.locator('[name=email]').fill('test@example.invalid');await page.locator('[name=password]').fill('Test-password-123');await page.locator('#auth button').click();
 await page.locator('#profile').waitFor();await page.locator('[name=display_name]').fill('新名字');await page.locator('#profile button').click();await page.getByText('资料已保存。',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>Object.keys(calls.find(c=>c[0]==='profile')[1]).sort()),['bio','display_name']);
 await page.locator('#logout').click();await page.locator('#auth').waitFor();
 for(const [route,title] of [['forgot','找回密码'],['resend','重发验证邮件']]){
   await page.locator('a[href="#'+route+'"]').click();await page.getByRole('heading',{name:title}).waitFor();
   await page.locator('[name=email]').fill('test@example.invalid');await page.locator('#auth button').click();await page.getByText('请求已提交。',{exact:false}).waitFor();
 }
 await page.goto('http://127.0.0.1:8765/account.html#type=recovery');await page.reload();
 await page.getByRole('heading',{name:'设置新密码'}).waitFor();
 await page.locator('[name=password]').fill('New-password-123');await page.locator('[name=confirm]').fill('Other-password-123');await page.locator('#auth button').click();await page.getByText('两次密码不一致。',{exact:true}).waitFor();
 await page.locator('[name=confirm]').fill('New-password-123');await page.locator('#auth button').click();await page.getByText('密码已更新，请重新登录。',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='password').length),1);
 await page.goto('http://127.0.0.1:8765/account.html?profile_missing=1#login');
 await page.getByRole('heading',{name:'欢迎回来'}).waitFor();
 await page.locator('[name=email]').fill('test@example.invalid');await page.locator('[name=password]').fill('Test-password-123');await page.locator('#auth button').click();
 await page.getByText('会员档案尚未启用，管理员需要完成数据库初始化。账号已经创建，无需重复注册。').waitFor();
 assert.equal(await page.getByText('正在读取资料…').count(),0);
 for(const lang of ['', '?lang=en'])for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:950});await page.goto('http://127.0.0.1:8765/account.html'+lang+'#signup');await page.locator('#auth').waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'overflow '+lang+width);
 }
 await page.screenshot({path:'C:/Users/Administrator/AppData/Local/Temp/spaceqat-account-mobile.png',fullPage:true});
 assert.deepEqual(faults,[]);
 console.log('PASS: mocked signup, login, profile edit, logout; Chinese/English layouts at 4 widths. Cloud registration, RLS, recovery and mail delivery still require setup and end-to-end testing.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
