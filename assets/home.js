/* Restrained progressive enhancement: all content remains visible without JS. */
(() => {
  const hero = document.querySelector('.hero');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero) return;
  let timer;
  let pending = true;
  const finish = () => {
    clearTimeout(timer);
    hero.classList.remove('hero-opening');
    hero.classList.add('hero-opened');
  };
  const play = () => {
    if (reduce.matches) return;
    pending = false;
    clearTimeout(timer);
    hero.classList.remove('hero-opening', 'hero-opened');
    void hero.offsetWidth;
    hero.classList.add('hero-opening');
    timer = setTimeout(finish, 3200);
  };
  const playWhenVisible = () => {
    if (pending && hero.getBoundingClientRect().top >= -100) play();
  };
  // Wait for the actual viewport, including restored scroll positions and anchor navigation.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) playWhenVisible();
    }, { threshold: [0, .5, .9, 1] }).observe(hero);
  }
  window.addEventListener('scroll', playWhenVisible, { passive: true });
  const replay = () => { pending = true; playWhenVisible(); };
  document.querySelectorAll('a[href="#top"]').forEach(link => link.addEventListener('click', replay));
  window.addEventListener('hashchange', () => {
    if (location.hash === '#top' || !location.hash) replay();
    else { pending = false; finish(); }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) replay(); });
  hero.addEventListener('focusin', () => { pending = false; finish(); });
  reduce.addEventListener('change', event => { if (event.matches) finish(); });
  requestAnimationFrame(playWhenVisible);
})();

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.animate([{ transform: 'translateY(16px)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'ease-out' });
      observer.unobserve(entry.target);
    });
  }, { threshold: .12 });
  document.querySelectorAll('.section-heading, .about-layout, .audience-card').forEach(item => observer.observe(item));
  const sequenceObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('sequence-visible');
      sequenceObserver.unobserve(entry.target);
    });
  }, { threshold: .25 });
  document.querySelectorAll('.space-dimensions > div, .journey > li').forEach(item => {
    const index = [...item.parentElement.children].indexOf(item);
    item.style.setProperty('--sequence-delay', `${index * 160}ms`);
    sequenceObserver.observe(item);
  });
  const foundation = document.querySelector('.foundation-art');
  const artObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      foundation.classList.add('motion-ready');
      artObserver.disconnect();
    }
  });
  if (foundation) artObserver.observe(foundation);
  reduce.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    sequenceObserver.disconnect();
    artObserver.disconnect();
    document.getAnimations().filter(animation => !animation.animationName).forEach(animation => animation.cancel());
  });
})();

/* A one-time closing sequence; all content is visible without scripting. */
(() => {
  const section = document.querySelector('.closing');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || reduce.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    section.classList.add('closing-revealed');
    observer.disconnect();
  }, { threshold: .2 });
  observer.observe(section);
  const settle = () => {
    observer.disconnect();
    section.classList.remove('closing-revealed');
  };
  section.addEventListener('focusin', settle);
  reduce.addEventListener('change', event => { if (event.matches) settle(); });
})();

/* The original gallery remains the accessible, searchable source of truth. */
(() => {
  const network = document.querySelector('.partner-network');
  const grid = network?.querySelector(':scope > .partner-logo-grid');
  if (!grid) return;
  const english = document.documentElement.lang.toLowerCase().startsWith('en');
  const labels = english ? {
    pause: 'Pause motion', resume: 'Resume motion', view: 'View all partners', back: 'Return to moving display',
    hint: 'Hover to pause · Swipe horizontally on mobile'
  } : {
    pause: '暂停滚动', resume: '继续滚动', view: '查看全部伙伴', back: '返回滚动展示',
    hint: '悬停暂停 · 手机可左右滑动'
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = document.createElement('div');
  controls.className = 'partner-motion-controls';
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.textContent = labels.pause;
  pause.setAttribute('aria-pressed', 'false');
  const all = document.createElement('button');
  all.type = 'button';
  all.textContent = labels.view;
  all.setAttribute('aria-expanded', 'false');
  grid.id = 'all-partners';
  all.setAttribute('aria-controls', grid.id);
  const hint = document.createElement('span');
  hint.textContent = labels.hint;
  controls.append(pause, all, hint);
  const marquee = document.createElement('div');
  marquee.className = 'partner-marquee';
  marquee.setAttribute('aria-hidden', 'true');
  const cards = [...grid.children];
  const middle = Math.ceil(cards.length / 2);
  for (const group of [cards.slice(0, middle), cards.slice(middle)]) {
    const row = document.createElement('div');
    row.className = 'partner-scroll-row';
    const track = document.createElement('div');
    track.className = 'partner-scroll-track';
    for (let copy = 0; copy < 2; copy++) {
      const list = document.createElement('ul');
      list.className = 'partner-scroll-group';
      for (const card of group) {
        const clone = card.cloneNode(true);
        clone.querySelectorAll('a').forEach(link => {
          const wrapper = document.createElement('div');
          wrapper.className = link.className;
          wrapper.append(...link.childNodes);
          link.replaceWith(wrapper);
        });
        clone.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
        list.append(clone);
      }
      track.append(list);
    }
    row.append(track);
    marquee.append(row);
  }
  grid.before(controls, marquee);
  let paused = false;
  let expanded = false;
  function sync() {
    grid.hidden = !reduce.matches && !expanded;
    marquee.hidden = reduce.matches || expanded;
    controls.hidden = reduce.matches;
    network.classList.toggle('motion-paused', paused);
    pause.textContent = paused ? labels.resume : labels.pause;
    pause.setAttribute('aria-pressed', String(paused));
    pause.hidden = expanded;
    all.textContent = expanded ? labels.back : labels.view;
    all.setAttribute('aria-expanded', String(expanded));
    hint.hidden = expanded;
  }
  pause.addEventListener('click', () => { paused = !paused; sync(); });
  all.addEventListener('click', () => { expanded = !expanded; sync(); });
  reduce.addEventListener('change', sync);
  sync();
})();
