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
  const english = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = english ? {
    all: 'All', featured: 'Featured', read: 'Read article ', fallbackSource: 'Community Update',
    emptyMatch: 'No updates match your search. Try another keyword or category.',
    empty: 'New conversations are taking shape. Please visit again soon.',
    loading: 'Loading community updates…', failed: 'Updates could not be loaded. Please try again later.',
    retry: 'Try again', failedStatus: 'Updates could not be loaded. Please try again.',
    count: total => `${total} update${total === 1 ? '' : 's'}`,
    shown: (visible, total) => `Showing ${visible} of ${total} updates`
  } : {
    all: '全部', featured: '精选', read: '阅读原文 ', fallbackSource: '社区动态',
    emptyMatch: '暂时没有匹配的动态，试试其他关键词或分类。',
    empty: '新的交流正在酝酿，欢迎再次来访。', loading: '正在加载社区动态…',
    failed: '动态暂时未能加载，请稍后重试。', retry: '重新加载', failedStatus: '动态暂时未能加载，请重试。',
    count: total => `共 ${total} 条动态`, shown: (visible, total) => `已显示 ${visible} 条，共 ${total} 条动态`
  };
  let entries = [], category = copy.all, query = '', limit = pageSize, ready = false;

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
    visual.dataset.kind = item.categoryKey;
    visual.setAttribute('aria-hidden', 'true');
    visual.append(element('span', 'community-art-label', item.label || item.category));
    visual.append(element('span', 'community-art-mark', item.categoryKey === '工具更新' ? '{ }' : '↗'));
    const body = element('div', 'community-card-body');
    const meta = element('div', 'community-card-meta');
    meta.append(element('span', 'community-category', item.category));
    if (item.date) {
      const time = element('time', '', item.date.replaceAll('-', '.'));
      time.dateTime = item.date;
      meta.append(time);
    } else if (item.featured) {
      meta.append(element('span', '', copy.featured));
    }
    body.append(meta, element('h3', '', item.title), element('p', '', item.summary));
    const foot = element('div', 'community-card-foot');
    const read = element('span', 'community-read', copy.read);
    const arrow = element('span', 'community-read-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    read.append(arrow);
    foot.append(element('span', '', item.source || copy.fallbackSource), read);
    body.append(foot);
    link.append(visual, body);
    article.append(link);
    return article;
  }

  function render(focusNew = false) {
    if (!ready) return;
    const oldCount = host.children.length;
    const matching = entries.filter(item => (category === copy.all || item.category === category) &&
      `${item.title} ${item.summary} ${item.category}`.toLocaleLowerCase().includes(query));
    const visible = matching.slice(0, archive ? limit : 3);
    host.replaceChildren(...visible.map(card));
    if (!visible.length) host.append(element('p', 'community-empty', entries.length ? copy.emptyMatch : copy.empty));
    if (count) count.textContent = visible.length < matching.length ? copy.shown(visible.length, matching.length) : copy.count(matching.length);
    if (more) more.hidden = visible.length >= matching.length;
    if (focusNew) host.children[oldCount]?.querySelector('a')?.focus();
  }

  function setupFilters() {
    if (!filters) return;
    const categories = [...new Set([copy.all, ...entries.map(item => item.category)])];
    if (!categories.includes(category)) category = copy.all;
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
    if (count) count.textContent = copy.loading;
    host.setAttribute('aria-busy', 'true');
    host.replaceChildren(element('p', 'community-empty', copy.loading));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('data/news.json', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('News unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid news format');
      entries = data.filter(validEntry).map(item => ({
        ...item,
        categoryKey: item.category,
        title: english && item.titleEn ? item.titleEn : item.title,
        summary: english && item.summaryEn ? item.summaryEn : item.summary,
        category: english && item.categoryEn ? item.categoryEn : item.category,
        source: english && item.sourceEn ? item.sourceEn : item.source,
        label: english && item.labelEn ? item.labelEn : item.label,
        date: validDate(item.date)
      }))
        .sort((a, b) => Number(b.featured === true) - Number(a.featured === true) || b.date.localeCompare(a.date));
      ready = true;
      if (search) search.disabled = false;
      setupFilters(); render();
      if (fromRetry) (search || host.querySelector('a'))?.focus();
    } catch {
      const message = element('div', 'community-empty');
      message.append(element('p', '', copy.failed));
      const retry = element('button', 'community-filter', copy.retry);
      retry.type = 'button'; retry.addEventListener('click', () => load(true));
      message.append(retry); host.replaceChildren(message);
      if (count) count.textContent = copy.failedStatus;
      if (more) more.hidden = true;
      if (fromRetry) retry.focus();
    } finally { clearTimeout(timeout); host.setAttribute('aria-busy', 'false'); }
  }

  search?.addEventListener('input', () => { query = search.value.trim().toLocaleLowerCase(); limit = pageSize; render(); });
  more?.addEventListener('click', () => { limit += pageSize; render(true); });
  load();
})();
