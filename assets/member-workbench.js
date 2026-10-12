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
    bar.innerHTML=`<div class="desk-shortcuts"><a href="#forum">${t('逛逛论坛','Visit the forum')} <span aria-hidden="true">↗</span></a><a href="#badges">${t('翻翻徽章册','Browse badges')} <span aria-hidden="true">↗</span></a></div><details class="desk-preferences"><summary>${t('桌面配色','Desk palette')} <span aria-hidden="true">◒</span></summary><div class="desk-swatches" role="group" aria-label="${t('选择桌面配色','Choose a desk palette')}">${palettes.map((id,i)=>`<button type="button" data-palette="${id}" aria-pressed="${palette===id}"><i aria-hidden="true"></i>${t(['云白','鼠尾草','暮色紫'][i],['Cloud','Sage','Dusk'][i])}</button>`).join('')}</div></details>`;
    root.querySelector('.profile-hero').before(bar);
    bar.addEventListener('click',event=>{const button=event.target.closest('[data-palette]');if(!button)return;palette=button.dataset.palette;document.body.dataset.deskPalette=palette;try{localStorage.setItem(key,palette);}catch{}bar.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===palette)));});
  }
  const root=document.querySelector('#content')||document.querySelector('#main');
  if(root)new MutationObserver(mount).observe(root,{childList:true,subtree:true});
  mount();
})();

/* Playful profile interactions. Suggestions only, no rewards or network writes. */
(() => {
  const root=document.querySelector('#content')||document.querySelector('#main');if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const t=(zh,en)=>document.documentElement.lang.startsWith('en')?en:zh;
  const routes=[
    ['T','技术与开源','Code & open source','从一个小问题开始：复现一次报错，留下清晰的环境与步骤。','Start small: reproduce an issue and record the environment and steps.','contributions','去看开源贡献','Explore contributions'],
    ['C','知识与作品','Knowledge & projects','把今天刚理解的一个概念，写成别人也能读懂的短笔记。','Turn one concept you learned today into a short note someone else can understand.','forum','去论坛分享','Share in the forum'],
    ['O','校园与活动','Campus & events','找两位伙伴，围绕一个量子问题，开始一次小组交流。','Find two peers and explore a quantum question in a small discussion.','forum','去找交流伙伴','Meet your peers'],
    ['M','互助与维护','Help & maintenance','看看有没有你能回答的问题：一个具体的提示也很有用。','Look for a question you can help answer. One practical hint can make a difference.','forum','去看看问题','Explore questions']
  ];
  let index=0,queued=false;
  function animate(node,frames,options){if(!reduced.matches&&!document.hidden){node.getAnimations().forEach(a=>a.cancel());node.animate(frames,options);}}
  function mount(){
    queued=false;const hero=root.querySelector('.profile-hero');if(!hero||root.querySelector('.explore-deck'))return;
    const companion=hero.querySelector('.hero-companion');
    if(companion){
      companion.removeAttribute('aria-hidden');companion.classList.add('interactive-companion');
      const art=companion.querySelector('svg');companion.replaceChildren();
      const hello=document.createElement('button');hello.type='button';hello.className='companion-hello';hello.setAttribute('aria-label',t('和探索搭子打个招呼','Say hello to your exploration buddy'));if(art)hello.append(art);
      const caption=document.createElement('span');caption.textContent=t('戳戳探索搭子','Say hello');hello.append(caption);
      const speech=document.createElement('span');speech.className='companion-speech';speech.setAttribute('role','status');companion.append(hello,speech);
      let greetings=0;
      hello.onblur=()=>speech.classList.remove('is-speaking');
      hello.onclick=()=>{const phrases=[t('喵，今天也有新发现！','A new discovery awaits!'),t('先从一个小问题开始吧。','Start with one small question.'),t('好奇心，是最好的起点。','Curiosity is a great beginning.')];speech.textContent=phrases[greetings++%phrases.length];speech.classList.add('is-speaking');animate(art||hello,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-9px) rotate(-7deg)',offset:.4},{transform:'translateY(1px) rotate(5deg)',offset:.75},{transform:'none'}],{duration:550,easing:'ease-out'});};
    }
    const deck=document.createElement('section');deck.className='explore-deck';deck.setAttribute('aria-label',t('灵感星图','Exploration map'));
    deck.innerHTML=`<div class="explore-orbit" aria-hidden="true"><span class="orbit-line"></span><span class="orbit-line second"></span><span class="orbit-core">✦</span><span class="orbit-satellite"></span></div><div class="explore-copy"><span class="explore-kicker">${t('灵感星图 · 不计积分','EXPLORATION MAP · NO XP')}</span><h2>${t('下一次发现，从哪里开始？','Where will your next discovery begin?')}</h2><p class="explore-suggestion" aria-live="polite"></p><a class="explore-destination"></a></div><div class="explore-controls"><div class="explore-routes" role="group" aria-label="${t('选择探索方向','Choose a track')}"></div><button type="button" class="secondary explore-next">${t('换个灵感 ↻','Another idea ↻')}</button></div>`;
    hero.after(deck);
    const group=deck.querySelector('.explore-routes');
    routes.forEach(([code,zh,en],i)=>{const button=document.createElement('button');button.type='button';button.textContent=code;button.setAttribute('aria-label',t(zh,en));button.onclick=()=>select(i,true);group.append(button);});
    function select(i,motion){index=i;const [code,zh,en,copy,english,destination,label,englishLabel]=routes[i];deck.dataset.track=code;group.querySelectorAll('button').forEach((button,n)=>button.setAttribute('aria-pressed',String(n===i)));deck.querySelector('.explore-suggestion').textContent=t(copy,english);const link=deck.querySelector('.explore-destination');link.href=(destination==='contributions'&&document.querySelector('.app-shell')?'account.html':'')+'#'+destination;link.textContent=t(label,englishLabel)+' ↗';deck.querySelector('.orbit-core').textContent=code;if(motion){animate(deck.querySelector('.explore-orbit'),[{transform:'rotate(-12deg) scale(.92)'},{transform:'rotate(4deg) scale(1.04)',offset:.7},{transform:'none'}],{duration:600,easing:'cubic-bezier(.16,1,.3,1)'});animate(deck.querySelector('.explore-suggestion'),[{opacity:.3,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});}}
    deck.querySelector('.explore-next').onclick=()=>select((index+1)%routes.length,true);select(index,false);
  }
  new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(mount);}}).observe(root,{childList:true,subtree:true});
  reduced.addEventListener('change',()=>{if(reduced.matches)root.getAnimations({subtree:true}).forEach(a=>a.cancel());});
  mount();
})();

