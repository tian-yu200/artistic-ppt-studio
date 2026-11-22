/**
 * v3.0 殿堂级先锋旗舰样板集 Part 2 (Showcase Decks 04 ~ 06)
 * 审计整改亮点：
 * - 04 Aurora Glass Pitch：根治“机器人 人/类”断词与象限叠字，新增光学视触觉应力波纹图，移除数据页干扰水印；
 * - 05 Executive Consulting：全篇零裁切十字、零歪脖子边注，工业级三层泳道拓扑图（实心遮罩胶囊零穿字），新增丹吉尔绿电港真图；
 * - 06 Nature Academic：以经典物理阻尼谐振双摆轨迹替代伪科学玻璃球，补充顶会级张量维度规格与独立可拖拽公式图层。
 */
import type { SlideDeckIR } from '../types/ir.js';

export const DECK_04_AURORA_PITCH: SlideDeckIR = {
  version: '2.0',
  meta: {
    title: 'VERDANT ROBOTICS',
    subtitle: '通用视触觉具身操作基座模型 — Series A 融资路演',
    author: 'Verdant Embodied AI Inc.',
    date: 'SERIES A // CONFIDENTIAL PITCH',
    brand_mark: 'VERDANT // AI',
    style_id: 'aurora-glass-light',
    playbook_id: 'vc-pitch-deck',
    locale: 'zh-CN',
  },
  slides: [
    {
      id: 'p1-cover',
      archetype: 'cover-cinematic',
      bleed_mark: 'A',
      eyebrow: 'Venture Thesis // Tactile Intelligence',
      title: '赋予工业机器人**人类指尖级的直觉与泛化力**',
      title_morph_id: 'verdant-hook',
      subtitle:
        'Verdant 打造全球首个“多模态视觉—高维力触觉联合基座模型 (VTLA)”，让柔性线束盲插与精密装配实现零代码 15 分钟极速跨产线换型。',
      media: {
        src: 'art://aurora-crystal-prism',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
        caption: 'SERIES A  →  $35M ROUND FOR GLOBAL DEPLOYMENT',
      },
    },
    {
      id: 'p2-versus',
      archetype: 'comparison-versus',
      transition: 'morph',
      bleed_mark: '78',
      eyebrow: '01 // THE $420B AUTOMATION BOTTLENECK',
      title: '为什么全球**78%的精密总装工位**至今仍无法被机械臂替代？',
      subtitle: '传统刚性轨迹编程在柔性形变器件面前彻底失灵，换线停产调试代价高昂。',
      items: [
        {
          tag: 'LEGACY RIGID PLC',
          title: '传统示教编程机械臂',
          metric: '6~8 周',
          body: '每次新品换线需停产数周编写上万行轨迹代码；公差偏移 1.5 毫米即导致卡死损坏良率崩盘。',
        },
        {
          tag: 'VERDANT VTLA FOUNDATION',
          title: 'Verdant 视触觉端到端基座',
          metric: '15 分钟',
          accent: true,
          morph_id: 'vtla-pole',
          body: '产线工人手持示范 5 次即可零样本泛化上岗；1000Hz 力控闭环实时感知微牛顿级接触阻力。',
        },
        {
          title: '柔性介质盲区',
          body: '无法稳定抓取 FPC 软排线、硅胶密封圈与高反光透明件。',
        },
        {
          title: '跨本体即插即用',
          body: '一套权重原生适配 14 款主流机械臂与多指灵巧手（UR / KUKA / Franka）。',
        },
      ],
    },
    {
      id: 'p3-metric',
      archetype: 'hero-metric',
      transition: 'portal',
      bleed_mark: '99',
      eyebrow: '02 // PRODUCTION-GRADE RELIABILITY',
      title: '跨越实验室演示，直抵**严苛灯塔工厂量产红线**',
      media: {
        src: 'art://aurora-tactile-ripples',
        camera_mode: 'vertical-slit',
        morph_id: 'cinema-bg',
      },
      hero_metric: {
        value: '99.94',
        unit: '%',
        delta: 'MILLION-CYCLE FPC BLIND INSERTION YIELD',
        label: '消费电子超细柔性排线百万次连续盲插良率',
        description:
          '依托 BOM 成本仅 $39 的自研光学视触觉指尖模组，每日从 600+ 已商用产线工位自动回流高价值接触力学边界数据。',
      },
      overlap_note: {
        title: '2.0 ms 单步一致性流推理',
        body: '将多步扩散策略蒸馏为边缘端 2 毫秒闭环输出，单工位硬件回收期仅 4.2 个月。',
        position: 'bottom-right',
        morph_id: 'verdant-overlap',
      },
    },
    {
      id: 'p4-traction',
      archetype: 'chart-spotlight',
      eyebrow: '03 // EXPLOSIVE COMMERCIAL TRACTION',
      title: '商业化启动 12 个月，已签约 ARR 突破**$1,850 万美元**',
      items: [
        {
          title: '净收入留存率 (NDR)',
          metric: '168%',
          accent: true,
          body: '头部果链与跨国车企客户在首条产线验证 90 天内即启动整厂批量复购，LTV/CAC 达 6.4×。',
        },
        {
          title: 'RaaS 软件订阅高毛利',
          metric: '76%',
          body: '采用“$2,800 触觉模组买断 + $18k/年工位模型订阅”的复利现金流架构。',
        },
      ],
      chart: {
        type: 'area',
        unit: '$M',
        highlight_index: 5,
        callout: '连续 5 个季度环比增速超 **55%**，在手具约束力订单储备达 **$3,100 万美元**',
        categories: ['25 Q3', '25 Q4', '26 Q1', '26 Q2', '26 Q3', '26 Q4(E)'],
        series: [{ name: 'Contracted ARR (USD Millions)', values: [1.4, 2.9, 5.2, 8.8, 13.6, 18.5] }],
      },
    },
    {
      id: 'p5-quadrant',
      archetype: 'quadrant-matrix',
      eyebrow: '04 // COMPETITIVE MOAT',
      title: '兼顾**亚毫米量产良率**与**零样本跨品类泛化**的唯一领航者',
      items: [
        {
          title: '相比纯视觉 VLA 创业公司',
          accent: true,
          body: '纯相机方案在遮挡插槽与过盈配合工位良率不足 70%，Verdant 凭借高频力触觉闭环独享高毛利总装市场。',
        },
        {
          title: '相比传统非标自动化集成商',
          body: '省去数百万定制精密治具投入，客户综合投资回收期（Payback）压缩至 4.2 个月。',
        },
      ],
      quadrant: {
        x_label_left: '单一工位刚性硬编码',
        x_label_right: '跨任务零样本通用泛化',
        y_label_bottom: '实验室演示级良率 (<90%)',
        y_label_top: '严苛产线量产级良率 (>99.9%)',
        quadrant_labels: ['传统工控巨头', 'Verdant 领航壁垒区', '非标定制集成商', '纯视觉学术VLA原型'],
        points: [
          { label: 'Verdant AI', x: 84, y: 84, size: 9, highlight: true },
          { label: 'Legacy PLC + Vision', x: 24, y: 78, size: 7 },
          { label: 'Vision-Only VLA', x: 76, y: 36, size: 6 },
          { label: 'System Integrators', x: 28, y: 40, size: 5 },
          { label: 'Teleop Prototypes', x: 56, y: 22, size: 5 },
        ],
      },
    },
    {
      id: 'p6-ask',
      archetype: 'roadmap-milestones',
      eyebrow: '05 // THE ASK & USE OF FUNDS',
      title: '本轮融资**$3,500 万美元**，冲刺万台工位数据飞轮奇点',
      items: [
        {
          tag: '45% // FOUNDATION R&D',
          title: '百亿参数 VTLA-2 基座训练',
          metric: '$15.8M',
          accent: true,
          body: '扩充物理可微仿真集群，攻克双臂协同高动态线束缠绕与微电子装配。',
        },
        {
          tag: '30% // GLOBAL EXPANSION',
          title: '慕尼黑、圣何塞与东京交付中心',
          metric: '$10.5M',
          body: '支撑已签约欧洲车企与精密医疗器械灯塔客户全球同步扩产，2027 ARR 目标 $52M。',
        },
        {
          tag: '25% // TACTILE ECOSYSTEM',
          title: '第三代触觉芯片化模组量产',
          metric: '$8.7M',
          body: '将单指视触觉传感器 BOM 再降 50% 至 $19，向全球机器人本体厂开放标准接口。',
        },
      ],
    },
    {
      id: 'p7-close',
      archetype: 'closing-beacon',
      transition: 'morph',
      bleed_mark: 'GO',
      eyebrow: 'VERDANT ROBOTICS // JOIN THE JOURNEY',
      title: '让物理世界的灵巧生产力，**像云计算一样按需流淌**。',
      title_morph_id: 'verdant-hook',
      subtitle: '诚邀长期主义投资伙伴莅临苏州与慕尼黑量产产线实地考察。',
      media: {
        src: 'art://aurora-tactile-ripples',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
      },
      items: [
        { title: 'FOUNDERS', tag: 'FOUNDERS', body: 'founders@verdant-ai.io' },
        { title: 'LIVE DEMO', tag: 'LIVE DEMO', body: 'Suzhou · Munich · San Jose' },
      ],
    },
  ],
};

