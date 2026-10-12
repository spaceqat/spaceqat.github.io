/* Account changes use the signed-in Auth API, never direct database updates. */
(() => {
 const cooldowns=new Map();
 window.renderSpaceQatSecurity=async({client,user,content,t,escape,current,onUserUpdate})=>{
  let account=null,busy=false;
  const callback=new URL('account.html',location.href);callback.search=document.documentElement.lang.startsWith('en')?'?lang=en':'';
  content.innerHTML=`<a href="#profile">${t('← 我的空间','← My space')}</a><h1>${t('账号安全','Account security')}</h1><section class="dashboard-card"><h2>${t('更换绑定邮箱','Change email')}</h2><p>${t('当前邮箱：','Current email: ')}<strong id="security-email">${escape(user.email||'—')}</strong></p><p id="email-pending" class="helper"></p><p>${t('请按新旧邮箱收到的邮件完成确认。验证完成前，仍使用当前邮箱登录；换绑不会创建新账号，也不会清空资料、徽章、帖子或关注关系。','Follow the confirmation emails sent to your current and new addresses. Keep using your current address until verified. This changes your existing account, preserving your profile, badges, posts and connections.')}</p><form id="change-email"><label>${t('新邮箱','New email')}<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>${t('再次输入新邮箱','Confirm new email')}<input name="confirm_email" type="email" required maxlength="254" autocomplete="off"></label><button type="submit" disabled>${t('发送换绑验证邮件','Send confirmation emails')}</button></form><p class="helper">${t('请检查收件箱和垃圾邮件。若旧邮箱已无法使用，请联系 spaceqat@163.com 协助核验，不要重新注册。','Check your inbox and spam folder. If you cannot access your old address, contact spaceqat@163.com for verification rather than creating another account.')}</p><button type="button" class="secondary" id="refresh-email">${t('我已验证，刷新状态','I have confirmed — refresh status')}</button><p id="email-status" role="status" aria-live="polite"></p></section>`;
  const form=content.querySelector('#change-email'),submit=form.querySelector('button'),refresh=content.querySelector('#refresh-email'),status=content.querySelector('#email-status');
  const active=()=>current()&&form.isConnected;
  const paint=a=>{account=a;onUserUpdate?.(a);content.querySelector('#security-email').textContent=a.email||'—';content.querySelector('#email-pending').textContent=a.new_email?t('待验证的新邮箱：','New email awaiting confirmation: ')+a.new_email:t('当前没有待完成的邮箱变更。','No pending email change.');};
  const errorText=e=>({over_email_send_rate_limit:t('邮件发送过于频繁，请稍后再试。','Email rate limit reached. Please try later.'),over_request_rate_limit:t('操作过于频繁，请稍后再试。','Too many requests. Please try later.'),email_exists:t('该邮箱无法用于换绑，请使用其他邮箱或联系社区。','This email cannot be used. Try another address or contact the community.'),user_already_exists:t('该邮箱无法用于换绑，请使用其他邮箱或联系社区。','This email cannot be used. Try another address or contact the community.'),email_address_invalid:t('请检查邮箱地址是否正确。','Please check the email address.'),session_not_found:t('登录状态已失效，请重新登录。','Your session has expired. Please sign in again.')}[e?.code]||t('操作未完成，请稍后重试；已保留输入。','Unable to complete the request. Please retry; your input is preserved.'));
  async function load(manual=false){refresh.disabled=true;submit.disabled=true;try{const r=await client.auth.getUser();if(!active())return;if(r.error)throw r.error;if(!r.data?.user||r.data.user.id!==user.id)throw {code:'session_not_found'};const old=account?.email;paint(r.data.user);if(manual)status.textContent=account.new_email?t('仍在等待邮件确认，请检查新旧邮箱。','Confirmation is still pending. Check both inboxes.'):old&&old!==account.email?t('邮箱已更新，下次可使用新邮箱登录。','Email updated. Use the new address next time you sign in.'):t('已刷新，以“当前邮箱”显示的地址为准。','Refreshed. The address shown under Current email is active.');}catch(e){if(active())status.textContent=errorText(e);}finally{if(active()){refresh.disabled=false;submit.disabled=!account;}}}
  form.onsubmit=async event=>{event.preventDefault();if(busy||!account)return;status.textContent='';const email=form.elements.email.value.trim(),confirm=form.elements.confirm_email.value.trim();
   if(email.toLowerCase()!==confirm.toLowerCase()){status.textContent=t('两次输入的邮箱不一致。','The email addresses do not match.');return;}
   if(email.toLowerCase()===(account.email||'').toLowerCase()){status.textContent=t('新邮箱不能与当前邮箱相同。','Enter a different email address.');return;}
   const remaining=Math.ceil(((cooldowns.get(user.id)||0)-Date.now())/1000);if(remaining>0){status.textContent=t('请等待 '+remaining+' 秒后再发送。','Please wait '+remaining+' seconds before sending again.');return;}
   if(!window.confirm(t('确认向以下邮箱申请换绑？\n','Request an email change to this address?\n')+email))return;
   busy=true;submit.disabled=true;refresh.disabled=true;
   try{const latest=await client.auth.getUser();if(!active())return;if(latest.error)throw latest.error;if(latest.data?.user?.id!==user.id)throw {code:'session_not_found'};
    if(latest.data.user.email!==account.email){paint(latest.data.user);status.textContent=t('当前邮箱已变化，请核对后重新提交。','Your active email changed. Check it before submitting again.');return;}
    const r=await client.auth.updateUser({email},{emailRedirectTo:callback.href});if(r.error)throw r.error;cooldowns.set(user.id,Date.now()+60000);if(!active())return;
    if(r.data?.user?.id===user.id)paint(r.data.user);
    form.reset();status.textContent=account.email.toLowerCase()===email.toLowerCase()?t('邮箱已更新，下次可使用新邮箱登录。','Email updated. Use the new address next time you sign in.'):t('换绑请求已提交，请按新旧邮箱收到的邮件完成确认。当前登录邮箱尚未改变。','Change requested. Follow the emails sent to both addresses. Your active email has not changed yet.');
   }catch(e){if(e?.code==='over_email_send_rate_limit')cooldowns.set(user.id,Date.now()+60000);if(active())status.textContent=errorText(e);}
   finally{busy=false;if(active()){submit.disabled=false;refresh.disabled=false;}}
  };
  refresh.onclick=()=>{if(!busy)void load(true);};await load();
 };
})();
