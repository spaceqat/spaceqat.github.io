#!/usr/bin/env node
// Update the static, accessible partner galleries from their shared data source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- PARTNER_GALLERY_START -->';
const END = '<!-- PARTNER_GALLERY_END -->';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function gallery(items, lang = 'zh') {
  const seen = new Set();
  const cards = items.map(item => {
    const name = item.name.trim();
    if (!name || seen.has(name)) throw new Error(`Empty or duplicate partner name: ${name}`);
    seen.add(name);
    const label = escape(lang === 'en' ? item.nameEn || name : name);
    const logo = item.logo || '';
    const website = item.website || '';
    if (website && new URL(website).protocol !== 'https:') throw new Error(`Partner website must use HTTPS: ${name}`);
    let content;
    if (logo) {
      const logoPath = path.resolve(ROOT, logo);
      const partnerRoot = path.resolve(ROOT, 'assets', 'partners') + path.sep;
      if (!logoPath.startsWith(partnerRoot) || !fs.existsSync(logoPath)) throw new Error(`Missing or invalid local logo: ${logo}`);
      const theme = item.theme === 'dark' ? ' theme-dark' : '';
      content = `<span class="partner-logo-image${theme}"><img src="${escape(logo)}" alt="" loading="lazy" decoding="async"></span><span class="partner-logo-name">${label}</span>`;
    } else {
      content = `<span class="partner-text-name">${label}</span>`;
    }
    const inner = website
      ? `<a class="partner-logo-inner" href="${escape(website)}" target="_blank" rel="noopener noreferrer">${content}</a>`
      : `<div class="partner-logo-inner">${content}</div>`;
    return `  <li class="partner-logo-card">${inner}</li>`;
  });
  return `<ul class="partner-logo-grid">\n${cards.join('\n')}\n</ul>`;
}

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'partners.json'), 'utf8'));
const pages = {
  'index.html': { lang: 'zh', initiators: '共同发起方', committee: '委员单位', partners: '共建伙伴', order: '排名顺序不分先后', guidance: '指导单位' },
  'en.html': { lang: 'en', initiators: 'Co-initiators', committee: 'Committee Members', partners: 'Ecosystem Partners', order: 'Listed in no particular order', guidance: 'Guiding Organization' }
};

for (const [filename, labels] of Object.entries(pages)) {
  let markup = '\n<div class="partners-gallery">\n<div class="organizers">\n';
  for (const key of ['initiators', 'committee']) {
    markup += `<div class="organizer"><h3>${labels[key]}</h3>\n${gallery(data[key], labels.lang)}\n</div>\n`;
  }
  markup += `</div>\n<div class="partner-network">\n<div class="partner-caption"><h3>${labels.partners}</h3><small>${labels.order}</small></div>\n`;
  markup += gallery(data.partners, labels.lang);
  markup += '\n</div>\n</div>\n';
  const pagePath = path.join(ROOT, filename);
  let source = fs.readFileSync(pagePath, 'utf8');
  if (!source.includes(START) || !source.includes(END)) throw new Error(`Partner gallery markers are missing from ${filename}`);
  source = source.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}${markup}${END}`);
  const guidance = data.guidance.map(item => escape(labels.lang === 'en' ? item.nameEn || item.name : item.name)).join('<br>');
  const guidancePattern = new RegExp(`(<div class="guidance"><small>${labels.guidance}</small><p>)[\\s\\S]*?(</p></div>)`);
  if (!guidancePattern.test(source)) throw new Error(`Guidance block is missing from ${filename}`);
  source = source.replace(guidancePattern, `$1${guidance}$2`);
  fs.writeFileSync(pagePath, source);
}

const count = ['initiators', 'committee', 'partners'].reduce((sum, key) => sum + data[key].length, 0);
console.log(`Updated ${count} partner cards in Chinese and English pages.`);
