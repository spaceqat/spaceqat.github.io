/* Private profile-only welcome. Read receipts are stored by the server, never localStorage. */
window.mountCampusWelcome=async({client,content,t,current})=>{
 const entry=content.querySelector('a[href="#campus-apply"]')?.closest('.dashboard-card');
 if(!entry)return;
 let result;try{result=await client.rpc('my_campus_welcome');}catch{return;}
 if(!current()||result.error||!result.data)return;
 const a=result.data,E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const active=a.status==='active',unread=active&&!a.read_at,en=document.documentElement.lang==='en';
 const dates=v=>new Date(v).toLocaleDateString(en?'en-GB':'zh-CN',{year:'numeric',month:'long',day:'numeric'});
 const states={active:t('有效任期','Active appointment'),paused:t('身份已暂停','Appointment paused'),expired:t('任期已结束','Term ended'),exited:t('已退出','Appointment ended'),revoked:t('身份已撤销','Appointment revoked'),scheduled:t('任期尚未开始','Term not started')};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const workspace='campus.html'+(en?'?lang=en':'')+(uuid.test(a.space_id||'')?'#'+a.space_id+'/edit':'#mine');
 entry.classList.add('campus-welcome');entry.classList.toggle('has-unread',unread);
 entry.innerHTML=`<div class="campus-welcome-top"><span class="campus-welcome-label">SPACEQAT / CAMPUS</span><span class="campus-welcome-state">${E(states[a.status]||a.status)}</span></div>
 ${unread?`<div class="campus-welcome-alert" role="status"><span class="campus-unread-dot" aria-hidden="true"></span><div><strong>${t('校园大使申请已通过','Your ambassador application is approved')}</strong><p>${t('欢迎加入校园共建。你的校园大使 Badge 已点亮，工作台已开启。','Welcome to the campus team. Your ambassador badge and workspace are ready.')}</p></div></div>`:''}
 <details class="campus-welcome-details" ${unread?'open':''}><summary>${active?t('你的校园大使欢迎卡','Your campus ambassador welcome card'):t('查看任命记录','View appointment record')} <span aria-hidden="true">↗</span></summary>
 <div class="campus-welcome-body"><div class="campus-welcome-art">${window.spaceqatBadgeArt?.('campus',active)||'<span aria-hidden="true">✦</span>'}<span>${t('校园大使','CAMPUS AMBASSADOR')}</span></div><div class="campus-welcome-copy"><p class="campus-welcome-kicker">${active?t('新的连接，从你开始。','A new connection starts with you.'):t('感谢你在校园留下的连接。','Thank you for the connections you made.')}</p><h2>${active?t('欢迎，','Welcome, '):''}${E(a.name)}</h2><p class="campus-welcome-school">${E(a.school)}</p><p>${active?t('把好奇心带到校园，让一次交流、一份分享，成为更多人的起点。','Bring curiosity to campus. One conversation, one shared idea can become someone else’s starting point.'):t('此卡保留历史任命信息，不表示当前仍拥有编辑权限。','This card records your appointment history, not current editing permission.')}</p><dl><div><dt>${t('任期','Term')}</dt><dd>${E(dates(a.starts_at))} — ${E(dates(a.ends_at))}</dd></div><div><dt>${t('身份编号','Appointment ID')}</dt><dd>${E(a.id)}</dd></div></dl></div></div>
 <div class="campus-welcome-actions">${active?`<a class="campus-welcome-primary" href="${E(workspace)}">${t('进入校园工作台 ↗','Open campus workspace ↗')}</a>`:''}<a href="#campus-apply">${t('查看正式任命通知','View formal appointment notice')}</a><a href="#badges">${t('查看我的徽章','View my badges')}</a></div><p class="campus-welcome-footnote">${t('校园大使身份不代表学校官方授权，不自动授予签约、收款或募资权限。','An ambassador appointment does not grant university representation or authority to sign contracts, collect payments or raise funds.')}</p></details>
 ${unread?`<div class="campus-welcome-receipt"><button type="button" class="secondary" id="campus-welcome-read">${t('我已知晓 · 标记已读','Got it · Mark as read')}</button><span>${t('仅更新已读状态，不是新的协议签署。','Read receipt only, not a new agreement.')}</span></div>`:''}<p class="campus-welcome-status" role="status" aria-live="polite"></p>`;
 const button=entry.querySelector('#campus-welcome-read');
 if(button)button.onclick=async()=>{if(button.disabled)return;button.disabled=true;const status=entry.querySelector('.campus-welcome-status');status.textContent=t('正在保存已读状态…','Saving read receipt…');
  try{const r=await client.rpc('read_campus_welcome',{appointment_id:a.id});if(r.error||!r.data)throw new Error('receipt');if(!current())return;
   entry.classList.remove('has-unread');entry.querySelector('.campus-welcome-alert')?.remove();entry.querySelector('.campus-welcome-receipt')?.remove();status.textContent=t('已标记为已读。欢迎卡会保留，之后仍可在我的空间查看。','Marked as read. Your welcome card stays in My space.');
  }catch{if(current()){status.textContent=t('已读状态未确认，请重试。通知仍保留，不会因此丢失。','Could not confirm the read receipt. Please retry; your notification remains available.');button.disabled=false;}}
 };
};
