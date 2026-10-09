# 量立方 SpaceQat 官网

连接科研、教育、产业与全球开发者的量子开源社区。首页保留“开放每一面，叠加无限可能。”与“We build a SPACE for Quantum.”，通过品牌介绍、FatQat 开源工具、参与方式、社区动态与伙伴生态串联内容。

## 第五版首页布局

首页使用 `assets/home.css` 和 `assets/home.js`；活动列表使用 `assets/events.css` 与同一套首页样式，两页共用 `assets/community.js` 与 `assets/navigation.js`。无需构建，使用静态 HTTP 服务即可预览。

- 首屏采用居中宣言，随后交替使用深蓝与浅色章节。FatQat 分为表达、编译、仿真与连接四步；面向各种量子比特体系描述硬件约束，真实硬件接口使用“将会陆续开放”的表述。
- 正文字号：桌面 18px，手机 16px；辅助文字至少 14px；首屏标题 34–88px，章节标题按屏宽缩放。
- 三类参与者直接展示；新闻保留同一数据源，以首条重点内容和两条简讯呈现；伙伴分组和生成标记保留。
- 菜单断点为 900px。首屏开盒、SPACE 维度、FatQat 流程、伙伴滚动和尾部动效均采用渐进增强，正文不会依赖 JavaScript 才能出现；减少动态效果偏好会关闭动效。
- 本地检查覆盖 1440、768、390、320px 宽度、横向溢出、菜单、资源与页面锚点。

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

保留“指导单位 / 共同发起方 / 委员单位 / 共建伙伴”的分组。共建伙伴按首次出现的顺序去除重复名称，采用响应式 Logo 展示墙和可暂停的双排滚动；没有确认 Logo 的机构使用文字卡片。

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

- `index.html`：首页内容、参与方式、开源工具与伙伴展示。
- `events.html`：活动与动态完整列表。
- `assets/home.css`：首页与活动页共享的字体、色彩、布局及动效。
- `assets/events.css`：活动页的专用布局、筛选区与列表卡片。
- `assets/community.css`：社区卡片与伙伴 Logo 的基础样式。
- `assets/community.js`：动态读取、筛选、搜索与加载更多；文本安全渲染，链接仅允许 HTTPS。
- `assets/navigation.js`：活动页的移动导航。
- `docs/membership-badges.md`：会员与 Badge 体系的方案草案；账号、申请和服务端权限尚未上线。
- `assets/fonts/`：本地 Manrope、Noto Sans SC 与 Noto Serif SC 字体子集及许可证。新增字形缺失时回落至系统字体。
- `assets/quantum-architecture.webp`、`open-foundations.webp`、`quantum-horizon.webp`：原有生成概念艺术，不是真实设备照片；提示词保存在 `IMAGE-PROMPT*.txt`。

页面不依赖远程字体、前端框架、分析追踪或表单服务。菜单、分类和标签页支持键盘操作，动效遵循系统“减少动态效果”设置。活动列表需要 JavaScript；禁用时提供浦江量话原文入口。

## 发布

继续使用仓库既有的 GitHub Pages 发布方式，保留 `.nojekyll`。在 Settings → Pages 中核对发布来源为 `main` 分支根目录。内容与静态资源提交到 `main` 后随 GitHub Pages 发布。

域名相关设置以仓库当前 Settings → Pages 和 DNS 为准。更换域名时同步修改 `robots.txt`、`sitemap.xml`、两页的 canonical 与 Open Graph URL；如使用 `CNAME` 文件，也需保持一致。本次修改不更改域名配置。

## 技术口径

SpaceQat 社区定位 → 活动与交流 → 开源工具 FatQat → 开放基座 → 参与方式 → 共建伙伴。保留协作者的社区介绍与 FatQat 技术表述。

FatQat 面向各种量子比特体系，将连接、移动、融合等硬件约束纳入编译与控制流程；社区将持续探索更多物理路线，并陆续开放不同路线的真实硬件接口。技术依据：[Compiler API](https://fatqat.readthedocs.io/en/latest/api/compiler/)、[执行模型](https://fatqat.readthedocs.io/en/latest/guide/execution-models/)。