/* Motion enhancement only. Never writes membership, XP or badge records. */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
  const root=document.querySelector('#content')||document.querySelector('#main');if(!root)return;
  const t=(zh,en)=>document.documentElement.lang.startsWith('en')?en:zh;
  const seen=new WeakSet(),numbers=new WeakMap(),activeCounts=new Map();
  const cardSelector='.real-badge,.showcase-badge,.badge-card';
  const visibility=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('motion-visible',e.isIntersecting)),{threshold:.1});
  let frame=0,tiltFrame=0,tilted=null,pendingUnlocks=[];
  const enabled=()=>!reduced.matches&&!document.hidden;
  function burst(target){
    if(!target||!enabled())return;
    target.getAnimations().forEach(a=>a.cancel());
    target.animate([{transform:'scale(1)'},{transform:'scale(1.12)',offset:.45},{transform:'scale(.97)',offset:.75},{transform:'scale(1)'}],{duration:620,easing:'ease-out'});
    const host=target.parentElement;if(host.querySelector('.motion-particles'))return;
    const particles=document.createElement('span');particles.className='motion-particles';particles.setAttribute('aria-hidden','true');
    const rect=target.getBoundingClientRect(),box=host.getBoundingClientRect();
    particles.style.left=(rect.left-box.left+host.scrollLeft+rect.width/2)+'px';particles.style.top=(rect.top-box.top+host.scrollTop+rect.height/2)+'px';
    for(let i=0;i<10;i++){const dot=document.createElement('i'),angle=i*Math.PI/5;dot.style.setProperty('--dx',Math.cos(angle)*75+'px');dot.style.setProperty('--dy',Math.sin(angle)*65+'px');particles.append(dot);}
    host.append(particles);setTimeout(()=>particles.remove(),700);
  }
  function count(node){
    const text=node.textContent.trim(),match=text.match(/^\d+/);if(!match||numbers.get(node)===text)return;
    numbers.set(node,text);const prior=activeCounts.get(node);if(prior)cancelAnimationFrame(prior);
    if(!enabled()){node.removeAttribute('data-count-display');activeCounts.delete(node);return;}
    const value=Number(match[0]),start=performance.now();
    const tick=now=>{if(!node.isConnected||!enabled()){node.removeAttribute('data-count-display');activeCounts.delete(node);return;}
      const p=Math.min(1,(now-start)/600),n=Math.round(value*(p===1?1:1-Math.pow(2,-10*p)));
      node.dataset.countDisplay=text.replace(/^\d+/,String(n).padStart(match[0].startsWith('0')?match[0].length:1,'0'));
      if(p<1)activeCounts.set(node,requestAnimationFrame(tick));else{node.removeAttribute('data-count-display');activeCounts.delete(node);}
    };activeCounts.set(node,requestAnimationFrame(tick));
  }
  function mount(){
    frame=0;
    root.querySelectorAll('.dashboard-stats b,.stat b').forEach(count);
    root.querySelectorAll('.profile-hero,.dashboard-card,.panel,.real-badge,.badge-card,.progress-track>span').forEach((node,i)=>{
      if(seen.has(node))return;seen.add(node);
      visibility.observe(node);
      if(node.matches('.progress-track>span')){node.classList.add('motion-progress');return;}
      if(enabled()&&!node.hidden)node.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,delay:Math.min(i,6)*50,easing:'ease-out'});
    });
    root.querySelectorAll(cardSelector).forEach(card=>{
      card.classList.add(card.matches('.locked')?'motion-locked':'motion-earned');
      if(card.querySelector('.motion-foil'))return;
      const foil=document.createElement('span');foil.className='motion-foil';foil.setAttribute('aria-hidden','true');card.append(foil);
      if(card.matches('.locked')){
        const tip=document.createElement('span');tip.className='motion-badge-tip';
        // No guessed completion percentage: only XP criteria may be quantified.
        tip.textContent=t('查看获取方法 · 积分之外还需核验','View requirements · Verification also required');
        card.append(tip);
      }
    });
    updateLockedProgress();
    root.querySelectorAll('.badge-rule-detail').forEach(detail=>{
      if(detail.querySelector('.motion-preview'))return;
      const button=document.createElement('button');button.type='button';button.className='secondary motion-preview';button.textContent=t('✦ 预览点亮效果','✦ Preview unlock');
      const note=document.createElement('span');note.className='motion-preview-note';note.textContent=t('仅动效预览，不会授予徽章或积分。','Visual preview only. No badge or XP is awarded.');
      detail.querySelector('.guide-status')?.after(button,note);
      button.onclick=()=>burst(detail.querySelector('.badge-illustration'));
    });
    root.querySelectorAll('a').forEach(link=>{
      if(link.querySelector('.motion-arrow'))return;
      const walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){if(!node.textContent.includes('↗'))continue;const parts=node.textContent.split('↗'),fragment=document.createDocumentFragment();parts.forEach((part,i)=>{if(i){const arrow=document.createElement('span');arrow.className='motion-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';fragment.append(arrow);}fragment.append(document.createTextNode(part));});node.replaceWith(fragment);break;}
    });
    if(pendingUnlocks.length){const ids=pendingUnlocks;pendingUnlocks=[];for(const id of ids){const card=[...root.querySelectorAll(cardSelector)].find(c=>c.querySelector('[data-badge-rule]')?.dataset.badgeRule===id||c.getAttribute('href')==='#badges/'+encodeURIComponent(id));if(card)burst(card.querySelector('.badge-illustration'));}}
  }
  new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(mount);}).observe(root,{childList:true,subtree:true,characterData:true});
  function updateLockedProgress(){
    root.querySelectorAll('.motion-locked[data-xp-target]').forEach(card=>{const tip=card.querySelector('.motion-badge-tip'),stamp=card.dataset.xp+'/'+card.dataset.xpTarget;if(!tip||tip.dataset.progress===stamp)return;tip.dataset.progress=stamp;const xp=Number(card.dataset.xp),target=Number(card.dataset.xpTarget);tip.textContent=t('积分条件：','XP criterion: ')+xp+' / '+target+' XP · '+t('仍需核验其他条件','Other criteria require review');const track=document.createElement('span');track.className='motion-locked-progress';const fill=document.createElement('i');fill.style.width=Math.min(100,xp/target*100)+'%';track.append(fill);tip.append(track);});
  }
  window.addEventListener('spaceqat-progress-ready',updateLockedProgress);
  const demoModal=document.querySelector('#modal');if(demoModal)new MutationObserver(()=>{
    // Demo dialogs live outside the main renderer; use the same safe preview.
    const detail=demoModal.querySelector('.badge-rule-detail');if(!detail||detail.querySelector('.motion-preview'))return;
    const button=document.createElement('button');button.type='button';button.className='btn motion-preview';button.textContent=t('✦ 预览点亮效果（仅预览）','✦ Preview unlock (visual only)');detail.querySelector('.guide-status')?.after(button);button.onclick=()=>burst(detail.querySelector('.badge-illustration'));
  }).observe(demoModal,{childList:true,subtree:true});
  function resetTilt(){if(tiltFrame)cancelAnimationFrame(tiltFrame);tiltFrame=0;if(tilted){tilted.style.removeProperty('--tilt-x');tilted.style.removeProperty('--tilt-y');tilted.classList.remove('is-tilting');tilted=null;}}
  root.addEventListener('pointermove',event=>{
    if(!enabled()||!fine.matches||event.pointerType==='touch')return;
    const card=event.target.closest('.motion-earned');if(!card){resetTilt();return;}
    if(tilted!==card){resetTilt();tilted=card;}if(tiltFrame)return;
    const x=event.clientX,y=event.clientY;
    tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;if(!card.isConnected)return;const r=card.getBoundingClientRect();card.style.setProperty('--tilt-x',((.5-(y-r.top)/r.height)*7)+'deg');card.style.setProperty('--tilt-y',(((x-r.left)/r.width-.5)*7)+'deg');card.classList.add('is-tilting');});
  });
  root.addEventListener('pointerleave',resetTilt);
  // One indicator survives content replacement; derives its geometry from the active link.
  const nav=document.querySelector('.member-tabs')||document.querySelector('.sidebar nav');
  if(nav){const indicator=document.createElement('span');indicator.className='motion-nav-indicator';indicator.setAttribute('aria-hidden','true');nav.append(indicator);nav.classList.add('motion-nav');
    let navFrame=0;const update=()=>{navFrame=0;const active=nav.querySelector('a[aria-current="page"],a.active');if(!active||nav.hidden){indicator.hidden=true;return;}indicator.hidden=false;const a=active.getBoundingClientRect(),b=nav.getBoundingClientRect();indicator.style.width=a.width+'px';indicator.style.height=a.height+'px';indicator.style.transform=`translate(${a.left-b.left+nav.scrollLeft}px,${a.top-b.top+nav.scrollTop}px)`;};
    const schedule=()=>{if(!navFrame)navFrame=requestAnimationFrame(update);};
    new MutationObserver(schedule).observe(nav,{attributes:true,attributeFilter:['aria-current','class','hidden'],subtree:true,childList:true});new ResizeObserver(schedule).observe(nav);window.addEventListener('resize',schedule);schedule();
  }
  function stop(){resetTilt();for(const [node,id] of activeCounts){cancelAnimationFrame(id);node.removeAttribute('data-count-display');}activeCounts.clear();if(!enabled())root.getAnimations({subtree:true}).forEach(a=>a.cancel());}
  reduced.addEventListener('change',stop);document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('motion-paused',document.hidden);stop();});
  window.spaceqatMotion={observeAwards(userId,awards){
    // Baseline the first visit: existing awards are not presented as newly granted.
    const key='spaceqat-seen-awards:'+userId,ids=awards.map(a=>a.badge_id);try{const old=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.setItem(key,JSON.stringify(ids));if(Array.isArray(old)){pendingUnlocks=ids.filter(id=>!old.includes(id));if(!frame)frame=requestAnimationFrame(mount);}}catch{/* Optional celebration never blocks the member area. */}
  }};
  mount();
})();
