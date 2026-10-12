/* Real member data only. All writes are checked by Supabase RPC permissions. */
window.renderSpaceQatCommunity=async ({client,user,view,content,t,escape,say,current})=>{
  const headings={badges:t('我的徽章','My badges'),forum:t('社区论坛','Community forum'),submissions:t('我的投稿','My posts'),moderation:t('投稿审核','Review submissions')};
  const categories={help:t('提问与互助','Questions & help'),fatqat:t('FatQat 开源','FatQat open source'),campus:t('校园交流','Campus'),knowledge:t('知识与作品','Knowledge & projects'),community:t('社区公告','Announcements')};
  const status=s=>({pending:t('待审核','Pending review'),published:t('已发布','Published'),rejected:t('未通过','Not approved')})[s]||s;
  const date=value=>new Date(value).toLocaleDateString(document.documentElement.lang);
  const failure=()=>{content.innerHTML=`<h2>${headings[view]}</h2><p class="empty">${t('这个板块暂时无法加载，请稍后重试。','This section is currently unavailable. Please try again later.')}</p><button id="retry-community">${t('重新加载','Retry')}</button>`;content.querySelector('button').onclick=()=>window.renderSpaceQatCommunity({client,user,view,content,t,escape,say,current});};
  const tags=badges=>(badges||[]).map(b=>`<span class="badge-tag">${escape(b.name)}</span>`).join('');
  const post=p=>`<article class="forum-post"><div class="post-meta">${escape(categories[p.category]||p.category)} · ${escape(date(p.published_at||p.created_at))}${p.status?' · '+escape(status(p.status)):''}</div><h3>${escape(p.title)}</h3>${p.author_name?`<div class="post-author">${escape(p.author_name)} ${tags(p.badges)}</div>`:''}<p class="post-body">${escape(p.body)}</p>${p.review_note?`<p class="review-note">${t('审核意见：','Review note: ')}${escape(p.review_note)}</p>`:''}</article>`;
  const act=async(button,fn)=>{button.disabled=true;say('');try{await fn();}catch(e){say(e.code==='P0001'?t('提交过于频繁，请稍后再试。','Please wait before submitting again.'):t('操作未完成，请刷新后重试。','Unable to complete the action. Please reload and try again.'),true);}finally{button.disabled=false;}};
  content.innerHTML=`<h2>${headings[view]}</h2><p>${t('正在加载…','Loading…')}</p>`;
  try{
    if(view==='badges'){
      const [catalog,owned]=await Promise.all([client.from('badge_catalog').select('*').order('sort_order'),client.from('member_badges').select('badge_id,granted_at').eq('user_id',user.id)]);
      if(!current())return;if(catalog.error||owned.error){failure();return;}
      const awards=new Map(owned.data.map(b=>[b.badge_id,b.granted_at]));
      content.innerHTML=`<h2>${headings.badges}</h2><p>${t('已点亮','Earned')} ${awards.size} ${t('枚。贡献经社区确认后，徽章会在这里点亮。','badges. Badges appear here after your contributions are verified.')}</p><div class="badge-grid">${catalog.data.map(b=>`<article class="real-badge ${awards.has(b.id)?'earned':'locked'}">${window.spaceqatBadgeArt(b.id,awards.has(b.id))}<small>${escape(b.category)}</small><h3>${escape(b.name)}</h3><p>${escape(b.description)}</p><strong>${awards.has(b.id)?t('已点亮 · ','Earned · ')+escape(date(awards.get(b.id))):t('尚未点亮','Not yet earned')}</strong></article>`).join('')}</div>${catalog.data.length?'':`<p class="empty">${t('徽章目录正在准备中。','The badge catalog is being prepared.')}</p>`}`;
      return;
    }
    if(view==='forum'){
      const [feed,role]=await Promise.all([client.rpc('community_feed',{page_offset:0}),client.rpc('community_can_review')]);
      if(!current())return;if(feed.error){failure();return;}
      content.innerHTML=`<div class="section-heading"><h2>${headings.forum}</h2>${role.data===true?`<a href="#moderation">${t('审核投稿 ↗','Review submissions ↗')}</a>`:''}</div><details class="post-compose"><summary>${t('＋ 发布帖子','＋ Write a post')}</summary><p>${t('提问与互助、FatQat 开源、校园交流可直接发布；知识与作品、社区公告审核通过后发布。帖子会展示你的用户名与已获得的徽章。','Questions & help, FatQat open source and Campus publish immediately. Knowledge & projects and Announcements require review. Posts display your username and earned badges.')}</p><form id="post-form"><label>${t('标题','Title')}<input name="title" minlength="3" maxlength="160" required></label><label>${t('分类','Category')}<select name="category">${Object.entries(categories).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>${t('正文','Body')}<textarea name="body" minlength="10" maxlength="20000" required></textarea></label><p id="publication-hint" class="helper" aria-live="polite"></p><button>${t('直接发布','Publish now')}</button></form></details><div id="feed">${feed.data.map(post).join('')||`<p class="empty">${t('还没有已发布的帖子。欢迎提交第一篇分享。','No published posts yet. Be the first to submit a post.')}</p>`}</div><button id="more-posts" class="secondary" ${feed.data.length<20?'hidden':''}>${t('加载更多','Load more')}</button>`;
      const compose=content.querySelector('#post-form');
      const updatePolicy=()=>{const review=['knowledge','community'].includes(compose.elements.category.value);compose.querySelector('button').textContent=review?t('提交审核','Submit for review'):t('直接发布','Publish now');content.querySelector('#publication-hint').textContent=review?t('此板块的帖子审核通过后公开。','Posts in this category are published after review.'):t('此板块的帖子提交后直接公开。','Posts in this category are published immediately.');};
      compose.elements.category.onchange=updatePolicy;updatePolicy();
      let offset=20;
      document.querySelector('#more-posts').onclick=e=>act(e.currentTarget,async()=>{const {data,error}=await client.rpc('community_feed',{page_offset:offset});if(error)throw error;if(!current())return;offset+=data.length;document.querySelector('#feed').insertAdjacentHTML('beforeend',data.map(post).join(''));e.target.hidden=data.length<20;});
      document.querySelector('#post-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);act(form.querySelector('button'),async()=>{
        const {data:postId,error}=await client.rpc('submit_community_post',{post_title:f.get('title').trim(),post_body:f.get('body').trim(),post_category:f.get('category')});if(error)throw error;
        if(!current())return;
        const saved=await client.from('community_posts').select('status').eq('id',postId).single();
        if(!current())return;
        if(saved.error||!saved.data){say(t('帖子已提交，可在“我的投稿”查看发布状态。','Post submitted. Check My posts for its publication status.'));return;}
        if(saved.data.status==='published'){await window.renderSpaceQatCommunity({client,user,view,content,t,escape,say,current});if(current())say(t('帖子已发布，现在可以在社区论坛查看。','Your post is published and visible in the forum.'));}
        else {form.reset();updatePolicy();say(t('投稿已提交，审核通过后会显示在论坛。可在“我的投稿”查看状态。','Submitted for review. Track its status in My posts.'));}
      });};
      return;
    }
    const reviewing=view==='moderation';
    if(reviewing){const role=await client.rpc('community_can_review');if(!current())return;if(role.error||role.data!==true){content.innerHTML=`<h2>${headings.moderation}</h2><p>${t('此页面仅向社区审核员开放。','This page is available to community reviewers only.')}</p>`;return;}}
    let query=client.from('community_posts').select('id,title,body,category,status,created_at,review_note,author_id').order('created_at',{ascending:false}).limit(100);
    query=reviewing?query.eq('status','pending'):query.eq('author_id',user.id);
    const {data,error}=await query;if(!current())return;if(error){failure();return;}
    content.innerHTML=`<h2>${headings[view]}</h2><p>${t('显示最近 100 条投稿。','Showing the latest 100 submissions.')}</p>${data.map(p=>post(p)+(reviewing&&p.author_id!==user.id?`<form class="review-form" data-id="${escape(p.id)}"><label>${t('审核意见（不通过时必填）','Review note (required when declining)')}<textarea name="note" maxlength="1000"></textarea></label><div class="links"><button value="published">${t('通过并发布','Approve and publish')}</button><button class="secondary" value="rejected">${t('不通过','Decline')}</button></div></form>`:reviewing?`<p>${t('自己的投稿需由其他审核员处理。','Another reviewer must review your own post.')}</p>`:'')).join('')||`<p class="empty">${t('暂无投稿。','No submissions yet.')}</p>`}`;
    for(const form of content.querySelectorAll('.review-form'))form.onsubmit=e=>{e.preventDefault();const decision=e.submitter.value;const note=new FormData(form).get('note').trim();if(decision==='rejected'&&!note){say(t('请填写未通过的原因。','Please provide a reason.'),true);return;}act(e.submitter,async()=>{const {error}=await client.rpc('review_community_post',{post_id:form.dataset.id,decision,note});if(error)throw error;if(!current())return;await window.renderSpaceQatCommunity({client,user,view,content,t,escape,say,current});say(t('审核结果已保存。','Review saved.'));});};
  }catch{if(current())failure();}
};