export const DECK_05_EXECUTIVE_CONSULTING: SlideDeckIR = {
  version: '2.0',
  meta: {
    title: '全球高能量密度储能供应链韧性重构战略',
    subtitle: '2026–2028 董事会专项战略审阅与区域产能投资组合决策',
    author: '集团战略规划部 & 全球运营委员会',
    date: '2026 Q4 BOARD REVIEW',
    brand_mark: 'STRATEGIC ADVISORY // BOARD MANDATE',
    style_id: 'executive-consulting',
    playbook_id: 'executive-strategy',
    locale: 'zh-CN',
  },
  slides: [
    {
      id: 'e1-cover',
      archetype: 'cover-cinematic',
      eyebrow: 'Executive Mandate // 2026–2028',
      title: '从“单一低成本外溢”转向**“区域闭环双源韧性网络”**',
      title_morph_id: 'exec-anchor',
      subtitle:
        '应对欧美本地化碳足迹新规与关税临界点，重构 120GWh 储能系统全球产能组合，锁定未来三年 +4.2 个百分点稳态毛利溢价。',
      media: {
        src: 'art://executive-cobalt-horizon',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
        caption: 'BOARD RESOLUTION  →  $310M PHASE-I ALLOCATION',
      },
    },
    {
      id: 'e2-summary',
      archetype: 'cards-3-staggered',
      transition: 'morph',
      eyebrow: '01 // EXECUTIVE SUMMARY',
      title: '三大战略研判：关税临界点已使**近岸本地化制造成为必选项**',
      title_morph_id: 'exec-anchor',
      subtitle: '维持纯出口路径将在 2027 年吞噬 62% 的欧美电网级大储营业利润。',
      items: [
        {
          tag: 'REGULATORY CLIFF',
          title: '欧美合规窗口仅剩 14 个月',
          icon: 'scale',
          metric: '-11.5 pct',
          body: '若不满足电池护照本土附加值门槛，综合税率将由 14% 跃升至 38.5%，直接丧失主流公用事业招投标资格。',
        },
        {
          tag: 'OPTIMAL FOOTPRINT',
          title: '“研发母厂 + 区域黑灯总装”架构',
          icon: 'compass',
          metric: '23.4% IRR',
          accent: true,
          body: '摒弃高风险全链条海外重资产建厂，采用高自动化本地 Pack 集成与绿电园区合资，降低 43% 初始资本开支。',
        },
        {
          tag: 'WORKING CAPITAL',
          title: '数字孪生排产释放 $2.4 亿现金流',
          icon: 'trending-up',
          metric: '-28 Days',
          body: '打通海运在途仓与区域保税缓冲池动态水位调度，端到端现金周转周期压缩近一个月。',
        },
      ],
    },
    {
      id: 'e3-chart',
      archetype: 'chart-spotlight',
      eyebrow: '02 // LANDED COST DIAGNOSIS',
      title: '2027 新规情景下，**摩洛哥与墨西哥双枢纽**具备显著到岸成本优势',
      items: [
        {
          title: '关税对冲净成本节约',
          metric: '$19 /kWh',
          accent: true,
          body: '依托双边自贸协定原产地资质完全豁免惩罚性关税，抵消海外人工溢价后仍净省 $19/kWh。',
        },
        {
          title: '绿电直供碳税红利',
          metric: '-34% CO2',
          body: '100% 风光直供园区满足欧盟电池法最高等级碳足迹评级（< 42 kgCO2e/kWh）。',
        },
      ],
      chart: {
        type: 'grouped-bar',
        unit: ' $/kWh',
        callout: '切换至双枢纽近岸总装后，欧美综合到岸成本由 **$136/kWh** 降至 **$115~$117/kWh**',
        categories: ['纯国内出口欧美', '东欧独资全链建厂', '摩洛哥自贸枢纽(推荐)', '墨西哥近岸总装(推荐)'],
        series: [
          { name: '制造与物流基础成本', values: [98, 121, 108, 110] },
          { name: '含关税及碳税总到岸成本', values: [136, 126, 115, 117] },
        ],
      },
      footnote: '测算基准：5MWh 液冷磷酸铁锂集装箱系统，碳酸锂与海运价格按 2026Q4 远期曲线锁定。',
    },
    {
      id: 'e4-table',
      archetype: 'three-line-table',
      eyebrow: '03 // CAPITAL ALLOCATION MATRIX',
      title: '四大候选海外产能基地**全生命周期回报与地缘敏感度评估**',
      table: {
        caption: '表 1：30GWh 标准区域模组与集成基地投资组合对比（WACC = 8.5%）',
        headers: ['候选基地选址', '初始 CAPEX ($M)', '达产周期', '自贸关税豁免', '税后项目 IRR', '董事会决策建议'],
        align: ['left', 'right', 'center', 'center', 'right', 'center'],
        highlight_rows: [0, 1],
        rows: [
          ['摩洛哥丹吉尔绿电港 (Phase I)', '$310M', '14 个月', '欧美双边 FTA 豁免', '23.4%', '**优先立项 (一号工程)**'],
          ['墨西哥新莱昂工业园 (Phase II)', '$285M', '12 个月', '北美本地化合规', '20.8%', '**并行锁地 (二号工程)**'],
          ['匈牙利德布勒森独资园', '$640M', '28 个月', '欧盟境内免税', '12.1%', '暂缓重资产电芯段'],
          ['东南亚传统转口组装仓', '$140M', '9 个月', '面临反规避穿透核查', '9.4%', '逐步缩减存量敞口'],
        ],
        footnote: '资料来源：集团战略财务模型 v8.2 及外部国际税法顾问尽调报告。',
      },
    },
    {
      id: 'e5-arch',
      archetype: 'architecture-flow',
      eyebrow: '04 // DIGITAL TWIN OPERATING MODEL',
      title: '核心工艺留母厂、敏捷总装近市场的**三层解耦运营拓扑**',
      diagram: {
        layout: 'layered',
        nodes: [
          {
            id: 'n1',
            label: '长三角零碳研发母厂与极片中心',
            sublabel: 'LFP 高压实配方 · 干法电极母机 · BOM 占比 58%',
            layer: 0,
            accent: true,
          },
          {
            id: 'n2',
            label: '摩洛哥丹吉尔欧洲门户基地',
            sublabel: '40GWh 电芯精封 + 5MWh 液冷舱总装 (EU FTA)',
            layer: 1,
            accent: true,
          },
          {
            id: 'n3',
            label: '墨西哥蒙特雷北美近岸基地',
            sublabel: '35GWh 黑灯 Pack 产线 + 本地 BMS 集成 (USMCA)',
            layer: 1,
            accent: true,
          },
          {
            id: 'n4',
            label: '鹿特丹 / 休斯顿电网运维与循环中心',
            sublabel: '48h 备件响应 · 电池护照云端溯源 · 锂镍闭环再生',
            layer: 2,
          },
        ],
        edges: [
          { from: 'n1', to: 'n2', label: '预制产线与核心主材直航' },
          { from: 'n1', to: 'n3', label: '数字孪生工艺包 OTA 同步' },
          { from: 'n2', to: 'n4', label: '欧盟零碳合规并网' },
          { from: 'n3', to: 'n4', label: '北美电网级大储交付' },
        ],
      },
    },
    {
      id: 'e6-timeline',
      archetype: 'process-timeline',
      eyebrow: '05 // PMO EXECUTION ROADMAP',
      title: '2027 四个季度**关键里程碑与跨部门问责路径**',
      items: [
        {
          tag: '2027 Q1',
          title: '合资交割与 15 年绿电 PPA',
          metric: '100% 绿电',
          accent: true,
          body: '完成丹吉尔港土地交割及 $0.038/kWh 风光直供长协签署。',
        },
        {
          tag: '2027 Q2',
          title: '母厂预制黑灯产线整柜发运',
          metric: '-40% 工期',
          body: '国内完成全线联调预验收后模块化海运，规避海外基建延期风险。',
        },
        {
          tag: '2027 Q3',
          title: '首批本土合规系统并网交付',
          metric: '15 GWh',
          body: '取得欧盟碳足迹认证并交付英国、德国首批独立储能标杆项目。',
        },
        {
          tag: '2027 Q4',
          title: '双枢纽达产兑现利润增量',
          metric: '+$380M',
          body: '海外高毛利订单占比跃升至 55%，全年 EBITDA 增量全面兑现。',
        },
      ],
    },
    {
      id: 'e7-close',
      archetype: 'closing-beacon',
      transition: 'morph',
      eyebrow: 'BOARD RESOLUTION // DECISION REQUIRED',
      title: '提请董事会批准**首期 $3.1 亿美元丹吉尔绿电枢纽资本开支**',
      subtitle: '以确定性的全球化制造纵深，构筑穿越贸易周期的结构性壁垒。',
      media: {
        src: 'art://executive-green-port',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
      },
      items: [
        { title: 'LEAD SPONSOR', tag: 'LEAD SPONSOR', body: '集团首席运营官 (COO) & 战略副总裁' },
        { title: 'GATE REVIEW', tag: 'GATE REVIEW', body: '2027 Q1 审计与风险委员会里程碑复核' },
      ],
    },
  ],
};

