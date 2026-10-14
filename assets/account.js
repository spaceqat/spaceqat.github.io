/* Public project identifier only. Never add a service_role/secret key here. */
(() => {
  'use strict';
  const en = new URLSearchParams(location.search).get('lang') === 'en';
  const t = (zh, english) => en ? english : zh;
  const content = document.querySelector('#content');
  const message = document.querySelector('#message');
  const say = (text, error=false) => { message.textContent=text;message.classList.toggle('error',error); };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.documentElement.lang=en?'en':'zh-CN';
  document.querySelector('#heading').textContent=t('你的开放空间。','Your open space.');
  document.querySelector('#subtitle').textContent=t('从一次连接开始，让每一份贡献被看见。','Connect with the community. Make your contributions count.');
  document.querySelector('#home').textContent=t('返回官网','Back to website');
  document.querySelector('#home').href=en?'en.html?v=community-2':'index.html?v=community-2';
  document.querySelector('#language').textContent=en?'中文':'EN';
  document.querySelector('#language').href=en?'account.html':'account.html?lang=en';
  document.querySelector('#privacy').textContent=t('邮箱用于验证身份和账号恢复，不在个人资料中公开。','Your email is used for verification and account recovery, not displayed in your profile.');
  if (!window.supabase) { content.textContent=t('账号服务未能加载，请检查网络后刷新。','Unable to load authentication. Check your connection and reload.');return; }
  const client=window.spaceqatClient;
  const tabs=document.createElement('nav');tabs.className='member-tabs';tabs.hidden=true;tabs.setAttribute('aria-label',t('个人空间导航','Personal space navigation'));
  tabs.innerHTML=`<p class="sidebar-label">YOUR OPEN SPACE</p>`+[['profile',t('我的空间','My space')],['badges',t('徽章收藏','Badges')],['forum',t('社区论坛','Forum')],['submissions',t('我的投稿','My posts')]].map(([id,label],i)=>`<a href="#${id}"><span>${['◇','♧','☷','↗'][i]} ${label}</span><small>0${i+1}</small></a>`).join('')+`<div class="sidebar-note"><span>✦</span><p>${t('每一份贡献，<br>都值得被看见。','Every contribution<br>deserves to be seen.')}</p><small>${t('开放每一面，<br>叠加无限可能。','Open every side.<br>Explore every possibility.')}</small></div>`;
  document.querySelector('main').before(tabs);
  const contributionLink=document.createElement('a');contributionLink.href='#contributions';contributionLink.innerHTML=`<span>⌘ ${t('开源贡献','Contributions')}</span><small>05</small>`;tabs.querySelector('.sidebar-note').before(contributionLink);
  const campusDirectory=document.createElement('a');campusDirectory.href='campus.html'+(en?'?lang=en':'');campusDirectory.innerHTML=`<span>⌂ ${t('校园空间','Campus spaces')}</span><small>06</small>`;tabs.querySelector('.sidebar-note').before(campusDirectory);
  async function refreshStaffNavigation(ticket){
    for(const a of tabs.querySelectorAll('[data-staff]'))a.remove();
    if(!user||recovery)return;
    try{
      const permissions=await client.rpc('my_community_permissions');
      let p=permissions.data;
      if(permissions.error){const legacy=await client.rpc('community_can_review');p={forum:legacy.data===true};}
      if(ticket!==revision)return;
      if(p?.admin){const a=document.createElement('a');a.dataset.staff='admin';a.href='#campus-review';a.textContent=t('▦ 校园大使审核','▦ Campus applications');tabs.querySelector('.sidebar-note').before(a);}
      for(const [flag,hash,label] of [['forum','moderation',t('论坛审核台','Forum review')],['contributions','contribution-review',t('贡献审核台','Contribution review')],['admin','admin',t('社区管理台','Administration')],['admin','mini-grant-review',t('迷你基金申请','Mini grant applications')]]){
        if(!p?.[flag])continue;const a=document.createElement('a');a.dataset.staff=flag;a.href='#'+hash;a.textContent='▦ '+label;a.setAttribute('aria-current',location.hash===a.hash?'page':'false');tabs.querySelector('.sidebar-note').before(a);
      }
    }catch{/* Missing optional permissions never prevent sign-in. */}
  }
  const recoveryAtStart=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
  const callbackError=new URLSearchParams(location.hash.slice(1)).get('error_description');
  let recovery=recoveryAtStart, user=null, revision=0, authBusy=false;
  const callback=new URL('account.html',location.href);callback.search=en?'?lang=en':'';callback.hash='';
  const field=(name,label,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
  const password=()=>field('password',t('密码（至少 12 位）','Password (at least 12 characters)'),'password','minlength="12" maxlength="128" autocomplete="new-password"');
  const email=()=>field('email',t('邮箱','Email'),'email','autocomplete="email" maxlength="254"');
  const errors=e=>({invalid_credentials:t('邮箱或密码不正确。','Incorrect email or password.'),email_not_confirmed:t('请先验证邮箱，可点击“重发验证邮件”。','Please verify your email first. You can resend the confirmation.'),over_email_send_rate_limit:t('邮件发送过于频繁，请稍后重试。','Too many email requests. Please try again later.'),weak_password:t('密码强度不足，请使用更长、更复杂的密码。','Please use a stronger password.')}[e.code] || t('操作未完成，请稍后重试；若持续出现，请联系 spaceqat@163.com。','Unable to complete the request. Try again or contact spaceqat@163.com.'));
  async function render(){
    const ticket=++revision;
    say('');
    tabs.hidden=!(user&&!recovery);
    document.querySelector('main').classList.toggle('member-space',!!user&&!recovery);
    document.body.classList.toggle('signed-in',!!user&&!recovery);
    void refreshStaffNavigation(ticket);
    const view=location.hash.slice(1).split('/')[0];
    const activeView=view==='member'?'forum':['badges','forum','submissions','moderation','contributions','contribution-review','admin'].includes(view)?view:'profile';
    document.querySelector('#language').href=(en?'account.html':'account.html?lang=en')+(['member','connections','forum'].includes(view)?location.hash:'');
    for(const a of tabs.querySelectorAll('a'))a.setAttribute('aria-current',a.hash==='#'+activeView?'page':'false');
    if(user&&!recovery&&view==='agreement'){await window.spaceqatAgreement.render({client,content,t,current:()=>ticket===revision});return;}
    if(!recovery&&(view==='campus-verify'||(user&&['campus-apply','campus-review'].includes(view)))){for(const a of tabs.querySelectorAll('a'))a.setAttribute('aria-current',a.hash==='#'+(view==='campus-apply'?'profile':view)?'page':'false');await window.renderSpaceQatCampus({client,user,view,content,t,escape,current:()=>ticket===revision});return;}
    if(user&&!recovery&&['mini-grant','mini-grant-review'].includes(view)){await window.renderSpaceQatGrants({client,user,view,content,t,escape,current:()=>ticket===revision});return;}
    if(user&&!recovery&&view==='security'){await window.renderSpaceQatSecurity({client,user,content,t,escape,current:()=>ticket===revision,onUserUpdate:updated=>{if(ticket===revision&&updated.id===user?.id)user=updated;}});return;}
    if(user&&!recovery&&['member','connections'].includes(view)){await window.renderSpaceQatSocial({client,view,content,t,escape,current:()=>ticket===revision});return;}
    if(user&&!recovery&&['contributions','contribution-review','admin'].includes(view)){
      await window.renderSpaceQatContributions({client,user,view,content,t,escape,say,current:()=>ticket===revision});return;
    }
    if(user&&!recovery&&['badges','forum','submissions','moderation'].includes(view)){
      await window.renderSpaceQatCommunity({client,user,view,content,t,escape,say,current:()=>ticket===revision});
      return;
    }
    if(user && !recovery){
      content.innerHTML=`<h2>${t('我的会员资料','My profile')}</h2><p class="email">${escape(user.email)}</p><p>${t('正在读取资料…','Loading profile…')}</p><button id="logout">${t('退出登录','Sign out')}</button>`;
      document.querySelector('#logout').onclick=logout;
      const {data,error}=await client.from('member_profiles').select('*').eq('id',user.id).single();
      if(ticket!==revision)return;
      if(error){
        const missing=error.code==='PGRST205';
        content.innerHTML=`<h2>${t('账号已登录','Signed in')}</h2><p class="email">${escape(user.email)}</p><p>${missing?t('会员档案尚未启用，管理员需要完成数据库初始化。账号已经创建，无需重复注册。','Member profiles are not yet enabled. An administrator needs to initialize the database. Your account is created; do not sign up again.'):t('暂时无法读取会员档案，请稍后刷新重试。','Unable to load your profile right now. Please try refreshing later.')}</p><button id="logout">${t('退出登录','Sign out')}</button>`;
        document.querySelector('#logout').onclick=logout;
        return;
      }
      content.innerHTML=`<h2>${t('我的会员资料','My profile')}</h2><p class="email">${escape(user.email)}</p><form id="profile">${field('display_name',t('用户名','Display name'),'text',`maxlength="40" value="${escape(data.display_name)}"`)}<label>${t('个人介绍','Bio')}<textarea name="bio" maxlength="500">${escape(data.bio)}</textarea></label><button>${t('保存资料','Save profile')}</button></form><div class="stats">${t('贡献积分','Contribution points')}: ${Number(data.points)||0}<div class="links"><a href="#badges">${t('查看我的徽章 ↗','View my badges ↗')}</a><a href="#forum">${t('进入社区论坛 ↗','Explore the forum ↗')}</a></div></div><button class="secondary" id="logout">${t('退出登录','Sign out')}</button>`;
      document.querySelector('#logout').onclick=logout;
      document.querySelector('#profile').onsubmit=e=>run(e,async f=>{const name=f.get('display_name').trim();if(!name)throw new Error('name');const {error}=await client.from('member_profiles').update({display_name:name,bio:f.get('bio').trim()}).eq('id',user.id);if(error)throw error;say(t('资料已保存。','Profile saved.'));});
      await window.decorateSpaceQatProfile({client,user,data,content,t,escape,current:()=>ticket===revision});
      if(ticket===revision)window.mountSpaceQatAvatar?.({client,user,data,content,t,current:()=>ticket===revision});
      if(ticket===revision){const entry=document.createElement('section');entry.className='dashboard-card';entry.innerHTML=`<h2>${t('把好奇心带到校园','Bring curiosity to campus')}</h2><p>${t('申请成为量立方校园大使：填写资料、阅读守则并签署，等待社区审核。','Apply to become a SpaceQat campus ambassador: complete your details, read and sign the code, then await review.')}</p><a href="#campus-apply">${t('申请校园大使 ↗','Apply as a campus ambassador ↗')}</a>`;content.querySelector('.profile-hero')?.after(entry);}
      if(ticket===revision){const security=document.createElement('a');security.href='#security';security.className='dashboard-action';security.textContent=t('账号安全 · 更换邮箱 ↗','Account security · Change email ↗');content.querySelector('.dashboard-signout')?.prepend(security);content.querySelector('#profile-editor .email')?.after(security.cloneNode(true));}
      if(ticket===revision)await window.decorateSpaceQatSocial({client,content,t,current:()=>ticket===revision});
      if(ticket===revision)void window.decorateSpaceQatCampus?.({client,user,content,t,current:()=>ticket===revision});
      return;
    }
    const mode=recovery&&user?'password':(['signup','forgot','resend'].includes(location.hash.slice(1))?location.hash.slice(1):'login');
    const titles={login:t('欢迎回来','Welcome back'),signup:t('创建账号','Create an account'),forgot:t('找回密码','Reset your password'),resend:t('重发验证邮件','Resend confirmation'),password:t('设置新密码','Set a new password')};
    content.innerHTML=`<h2>${titles[mode]}</h2><form id="auth">${mode==='signup'?field('name',t('用户名','Display name'),'text','maxlength="40" autocomplete="nickname"'):''}${mode==='password'?'':email()}${mode==='login'?field('password',t('密码','Password'),'password','autocomplete="current-password"'):['signup','password'].includes(mode)?password():''}${mode==='password'?field('confirm',t('确认新密码','Confirm new password'),'password','minlength="12" autocomplete="new-password"'):''}<button>${titles[mode]}</button></form><div class="links"><a href="#login">${t('登录','Sign in')}</a><a href="#signup">${t('注册账号','Create account')}</a><a href="#forgot">${t('忘记密码','Forgot password')}</a><a href="#resend">${t('重发验证邮件','Resend confirmation')}</a></div>`;
    document.querySelector('#auth').onsubmit=e=>run(e,async f=>{
      const address=String(f.get('email')||'').trim();let result;
      if(mode==='login')result=await client.auth.signInWithPassword({email:address,password:f.get('password')});
      if(mode==='signup'){
        if(!f.get('name').trim()){say(t('请输入用户名。','Enter a display name.'),true);return;}
        result=await client.auth.signUp({email:address,password:f.get('password'),options:{emailRedirectTo:callback.href,data:{display_name:f.get('name').trim()}}});
      }
      if(mode==='forgot')result=await client.auth.resetPasswordForEmail(address,{redirectTo:callback.href});
      if(mode==='resend')result=await client.auth.resend({type:'signup',email:address,options:{emailRedirectTo:callback.href}});
      if(mode==='password'){
        if(f.get('password')!==f.get('confirm')){say(t('两次密码不一致。','Passwords do not match.'),true);return;}
        result=await client.auth.updateUser({password:f.get('password')});
      }
      if(result.error)throw result.error;
      if(mode==='password'){recovery=false;await client.auth.signOut();user=null;history.replaceState(null,'',callback.href+'#login');await render();say(t('密码已更新，请重新登录。','Password updated. Please sign in again.'));}
      else if(mode==='login'||result.data?.session){user=result.data.user;await render();}
      else say(t('请求已提交。如该邮箱符合条件，将收到邮件。请检查收件箱和垃圾邮件，按邮件指引继续。','Request submitted. If eligible, this address will receive an email. Check your inbox and spam folder to continue.'));
    });
  }
  async function run(event,action){event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;authBusy=true;say('');try{await action(new FormData(form));}catch(e){say(errors(e),true);}finally{button.disabled=false;authBusy=false;}}
  async function logout(){authBusy=true;try{const {error}=await client.auth.signOut();if(error){say(errors(error),true);return;}user=null;recovery=false;await render();}catch(e){say(errors(e),true);}finally{authBusy=false;}}
  client.auth.onAuthStateChange((event,session)=>{const previous=user?.id;user=session?.user||null;if(event==='PASSWORD_RECOVERY')recovery=true;if(event==='SIGNED_OUT')recovery=false;if(!authBusy&&(previous!==user?.id||event==='PASSWORD_RECOVERY')&&['SIGNED_OUT','SIGNED_IN','PASSWORD_RECOVERY'].includes(event))setTimeout(()=>render(),0);});
  window.addEventListener('hashchange',()=>{if(!location.hash.includes('access_token'))render();});
  (async()=>{try{const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;if(location.hash.includes('access_token')||callbackError)history.replaceState(null,'',callback.href);const linking=sessionStorage.getItem('spaceqat-github-link-user');if(linking){sessionStorage.removeItem('spaceqat-github-link-user');if(!callbackError&&linking===user?.id)history.replaceState(null,'',callback.href+'#contributions');}await render();if(callbackError)say(t('验证链接未能完成，请重新尝试邮件验证或 GitHub 授权。','Verification could not be completed. Please retry email verification or GitHub authorization.'),true);}catch(e){content.textContent=t('账号服务暂时不可用，请刷新重试。','Authentication is temporarily unavailable. Please reload.');}})();
})();
