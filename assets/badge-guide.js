/* Handbook V2 display guidance only. Awards and permissions remain server-controlled. */
(() => {
  'use strict';
  const pick = (zh, en) => document.documentElement.lang.startsWith('en') ? en : zh;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const levels = [
    ['完成账号注册并确认参与约定；这是欢迎身份，不代表已获贡献认证。','Register and accept the participation agreement. This is a welcome identity, not a contribution award.'],
    ['累计 40 XP；至少 1 项有效贡献。','40 total XP; at least 1 qualifying contribution.'],
    ['累计 160 XP；4 项有效贡献；贡献跨度 28 天，覆盖 2 个自然周；主路线 60 XP；A90 ≥ 60 XP。','160 total XP; 4 qualifying contributions; a 28-day span across 2 calendar weeks; 60 XP in your main track; A90 ≥ 60 XP.'],
    ['累计 420 XP；8 项有效贡献；贡献跨度 56 天，覆盖 4 个自然周；2 项独立代表成果；主路线 180 XP；A90 ≥ 120 XP。','420 total XP; 8 qualifying contributions; a 56-day span across 4 calendar weeks; 2 independent representative works; 180 XP in your main track; A90 ≥ 120 XP.'],
    ['累计 900 XP；15 项有效贡献；贡献跨度 112 天，覆盖 6 个自然周；2 项独立代表成果；银阶专长；A180 ≥ 240 XP；通过项目责任评审。','900 total XP; 15 qualifying contributions; a 112-day span across 6 calendar weeks; 2 independent representative works; a silver specialty; A180 ≥ 240 XP; pass a project-responsibility review.'],
    ['累计 1800 XP；25 项有效贡献；贡献跨度 224 天，覆盖 10 个自然周；金阶专长；A180 ≥ 300 XP；完成复用与传承证明。','1,800 total XP; 25 qualifying contributions; a 224-day span across 10 calendar weeks; a gold specialty; A180 ≥ 300 XP; evidence of reuse and knowledge transfer.']
  ];
  const tiers = [
    ['本路线 80 XP；3 项有效贡献，来自至少 2 个成果根 ID。','80 track XP; 3 qualifying contributions from at least 2 distinct work roots.'],
    ['本路线 240 XP；6 项有效贡献；3 项个人基础分 ≥ 40 XP 的独立成果；跨度 56 天；至少 1 项被他人实际使用。','240 track XP; 6 qualifying contributions; 3 independent works with personal base scores ≥ 40 XP; a 56-day span; at least 1 work used by someone else.'],
    ['本路线 600 XP；12 项有效贡献；4 项代表成果；跨度 112 天；2 项独立成果有外部使用证据；完成带教或交接。','600 track XP; 12 qualifying contributions; 4 representative works; a 112-day span; external use of 2 independent works; complete mentoring or a handover.']
  ];
  const abilities = {
    T: ['提供可复现的问题、推理、评审或实现证据；银阶需材料被他人用于复现、评审或决策，金阶需外部使用与带教／交接。不要求必须合并 PR。','Provide reproducible problem analysis, reasoning, reviews or implementation. Silver requires use in reproduction, review or decisions; gold requires external use and mentoring/handover. A merged PR is not required.'],
    C: ['注明事实来源；银阶需真实读者或教学试用，金阶需独立系列、教学单元或指南及修订证据。','Cite sources. Silver requires real readers or teaching trials; gold requires a standalone series, learning unit or guide with revision evidence.'],
    O: ['记录分工、参与体验与复盘；银阶需协作交付物，金阶需可复用活动包、稳定流程或交接。','Document roles, participant experience and a retrospective. Silver requires collaborative deliverables; gold requires a reusable event kit, stable process or handover.'],
    M: ['帮助需得到确认；银阶需 FAQ、流程或带教成果，金阶需新人独立实践或接任者运行证明。','Help must be confirmed. Silver requires FAQs, processes or mentoring outcomes; gold requires independent newcomer practice or a working succession.']
  };
  const achievements = {
    committee_member:['提供本人属于委员单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。成员身份不含代表的活动申请权限。','Provide valid evidence of your affiliation with a committee organization, or contact SpaceQat staff directly for verification. The badge is granted after confirmation. Member status does not include representative event-request permissions.'],
    partner_member:['提供本人属于共建单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。成员身份不含代表的活动申请权限。','Provide valid evidence of your affiliation with a partner organization, or contact SpaceQat staff directly for verification. The badge is granted after confirmation. Member status does not include representative event-request permissions.'],
    committee_representative:['提供本人属于委员单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。代表可申请发起活动或 host／cohost／sponsor，活动须另行审核。','Provide valid evidence of your affiliation with a committee organization, or contact SpaceQat staff directly for verification. The badge is granted after confirmation. Representatives may request to organize, host, cohost or sponsor an event; each event requires separate review.'],
    partner_representative:['提供本人属于共建单位的有效证明，或直接联系量立方工作人员核验，经确认后授予。代表可申请发起活动或 host／cohost／sponsor，活动须另行审核。','Provide valid evidence of your affiliation with a partner organization, or contact SpaceQat staff directly for verification. The badge is granted after confirmation. Representatives may request to organize, host, cohost or sponsor an event; each event requires separate review.'],
    A0: ['首次完成 T、C、O 或 M 类有效贡献。','Complete your first qualifying T, C, O or M contribution.'],
    A1: ['历史纪念徽章，保留此前已授予的记录。V2 不再以“首个 PR 合并”作为新的授予标准。','Historical badge: existing awards are retained. V2 no longer awards a new badge just for a first merged PR.'],
    A2: ['校园大使独立组织首次合格小组交流，提交 O01 的活动记录与复盘并通过验收。','As a campus ambassador, independently run your first qualifying group discussion; submit O01 event records and a retrospective for verification.'],
    A3: ['参与校园节点首次稳定启动，有实际分工，且 O05 贡献已验收。','Contribute to a campus node’s first stable launch with a documented role and verified O05 work.'],
    A4: ['完成至少 5 项来自不同成果根的 T-K 实质文档有效贡献，累计至少 150 XP。','Complete at least 5 qualifying T-K documentation contributions from distinct work roots, totaling at least 150 XP.'],
    A5: ['完成 O08 或等价交接；新接任者独立运行至少 1 个周期。','Complete O08 or an equivalent handover; the successor independently runs at least 1 cycle.'],
    A6: ['V1 历史徽章，原条件为 5 个不同的已确认问题反馈或修复。保留已有认证；V2 新申请按新版成就规则人工核验，不沿用问题数量计奖。','V1 historical badge for 5 distinct confirmed issue reports or fixes. Existing awards remain; new V2 achievements require individual review rather than issue-count awards.'],
    A7: ['两个及以上校园共同完成可用成果，本人有已验收的有效贡献。','At least 2 campuses produce usable work together, including your verified qualifying contribution.'],
    A8: ['一份成果被两个独立团队实际使用，并提交使用证据；T 类无需套用 R 加分条件。','Provide evidence that 2 independent teams actually use one of your works. T-track work does not need an R bonus.'],
    A9: ['连续性按实际完成日期核验：三个不同自然月，每月至少完成 40 XP。','Using actual completion dates, earn at least 40 XP in each of 3 distinct calendar months.'],
    A10: ['围绕同一资源完成 3 个不重叠的 M05 维护周期，并逐期验收。','Complete and verify 3 non-overlapping M05 maintenance cycles for the same resource.'],
    A11: ['帮助两位不同新人完成 M06 带教；两人的独立实践能力均通过独立核验。','Complete M06 mentoring for 2 different newcomers, with independently verified practical competence for each.'],
    campus: ['提交校园联系资料，确认活动规范，经社区核验后授予。校园大使是参与身份，与个人等级分离。','Submit campus contact details and accept event guidelines for community verification. Campus ambassador is an identity separate from your personal level.']
  };
  const definitions = () => pick('有效贡献：个人基础分 ≥ 15 XP；代表成果：不同成果根、个人基础分 ≥ 50 XP。A90／A180 是最近 90／180 天实际完成且核验的积分。成果根指同一问题或作品，不因拆分投稿重复计数。','Qualifying contribution: personal base score ≥ 15 XP. Representative work: a distinct work root with a personal base score ≥ 50 XP. A90/A180 counts verified work completed in the last 90/180 days. Splitting one problem or work into multiple submissions does not create extra roots.');
  function rule(b) {
    if (/^L[0-5]$/.test(b.id)) return pick(...levels[Number(b.id[1])]);
    if (/^[TCOM][0-2]$/.test(b.id)) return pick(...tiers[Number(b.id[1])]) + ' ' + pick(...abilities[b.id[0]]);
    return achievements[b.id] ? pick(...achievements[b.id]) : (b.description || b.rule || pick('请联系社区确认此徽章的获取条件。','Contact the community for this badge’s criteria.'));
  }
  function name(b) {
    return /^T[0-2]$/.test(b.id) ? pick('开源研判师 · ', 'Open-source analyst · ') + pick(...[['铜阶','Bronze'],['银阶','Silver'],['金阶','Gold']][Number(b.id[1])]) : b.name;
  }
  const grant = () => pick('获得 L3 及以上徽章后，可在“我的空间”申请 Mini grant。单项目申请上限 3000 元，最终资助金额由社区专家评审确定；获得徽章不代表自动获批。Proposal 须为 2–4 页 A4，正文字号 10／11 pt，包含项目动机、意义、执行方式和里程碑。','Earn an L3 or higher badge to apply for a Mini grant from My space. Requests are capped at CNY 3,000 per project; community expert review determines the final award. Eligibility does not guarantee funding. Submit a 2–4 page A4 proposal in 10/11 pt covering motivation, significance, execution and milestones.');
  const hardwareBenefits = () => pick('未来两个月，社区计划对接硬件资源，为徽章持有者陆续增加硬件机时等额外福利。具体适用徽章、开放时间、机时额度与申请方式，将在对接完成后另行公布；目前尚未开放领取。','Over the next two months, the community plans to connect with hardware providers and introduce additional badge benefits, including hardware access time. Eligible badges, launch dates, quotas and application details will be announced after arrangements are finalized; these benefits are not yet available.');
  const activityRules = () => `<details class="activity-xp-rules"><summary>${pick('校园活动计分约束','Campus activity scoring limits')}</summary><ul>${[
    ['组织小组交流：20 XP 为整场组织积分池，多人合办按实际分工分配，不是每人 20 XP；须提供议题、至少两位其他实际参与者、讨论记录与复盘。','Organizing a group discussion: 20 XP is the shared organizer pool, allocated by verified individual work, not 20 XP per organizer. Provide an agenda, at least two other active participants, discussion records and a retrospective.'],
    ['参与小组交流：每人每场 10 XP，须有实际参与记录及讨论或学习反馈；仅报名、签到或挂机不计分。同一人同一场按一个角色计分，组织与参与不叠加。','Participating: 10 XP per person per session with verified participation and discussion or learning feedback. Registration, check-in alone or idle attendance earns nothing. One role per person per session; organizer and participant points cannot stack.'],
    ['参与的 10 XP 可计入累计积分与对应活跃窗口，但低于 15 XP，不计为有效贡献；不能把多次参与合并成一项有效贡献。','The 10 participation XP counts toward total points and the applicable activity window, but is below 15 XP and is not a qualifying contribution. Multiple attendances cannot be combined into one qualifying contribution.'],
    ['重复主题活动需说明新增内容、参与者反馈或改进成果，经核验后计分；改名、拆场、重复材料或重复申报不能反复领取满分。','Repeated-topic events need evidence of new content, participant feedback or improvements. Renaming, splitting sessions, reusing the same evidence or duplicate claims cannot repeatedly earn full points.'],
    ['每人 O 类每自然月最多入账 80 XP（UTC+8，按活动完成日期，含组织、参与及加分）；不得跨月挪账或换路线绕过。重大活动须事先单独评审并记录批准额度，不能事后追认超额。','Each person may receive at most 80 O-track XP per calendar month (UTC+8, by completion date, including organizing, participation and bonuses). Do not shift dates or tracks to evade the cap. Major events require a separately approved, recorded allowance in advance, not retroactive exceptions.'],
    ['活动材料与个人分工由社区人工核验，发帖通过不等于积分通过。现有网站尚无活动自动计分或月度限额拦截，审核时须查台账执行。','The community manually verifies event evidence and individual roles. Post approval is not XP approval. The current site does not automatically score events or enforce monthly caps; reviewers must check the ledger.']
  ].map(pair=>`<li>${pick(...pair)}</li>`).join('')}</ul></details>`;
  const contributionLink = demo => `<a class="guide-contributions" href="${demo ? 'account.html'+(document.documentElement.lang.startsWith('en')?'?lang=en':'') : ''}#contributions">${pick('打开开源贡献 ↗','Open Contributions ↗')}</a>`;
  function guide(demo = false) {
    const routes = [
      ['T', '技术与开源', 'Technology & open source', '问题诊断、讨论、评审、文档与代码；按价值评为 20／40／60／80／120 XP，不按 PR 数量计分。', 'Diagnosis, discussions, reviews, documentation and code: 20/40/60/80/120 XP based on value, not PR count.'],
      ['C', '知识与内容', 'Knowledge & content', '例如学习笔记 20 XP、原创科普 40 XP、可复用教学单元 80 XP。', 'Examples: learning notes 20 XP, original explainers 40 XP, reusable learning units 80 XP.'],
      ['O', '校园与活动', 'Campus & events', '组织小组交流 20 XP，参与 10 XP；合办共享组织积分池。个人 O 类每月上限 80 XP。', 'Organize a group discussion: 20 XP; participate: 10 XP. Co-organizers share the organizer pool. Personal O-track cap: 80 XP/month.'],
      ['M', '互助与维护', 'Help & maintenance', '例如有效答疑 5 XP、FAQ 30 XP、四周资源维护 50 XP；带教须核验成果。', 'Examples: verified answers 5 XP, FAQs 30 XP, four-week resource maintenance 50 XP. Mentoring requires verified outcomes.']
    ];
    return `<section class="xp-guide" aria-labelledby="xp-guide-title"><div class="xp-guide-heading"><div><small>FIELD GUIDE / V2</small><h3 id="xp-guide-title">${pick('积分获取小手册','A quick guide to XP')}</h3></div><span class="guide-stamp">${pick('贡献 → 核验 → 点亮','Contribute → Verify → Earn')}</span></div><div class="xp-routes">${routes.map(([code,zh,en,desc,english])=>`<div><b>${code}</b><h4>${pick(zh,en)}</h4><p>${pick(desc,english)}</p></div>`).join('')}</div><p class="guide-workflow">${pick('保留成果链接和个人分工 → 提交社区核验 → 审核确认积分及徽章。发帖或 PR 合并本身不等于获积分；同一成果不重复计分。','Keep work links and your individual role → submit for verification → receive reviewed points and badges. Publishing or merging a PR does not itself earn XP; the same work is not counted twice.')}</p><details><summary>${pick('怎么提交？还有哪些规则？','How do I submit? What else should I know?')}</summary><p>${demo ? pick('这是交互 Demo，不会写入真实账号。正式账号可在“开源贡献”绑定 GitHub，目前自动同步已合并 PR；其他材料请联系社区人工核验。','This is a demo and does not update a real account. In the real member space, Contributions can link GitHub and sync merged PRs; other evidence requires manual community review.') : pick('在“开源贡献”绑定 GitHub，可同步 FatQat 已合并 PR 的待核验记录。Issue、讨论、评审及其他路线暂未自动同步：请把成果链接、个人分工和完成日期发至 spaceqat@163.com。论坛发帖审核与积分审核是两回事。','Link GitHub in Contributions to sync merged FatQat PRs for verification. Issues, discussions, reviews and other tracks are not automatically synced yet: email work links, your role and completion dates to spaceqat@163.com. Post moderation is separate from XP review.')}</p>${contributionLink(demo)}<p>${definitions()}</p><p>${pick('每份成果只归一条主路线。T 类不叠加 Q／R 奖励，80 XP 及以上需双人评审。各任务上限及加分条件按 V2 手册核验；历史认证保留。','Each work has one main track. T has no Q/R bonuses; scores of 80 XP or more require two reviewers. Task caps and bonuses follow the V2 handbook; historical awards are retained.')}</p></details>${activityRules()}<div class="guide-benefits"><p><strong>${pick('把成长带回生活。','Take your progress with you.')}</strong> ${pick('成长权益包括社区周边，如贴纸、徽章、手账、帆布袋等；款式与领取规则以当期安排为准，不兑换现金。','Growth benefits include community merchandise such as stickers, pins, notebooks and tote bags. Availability and collection rules follow current arrangements; no cash redemption.')}</p><p>${grant()}</p><p class="hardware-benefits">${hardwareBenefits()}</p></div></section>`;
  }
  function detail(b, earned = false, demo = false) {
    if(b.id==='campus')return `<div class="badge-rule-detail">${window.spaceqatBadgeArt?.(b.id,earned)||''}<small>${demo?pick('示例认证','Demo award'):pick('认证身份','Verified identity')}</small><h2 id="badge-rule-title">${esc(name(b))}</h2><span class="guide-status">${earned?pick('已点亮','Earned'):pick('尚未点亮','Not yet earned')}</span><h3>${pick('需要完成什么','What you need to do')}</h3><p>${pick('在个人空间填写校园大使申请，分别阅读确认行为承诺与个人信息告知，通过社区简单筛查后任命并点亮徽章。无需已有论文、代码或活动经验，无须面试。','Apply in your personal space, acknowledge the code and privacy notice separately, and complete community screening. Appointment awards this badge; no papers, code experience, event experience or interview required.')}</p><p>${pick('校园大使身份与个人等级分离，不自动增加 XP，也不自动获得单位代表、签约、收款或赞助权限。有效身份可申请校园活动支持；支持需另行审核。','This identity is separate from personal levels, adds no XP and grants no organization representative, contracting or fundraising authority. Active ambassadors may request campus event support, subject to review.')}</p><p>${pick('任期、活跃度与恢复规则以申请时公布的条款为准。暂停、退出、到期或撤销后，不再作为有效大使身份展示。','Term, activity and restoration rules follow the published policy. Paused, ended, expired or revoked appointments are not displayed as active badges.')}</p><a class="guide-contact" href="${demo?'account.html#campus-apply':'#campus-apply'}">${pick('进入校园大使申请 / 我的身份 ↗','Campus application / My appointment ↗')}</a><p class="hardware-benefits">${hardwareBenefits()}</p></div>`;
    const organizationBadge=['committee_member','committee_representative','partner_member','partner_representative'].includes(b.id);
    const level = /^L[0-5]$/.test(b.id) ? Number(b.id[1]) : -1;
    return `<div class="badge-rule-detail">${window.spaceqatBadgeArt ? window.spaceqatBadgeArt(b.id, earned) : ''}<small>${esc(b.id)} · ${demo ? pick('示例认证','Demo award') : pick('获取方法','How to earn')}</small><h2 id="badge-rule-title">${esc(name(b))}</h2><span class="guide-status">${earned ? pick('已点亮','Earned') : pick('尚未点亮 · 可以从这里开始','Not yet earned · Start here')}</span>${b.id==='L0'?`<div class="agreement-entry"><span>${pick('在这里阅读并确认参与约定。','Read and confirm the agreement here.')}</span><a href="#agreement">${pick('阅读并确认参与约定 →','Read and confirm →')}</a></div>`:''}<h3>${pick('需要完成什么','What you need to do')}</h3><p>${esc(rule(b))}</p>${level >= 1 || /^[TCOM][0-2]$/.test(b.id) ? `<details><summary>${pick('积分与成果如何计算','How points and works are counted')}</summary><p>${definitions()}</p></details>` : ''}${level >= 0 ? `<h3>${pick('成长权益','Growth benefits')}</h3><p>${pick('成长权益包括认证、反馈、交流机会及各类社区周边，按当期款式与名额安排。','Growth benefits include certification, feedback, exchange opportunities and community merchandise, subject to current availability.')}</p><p>${level >= 3 ? grant() : pick('Mini grant 从 L3 开始开放申请，经社区专家评审后决定是否支持。','Mini grant applications start at L3 and require community expert review.')}</p>` : ''}${/^O[0-2]$/.test(b.id) || ['A2','campus'].includes(b.id) ? activityRules() : ''}<p class="hardware-benefits">${hardwareBenefits()}</p><h3>${pick('如何申请核验','Request verification')}</h3><p>${organizationBadge ? pick('这类徽章核验的是单位身份，不要求贡献成果、积分或 GitHub 记录。提供所属单位的有效证明即可申请，也可以直接联系量立方工作人员协助核验。请通过私下联系提交证明，勿在论坛公开敏感信息。','These badges verify organization affiliation, not contributions, points or GitHub activity. Apply with valid affiliation evidence, or contact SpaceQat staff for verification. Share evidence privately rather than posting sensitive information in the forum.') : pick('准备成果链接、个人分工及完成日期，联系社区核验。GitHub 已同步的记录可在“开源贡献”查看；此处只展示规则，不会自动发放徽章或开通权限。','Prepare work links, your role and completion dates for community verification. Synced GitHub records are in Contributions. This page explains rules; it does not automatically award badges or permissions.')}</p><p>${organizationBadge ? pick('联系微信：SpaceQat · 邮箱：spaceqat@163.com','WeChat: SpaceQat · Email: spaceqat@163.com') : contributionLink(demo)}</p><a class="guide-contact" href="mailto:spaceqat@163.com?subject=${encodeURIComponent('SpaceQat badge '+b.id)}">${pick('邮件联系社区 ↗','Email the community ↗')}</a><p class="guide-fineprint">${pick('V2 试行说明 · 成就徽章本身不额外赠送 XP。等级、徽章与审核／代码发布权限分离。','V2 trial guidance · Achievement badges add no bonus XP. Levels and badges do not automatically grant moderation or code-release permissions.')}</p></div>`;
  }
  function bind(root, catalog, awards) {
    document.getElementById('badge-rule-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'badge-rule-dialog'; dialog.className = 'badge-rule-dialog'; dialog.setAttribute('aria-labelledby','badge-rule-title');
    root.append(dialog);
    const open = (id, trigger) => {
      const badge = catalog.find(b=>b.id===id); if (!badge) return;
      dialog.innerHTML = `<button type="button" class="secondary badge-rule-close">${pick('关闭','Close')} ×</button>${detail(badge,awards.has(id))}`;
      dialog.querySelector('button').onclick=()=>dialog.close();
      dialog.onclose=()=>{if(location.hash.startsWith('#badges/'))history.replaceState(null,'','#badges');(trigger || root.querySelector('[data-badge-rule]'))?.focus();};
      dialog.showModal();
    };
    root.querySelectorAll('[data-badge-rule]').forEach(button=>button.onclick=()=>open(button.dataset.badgeRule,button));
    let id='';
    try { id=location.hash.startsWith('#badges/') ? decodeURIComponent(location.hash.slice(8)) : ''; } catch { /* Ignore malformed deep links; keep the catalog usable. */ }
    if(id)open(id);
  }
  // Keep policy copy intact while collapsing secondary reading into a native accordion.
  function compactGuide(demo=false){
    const template=document.createElement('template');template.innerHTML=guide(demo);
    const section=template.content.querySelector('.xp-guide');
    const metrics=pick(['20–120 XP / 项','示例 20–80 XP','10 / 20 XP · 月限 80','示例 5–50 XP'],['20–120 XP / work','Examples: 20–80 XP','10 / 20 XP · 80 / month','Examples: 5–50 XP']);
    section.querySelectorAll('.xp-routes>div').forEach((card,i)=>{const pill=document.createElement('span');pill.className='route-metric';pill.textContent=metrics[i];card.querySelector('h4').after(pill);});
    const more=document.createElement('details');more.className='guide-more';
    const summary=document.createElement('summary');summary.textContent=pick('核验流程、计分约束与成长权益','Verification, scoring limits & growth benefits');more.append(summary);
    let node=section.querySelector('.xp-routes').nextElementSibling;
    while(node){const next=node.nextElementSibling;more.append(node);node=next;}
    section.append(more);return section.outerHTML;
  }
  window.spaceqatBadgeGuide = {guide:compactGuide,detail,rule,name,bind};
})();
