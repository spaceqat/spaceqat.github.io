#!/usr/bin/env python3
"""Update the static, accessible partner gallery from its source list."""
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
START = '<!-- PARTNER_GALLERY_START -->'
END = '<!-- PARTNER_GALLERY_END -->'


def gallery(items):
    cards = []
    seen = set()
    for item in items:
        name = item['name'].strip()
        if not name or name in seen:
            raise ValueError(f'Empty or duplicate partner name: {name}')
        seen.add(name)
        label = html.escape(name)
        logo = item.get('logo', '')
        website = item.get('website', '')
        if website and urlparse(website).scheme != 'https':
            raise ValueError(f'Partner website must use HTTPS: {name}')
        if logo:
            path = (ROOT / logo).resolve()
            if not path.is_relative_to(ROOT / 'assets' / 'partners') or not path.is_file():
                raise ValueError(f'Missing or invalid local logo: {logo}')
            theme = ' theme-dark' if item.get('theme') == 'dark' else ''
            content = (f'<span class="partner-logo-image{theme}"><img src="{html.escape(logo, quote=True)}" '
                       f'alt="" loading="lazy" decoding="async"></span>'
                       f'<span class="partner-logo-name">{label}</span>')
        else:
            content = f'<span class="partner-text-name">{label}</span>'
        if website:
            inner = (f'<a class="partner-logo-inner" href="{html.escape(website, quote=True)}" '
                     f'target="_blank" rel="noopener noreferrer">{content}</a>')
        else:
            inner = f'<div class="partner-logo-inner">{content}</div>'
        cards.append(f'  <li class="partner-logo-card">{inner}</li>')
    return '<ul class="partner-logo-grid">\n' + '\n'.join(cards) + '\n</ul>'


def main():
    data = json.loads((ROOT / 'data' / 'partners.json').read_text())
    markup = '\n<div class="partners-gallery">\n<div class="organizers">\n'
    for key, title in [('initiators', '共同发起方'), ('committee', '委员单位')]:
        markup += f'<div class="organizer"><h3>{title}</h3>\n{gallery(data[key])}\n</div>\n'
    markup += ('</div>\n<div class="partner-network">\n<div class="partner-caption">'
               '<h3>共建伙伴</h3><small>排名顺序不分先后</small></div>\n')
    markup += gallery(data['partners'])
    markup += '\n</div>\n</div>\n'
    page = ROOT / 'index.html'
    source = page.read_text()
    if START not in source or END not in source:
        raise ValueError('Partner gallery markers are missing from index.html')
    source = re.sub(re.escape(START) + r'.*?' + re.escape(END),
                    lambda _: START + markup + END, source, flags=re.S)
    guidance = '<br>'.join(html.escape(item['name']) for item in data['guidance'])
    source, updated = re.subn(r'(<div class="guidance"><small>指导单位</small><p>).*?(</p></div>)',
                              lambda match: match[1] + guidance + match[2], source, count=1)
    if updated != 1:
        raise ValueError('Guidance block is missing from index.html')
    page.write_text(source)
    print(f'Updated {sum(len(data[key]) for key in ("initiators", "committee", "partners"))} partner cards.')


if __name__ == '__main__':
    main()