export const DECK_06_NATURE_ACADEMIC: SlideDeckIR = {
  version: '2.0',
  meta: {
    title: 'NeuroSym-World: 物理守恒约束下的神经符号连续时空世界模型',
    subtitle: 'Hamiltonian-Constrained Neuro-Symbolic World Models for Long-Horizon Physical Reasoning',
    author: '林知远, 陈沐阳, Prof. H. Vance · 清华大学交叉信息院 & MIT CSAIL',
    date: 'NATURE MACHINE INTELLIGENCE // ORAL 2026',
    brand_mark: 'NATURE MACHINE INTELLIGENCE // ORAL',
    style_id: 'nature-academic',
    playbook_id: 'academic-defense',
    locale: 'zh-CN',
  },
  slides: [
    {
      id: 'a1-cover',
      archetype: 'cover-editorial-split',
      eyebrow: 'ORAL PAPER // PHYSICAL WORLD MODELS',
      eyebrow_morph_id: 'nature-kicker',
      title: 'NeuroSym-World：将**哈密顿守恒律**嵌入百亿参数视频世界模型',
      subtitle:
        '突破纯数据驱动扩散模型在长时程交互中的“动量凭空创生与几何穿透幻觉”，首次实现 60 秒刚柔耦合场景零能量发散预测。',
      media: {
        src: 'art://nature-pendulum-trace',
        camera_mode: 'portal-right',
        morph_id: 'cinema-bg',
        caption: 'Fig 1. Phase-Space Damped Harmonic Trajectory Convergence',
      },
    },
    {
      id: 'a2-versus',
      archetype: 'comparison-versus',
      transition: 'morph',
      eyebrow: '01 // PROBLEM FORMULATION',
      eyebrow_morph_id: 'nature-kicker',
      title: '视觉逼真不等于物理可信：**像素级扩散模型的长程结构坍塌**',
      subtitle: '当世界模型用于具身规划与科学仿真时，微小的非保守场误差会随自回归步数指数级爆炸。',
      items: [
        {
          tag: 'UNCONSTRAINED PIXEL DIFFUSION',
          title: '纯黑盒二维光流扩散模型',
          metric: '42.6% 违例率',
          body: '仅拟合像素帧间统计相关性，超过 8 秒后频繁出现刚体相互穿透、质量无故湮灭及总能量发散。',
        },
        {
          tag: 'SYMPLECTIC NEUROSYM (OURS)',
          title: '辛几何流形神经符号世界模型',
          metric: '1.8% 违例率',
          accent: true,
          body: '在连续潜空间显式解耦广义坐标与共轭动量，通过可微蛙跳辛积分器严格保持相空间体积与能量上界。',
        },
      ],
    },
    {
      id: 'a3-math',
      archetype: 'academic-paper-2col',
      eyebrow: '02 // THEORETICAL FORMULATION',
      title: '核心数学建模：潜空间**耗散端口哈密顿神经微分方程**',
      subtitle: '在保守辛结构矩阵基础上引入半正定瑞利耗散势，统一刻画弹性碰撞与真实接触摩擦。',
      formula_block: {
        title: 'Dissipative Port-Hamiltonian Dynamics',
        equation_number: '(Eq. 3)',
        latex:
          '\\frac{d}{dt}\\begin{bmatrix} \\mathbf{q}_t \\\\ \\mathbf{p}_t \\end{bmatrix} = \\left( \\mathbf{J} - \\mathbf{R}(\\mathbf{q}_t) \\right) \\nabla \\mathcal{H}_{\\theta}(\\mathbf{q}_t, \\mathbf{p}_t) + \\mathbf{G}(\\mathbf{q}_t)\\mathbf{u}_t',
        symbols: [
          { symbol: '\\mathbf{q}_t, \\mathbf{p}_t \\in \\mathbb{R}^d', meaning: '由三维高斯溅射编码器提取的对象中心广义坐标与共轭动量' },
          { symbol: '\\mathbf{J} = -\\mathbf{J}^\\top', meaning: '反对称辛结构矩阵，从代数结构上严格保证保守内力不做净功' },
          { symbol: '\\mathbf{R}(\\mathbf{q}_t) \\succeq 0', meaning: '半正定瑞利摩擦耗散算子，确保零输入下系统总能量单调不增' },
          { symbol: '\\mathbf{u}_t', meaning: '外部智能体施加的连续力矩控制向量' },
        ],
      },
      items: [
        {
          tag: 'THEOREM 1',
          title: '长时程李雅普诺夫有界性保证',
          accent: true,
          formula: '\\frac{d\\mathcal{H}_\\theta}{dt} = -(\\nabla_{\\mathbf{p}}\\mathcal{H}_\\theta)^\\top \\mathbf{R} (\\nabla_{\\mathbf{p}}\\mathcal{H}_\\theta) \\le 0',
          body: '严格证明了任意步长自回归展开均不会发生潜变量范数爆炸。',
        },
        {
          tag: 'DISCRETIZATION',
          title: '二阶蛙跳辛积分核 (Leapfrog Symplectic)',
          body: '相比传统欧拉离散化，长期能量漂移上界由线性发散 $O(T \\cdot \\Delta t)$ 压缩至有界微幅振荡 $O(\\Delta t^2)$。',
        },
      ],
    },
    {
      id: 'a4-pipeline',
      archetype: 'architecture-flow',
      eyebrow: '03 // ARCHITECTURE PIPELINE',
      title: '端到端可微**等变感知—符号辛演化—4D高斯渲染**流水线',
      diagram: {
        layout: 'pipeline',
        nodes: [
          { id: 'p1', label: '多视角 RGB-D 观测流', sublabel: 'SE(3) 等变特征 ∈ R^{K×256}' },
          { id: 'p2', label: '对象符号槽编码器', sublabel: '解耦相空间 (q_t, p_t, M^{-1})', accent: true },
          { id: 'p3', label: '二阶蛙跳辛积分核', sublabel: 'Δt=16ms 守恒场 (J-R)∇H_θ', accent: true },
          { id: 'p4', label: '4D 高斯溅射解码器', sublabel: '可微多视角物理一致重渲染' },
        ],
        edges: [
          { from: 'p1', to: 'p2', label: 'Slot Attn' },
          { from: 'p2', to: 'p3', label: 'Latent ODE' },
          { from: 'p3', to: 'p4', label: '4D-GS' },
        ],
      },
    },
    {
      id: 'a5-table',
      archetype: 'three-line-table',
      eyebrow: '04 // QUANTITATIVE EVALUATION',
      title: 'PhysBench-4D 与真实灵巧操作基准**主实验 SOTA 定量对比**',
      table: {
        caption: 'Table 1: 600 帧长时程物理预测与下游机械臂规划成功率对比（均值，3 随机种子）',
        headers: ['Method (方法模型)', 'Params', 'FVD ↓ (视觉质量)', 'Energy Drift ↓ (能量漂移)', '3D IoU ↑ (几何一致)', 'Robot Task SR ↑'],
        align: ['left', 'center', 'center', 'center', 'center', 'center'],
        highlight_rows: [4],
        rows: [
          ['Cosmos-Predict-14B', '14.0B', '84.2', '38.7%', '0.512', '54.0%'],
          ['VideoDiT-XL + Flow', '7.2B', '91.5', '44.1%', '0.486', '48.5%'],
          ['NeuralODE-Latent', '3.4B', '106.8', '19.4%', '0.628', '66.2%'],
          ['NeuroSym w/o Symplectic (Ablation)', '3.8B', '76.4', '14.2%', '0.705', '74.8%'],
          ['**NeuroSym-World (Ours)**', '**3.8B**', '**62.1**', '**1.3%**', '**0.849**', '**89.6%**'],
        ],
        footnote: '↓ 越低越优，↑ 越高越优；突出显示行代表统计显著最优 (Paired t-test p < 0.001)。',
      },
    },
    {
      id: 'a6-chart',
      archetype: 'chart-spotlight',
      eyebrow: '05 // LONG-HORIZON STABILITY',
      title: '跨越 60 秒超长时程推演，系统能量漂移始终收敛于**1.5%以内**',
      items: [
        {
          title: '参数量缩减 73%，性能大幅反超',
          metric: '3.8B',
          accent: true,
          body: '嵌入式物理守恒归纳偏置免除了模型从海量噪声像素中暴力拟合牛顿定律的冗余容量。',
        },
        {
          title: '零样本极端重力泛化',
          metric: '+31.4%',
          body: '在训练未见的月球低重力 (1.62 m/s²) 与非牛顿流体交互集上保持稳健推演。',
        },
      ],
      chart: {
        type: 'line',
        unit: '%',
        highlight_index: 5,
        callout: '60 秒（600 帧）推演末端：纯扩散基线能量误差发散至 **41.2%**，我方模型稳定在 **1.3%**',
        categories: ['5s', '10s', '20s', '30s', '45s', '60s'],
        series: [
          { name: 'NeuroSym-World (Ours)', values: [0.6, 0.8, 1.0, 1.1, 1.2, 1.3] },
          { name: 'Cosmos-Predict-14B Baseline', values: [3.2, 8.5, 17.4, 25.8, 34.0, 41.2] },
        ],
      },
    },
    {
      id: 'a7-close',
      archetype: 'closing-beacon',
      transition: 'portal',
      eyebrow: 'CONCLUSION & OPEN SCIENCE',
      title: '物理守恒先验与神经表征的统一，是通往**可信世界模型**的必由之路',
      subtitle: '全部训练代码、PhysBench-4D 基准数据集与预训练权重均已开源。',
      media: {
        src: 'art://nature-pendulum-trace',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
      },
      items: [
        { title: 'OPEN REPOSITORY', tag: 'OPEN REPOSITORY', body: 'github.com/neurosym-world/core' },
        { title: 'PROJECT PAGE', tag: 'PROJECT PAGE', body: 'neurosym-world.csail.mit.edu' },
      ],
    },
  ],
};
