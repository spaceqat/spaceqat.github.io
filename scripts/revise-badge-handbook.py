"""Create a non-destructive, text-only revision of the supplied V2 handbook."""
import argparse
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
changes = {
    22: '执行口径：本文件中的积分、周边配置与服务名额均为建议试行配置。启动时由社区公布生效日期、当期资源和负责团队；确定后对同一期参与者统一执行。L3及以上可申请Mini grant，由社区专家评审，申请资格不等于获批。',
    98: '权限：以校园大使身份提出本校活动或内容计划；加入协作项目；在登记后的个人档案展示认证信息；提交一次性微活动物料支持申请。身份正式启用仍需完成校园联系资料与活动规范说明。Mini grant须达到L3后申请。',
    99: 'Benefits：L1电子徽章、首份可核验贡献记录、校园启动材料包、一次标准化入门反馈；个别带教按当期名额申请。原单项目经费权益改为社区周边，如贴纸或书签，按当期款式与名额安排。',
    118: 'Benefits：L2徽章、学期贡献证明、自助创建作品集条目、进阶训练营申请、每学期一次作品集书面反馈申请；可申请社区周边，如徽章或手账，按当期款式与名额安排。',
    123: 'Benefits：L3徽章、含代表成果的证明、社区成果展示申请；每学期一次30分钟导师交流申请；可申请主题周边。自L3起可申请Mini grant，须提交项目方案并经社区专家评审。',
    132: 'Benefits：L4徽章、项目责任证明、跨校项目发起与展示机会；每学期最多两次30分钟导师交流申请；可申请共建主题周边及Mini grant，项目支持须经社区专家评审。',
    138: 'Benefits：L5徽章、长期贡献与带教证明、导师或共创会议候选资格；每学期一次60分钟项目评议申请，可替代下级导师时段；可申请纪念周边及Mini grant，项目支持须经社区专家评审。',
    168: 'Mini grant评审与拨付',
    169: '社区专家评审；运营与财务执行',
    184: '周边支持示例',
    188: '数字欢迎包',
    192: '贴纸或书签',
    196: '徽章或手账',
    200: '主题帆布袋或T恤',
    204: '共建主题周边套装',
    208: '纪念周边套装',
    210: '电子认证与贡献记录在确认后10个工作日内提供。导师交流、实体周边、展示位置与Mini grant属于容量受限支持，须按当期公开安排申请；高等级同类服务额度替代下级额度，不层层累加。表中周边为示例，具体款式、名额与领取方式由社区公布，不兑换现金。',
    211: '周边与Mini grant申请规则',
    212: '原等级对应的单项目经费权益统一改为各类社区周边，不设按等级固定发放的现金额度。L3及以上成员可作为负责人申请Mini grant；L0至L2可参与项目，但不具有独立申请资格。获得等级仅代表可以申请，不承诺资助。',
    213: '申请人提交项目目标、个人与团队分工、预算、执行计划及验收方式，由社区专家评审决定是否支持；具体金额、名额与拨付方式按当期公告及评审结果执行。同一项目只申请一次，不因多人参与叠加额度；同一人每学期原则上最多负责两个获资助项目。',
    215: 'Mini grant由社区专家检查目标、预算和验收是否清楚，再按学习与开放价值40分、执行可行性30分、可复用性20分、资源节约10分评议。学校名气与成员总积分不加权。条件相近时优先支持过去未获得支持的团队；申请负责人须达到L3。评审者回避本人及存在利益冲突的项目，运营与财务根据评审结果执行。',
    634: 'O类组织分值是整个任务或活动的积分池，多人按实际分工共享。O01组织小组交流为20 XP；经核验的普通参与者每人每场10 XP，不从组织积分池分配。同一人同一场只按一个角色计分，组织与参与不叠加。小型活动不设大规模人数门槛。',
    640: '组织20；参与10',
    641: '组织需有议题、至少2位其他实际参与者、讨论记录和复盘；参与需有实际参与记录及讨论或学习反馈，仅报名、签到或挂机不计分。',
    642: '组织分按个人分工核验；参与10 XP可计累计分与活跃窗口，但低于15 XP，不算有效贡献，多次参与不能合并为一项有效贡献。',
    673: '30人的读书会不会自动比5人的读书会得分更高。讲者、主持、技术支持等按实际职责共享组织积分池，不是每人领取整场满分。重复主题活动须说明新增内容、参与者反馈或改进成果后核验，改名、拆场、重复材料或重复申报不能反复领取满分。',
    675: 'O05适用于校园大使、兴趣小组和社团的首次稳定启动，同一校园节点生命周期只发一次；改名、换负责人或升级为社团不会重新领取。每人O类每自然月最多入账80 XP（UTC+8，按活动完成日期，含组织、参与及加分）；不得跨月挪账或换路线绕过。重大活动须事先单独评审并记录批准额度，不能事后追认超额。活动与个人分工由社区人工核验，发帖审核与积分审核分离；当前网站尚无活动自动计分或月度限额拦截，审核时须查台账执行。',
    945: '校园负责人是学校或团队内部的职责安排，可在初期依据实际情况产生，不要求先达到L4。需要社区发布、任务评审等权限时，再使用本手册的具体授权规则。Mini grant申请负责人须达到L3，并经社区专家评审。',
    1050: '建议先开展16周、20至30人的试点，选择不同规模与参与形式的校园。所有成员采用同一版本规则；周边名额、Mini grant申请安排及服务额度在招募时明确，避免高估可兑现资源。以下为试点总预算示例，不是个人或等级对应的经费权益。Mini grant仅面向L3及以上负责人申请，经社区专家评审后实施。',
    1054: '校园周边物料包',
    1055: '6批，每批平均500元',
    1057: 'Mini grant项目支持池',
    1058: 'L3起申请，专家评审后分配',
    1060: '实体纪念周边',
    1117: '一份公开等级说明；一份任务目录；一个统一申报表；一份贡献台账；两名可回避的审核人及第三人争议候选；一个练习仓库；五个每周结算名额；一次月度晋级评议；清楚的周边名额、Mini grant专家评审安排与导师额度。Mini grant从L3起开放申请。先验证这一套流程，再增加专长金阶、成就种类和自动化系统。'
}
with ZipFile(args.source) as source:
    root = E.fromstring(source.read('word/document.xml'))
    paragraphs = root.xpath('//w:body//w:p', namespaces=ns)
    assert len(paragraphs) == 1149, 'Unexpected source version; review paragraph mapping first.'
    assert ''.join(paragraphs[184].xpath('.//w:t/text()', namespaces=ns)) == '单项目经费上限'
    for index, replacement in changes.items():
        texts = paragraphs[index].xpath('.//w:t', namespaces=ns)
        assert texts, index
        texts[0].text = replacement
        for text in texts[1:]:
            text.text = ''
    content = ''.join(root.xpath('//w:t/text()', namespaces=ns))
    for stale in ['单项目不超过', '单项目经费上限', '40%的活动经费给L1']:
        assert stale not in content, stale
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.output, 'w') as target:
        for item in source.infolist():
            target.writestr(item, E.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True) if item.filename == 'word/document.xml' else source.read(item.filename))
with ZipFile(args.output) as checked:
    assert checked.testzip() is None
print(f'Revised {len(changes)} paragraphs; original preserved. Output: {args.output}')
