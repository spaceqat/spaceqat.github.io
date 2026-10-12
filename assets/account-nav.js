(() => {
  const client=window.spaceqatClient;
  if (!client) return;
  const en=document.documentElement.lang.startsWith('en');
  const entries=[...document.querySelectorAll('a[href^="account.html"]')];
  const signedOut=entries.map(a=>({text:a.innerHTML,href:a.getAttribute('href'),title:a.getAttribute('title')}));
  function update(session){
    entries.forEach((a,i)=>{
      if(session?.user){
        a.textContent=en?'My space':'我的个人空间';
        a.href=en?'account.html?lang=en#profile':'account.html#profile';
        a.title=en?'Open my personal space':'进入我的个人空间';
      }else{
        a.innerHTML=signedOut[i].text;a.setAttribute('href',signedOut[i].href);
        if(signedOut[i].title)a.title=signedOut[i].title;else a.removeAttribute('title');
      }
    });
  }
  let revision=0;
  async function refresh(){const ticket=++revision;try{const {data,error}=await client.auth.getSession();if(ticket===revision)update(error?null:data.session);}catch{if(ticket===revision)update(null);}}
  client.auth.onAuthStateChange((_event,session)=>{revision++;update(session);});
  window.addEventListener('pageshow',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  refresh();
})();
