/**
 * 8 大行业主题叙事剧本库 (Theme Playbooks & Duarte Sparkline Choreography)
 */
import type { PlaybookId, ThemePlaybook } from '../types/ir.js';

export const ALL_PLAYBOOKS: ThemePlaybook[] = [
  {
    id: 'keynote-launch',
    name: 'Flagship Keynote Launch',
    name_zh: '旗舰产品发布会剧本',
    scenario: 'AI 大模型发布、智能硬件揭幕、重大版本更新、年度旗舰峰会',
    recommended_styles: ['apple-keynote-dark', 'stage-cyber-spotlight', 'bauhaus-industrial'],
    ideal_slide_count: [8, 14],
    story_arc_summary:
      '遵循“破界悬念 → 行业桎梏痛点 → 新物种登场 → Bento 核心能力矩阵 → 单点推镜深潜 → 极致性能实测指标 → 开发者/生态路线图 → One More Thing 愿景定格”。',
    steps: [
      {
        step: 1,
        phase_name: '破界序幕 (The Reveal)',
        narrative_goal: '用极具张力的主视觉与精炼副标建立旗舰气场',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['cover-cinematic'],
        morph_tip: '设置 title_morph_id="brand-core"，下一页缩回左上眉标形成空间拉远。',
      },
      {
        step: 2,
        phase_name: '时代裂缝 (What Is)',
        narrative_goal: '一针见血指出旧范式的根本瓶颈，制造情绪张力',
        energy_level: 'low-breath',
        recommended_archetypes: ['statement-impact', 'comparison-versus'],
      },
      {
        step: 3,
        phase_name: '全景架构亮相 (Bento Overview)',
        narrative_goal: '以不对称 Bento 矩阵一次亮出 4~5 大核心技术支柱',
        energy_level: 'high-dense',
        recommended_archetypes: ['bento-asymmetric-4', 'bento-showcase-5'],
        morph_tip: '给核心高亮卡片设置 morph_id="spotlight-pillar"，与下一页 container_morph_id 对接推镜！',
      },
      {
        step: 4,
        phase_name: '核心引擎推镜深潜 (Camera Zoom-In)',
        narrative_goal: '承接上一页焦点卡片无缝放大，拆解底层微架构原理',
        energy_level: 'high-dense',
        recommended_archetypes: ['focus-zoom-detail', 'architecture-flow'],
      },
      {
        step: 5,
        phase_name: '性能核爆锚点 (Hero Benchmark)',
        narrative_goal: '全屏聚焦 1 个颠覆性实测指标与对比曲线，引爆全场记忆点',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['hero-metric', 'chart-spotlight'],
      },
      {
        step: 6,
        phase_name: '发售路线与生态 (Roadmap & Call)',
        narrative_goal: '清晰交代开放时间表并以一句话品牌精神定格收尾',
        energy_level: 'low-breath',
        recommended_archetypes: ['roadmap-milestones', 'closing-beacon'],
      },
    ],
  },
  {
    id: 'vc-pitch-deck',
    name: 'Venture Capital Pitch Deck',
    name_zh: '红杉/YC 黄金融资路演剧本',
    scenario: '种子轮至 B 轮创业融资、创新业务立项答辩、路演竞赛',
    recommended_styles: ['aurora-glass-light', 'apple-keynote-dark', 'linear-precision'],
    ideal_slide_count: [10, 12],
    story_arc_summary:
      '投资人前 90 秒决定去留：一句价值主张开场 → 痛点量化 → 产品解药 → 为什么是现在 (Why Now) → 市场规模与增长飞轮 → 竞争壁垒象限 → 商业化与融资规划。',
    steps: [
      {
        step: 1,
        phase_name: '一句话价值锚点 (Value Hook)',
        narrative_goal: '零废话定义你是谁、为谁解决什么十倍速问题',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['cover-cinematic', 'cover-editorial-split'],
      },
      {
        step: 2,
        phase_name: '真实痛点与代价 (The Acute Pain)',
        narrative_goal: '用真实损失指标揭示现有方案为何失效',
        energy_level: 'medium-build',
        recommended_archetypes: ['hero-metric', 'cards-3-staggered'],
      },
      {
        step: 3,
        phase_name: '产品魔法演示 (Product Solution)',
        narrative_goal: '黄金分割呈现产品工作流与核心差异化体验',
        energy_level: 'high-dense',
        recommended_archetypes: ['split-golden-ratio', 'bento-asymmetric-4'],
      },
      {
        step: 4,
        phase_name: '增长验证与飞轮 (Traction & Metrics)',
        narrative_goal: '用陡峭增长面积图展现 ARR、留存率或关键商业里程碑',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['chart-spotlight', 'hero-metric'],
      },
      {
        step: 5,
        phase_name: '竞争护城河象限 (Competitive Moat)',
        narrative_goal: '二维象限清晰确立右上角唯一高壁垒生态位',
        energy_level: 'high-dense',
        recommended_archetypes: ['quadrant-matrix', 'comparison-versus'],
      },
      {
        step: 6,
        phase_name: '融资用途与里程碑 (The Ask & Milestones)',
        narrative_goal: '明确本轮融资金额、资金分配与未来 18 个月关键节点',
        energy_level: 'medium-build',
        recommended_archetypes: ['roadmap-milestones', 'closing-beacon'],
      },
    ],
  },
  {
    id: 'executive-strategy',
    name: 'Executive Strategy & QBR',
    name_zh: '麦肯锡 SCQA 高管战略汇报剧本',
    scenario: '董事会战略规划、季度业务复盘 (QBR)、数字化转型咨询交付',
    recommended_styles: ['executive-consulting', 'swiss-grid-modern', 'linear-precision'],
    ideal_slide_count: [8, 15],
    story_arc_summary:
      '严格遵循金字塔原理与 Action Title（结论先行）：每页主标题直接写出经营判断，正文由数据图表、对比矩阵与可落地的三阶段抓手支撑。',
    steps: [
      {
        step: 1,
        phase_name: '战略议题封面 (Executive Mandate)',
        narrative_goal: '明确战略周期、核心议题与决策范围',
        energy_level: 'low-breath',
        recommended_archetypes: ['cover-swiss-grid', 'cover-editorial-split'],
      },
      {
        step: 2,
        phase_name: '全局执行摘要 (Executive Summary)',
        narrative_goal: '一页浓缩三大核心研判与关键财务目标',
        energy_level: 'high-dense',
        recommended_archetypes: ['bento-asymmetric-4', 'cards-3-staggered'],
      },
      {
        step: 3,
        phase_name: '市场结构与差距诊断 (Gap Diagnosis)',
        narrative_goal: '通过分组对比图与精修明细表定位利润漏斗瓶颈',
        energy_level: 'high-dense',
        recommended_archetypes: ['chart-spotlight', 'three-line-table'],
      },
      {
        step: 4,
        phase_name: '战略取舍矩阵 (Strategic Trade-offs)',
        narrative_goal: '明确“坚决投入什么”与“果断放弃什么”',
        energy_level: 'medium-build',
        recommended_archetypes: ['comparison-versus', 'quadrant-matrix'],
      },
      {
        step: 5,
        phase_name: '战役路径与组织保障 (Execution Roadmap)',
        narrative_goal: '拆解 Q1-Q4 里程碑责任人与预期 ROI 贡献',
        energy_level: 'high-dense',
        recommended_archetypes: ['process-timeline', 'roadmap-milestones'],
      },
    ],
  },
  {
    id: 'tech-architecture',
    name: 'Deep Tech & System Architecture',
    name_zh: '硬核系统架构深度分享剧本',
    scenario: '技术大会演讲、架构评审、开源项目发布、工程团队内部分享',
    recommended_styles: ['linear-precision', 'apple-keynote-dark', 'bauhaus-industrial'],
    ideal_slide_count: [8, 14],
    story_arc_summary:
      '拒绝枯燥罗列模块名：从极端并发/延迟挑战切入 → 顶层分层拓扑全景 → 核心状态机/协议代码切片 → 压测 P99 延迟突破对比。',
    steps: [
      {
        step: 1,
        phase_name: '工程命题开篇 (Engineering Thesis)',
        narrative_goal: '亮出系统规模量级与核心架构突破口',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['cover-cinematic', 'cover-swiss-grid'],
      },
      {
        step: 2,
        phase_name: '分层拓扑全景 (Layered Topology)',
        narrative_goal: '清晰展现数据面、控制面与调度引擎关系',
        energy_level: 'high-dense',
        recommended_archetypes: ['architecture-flow', 'bento-asymmetric-4'],
      },
      {
        step: 3,
        phase_name: '关键协议与实现精粹 (Code & Mechanism)',
        narrative_goal: '展示最核心的 12 行优雅接口设计与设计权衡',
        energy_level: 'high-dense',
        recommended_archetypes: ['code-architecture', 'focus-zoom-detail'],
      },
      {
        step: 4,
        phase_name: '基准压测与线上收益 (Production Gains)',
        narrative_goal: '对比重构前后吞吐量与成本曲线',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['chart-spotlight', 'hero-metric'],
      },
    ],
  },
  {
    id: 'academic-defense',
    name: 'Top-Tier Academic Defense',
    name_zh: '顶刊学术论文与学位答辩剧本',
    scenario: '博士/硕士学位答辩、CVPR/NeurIPS/ACL 口头报告、国家自然科学基金汇报',
    recommended_styles: ['nature-academic', 'swiss-grid-modern', 'warm-humanist'],
    ideal_slide_count: [10, 16],
    story_arc_summary:
      '科学问题界定 → 现有方法局限对比 → 核心数学建模与方法框架图 → 主实验 SOTA 三线表对比 → 消融实验分析 → 结论与未来展望。',
    steps: [
      {
        step: 1,
        phase_name: '研究课题与贡献概览 (Research Title)',
        narrative_goal: '规范呈现论文题目、作者团队与三大理论贡献',
        energy_level: 'medium-build',
        recommended_archetypes: ['cover-editorial-split', 'academic-paper-2col'],
      },
      {
        step: 2,
        phase_name: '理论建模与核心公式 (Formulation)',
        narrative_goal: '清晰推导目标函数并逐项注释物理/统计含义',
        energy_level: 'high-dense',
        recommended_archetypes: ['academic-paper-2col', 'architecture-flow'],
      },
      {
        step: 3,
        phase_name: '主实验 SOTA 三线表 (Quantitative Results)',
        narrative_goal: '标准学术三线表高亮最优指标与显著性提升',
        energy_level: 'high-dense',
        recommended_archetypes: ['three-line-table', 'chart-spotlight'],
      },
      {
        step: 4,
        phase_name: '消融实验与结论展望 (Ablation & Future Work)',
        narrative_goal: '验证各子模块独立贡献并总结学术价值',
        energy_level: 'medium-build',
        recommended_archetypes: ['bento-asymmetric-4', 'closing-beacon'],
      },
    ],
  },
  {
    id: 'brand-manifesto',
    name: 'Brand & Artistic Manifesto',
    name_zh: '高奢品牌提案与艺术策展剧本',
    scenario: '品牌升级视觉提案、建筑/空间设计汇报、文化艺术策展、独立杂志画册',
    recommended_styles: ['editorial-vogue', 'oriental-ink-zen', 'config-neo-brutal'],
    ideal_slide_count: [7, 12],
    story_arc_summary:
      '重情绪浓度与空间留白：以巨幅出血视觉与时代洞察金句交替推进，拒绝拥挤框线，让每一页都像值得装裱的艺术海报。',
    steps: [
      {
        step: 1,
        phase_name: '美学母题开卷 (Curatorial Cover)',
        narrative_goal: '破界构图建立过目不忘的审美调性',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['cover-editorial-split', 'cover-cinematic'],
      },
      {
        step: 2,
        phase_name: '精神宣言与哲学 (The Manifesto)',
        narrative_goal: '大面积奢华留白配一句振聋发聩的美学主张',
        energy_level: 'low-breath',
        recommended_archetypes: ['quote-manifesto', 'statement-impact'],
      },
      {
        step: 3,
        phase_name: '策展画幅拆解 (Editorial Spread)',
        narrative_goal: '杂志跨页分栏呈现材质、色彩与空间语言',
        energy_level: 'medium-build',
        recommended_archetypes: ['editorial-magazine', 'split-golden-ratio'],
      },
      {
        step: 4,
        phase_name: '余韵定格 (Resonance)',
        narrative_goal: '克制隽永的视觉符号收束全场情绪',
        energy_level: 'low-breath',
        recommended_archetypes: ['closing-beacon'],
      },
    ],
  },
  {
    id: 'masterclass-workshop',
    name: 'Masterclass & Deep Workshop',
    name_zh: '认知阶梯大师课与培训剧本',
    scenario: '企业内训、名师公开课、读书拆解、复杂概念科普工作坊',
    recommended_styles: ['warm-humanist', 'aurora-glass-light', 'swiss-grid-modern'],
    ideal_slide_count: [10, 18],
    story_arc_summary:
      '遵循“反常识提问 → 心智模型图解 → 分步拆解演练 → 正反案例对照 → 一页可带走行动清单”。',
    steps: [
      {
        step: 1,
        phase_name: '反直觉开场提问 (Cognitive Hook)',
        narrative_goal: '打破固有认知惯性，激发求知好奇',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['cover-editorial-split', 'statement-impact'],
      },
      {
        step: 2,
        phase_name: '核心心智模型 (Mental Model)',
        narrative_goal: '将抽象知识凝练为清晰的四步流或二维矩阵',
        energy_level: 'high-dense',
        recommended_archetypes: ['process-timeline', 'quadrant-matrix'],
      },
      {
        step: 3,
        phase_name: '误区与最佳实践对照 (Do vs Don’t)',
        narrative_goal: '左右鲜明对比常见错误做法与高手解法',
        energy_level: 'medium-build',
        recommended_archetypes: ['comparison-versus', 'cards-3-staggered'],
      },
    ],
  },
  {
    id: 'career-promotion',
    name: 'STAR Career & Promotion Review',
    name_zh: '晋升答辩与年终战功述职剧本',
    scenario: '职级晋升答辩、年度绩效述职、核心人才盘点汇报',
    recommended_styles: ['apple-keynote-dark', 'executive-consulting', 'aurora-glass-light'],
    ideal_slide_count: [8, 12],
    story_arc_summary:
      '拒绝流水账苦劳罗列：开篇亮出个人定位与三大标志性战功指标 → 攻坚战役 STAR 拆解（复杂度/架构折中/业务硬结果）→ 方法论沉淀外溢 → 下一阶段破局规划。',
    steps: [
      {
        step: 1,
        phase_name: '个人价值标签与战功总览 (Impact Summary)',
        narrative_goal: '30 秒让评委记住你的职级匹配度与硬核产出数字',
        energy_level: 'peak-anchor',
        recommended_archetypes: ['cover-cinematic', 'bento-asymmetric-4'],
      },
      {
        step: 2,
        phase_name: '一号攻坚战役深潜 (Flagship Battle)',
        narrative_goal: '展现面对高复杂度困境时的系统性破局方案与量化收益',
        energy_level: 'high-dense',
        recommended_archetypes: ['focus-zoom-detail', 'chart-spotlight'],
      },
      {
        step: 3,
        phase_name: '组织赋能与未来规划 (Leverage & Next)',
        narrative_goal: '展示工具化/方法论复用半径与更高职级视野',
        energy_level: 'medium-build',
        recommended_archetypes: ['roadmap-milestones', 'closing-beacon'],
      },
    ],
  },
];

const PLAYBOOK_MAP = new Map<PlaybookId, ThemePlaybook>(
  ALL_PLAYBOOKS.map((p) => [p.id, p])
);

export function getPlaybook(id?: PlaybookId): ThemePlaybook | undefined {
  return id ? PLAYBOOK_MAP.get(id) : undefined;
}
