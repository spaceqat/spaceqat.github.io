/* Personal display preferences only; never touches member data or awards. */
(() => {
  const key='spaceqat-desk-palette';
  const palettes=['paper','sage','dusk'];
  let palette='paper';try{const saved=localStorage.getItem(key);if(palettes.includes(saved))palette=saved;}catch{}
  document.body.dataset.deskPalette=palette;
  const t=(zh,en)=>document.documentElement.lang.startsWith('en')?en:zh;
  function mount(){
    const root=document.querySelector('.member-space #content')||document.querySelector('.app-shell #main');
    if(!root||!root.querySelector('.profile-hero')||root.querySelector('.desk-tools'))return;
    const bar=document.createElement('div');bar.className='desk-tools';
    bar.innerHTML=`<div class="desk-shortcuts"><a href="#forum">${t('逛逛论坛','Visit the forum')} <span aria-hidden="true">↗</span></a><a href="#badges">${t('翻翻徽章册','Browse badges')} <span aria-hidden="true">↗</span></a></div><details class="desk-preferences"><summary>${t('桌面配色','Desk palette')} <span aria-hidden="true">◒</span></summary><div class="desk-swatches" role="group" aria-label="${t('选择桌面配色','Choose a desk palette')}">${palettes.map((id,i)=>`<button type="button" data-palette="${id}" aria-pressed="${palette===id}"><i aria-hidden="true"></i>${t(['奶油纸','鼠尾草','暮色紫'][i],['Paper','Sage','Dusk'][i])}</button>`).join('')}</div></details>`;
    root.querySelector('.profile-hero').before(bar);
    bar.addEventListener('click',event=>{const button=event.target.closest('[data-palette]');if(!button)return;palette=button.dataset.palette;document.body.dataset.deskPalette=palette;try{localStorage.setItem(key,palette);}catch{}bar.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===palette)));});
  }
  const root=document.querySelector('#content')||document.querySelector('#main');
  if(root)new MutationObserver(mount).observe(root,{childList:true,subtree:true});
  mount();
})();
