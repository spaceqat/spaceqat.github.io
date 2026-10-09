# 量立方 SpaceQat 官网

连接科研、教育、产业与全球开发者的量子开源社区。首页保留“开放每一面，叠加无限可能。”与“We built a SPACE for Quantum.”，以社区活动与交流为先，FatQat 是社区中的开源工具项目。

网站仓库：https://github.com/spaceqat/spaceqat.github.io  
网站域名：https://space-qat.com

## 维护活动与动态

**只需要修改 [`data/news.json`](data/news.json)，不用改网页。** 首页展示前 3 条，完整内容显示在 [`events.html`](events.html)。两处共用同一份清单；活动页支持分类、关键词搜索和分批加载。

1. 使用有仓库写入权限的 GitHub 账号打开 [动态清单编辑页](https://github.com/spaceqat/spaceqat.github.io/edit/main/data/news.json)。
2. 新增时复制一整条记录，修改内容，并为 `id` 换一个唯一名称；编辑时直接修改对应字段。
3. 临时下架：把 `published` 改为 `false`。删除：移除对应的整个 `{ ... }`，并检查相邻记录之间的逗号。
4. 点击 **Commit changes** 保存。GitHub Pages 完成发布后，刷新首页和活动页即可看到更新。

这是随 GitHub 提交发布的静态网站。无需独立服务器或后台账号；保存后需要等待 GitHub Pages 部署和缓存更新，**不是保存即刻在线生效**。页面请求内容时不使用浏览器缓存。

单条记录示例（添加到最外层 `[` 和 `]` 之间，相邻记录用逗号分隔，最后一条后面不加逗号）：

```json
{
  "id": "your-unique-event-id",
  "title": "活动标题",
  "summary": "一到两句话介绍活动或动态。",
  "category": "活动交流",
  "date": "2026-10-09",
  "url": "https://example.com/article",
  "source": "来源名称",
  "label": "交流分享",
  "featured": false,
  "published": true
}
```

| 字段 | 如何填写 |
| --- | --- |
| `id` | 唯一、稳定的标识，建议英文小写加连字符 |
| `title` / `summary` | 标题和简短介绍，使用普通文字 |
| `category` | 建议用“活动交流”“社区新闻”“工具更新”；新分类会自动出现在活动页 |
| `date` | 已核实的日期，格式 `YYYY-MM-DD`；未知时用 `null`，页面不展示日期 |
| `url` | 完整的 HTTPS 原文链接，点击后在新标签页打开 |
| `source` | 来源名称，例如媒体、公众号或 GitHub Releases |
| `label` | 卡片顶部的短标题，建议 4–6 个汉字 |
| `featured` | `true` 置顶，`false` 普通展示 |
| `published` | `true` 上线，`false` 隐藏 |

置顶记录优先，其余按日期由新到旧排列；没有日期的记录排在同组末尾，同日保持清单中的顺序。首页最多展示 3 条，活动页每次展示 9 条，可点击“加载更多动态”。搜索和分类会同时生效。JSON 格式错误时，页面会显示加载失败提示及重试按钮。

“浦江量话”采用提供的微信标题和原文链接。原文访问验证使活动日期暂未核实，故 `date` 保持 `null`，待确认后填写；没有把收录日期当成活动日期。

## 共建伙伴

保留“指导单位 / 共同发起方 / 委员单位 / 共建伙伴”的分组。共建伙伴按首次出现的顺序去除重复名称，新增“量观知元”“量子元匙”。采用响应式 Logo 展示墙；没有确认官方 Logo 的机构使用文字卡片。

- 机构清单与 Logo 配置：[`data/partners.json`](data/partners.json)。
- 图片：`assets/partners/`。来源及未找到素材的说明见 [`SOURCES.md`](assets/partners/SOURCES.md)。
- 维护清单后运行 `python3 scripts/build_partners.py` 更新首页伙伴区，再一起提交。伙伴区为静态 HTML，关闭 JavaScript 仍可阅读。
- Logo 保持官方颜色和比例。白字品牌使用深色底，其余使用浅色底。机构名称始终可读，文字卡片不是自行设计的品牌 Logo。

## 本地预览

无需安装依赖或编译。因动态清单通过 HTTP 读取，请在仓库目录启动一个本地静态服务器：

```sh
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000/` 和 `http://localhost:8000/events.html`。直接双击 HTML 打开的 `file://` 页面无法可靠读取动态清单。

## 页面与资源

- `index.html`：首页内容、参与方式、编译路线与受众切换。
- `events.html`：活动与动态完整列表。
- `assets/site.css`：共享的基础样式、本地字体和既有页面布局。
- `assets/community.css`：社区卡片、活动页、伙伴 Logo 展示墙及移动端布局。
- `assets/community.js`：动态读取、筛选、搜索与加载更多；文本安全渲染，链接仅允许 HTTPS。
- `assets/navigation.js`：活动页的移动导航。
- `assets/fonts/`：本地 Manrope、Noto Sans SC 与 Noto Serif SC 字体子集及许可证。新增字形缺失时回落至系统字体。
- `assets/quantum-architecture.webp`、`open-foundations.webp`、`quantum-horizon.webp`：原有生成概念艺术，不是真实设备照片；提示词保存在 `IMAGE-PROMPT*.txt`。

页面不依赖远程字体、前端框架、分析追踪或表单服务。菜单、分类和标签页支持键盘操作，动效遵循系统“减少动态效果”设置。活动列表需要 JavaScript；禁用时提供浦江量话原文入口。

## 发布

继续使用仓库既有的 GitHub Pages 发布方式，保留 `.nojekyll`。在 Settings → Pages 中核对发布来源为 `main` 分支根目录。内容与静态资源提交到 `main` 后随 GitHub Pages 发布。

域名相关设置以仓库当前 Settings → Pages 和 DNS 为准。更换域名时同步修改 `robots.txt`、`sitemap.xml`、两页的 canonical 与 Open Graph URL；如使用 `CNAME` 文件，也需保持一致。本次修改不更改域名配置。

## 技术口径

SpaceQat 社区定位 → 活动与交流 → 开源工具 FatQat → 开放基座 → 参与方式 → 共建伙伴。保留协作者的社区介绍与 FatQat 技术表述。

FatQat 当前公开编译目标为超导、中性原子；更多体系持续探索，真实量子硬件接入属于后续计划。技术依据：[编译指南](https://fatqat.readthedocs.io/en/latest/guide/compiler/)、[Compiler API](https://fatqat.readthedocs.io/en/latest/api/compiler/)、[执行模型](https://fatqat.readthedocs.io/en/latest/guide/execution-models/)。
