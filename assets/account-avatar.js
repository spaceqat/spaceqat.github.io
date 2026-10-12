/* Uploaded images are public. Re-encode locally to strip metadata and disallow SVG. */
(() => {
 const uuid='[0-9a-f-]{36}',valid=new RegExp('^'+uuid+'/'+uuid+'\\.webp$');
 const url=path=>valid.test(path||'')?window.spaceqatClient.storage.from('member-avatars').getPublicUrl(path).data.publicUrl:null;
 function paint(element,path){
  if(!element)return;element.dataset.avatarSource=path||'';const src=url(path);if(!src)return;
  const img=new Image();img.alt='';img.className='member-avatar-image';img.src=src;
  img.onload=()=>{if(element.dataset.avatarSource===path)element.replaceChildren(img);}; // Keep initial if unavailable or superseded.
 }
 window.mountSpaceQatAvatar=({client,user,data,content,t,current})=>{
  const editor=content.querySelector('#profile-editor');if(!editor)return;
  paint(content.querySelector('.identity .avatar'),data.avatar_path);
  const panel=document.createElement('section');panel.className='avatar-editor';
  panel.innerHTML=`<h3>${t('个人头像','Profile photo')}</h3><span class="avatar avatar-preview"></span><label>${t('选择图片','Choose an image')}<input type="file" accept="image/jpeg,image/png,image/webp"></label><p class="helper">${t('JPG、PNG 或 WebP，最大 5 MB。自动居中裁为方形；头像将在论坛与个人主页公开展示。','JPG, PNG or WebP, up to 5 MB. Center-cropped to a square; visible publicly in the forum and on your profile.')}</p><button type="button" class="avatar-upload" disabled>${t('保存头像','Save photo')}</button> <button type="button" class="secondary avatar-remove">${t('恢复默认头像','Remove photo')}</button><p role="status" class="avatar-status"></p>`;
  editor.prepend(panel);const preview=panel.querySelector('.avatar-preview'),input=panel.querySelector('input'),save=panel.querySelector('.avatar-upload'),remove=panel.querySelector('.avatar-remove'),status=panel.querySelector('[role=status]');
  const initial=()=>Array.from(content.querySelector('#hero-name')?.textContent||data.display_name||'S')[0];
  preview.textContent=initial();paint(preview,data.avatar_path);remove.disabled=!data.avatar_path;
  let selected=null,version=0,busy=false;
  const reset=()=>{preview.textContent=initial();paint(preview,data.avatar_path);};
  input.onchange=async()=>{
   const ticket=++version;selected=null;save.disabled=true;status.textContent='';const file=input.files[0];reset();if(!file)return;
   try{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size)throw Error('invalid');
    const bitmap=await createImageBitmap(file);
    if(ticket!==version||!current()){bitmap.close();return;}
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('invalid');}
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const side=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,512,512);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));
    if(ticket!==version||!current())return;if(!blob||blob.type!=='image/webp')throw Error('invalid');
    selected=blob;preview.dataset.avatarSource='selection';const img=new Image();img.alt='';img.className='member-avatar-image';img.src=canvas.toDataURL('image/webp',.88);preview.replaceChildren(img);save.disabled=false;
   }catch{if(ticket===version&&current())status.textContent=t('请选择有效的 JPG、PNG 或 WebP（不超过 5 MB、4000 万像素）。','Choose a valid JPG, PNG or WebP (up to 5 MB and 40 megapixels).');}
  };
  async function persist(removing){
   if(busy||(!removing&&!selected))return;busy=true;save.disabled=remove.disabled=input.disabled=true;status.textContent=t('正在保存…','Saving…');
   let uploaded=null,committed=false;const old=data.avatar_path;
   try{
    if(!data.public_id)throw Error('setup');
    if(!removing){uploaded=data.public_id+'/'+crypto.randomUUID()+'.webp';const r=await client.storage.from('member-avatars').upload(uploaded,selected,{contentType:'image/webp',upsert:false});if(r.error)throw r.error;}
    const result=await client.from('member_profiles').update({avatar_path:uploaded}).eq('id',user.id).select('avatar_path').single();if(result.error||!result.data)throw result.error||Error('save');
    committed=true;data.avatar_path=uploaded;
    if(current()){const hero=content.querySelector('.identity .avatar');hero.textContent=initial();paint(hero,uploaded);selected=null;input.value='';reset();status.textContent=t('头像已更新。','Photo updated.');}
    if(old)await client.storage.from('member-avatars').remove([old]);
   }catch{if(uploaded&&!committed)await client.storage.from('member-avatars').remove([uploaded]).catch(()=>{});if(current())status.textContent=t('头像未能保存，请重试；若持续失败，请联系管理员检查头像存储是否启用。','Unable to save. Retry or ask an administrator to check avatar storage.');}
   finally{busy=false;if(current()){input.disabled=false;save.disabled=!selected;remove.disabled=!data.avatar_path;}}
  }
  save.onclick=()=>persist(false);remove.onclick=()=>persist(true);
  // A name edit must not replace a saved photo with an initial.
  const hero=content.querySelector('.identity .avatar');new MutationObserver(()=>{if(current()&&data.avatar_path&&!hero.querySelector('img'))paint(hero,data.avatar_path);}).observe(hero,{childList:true});
 };
 // Existing public-profile links appear in forum posts, replies and connections.
 let queued=false;
 async function hydrate(){
  queued=false;const nodes=[...document.querySelectorAll('.member-name-link[href^="#member/"], [data-avatar-member]')].filter(e=>!e.dataset.avatarChecked);
  const groups=new Map();for(const e of nodes){const id=e.dataset.avatarMember||e.getAttribute('href').split('/')[1];if(!new RegExp('^'+uuid+'$').test(id))continue;e.dataset.avatarChecked='true';if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e);}
  const ids=[...groups.keys()];for(let i=0;i<ids.length;i+=100){try{const r=await window.spaceqatClient.rpc('community_avatar_paths',{member_ids:ids.slice(i,i+100)});for(const m of r.data||[]){if(!url(m.avatar_path))continue;for(const e of groups.get(m.id)||[]){if(!e.isConnected)continue;if(e.dataset.avatarMember)paint(e,m.avatar_path);else{const span=document.createElement('span');span.className='forum-avatar';e.prepend(span);paint(span,m.avatar_path);}}}}catch{/* Missing optional avatar data keeps name initials. */}}
 }
 new MutationObserver(()=>{if(!queued){queued=true;setTimeout(hydrate,50);}}).observe(document.querySelector('#content'),{childList:true,subtree:true});
})();
