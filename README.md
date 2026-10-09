# 量立方 SpaceQat 官网

面向高校与科研、企业与开发者、政府与公共机构的中文静态官网。第四版统一全站字体，并将伙伴区域与结尾组织为连续的量子光学地平线。

网站仓库：https://github.com/spaceqat/spaceqat.github.io  
网站域名：https://space-qat.com

## 预览

直接用浏览器打开 `index.html`。所有样式和交互都包含在 HTML 中，图片使用相对路径，不需要安装依赖、编译或启动后端。

## 发布到 GitHub Pages

1. 将本目录**内部的全部文件**上传到目标仓库的 `main` 分支根目录。保留 `assets` 文件夹和 `.nojekyll`。
2. 打开仓库 **Settings → Pages**，选择 **Deploy from a branch → main → / (root)**，保存。
3. 在 **Custom domain** 中填写 `space-qat.com`，保存。根目录已提供同内容的 `CNAME` 文件；域名仍需要在 Pages 设置中完成配置。
4. 在域名 DNS 管理处配置下列记录。更改前先核对并清理同主机名下冲突的旧网站记录，保留邮箱等其他服务的记录。

| 类型 | 主机名 | 目标 |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | spaceqat.github.io |

5. 等待 DNS 和证书生效，然后在 Pages 开启 **Enforce HTTPS**。DNS 传播可能需要最多 24 小时。
6. 由组织所有者在组织的 **Settings → Pages** 验证域名，按 GitHub 给出的值添加并保留 TXT 记录。

说明：上传文件后，还需要确认 Pages 发布、DNS 配置与证书签发状态。不要把 ZIP 文件直接当作网站上传；请先解压。

官方参考：[发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) · [域名验证](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)

## 内容维护

- 页面内容、配色、手机样式、导航、编译路线与受众切换：编辑 `index.html`。
- 图片：`assets/quantum-architecture.webp`，1672 × 941，约 310 KB。使用内置 image_gen 生成的抽象概念艺术，不是真实量子硬件照片；完整生成提示词保存在 `IMAGE-PROMPT.txt`。
- 动态：搜索 `news-list`，按日期从新到旧更新标题、摘要、日期和来源链接。
- 共建伙伴：搜索 `partner-table`。按品牌资料保留四列、七行，以及重复名称和末尾空位；手机可横向滚动查看。
- `CNAME`、`robots.txt`、`sitemap.xml`：更换域名时同步更新，并修改 HTML 的 canonical 和 Open Graph URL。

页面使用随包提供的开源字体，不依赖远程字体服务、前端框架、分析追踪或表单服务。菜单和受众切换支持键盘操作，动效遵循系统“减少动态效果”设置；关闭 JavaScript 后仍能阅读全部受众内容。

## 技术口径

- 主视觉：精密层叠玻璃立方体、相干光路与不同输出结构，表达共同语言连接多种量子体系。
- 信息重心：量子编译 → 开放基座 → 不同参与者 → 动态与共建伙伴。
- 当前公开编译目标：超导、中性原子；更多体系明确标为面向未来，未宣称已全部支持或接入真机。
- 技术依据：[官方编译指南](https://fatqat.readthedocs.io/en/latest/guide/compiler/)、[Compiler API](https://fatqat.readthedocs.io/en/latest/api/compiler/)、[执行模型](https://fatqat.readthedocs.io/en/latest/guide/execution-models/)。
- 静态检查覆盖：源资料一致性、伙伴排列、内部锚点、标签页语义、脚本语法和静态资源。发布后仍应检查桌面和手机浏览效果。

## 第四版：字体与连续收尾

- 中文大标题：Noto Serif SC，400–500 字重，增加中文宋体的比例与笔画层次。
- 正文与界面：Noto Sans SC，350–500 字重；英文、品牌英文与数字：Manrope，400–600 字重。
- 三组字体均本地加载，WOFF2 合计约 371 KB。许可证与来源位于 `assets/fonts/`；完整页面字符已检查，无缺字。未来增加文字时可重新制作子集，缺失字符会回落至系统字体。
- 05：保留指导单位、发起方、委员单位和伙伴原始分组与顺序，改用开放式名录，减少机械表格边框。
- 结尾：与 05 共享同一片连续光学场景，以大标题、远景光路和品牌署名形成收束。
- 当前三幅图片：`quantum-architecture.webp`、`open-foundations.webp`、`quantum-horizon.webp`，均在 `assets/`。第三幅由内置 image_gen 生成，完整提示词位于 `IMAGE-PROMPT-V4.txt`；是抽象概念艺术，不是真实量子设备照片。
- 字体字形覆盖和字重、320px主要标题宽度、脚本语法、28格伙伴排列、6个标签页、锚点与静态资源均已完成静态检查。
