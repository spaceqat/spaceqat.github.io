(() => {
  const header = document.querySelector('.header');
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.nav-links');
  const english = document.documentElement.lang.toLowerCase().startsWith('en');
  const labels = english ? { open: 'Open navigation', close: 'Close navigation' } : { open: '打开导航', close: '关闭导航' };
  const close = () => {
    nav.classList.remove('open'); header.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', labels.open);
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('open', open); header.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? labels.close : labels.open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { close(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.header')) close(); });
  const scroll = () => header.classList.toggle('scrolled', window.scrollY > 35);
  window.addEventListener('scroll', scroll, { passive: true }); scroll();
  const menuWidth = document.documentElement.dataset.designVersion === '5' ? 900 : 600;
  window.matchMedia(`(max-width:${menuWidth}px)`).addEventListener('change', event => { if (!event.matches) close(); });
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
