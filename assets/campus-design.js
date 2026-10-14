/* Preset-only design tools. Images stay in private storage until page review. */
(() => {
 'use strict';
 const pathPattern=/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/;
 const defaults=()=>['intro','news','resources','gallery'].map(id=>({id,visible:true}));
 const position=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(100,Number(v))):50;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const imageNode=(item,cover=false)=>{
  const img=document.createElement('img');img.alt=item.caption||'';img.dataset.campusImage=item.path;
  // Fetch while the short-lived signed URL is valid; gallery size is bounded at eight.
  img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
  if(cover){img.className='cs-cover-photo';img.style.objectPosition=`${position(item.x??50)}% ${position(item.y??50)}%`;}
  return img;
 };
 async function hydrate(root){
  const client=window.spaceqatClient;
  await Promise.all([...root.querySelectorAll('img[data-campus-image]:not([data-image-loading])')].map(async img=>{
   img.dataset.imageLoading='true';const path=img.dataset.campusImage;
   try{
    if(!pathPattern.test(path))throw Error('path');
    const {data,error}=await client.storage.from('campus-media').createSignedUrl(path,60);
    if(error||!data?.signedUrl)throw error||Error('url');
    if(img.isConnected)img.src=data.signedUrl;
    img.onerror=()=>{img.hidden=true;img.closest('figure')?.classList.add('cs-image-unavailable');};
   }catch{img.hidden=true;img.closest('figure')?.classList.add('cs-image-unavailable');}
  }));
 }
 function decorate(html,page,t){
  const template=document.createElement('template');template.innerHTML=html;
  const root=template.content.firstElementChild,design=page.design||{},hero=root.querySelector('.cs-cover');
  root.dataset.coverStyle=design.cover_style==='postcard'?'postcard':'editorial';
  root.dataset.titleStyle=design.title_style==='serif'?'serif':'sans';
  if(design.cover?.path){hero.prepend(imageNode(design.cover,true));hero.classList.add('cs-has-cover');}
  const main=root.querySelector('.cs-layout>div'),sections=[...main.children],modules=new Map();
  modules.set('intro',sections[0]);modules.set('news',sections[1]);if(sections[2])modules.set('resources',sections[2]);
  if(design.gallery?.length){
   const panel=document.createElement('section');panel.className='cs-panel';
   const label=document.createElement('p');label.className='cs-eyebrow';label.textContent='CAMPUS / MOMENTS';
   const title=document.createElement('h2');title.textContent=t('校园相册','Campus moments');
   const grid=document.createElement('div');grid.className='cs-gallery';
   design.gallery.slice(0,8).forEach(item=>{const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=item.caption||t('校园瞬间','A campus moment');figure.append(imageNode(item),caption);grid.append(figure);});
   panel.append(label,title,grid);modules.set('gallery',panel);
  }
  main.replaceChildren();(design.modules||defaults()).forEach(m=>{const section=modules.get(m.id);if(m.visible&&section){main.append(section);modules.delete(m.id);}});
  return template.innerHTML;
 }
 function mount({form,page,id,t,E,changed,current}){
  const design=clone(page.design||{});design.modules ||= defaults();design.gallery ||= [];
  design.cover_style ||= 'editorial';design.title_style ||= 'sans';
  let uploading=false;
  const section=document.createElement('section');section.className='cs-design';
  section.innerHTML=`<div class="cs-design-heading"><p class="cs-eyebrow">MAKE IT YOUR CAMPUS</p><h2>${t('装扮校园空间','Make this space yours')}</h2><p class="cs-muted">${t('封面、相册和排版会随草稿一起审核。移除照片不会立即影响当前公开版本。','Cover, gallery and layout are reviewed with your draft. Removing a photo does not immediately change the public version.')}</p></div>
   <div class="cs-fields"><label>${t('封面排版','Cover layout')}<select data-design="cover_style"><option value="editorial">${t('编辑部 · 横幅','Editorial · Banner')}</option><option value="postcard">${t('明信片 · 图文分栏','Postcard · Split')}</option></select></label><label>${t('标题字体','Heading style')}<select data-design="title_style"><option value="sans">${t('清爽黑体','Modern sans')}</option><option value="serif">${t('书刊宋体','Editorial serif')}</option></select></label></div>
   <h3>${t('校园封面','Campus cover')}</h3><p class="cs-muted">${t('JPG / PNG / WebP，每张最多 8 MB、4000 万像素；自动缩小并移除图片元数据。请只上传有权使用、获得出镜者同意的照片。','JPG / PNG / WebP, up to 8 MB and 40 megapixels each. Resized and metadata stripped. Upload only images you may use, with consent from people pictured.')}</p>
   <label class="cs-upload-label">${t('选择 / 更换封面','Choose / replace cover')}<input data-upload="cover" type="file" accept="image/jpeg,image/png,image/webp"></label>
   <div class="cs-cover-editor"></div>
   <h3>${t('模块顺序与显示','Module order & visibility')}</h3><p class="cs-muted">${t('使用上下按钮调整正文顺序；共建伙伴和联系方式始终保留。','Use the arrow buttons to reorder the main column. Team and contact panels stay visible.')}</p><div class="cs-module-controls"></div>
   <h3>${t('校园相册 · 最多 8 张','Campus gallery · Up to 8 photos')}</h3><label class="cs-upload-label">${t('添加照片','Add a photo')}<input data-upload="gallery" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="cs-gallery-editor"></div><p class="cs-notice" role="status" data-upload-status></p>`;
  form.querySelector('.cs-actions').before(section);
  const status=section.querySelector('[data-upload-status]');
  const names={intro:t('校园介绍','Introduction'),news:t('动态与活动','Notes & activities'),resources:t('学习资源','Resources'),gallery:t('校园相册','Gallery')};
  function drawModules(focus){
   const container=section.querySelector('.cs-module-controls');
   container.innerHTML=design.modules.map((m,i)=>`<div class="cs-module-row"><label><input type="checkbox" data-module="${m.id}" ${m.visible?'checked':''}> ${names[m.id]}</label><span><button type="button" class="cs-secondary" data-move="${i},-1" aria-label="${t('上移','Move up')} ${names[m.id]}" ${i===0?'disabled':''}>↑</button><button type="button" class="cs-secondary" data-move="${i},1" aria-label="${t('下移','Move down')} ${names[m.id]}" ${i===3?'disabled':''}>↓</button></span></div>`).join('');
   container.querySelectorAll('input').forEach(input=>input.onchange=()=>{design.modules.find(m=>m.id===input.dataset.module).visible=input.checked;changed();});
   container.querySelectorAll('button').forEach(button=>button.onclick=()=>{const [i,step]=button.dataset.move.split(',').map(Number),next=i+step;if(next<0||next>=4)return;const [item]=design.modules.splice(i,1);design.modules.splice(next,0,item);changed();drawModules(item.id);});
   if(focus)container.querySelector(`[data-module="${focus}"]`).focus();
  }
  function drawMedia(){
   const cover=section.querySelector('.cs-cover-editor'),c=design.cover;
   cover.innerHTML=c?`<div class="cs-crop-preview"></div><div class="cs-fields"><label>${t('横向取景','Horizontal framing')}<input type="range" min="0" max="100" value="${position(c.x??50)}" data-crop="x"></label><label>${t('纵向取景','Vertical framing')}<input type="range" min="0" max="100" value="${position(c.y??50)}" data-crop="y"></label><label>${t('封面说明（无障碍描述）','Cover description (alt text)')}<input maxlength="160" value="${E(c.caption||'')}" data-cover-caption></label></div><button class="cs-secondary" type="button" data-remove-cover>${t('移除封面','Remove cover')}</button>`:`<p class="cs-muted">${t('尚未上传封面，将使用所选色板。','No cover yet. The selected palette will be used.')}</p>`;
   if(c){
    cover.querySelector('.cs-crop-preview').append(imageNode(c,true));
    cover.querySelectorAll('[data-crop]').forEach(input=>input.oninput=()=>{c[input.dataset.crop]=Number(input.value);cover.querySelector('img').style.objectPosition=`${position(c.x??50)}% ${position(c.y??50)}%`;changed();});
    cover.querySelector('[data-cover-caption]').oninput=e=>{c.caption=e.target.value;changed();};
    cover.querySelector('[data-remove-cover]').onclick=()=>{delete design.cover;changed();drawMedia();};
   }
   const gallery=section.querySelector('.cs-gallery-editor');gallery.replaceChildren();
   design.gallery.forEach((item,i)=>{
    const row=document.createElement('div');row.className='cs-photo-row';
    row.innerHTML=`<label>${t('照片说明','Photo caption')} ${i+1}<input maxlength="160" value="${E(item.caption||'')}"></label><div class="cs-photo-actions"><button type="button" class="cs-secondary" data-photo-up ${i===0?'disabled':''}>${t('前移','Move earlier')}</button><button type="button" class="cs-secondary" data-photo-remove>${t('移除','Remove')}</button></div>`;
    row.prepend(imageNode(item));row.querySelector('input').oninput=e=>{item.caption=e.target.value;changed();};
    row.querySelector('[data-photo-remove]').onclick=()=>{design.gallery.splice(i,1);changed();drawMedia();};
    row.querySelector('[data-photo-up]').onclick=()=>{if(i===0)return;[design.gallery[i-1],design.gallery[i]]=[design.gallery[i],design.gallery[i-1]];changed();drawMedia();};gallery.append(row);
   });
   section.querySelector('[data-upload="gallery"]').disabled=uploading||design.gallery.length>=8;
   void hydrate(section);
  }
  section.querySelectorAll('[data-design]').forEach(select=>{select.value=design[select.dataset.design];select.onchange=()=>{design[select.dataset.design]=select.value;changed();};});
  section.querySelectorAll('[data-upload]').forEach(input=>input.onchange=async()=>{
   const file=input.files[0],kind=input.dataset.upload;if(!file||uploading)return;
   if(kind==='gallery'&&design.gallery.length>=8)return;
   uploading=true;changed();section.querySelectorAll('[data-upload]').forEach(i=>i.disabled=true);status.textContent=t('正在处理并上传图片…请完成后再保存草稿。','Processing and uploading… Wait before saving your draft.');
   try{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>8*1024*1024)throw Error('invalid');
    const bitmap=await createImageBitmap(file);
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('invalid');}
    const scale=Math.min(1,(kind==='cover'?1920:1400)/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));
    if(!blob||blob.type!=='image/webp'||blob.size>2097152)throw Error('invalid');if(!current())return;
    const path=id+'/'+crypto.randomUUID()+'.webp';
    const {error}=await window.spaceqatClient.storage.from('campus-media').upload(path,blob,{contentType:'image/webp',upsert:false});if(error)throw error;if(!current())return;
    const item={path,caption:'',x:50,y:50};if(kind==='cover')design.cover=item;else design.gallery.push(item);
    changed();drawMedia();status.textContent=t('图片已上传到私有草稿区。请保存草稿或提交审核；上传本身不会发布。','Uploaded privately. Save your draft or submit for review; uploading does not publish it.');
   }catch(e){if(current())status.textContent=e.message==='invalid'?t('请选择有效图片：不超过 8 MB、4000 万像素。','Choose a valid image, up to 8 MB and 40 megapixels.'):t('上传未完成，现有内容已保留。请重试；若持续失败，请联系管理员检查 020 图片存储脚本与校园编辑权限。','Upload failed; existing content is retained. Retry, or ask an administrator to check migration 020 and your campus permissions.');}
   finally{uploading=false;input.value='';if(current()){section.querySelectorAll('[data-upload]').forEach(i=>i.disabled=false);section.querySelector('[data-upload="gallery"]').disabled=design.gallery.length>=8;}}
  });
  drawModules();drawMedia();
  return {collect:()=>clone(design),get uploading(){return uploading;}};
 }
 window.SpaceQatCampusDesign={decorate,hydrate,mount};
})();
