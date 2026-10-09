/* Both pages read the same content file. Text is rendered without HTML injection. */
(() => {
  const host = document.querySelector('[data-news]');
  if (!host) return;
  const archive = host.dataset.news === 'archive';
  const filters = document.querySelector('[data-news-filters]');
  const search = document.querySelector('#news-search');
  const more = document.querySelector('[data-news-more]');
  const count = document.querySelector('[data-news-count]');
  const pageSize = 9;
  let entries = [], category = '全部', query = '', limit = pageSize, ready = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function validEntry(item) {
    if (!item || item.published === false) return false;
    if (!['id', 'title', 'summary', 'category', 'url'].every(key => typeof item[key] === 'string' && item[key].trim())) return false;
    try { return new URL(item.url).protocol === 'https:'; } catch { return false; }
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
  }

  function card(item) {
    const article = element('article', `community-card${item.featured ? ' is-featured' : ''}`);
    const link = element('a', 'community-card-link');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const visual = element('div', 'community-card-art');
    visual.dataset.kind = item.category;
    visual.setAttribute('aria-hidden', 'true');
    visual.append(element('span', 'community-art-label', item.label || item.category));
    visual.append(element('span', 'community-art-mark', item.category === '工具更新' ? '{ }' : '↗'));
    const body = element('div', 'community-card-body');
    const meta = element('div', 'community-card-meta');
    meta.append(element('span', 'community-category', item.category));
    if (item.date) {
      const time = element('time', '', item.date.replaceAll('-', '.'));
      time.dateTime = item.date;
      meta.append(time);
    } else if (item.featured) {
      meta.append(element('span', '', '精选'));
    }
    body.append(meta, element('h3', '', item.title), element('p', '', item.summary));
    const foot = element('div', 'community-card-foot');
    foot.append(element('span', '', item.source || '社区动态'), element('span', 'community-read', '阅读原文 ↗'));
    body.append(foot);
    link.append(visual, body);
    article.append(link);
    return article;
  }

  function render(focusNew = false) {
    if (!ready) return;
    const oldCount = host.children.length;
    const matching = entries.filter(item => (category === '全部' || item.category === category) &&
      `${item.title} ${item.summary} ${item.category}`.toLocaleLowerCase().includes(query));
    const visible = matching.slice(0, archive ? limit : 3);
    host.replaceChildren(...visible.map(card));
    if (!visible.length) host.append(element('p', 'community-empty', entries.length ? '暂时没有匹配的动态，试试其他关键词或分类。' : '新的交流正在酝酿，欢迎再次来访。'));
    if (count) count.textContent = visible.length < matching.length ? `已显示 ${visible.length} 条，共 ${matching.length} 条动态` : `共 ${matching.length} 条动态`;
    if (more) more.hidden = visible.length >= matching.length;
    if (focusNew) host.children[oldCount]?.querySelector('a')?.focus();
  }

  function setupFilters() {
    if (!filters) return;
    const categories = [...new Set(['全部', ...entries.map(item => item.category)])];
    if (!categories.includes(category)) category = '全部';
    filters.replaceChildren(...categories.map(name => {
      const button = element('button', 'community-filter', name);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(name === category));
      button.addEventListener('click', () => {
        category = name; limit = pageSize;
        filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        render();
      });
      return button;
    }));
  }

  async function load(fromRetry = false) {
    ready = false;
    if (search) search.disabled = true;
    filters?.querySelectorAll('button').forEach(button => { button.disabled = true; });
    if (more) more.hidden = true;
    if (count) count.textContent = '正在加载社区动态…';
    host.setAttribute('aria-busy', 'true');
    host.replaceChildren(element('p', 'community-empty', '正在加载社区动态…'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('data/news.json', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('News unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid news format');
      entries = data.filter(validEntry).map(item => ({ ...item, date: validDate(item.date) }))
        .sort((a, b) => Number(b.featured === true) - Number(a.featured === true) || b.date.localeCompare(a.date));
      ready = true;
      if (search) search.disabled = false;
      setupFilters(); render();
      if (fromRetry) (search || host.querySelector('a'))?.focus();
    } catch {
      const message = element('div', 'community-empty');
      message.append(element('p', '', '动态暂时未能加载，请稍后重试。'));
      const retry = element('button', 'community-filter', '重新加载');
      retry.type = 'button'; retry.addEventListener('click', () => load(true));
      message.append(retry); host.replaceChildren(message);
      if (count) count.textContent = '动态暂时未能加载，请重试。';
      if (more) more.hidden = true;
      if (fromRetry) retry.focus();
    } finally { clearTimeout(timeout); host.setAttribute('aria-busy', 'false'); }
  }

  search?.addEventListener('input', () => { query = search.value.trim().toLocaleLowerCase(); limit = pageSize; render(); });
  more?.addEventListener('click', () => { limit += pageSize; render(true); });
  load();
})();
