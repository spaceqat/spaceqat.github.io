/* Public profile fields only. Connection lists are private server-side. */
window.renderSpaceQatSocial=async({client,view,content,t,escape,current})=>{
 const link=id=>'#member/'+encodeURIComponent(id);
 const nameLink=m=>`<a class="member-name-link" href="${link(m.id)}">${escape(m.display_name)}</a>`;
 const profileId=location.hash.split('/')[1]||null;
 const preview=location.hash.split('/')[2]==='preview';
 const failed=()=>{if(!current())return;content.innerHTML=`<h2>${t('暂时无法加载','Unable to load')}</h2><p>${t('请稍后重试。','Please try again.')}</p><button class="social-retry">${t('重试','Retry')}</button>`;content.querySelector('button').onclick=()=>window.renderSpaceQatSocial({client,view,content,t,escape,current});};
 content.innerHTML=`<p role="status">${t('正在加载…','Loading…')}</p>`;
 try{
 if(view==='connections'){
   const kind=profileId==='followers'?'followers':'following';
   content.innerHTML=`<a href="#profile">${t('← 我的空间','← My space')}</a><h1>${kind==='followers'?t('我的粉丝','My followers'):t('我的关注','Following')}</h1><p class="helper">${t('只有你能查看自己的名单，其他会员只能看到数量。','Only you can view your lists. Other members can see counts only.')}</p><div class="social-list"></div><button class="secondary social-more">${t('加载更多','Load more')}</button><p class="social-status" role="status"></p>`;
   await paginate('my_member_connections',{connection_kind:kind},m=>`<article class="social-person"><span class="avatar">${escape(Array.from(m.display_name||'S')[0])}</span><div><h3>${nameLink(m)}</h3><p>${escape(m.bio)||t('还没有填写个人介绍。','No bio yet.')}</p></div></article>`,t('名单还是空的，去论坛认识新朋友吧。','No connections yet. Meet someone in the forum.'));return;
 }
 const result=await client.rpc('community_member_profile',{member_id:profileId});if(!current())return;if(result.error)throw result.error;const m=result.data;
 if(!m){content.innerHTML=`<a href="#forum">${t('← 返回论坛','← Back to forum')}</a><p class="empty">${t('该会员主页不存在或不可访问。','This member profile is unavailable.')}</p>`;return;}
 const owner=m.is_self&&!preview;
 const count=(value,label,kind)=>owner?`<a href="#connections/${kind}"><b>${Number(value)||0}</b> ${label}</a>`:`<span><b>${Number(value)||0}</b> ${label}</span>`;
 content.innerHTML=`<div class="section-heading"><a href="#forum">${t('← 返回论坛','← Back to forum')}</a><span class="helper">${t('访客视角 · 会员主页','Visitor view · Member profile')}</span></div>
 <section class="profile-hero visitor-hero"><div class="identity"><span class="avatar">${escape(Array.from(m.display_name||'S')[0])}</span><div><p class="eyebrow">SPACEQAT / MEMBER</p><h1>${escape(m.display_name)}</h1></div></div><p class="profile-bio">${escape(m.bio)||t('这位伙伴还没有填写个人介绍。','This member has not added a bio yet.')}</p>
 <div class="social-counts">${count(m.following_count,t('关注','Following'),'following')}${count(m.follower_count,t('粉丝','Followers'),'followers')}${!m.is_self?'<button class="follow-button" type="button"></button>':owner?`<a href="#profile">${t('编辑我的资料 ↗','Edit my profile ↗')}</a>`:`<a href="#profile">${t('返回我的空间','Back to my space')}</a>`}</div><p class="follow-status" role="status"></p></section>
 <section class="dashboard-card"><h2>${t('已点亮的徽章','Earned badges')}</h2><div class="showcase-badges visitor-badges">${(m.badges||[]).map(b=>`<div class="showcase-badge earned">${window.spaceqatBadgeArt?.(b.id,true)||''}<strong>${escape(b.name)}</strong></div>`).join('')||`<p class="helper">${t('还没有点亮徽章。','No earned badges yet.')}</p>`}</div></section>
 <section class="dashboard-card"><h2>${t('近期论坛帖子','Recent forum posts')}</h2><p class="helper">${t('仅展示已公开的帖子。','Published posts only.')}</p><div class="social-list"></div><button class="secondary social-more">${t('加载更多','Load more')}</button><p class="social-status" role="status"></p></section>`;
 content.querySelector('.visitor-hero .avatar').dataset.avatarMember=m.id;
 const follow=content.querySelector('.follow-button');
 if(follow){let following=m.is_following===true;const paint=()=>{follow.textContent=following?t('已关注 · 取消关注','Following · Unfollow'):t('＋ 关注','＋ Follow');follow.setAttribute('aria-pressed',String(following));};paint();
 follow.onclick=async()=>{follow.disabled=true;const msg=content.querySelector('.follow-status');msg.textContent='';try{const r=await client.rpc('set_member_follow',{member_id:m.id,following:!following});if(!current())return;if(r.error||typeof r.data!=='boolean')throw new Error('follow');const previous=following;following=r.data;if(previous!==following){m.follower_count=Number(m.follower_count)+(following?1:-1);content.querySelectorAll('.social-counts b')[1].textContent=m.follower_count;}paint();msg.textContent=following?t('已关注这位伙伴。','You are now following this member.'):t('已取消关注。','Unfollowed.');}catch{if(current())msg.textContent=t('操作未完成，请重试。','Unable to update. Please retry.');}finally{follow.disabled=false;}};
 }
 await paginate('community_member_posts',{member_id:m.id},p=>`<article class="social-post"><small>${escape(new Date(p.published_at).toLocaleDateString(document.documentElement.lang))}</small><h3><a href="#forum/${encodeURIComponent(p.id)}">${escape(p.title)}</a></h3><p>${escape(p.body)}</p></article>`,t('暂时没有公开的帖子。','No published posts yet.'));
 }catch{failed();}
 async function paginate(rpc,args,markup,empty){let offset=0;const more=content.querySelector('.social-more'),list=content.querySelector('.social-list'),status=content.querySelector('.social-status');
 const load=async()=>{more.disabled=true;status.textContent='';try{const r=await client.rpc(rpc,{...args,page_offset:offset});if(!current()||!list.isConnected)return;if(r.error||!Array.isArray(r.data))throw new Error('list');list.insertAdjacentHTML('beforeend',r.data.map(markup).join('')||(!offset?`<p class="empty">${empty}</p>`:''));offset+=r.data.length;more.hidden=r.data.length<20;}catch{if(current())status.textContent=t('列表暂时无法加载，请点击重试。','List unavailable. Please retry.');more.textContent=t('重试','Retry');}finally{more.disabled=false;}};more.onclick=load;await load();
 }
};
window.decorateSpaceQatSocial=async({client,content,t,current})=>{
 const section=document.createElement('section');section.className='dashboard-card social-home';content.querySelector('.profile-hero')?.after(section);
 section.innerHTML=`<h2>${t('社区连接','Community connections')}</h2><p role="status">${t('正在加载…','Loading…')}</p>`;
 const load=async()=>{try{const r=await client.rpc('community_member_profile',{member_id:null});if(!current()||!section.isConnected)return;if(r.error||!r.data?.id)throw new Error('profile');const m=r.data;section.innerHTML=`<div class="section-heading"><h2>${t('社区连接','Community connections')}</h2><a href="#member/${encodeURIComponent(m.id)}/preview">${t('查看访客视角 ↗','Preview visitor view ↗')}</a></div><div class="social-counts"><a href="#connections/following"><b>${Number(m.following_count)||0}</b> ${t('关注','Following')}</a><a href="#connections/followers"><b>${Number(m.follower_count)||0}</b> ${t('粉丝','Followers')}</a></div><p class="helper">${t('名单仅自己可见；访客只能看到数量、介绍、徽章和公开帖子。','Lists are private. Visitors see counts, your bio, badges and published posts only.')}</p>`;}catch{if(!current())return;section.innerHTML=`<p>${t('社区连接暂时无法加载。','Connections are unavailable.')}</p><button class="secondary">${t('重试','Retry')}</button>`;section.querySelector('button').onclick=load;}};await load();
};
