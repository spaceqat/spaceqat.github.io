/* Real member data only. All writes are checked by Supabase RPC permissions. */
window.renderSpaceQatCommunity=async ({client,user,view,content,t,escape,say,current})=>{
  const headings={badges:t('我的徽章','My badges'),forum:t('社区论坛','Community forum'),submissions:t('我的投稿','My posts'),moderation:t('投稿审核','Review submissions')};
  const categories={help:t('提问与互助','Questions & help'),fatqat:t('FatQat 开源','FatQat open source'),campus:t('校园交流','Campus'),knowledge:t('知识与作品','Knowledge & projects'),community:t('社区公告','Announcements'),event:t('活动','Events')};
  const status=s=>({pending:t('待审核','Pending review'),published:t('已发布','Published'),rejected:t('未通过','Not approved')})[s]||s;
  const date=value=>new Date(value).toLocaleDateString(document.documentElement.lang);
  const failure=()=>{content.innerHTML=`<h2>${headings[view]}</h2><p class="empty">${t('这个板块暂时无法加载，请稍后重试。','This section is currently unavailable. Please try again later.')}</p><button id="retry-community">${t('重新加载','Retry')}</button>`;content.querySelector('button').onclick=()=>window.renderSpaceQatCommunity({client,user,view,content,t,escape,say,current});};
  const tags=badges=>(badges||[]).map(b=>`<span class="badge-tag">${escape(b.name)}</span>`).join('');
  const author=p=>p.author_profile_id?`<a class="member-name-link" href="#member/${encodeURIComponent(p.author_profile_id)}">${escape(p.author_name)}</a>`:escape(p.author_name);
  const post=p=>`<article class="forum-post" data-post-id="${escape(p.id)}"><div class="post-meta">${escape(categories[p.category]||p.category)} · ${escape(date(p.published_at||p.created_at))}${p.status?' · '+escape(status(p.status)):''}</div><h3>${escape(p.title)}</h3>${p.author_name?`<div class="post-author"><strong>${author(p)}</strong> ${tags(p.badges)}</div>`:''}<p class="post-body">${escape(p.body)}</p>${p.review_note?`<p class="review-note">${t('审核意见：','Review note: ')}${escape(p.review_note)}</p>`:''}${view==='forum'?`<button type="button" class="secondary reply-toggle" aria-expanded="false">${t('查看讨论 / 回复','Discussion / Reply')}</button><section class="reply-thread" hidden aria-label="${t('帖子回复','Post replies')}"></section>`:''}</article>`;
  const act=async(button,fn)=>{button.disabled=true;say('');try{await fn();}catch(e){say(e.code==='P0001'?t('提交过于频繁，请稍后再试。','Please wait before submitting again.'):t('操作未完成，请刷新后重试。','Unable to complete the action. Please reload and try again.'),true);}finally{button.disabled=false;}};
  const replyMarkup=r=>`<article class="forum-reply" data-reply-id="${escape(r.id)}"><div class="post-author"><strong>${author(r)}</strong> ${tags(r.badges)}</div><small class="post-meta">${escape(date(r.published_at||r.created_at))}</small><p class="post-body">${escape(r.body)}</p>${r.can_delete||r.is_own?`<button type="button" class="secondary delete-reply">${t('删除我的回复','Delete my reply')}</button>`:''}</article>`;
  function bindReplies(article){
      const panel=article.querySelector('.reply-thread');panel.hidden=false;
      panel.innerHTML=`<h4>${t('讨论与回复','Discussion & replies')}</h4><div class="reply-list"></div><button type="button" class="secondary replies-more">${t('加载回复','Load replies')}</button><form class="reply-compose"><label>${t('写下回复','Write a reply')}<textarea name="body" required minlength="1" maxlength="10000" placeholder="${t('分享你的想法、解答或补充…','Share an answer, idea or context…')}"></textarea></label><p class="helper">${t('回复提交后立即公开，昵称后会展示你的已认证徽章。请友善交流；发回复不会自动获得积分。','Replies publish immediately with your earned badges beside your name. Please be respectful; replying does not automatically award XP.')}</p><button type="submit">${t('发布回复','Publish reply')}</button></form><p class="reply-message" role="status" aria-live="polite"></p><a href="#submissions">${t('查看我的回复 ↗','My replies ↗')}</a>`;
      const more=panel.querySelector('.replies-more'),message=panel.querySelector('.reply-message');let offset=0;
      const load=async()=>{more.disabled=true;message.textContent='';try{
        const result=await client.rpc('community_member_replies',{thread_id:article.dataset.postId,page_offset:offset});
        if(!current()||!panel.isConnected)return;if(result.error||!Array.isArray(result.data))throw new Error('reply service');
        if(offset===0)panel.querySelector('.reply-list').innerHTML='';
        panel.querySelector('.reply-list').insertAdjacentHTML('beforeend',result.data.map(replyMarkup).join('')||(offset===0?`<p class="helper">${t('还没有公开回复，欢迎开启讨论。','No published replies yet. Start the discussion.')}</p>`:''));
        offset+=result.data.length;more.hidden=result.data.length<20;more.textContent=t('加载更多回复','Load more replies');
      }catch{if(current()&&panel.isConnected){message.textContent=t('回复暂时无法加载，请重试。','Replies are unavailable. Please retry.');more.textContent=t('重试加载回复','Retry replies');}}
      finally{more.disabled=false;}};
      more.onclick=load;void load();
      bindReplyDeletion(panel,async()=>{offset=0;await load();});
      panel.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),body=form.elements.body.value.trim();if(!body){message.textContent=t('请填写回复内容。','Please write a reply.');return;}button.disabled=true;message.textContent='';
        try{const result=await client.rpc('submit_community_reply',{thread_id:article.dataset.postId,reply_body:body});if(!current()||!panel.isConnected)return;if(result.error)throw result.error;form.reset();offset=0;await load();if(current()&&panel.isConnected)message.textContent=t('回复已发布。可在“我的投稿”查看或删除自己的回复。','Reply published. View or delete your replies in My posts.');}
        catch(error){if(current()&&panel.isConnected)message.textContent=error.code==='P0001'?t('回复过于频繁，请稍后再试。','Please wait before replying again.'):t('回复未提交，请稍后重试；内容已保留。','Reply not submitted. Please retry; your draft is preserved.');}
        finally{button.disabled=false;}
      };
  }
  function bindReplyDeletion(root,refresh){
    root.addEventListener('click',e=>{const button=e.target.closest('.delete-reply');if(!button)return;
      if(!window.confirm(t('确认删除这条回复？删除后将不再公开显示。','Delete this reply? It will no longer be visible.')))return;
      void act(button,async()=>{const result=await client.rpc('delete_community_reply',{reply_id:button.closest('[data-reply-id]').dataset.replyId});if(result.error)throw result.error;if(!current())return;await refresh();say(t('回复已删除。','Reply deleted.'));});
    });
  }
  function listLinks(root){
    root.querySelectorAll('.forum-post').forEach(article=>{
      const title=article.querySelector('h3'),link=document.createElement('a');link.href='#forum/'+encodeURIComponent(article.dataset.postId);link.textContent=title.textContent;title.replaceChildren(link);
      article.querySelector('.post-body').textContent=article.querySelector('.post-body').textContent.slice(0,280);article.classList.add('post-preview');
      article.querySelector('.reply-toggle')?.remove();article.querySelector('.reply-thread')?.remove();
    });
  }
  async function renderReplyQueue(reviewing){
    const section=document.createElement('section');section.className='reply-queue';content.append(section);
    const title=t(reviewing?'待审核回复':'我的回复',reviewing?'Replies awaiting review':'My replies');
    section.innerHTML=`<h3>${title}</h3><p>${t('正在加载…','Loading…')}</p>`;
    try{const result=await client.rpc('community_reply_submissions',{review_queue:reviewing});if(!current())return;if(result.error||!Array.isArray(result.data))throw new Error('reply queue');
      section.innerHTML=`<h3>${title}</h3><p class="helper">${t('显示最近 100 条回复。','Showing the latest 100 replies.')}</p>`+result.data.map(r=>`<section class="reply-submission"><p class="post-meta">${t('回复帖子：','Reply to: ')}${escape(r.post_title)} · ${escape(status(r.status))}</p>${replyMarkup(r)}${r.review_note?`<p class="review-note">${t('审核意见：','Review note: ')}${escape(r.review_note)}</p>`:''}${reviewing&&!r.is_own?`<form class="reply-review" data-reply-id="${escape(r.id)}"><label>${t('审核意见（不通过时必填）','Review note (required when declining)')}<textarea name="note" maxlength="1000"></textarea></label><div class="links"><button value="published">${t('通过回复','Approve reply')}</button><button class="secondary" value="rejected">${t('不通过回复','Decline reply')}</button></div></form>`:reviewing?`<p class="helper">${t('自己的回复需由其他审核员处理。','Another reviewer must review your own reply.')}</p>`:''}</section>`).join('')+(result.data.length?'':`<p class="helper">${t('暂无回复。','No replies yet.')}</p>`);
      bindReplyDeletion(section,async()=>{section.remove();await renderReplyQueue(reviewing);});
      section.querySelectorAll('.reply-review').forEach(form=>form.onsubmit=e=>{e.preventDefault();const decision=e.submitter.value,note=form.elements.note.value.trim();if(decision==='rejected'&&!note){say(t('请填写未通过的原因。','Please provide a reason.'),true);return;}act(e.submitter,async()=>{const result=await client.rpc('review_community_reply',{reply_id:form.dataset.replyId,decision,note});if(result.error)throw result.error;if(!current())return;section.remove();await renderReplyQueue(reviewing);if(current())say(t('回复审核结果已保存。','Reply review saved.'));});});
    }catch{if(current()){section.innerHTML=`<h3>${title}</h3><p class="helper">${t('回复记录暂时无法加载。','Reply records are unavailable.')}</p><button type="button" class="secondary">${t('重试','Retry')}</button>`;section.querySelector('button').onclick=()=>{section.remove();void renderReplyQueue(reviewing);};}}
  }
  content.innerHTML=`<h2>${headings[view]}</h2><p>${t('正在加载…','Loading…')}</p>`;
  try{
    if(view==='badges'){
      const [catalog,owned]=await Promise.all([client.from('badge_catalog').select('*').order('sort_order'),client.from('member_badges').select('badge_id,granted_at').eq('user_id',user.id)]);
      if(!current())return;if(catalog.error||owned.error){failure();return;}
      const awards=new Map(owned.data.map(b=>[b.badge_id,b.granted_at]));
      window.spaceqatMotion?.observeAwards(user.id,owned.data);
      const guide=window.spaceqatBadgeGuide;
      content.innerHTML=`<h2>${headings.badges}</h2><p>${t('已点亮','Earned')} ${awards.size} ${t('枚。点击任意徽章，查看获取方法。','badges. Select any badge to see how to earn it.')}</p>${guide.guide()}<div class="badge-grid">${catalog.data.map(b=>`<article class="real-badge ${awards.has(b.id)?'earned':'locked'}">${window.spaceqatBadgeArt(b.id,awards.has(b.id))}<small>${escape(b.category)}</small><h3>${escape(guide.name(b))}</h3><p>${escape(guide.rule(b))}</p><strong>${awards.has(b.id)?t('已点亮 · ','Earned · ')+escape(date(awards.get(b.id))):t('尚未点亮','Not yet earned')}</strong><button type="button" class="badge-rule-trigger" data-badge-rule="${escape(b.id)}" aria-label="${escape(guide.name(b))} · ${t('查看获取方法','How to earn')}">${t('查看获取方法 ↗','How to earn ↗')}</button></article>`).join('')}</div>${catalog.data.length?'':`<p class="empty">${t('徽章目录正在准备中。','The badge catalog is being prepared.')}</p>`}`;
      guide.bind(content,catalog.data,awards);
      try{const profile=await client.from('member_profiles').select('points').eq('id',user.id).single();if(current()&&!profile.error&&profile.data){for(const button of content.querySelectorAll('[data-badge-rule]')){const id=button.dataset.badgeRule;if(/^L[1-5]$/.test(id)){const card=button.closest('.real-badge');card.dataset.xp=String(Math.max(0,Number(profile.data.points)||0));card.dataset.xpTarget=String([0,40,160,420,900,1800][Number(id[1])]);}}window.dispatchEvent(new Event('spaceqat-progress-ready'));}}catch{/* Rules stay usable if optional XP data is unavailable. */}
      return;
    }
    if(view==='forum'){
      const threadId=location.hash.split('/')[1];
      if(threadId){
        const result=await client.rpc('community_member_post_detail',{thread_id:threadId});if(!current())return;if(result.error){failure();return;}
        const p=result.data;
        content.innerHTML=`<a class="thread-back" href="#forum">${t('← 返回论坛','← Back to forum')}</a>`;
        if(!p){content.insertAdjacentHTML('beforeend',`<p class="empty">${t('帖子不存在、已删除或暂未公开。','This post is unavailable, removed or not public.')}</p>`);return;}
        content.insertAdjacentHTML('beforeend',post(p));
        const article=content.querySelector('.forum-post');article.classList.add('post-detail');article.querySelector('.reply-toggle')?.remove();
        if(p.can_delete){const button=document.createElement('button');button.type='button';button.className='secondary delete-post';button.textContent=t('删除帖子','Delete post');article.querySelector('.reply-thread').before(button);
          button.onclick=()=>{if(!window.confirm(t('确认删除这篇帖子？帖子及其下所有回复将不再展示。','Delete this post? The post and all its replies will be hidden.')))return;void act(button,async()=>{const r=await client.rpc('delete_community_post',{thread_id:p.id});if(r.error)throw r.error;if(current()){location.hash='forum';say(t('帖子已删除。','Post deleted.'));}});};
        }
        if(p.can_reply)bindReplies(article);else article.querySelector('.reply-thread').remove();
        return;
      }
      const [feed,role]=await Promise.all([client.rpc('community_member_feed',{page_offset:0}),client.rpc('community_can_review')]);
      if(!current())return;if(feed.error){failure();return;}
      content.innerHTML=`<div class="section-heading"><h2>${headings.forum}</h2>${role.data===true?`<a href="#moderation">${t('审核投稿 ↗','Review submissions ↗')}</a>`:''}</div><details class="post-compose"><summary>${t('＋ 发布帖子','＋ Write a post')}</summary><p>${t('提问与互助、FatQat 开源、校园交流可直接发布；知识与作品、社区公告和活动审核通过后发布。帖子会展示你的用户名与已获得的徽章。','Questions & help, FatQat open source and Campus publish immediately. Knowledge & projects, Announcements and Events require review. Posts display your username and earned badges.')}</p><form id="post-form"><label>${t('标题','Title')}<input name="title" minlength="3" maxlength="160" required></label><label>${t('分类','Category')}<select name="category">${Object.entries(categories).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>${t('正文','Body')}<textarea name="body" minlength="10" maxlength="20000" required></textarea></label><p id="publication-hint" class="helper" aria-live="polite"></p><button>${t('直接发布','Publish now')}</button></form></details><div id="feed">${feed.data.map(post).join('')||`<p class="empty">${t('还没有已发布的帖子。欢迎提交第一篇分享。','No published posts yet. Be the first to submit a post.')}</p>`}</div><button id="more-posts" class="secondary" ${feed.data.length<20?'hidden':''}>${t('加载更多','Load more')}</button>`;
      const compose=content.querySelector('#post-form');
      listLinks(content);
      const eventPermission=await client.rpc('community_can_submit_event');if(!current())return;
      const canEvent=eventPermission.data===true;
      compose.elements.category.closest('label').insertAdjacentHTML('afterend',`<label id="event-role-field" hidden>${t('活动申请类型','Event request type')}<select name="event_role"><option value="organize">${t('发起活动','Organize an event')}</option><option value="host">Host</option><option value="cohost">Co-host</option><option value="sponsor">Sponsor</option></select></label>`);
      const updatePolicy=()=>{const event=compose.elements.category.value==='event',review=['knowledge','community','event'].includes(compose.elements.category.value);compose.querySelector('button').disabled=event&&!canEvent;content.querySelector('#event-role-field').hidden=!event;compose.querySelector('button').textContent=review?t('提交审核','Submit for review'):t('直接发布','Publish now');content.querySelector('#publication-hint').textContent=event?t('仅经认证的委员单位代表、共建单位代表可提交。请写明活动主题、拟定时间地点、所属单位、个人分工及支持需求；不要填写私人联系方式。所有活动均需审核，host/cohost/sponsor 申请须社区确认。发布后有机会由运营精选至首页社区动态，非自动展示。','Only verified committee or partner representatives may submit. Include the topic, proposed date and venue, organization, your role and support requested; omit private contact details. Every event and host/cohost/sponsor request requires review. Published events may be editorially selected for homepage news; selection is not automatic.')+(canEvent?'':t(' 你目前没有代表权限。',' You do not currently have representative access.')):review?t('此板块的帖子审核通过后公开。','Posts in this category are published after review.'):t('此板块的帖子提交后直接公开。','Posts in this category are published immediately.');};
      compose.elements.category.onchange=updatePolicy;updatePolicy();
      let offset=20;
      document.querySelector('#more-posts').onclick=e=>act(e.currentTarget,async()=>{const {data,error}=await client.rpc('community_member_feed',{page_offset:offset});if(error)throw error;if(!current())return;offset+=data.length;document.querySelector('#feed').insertAdjacentHTML('beforeend',data.map(post).join(''));listLinks(content);e.target.hidden=data.length<20;});
      document.querySelector('#post-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);act(form.querySelector('button'),async()=>{
        const event=f.get('category')==='event';
        const {data:postId,error}=await client.rpc(event?'submit_community_event':'submit_community_post',{post_title:f.get('title').trim(),post_body:f.get('body').trim(),...(event?{event_role:f.get('event_role')}:{post_category:f.get('category')})});if(error)throw error;
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
    listLinks(content);
    if(!reviewing)await renderReplyQueue(false);
  }catch{if(current())failure();}
};
