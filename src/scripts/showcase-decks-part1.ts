/**
 * v3.0 殿堂级先锋旗舰样板集 Part 1 (Showcase Decks 01 ~ 03)
 * 审计整改亮点：
 * - 01 Apple Keynote Dark：四幕递进专属真图（硅光波导 -> 玄武岩光影 -> 钛金封装腔体 -> 激光暗场），彻底消除单图疲劳与色温冲突；
 * - 02 Editorial Vogue：消除中文加粗空格裂缝，洞石亚麻与美术馆旋梯交替策展，跨界建筑切口衬板 15:1 对比度；
 * - 03 Oriental Ink Zen：正式启用传统书卷竖排大标题 (vertical_title: true) + 朱砂篆印，移除廉价粉红圆日。
 */
import type { SlideDeckIR } from '../types/ir.js';

export const DECK_01_APPLE_KEYNOTE: SlideDeckIR = {
  version: '2.0',
  meta: {
    title: 'AETHER M5',
    subtitle: '以片上硅光互连重构端侧万亿参数空间智能',
    author: 'Aether Silicon Lab',
    date: '2026 AUTUMN KEYNOTE',
    brand_mark: 'AETHER // SILICON',
    style_id: 'apple-keynote-dark',
    playbook_id: 'keynote-launch',
    locale: 'zh-CN',
  },
  slides: [
    {
      id: 's1-cover',
      archetype: 'cover-cinematic',
      bleed_mark: 'M5',
      side_note: 'KEYNOTE 2026 — OPTICAL SILICON ARCHITECTURE',
      eyebrow: 'Prologue // Beyond Copper Limits',
      eyebrow_morph_id: 'kicker-aether',
      title: '认识 **Aether M5**\n光速级端侧神经引擎',
      title_morph_id: 'hero-aether-title',
      subtitle:
        '首次将 64 通道纳米硅光波导直接刻入 2nm 计算裸片，彻底击穿传统铜互连内存墙，让百亿多模态世界模型在毫瓦级功耗下实时觉醒。',
      media: {
        src: 'art://silicon-photonic-macro',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
        caption: '01 / 08  →  64-CHANNEL SILICON PHOTONIC DIE',
      },
    },
    {
      id: 's2-interlock',
      archetype: 'editorial-magazine',
      transition: 'portal',
      bleed_mark: '68',
      eyebrow: '01 // THE COPPER BOTTLENECK',
      eyebrow_morph_id: 'kicker-aether',
      title: '算力暴涨百倍，芯片内部却有**68%的总功耗**困于搬运途中',
      subtitle:
        '电子在纳米铜线中的焦耳热阻与 RC 延迟，已成为端侧实时空间智能不可逾越的物理高墙。',
      media: {
        src: 'art://silicon-photonic-macro',
        camera_mode: 'portal-left',
        morph_id: 'cinema-bg',
      },
      items: [
        {
          title: '跨封装带宽饥渴',
          metric: '4.2 TB/s',
          body: '万亿参数多模态推理每秒需吞吐逾 4TB 张量权重，传统电互连功耗呈指数级失控。',
        },
        {
          title: '眩晕安全时延红线',
          metric: '< 12 ms',
          body: '超过 15ms 的光子到像素（Photon-to-Photon）延迟将直接破坏空间计算的临场真实感。',
        },
      ],
    },
    {
      id: 's3-collage',
      archetype: 'bento-asymmetric-4',
      transition: 'morph',
      bleed_mark: '02',
      eyebrow: '02 // UNIFIED PHOTONIC ARCHITECTURE',
      title: '四大物理层重构，铸就**零热耗光子网格**',
      subtitle: '摒弃冗余总线仲裁，让计算簇通过片上激光脉冲直接对话。',
      items: [
        {
          title: '硅光波导片上网格 (Optical Mesh)',
          tag: 'FLAGSHIP CORE',
          metric: '9.6 TB/s',
          body: '以 1310nm 激光脉冲替代电子充放电传输张量，跨核寻址延迟骤降至皮秒量级。',
          accent: true,
          morph_id: 'cinema-bg',
          media: { src: 'art://monolith-chiaroscuro' },
        },
        {
          title: '动态稀疏 FP4 神经张量核',
          tag: 'NEURAL ENGINE',
          icon: 'zap',
          metric: '180 TOPS',
          body: '硬件级自动跳过 75% 无效零激活权重，峰值算力密度提升 3.2 倍。',
        },
        {
          title: '零拷贝统一光子内存池',
          tag: 'UNIFIED MEMORY',
          icon: 'layers',
          metric: '192 GB',
          body: 'CPU、GPU 与光子张量核共享同一物理寻址空间，彻底消除拷贝开销。',
        },
        {
          title: '物理量子随机数安全飞地',
          tag: 'ENCLAVE',
          icon: 'shield',
          metric: 'AES-512',
          body: '基于光子散粒噪声生成真随机密钥流，端侧隐私数据永不出片。',
        },
      ],
    },
    {
      id: 's4-zoom',
      archetype: 'focus-zoom-detail',
      transition: 'parallax',
      container_morph_id: 'cinema-bg',
      bleed_mark: '03',
      eyebrow: '03 // MICRO-RING RESONATOR DEEP DIVE',
      title: '推镜深潜：4 微米谐振环的**皮秒级光谱路由**',
      subtitle:
        '在 CNC 精密阳极氧化钛金散热腔之下集成氮化硅微环阵列，单根波导并行复用 16 路独立波长信号。',
      media: {
        src: 'art://apple-titanium-cavity',
        camera_mode: 'pan-zoom-detail',
        morph_id: 'cinema-bg',
      },
      hero_metric: {
        value: '0.32',
        unit: ' pJ/bit',
        label: '超低光电转换比特能耗（仅为传统电 SerDes 的 1/9）',
      },
      items: [
        {
          title: '闭环热敏自校准偏置',
          icon: 'sparkles',
          body: '片上微秒级热传感器动态锁定谐振波长，跨越 100°C 温差零误码运行。',
        },
        {
          title: '全交叉无阻塞光开关',
          icon: 'network',
          body: '任意两个计算簇之间仅需一次光折射直达，消除高并发尾延迟抖动。',
        },
        {
          title: '原生兼容 300mm 标准晶圆厂',
          icon: 'cpu',
          body: '无需昂贵奇异化合物工艺，直接复用成熟硅光后道产线实现百万片级交付。',
        },
      ],
    },
    {
      id: 's5-metric',
      archetype: 'hero-metric',
      transition: 'morph',
      bleed_mark: '4.8',
      eyebrow: '04 // PER-WATT BREAKTHROUGH',
      title: '无风扇被动散热包络下的**绝对能效统治力**',
      media: {
        src: 'art://cyber-stage-laser',
        camera_mode: 'vertical-slit',
        morph_id: 'cinema-bg',
      },
      hero_metric: {
        value: '4.8',
        unit: '×',
        delta: '+380% EFFICIENCY OVER DESKTOP NPU',
        label: '端侧 70B 多模态模型每瓦特持续解码吞吐跃升',
        description:
          '在仅 12W 轻薄设备功耗上限内稳定输出 68 tokens/s，并同步驱动双目 8K@120Hz 实时空间渲染。',
      },
      overlap_note: {
        title: '11.4 ms 首字瞬时响应',
        body: '深空钛蓝冷调铭牌：32K 上下文零感预填充，全天候 22 小时免充电续航。',
        position: 'bottom-right',
        morph_id: 'aether-overlap',
      },
    },
    {
      id: 's6-chart',
      archetype: 'chart-spotlight',
      eyebrow: '05 // MLPERF CLIENT BENCHMARK',
      title: '百万词元长窗口推理吞吐**全面领跑旗舰芯片**',
      items: [
        {
          title: '线性长序列扩展',
          metric: '1M ctx',
          accent: true,
          body: '依托高带宽统一光内存，在百万上下文负载下彻底告别传统显存换页悬崖。',
        },
        {
          title: '实测环境基准',
          metric: '25°C',
          body: 'MLPerf Client v4.5 多模态标准套件，无主动风扇连续满载 30 分钟均值。',
        },
      ],
      chart: {
        type: 'bar',
        unit: ' tok/s',
        highlight_index: 4,
        callout: 'Aether M5 在 15W 端侧功耗下飙升至 **118 tok/s**，达到桌面级 65W 处理器的 **2.4倍**',
        categories: ['Mobile SoC X', 'Laptop NPU Pro', 'Desktop APU Z', 'Aether M4', 'Aether M5'],
        series: [{ name: '70B Multimodal Decode Throughput', values: [19, 34, 49, 68, 118] }],
      },
      footnote: 'Source: Aether Silicon Architecture Verification Lab, Q4 2026.',
    },
    {
      id: 's7-code',
      archetype: 'code-architecture',
      eyebrow: '06 // PHOTONGRAPH COMPILER',
      title: '三行代码，无缝唤醒**片上光广播原语加速**',
      code_block: {
        language: 'typescript',
        caption: 'aether-sdk // spatial_pipeline.ts',
        highlight_lines: [4, 5, 6, 9],
        code: `import { PhotonSession, QuantMode } from '@aether/photon-rt';

const session = await PhotonSession.compile({
  model: 'omni-world-72b.aether',
  interconnect: 'optical-mesh-zero-copy',
  precision: QuantMode.DynamicFP4,
  latencyBudgetMs: 12
});

const frameState = await session.stepSpatialStream(rgbDepthTensor);`,
      },
      items: [
        {
          title: 'PyTorch / JAX 零侵入图捕获',
          icon: 'terminal',
          accent: true,
          body: '编译器自动将多头注意力归约算子映射为单周期光波分广播，无需改写模型代码。',
        },
        {
          title: '皮秒级光路可视化探针',
          icon: 'eye',
          body: '内置硬件性能计数器，实时呈现 64 通道光谱负载热力图与缓存命中轨迹。',
        },
      ],
    },
    {
      id: 's8-closing',
      archetype: 'closing-beacon',
      transition: 'morph',
      bleed_mark: 'M5',
      eyebrow: 'EPILOGUE // ONE MORE THING',
      title: '光之所及，**皆为算境**。',
      title_morph_id: 'hero-aether-title',
      subtitle: 'Aether M5 开发者先锋套件即日起开放全球限量申请。',
      media: {
        src: 'art://apple-titanium-cavity',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
      },
      items: [
        { title: 'DEV PORTAL', tag: 'DEV PORTAL', body: 'developer.aether.silicon' },
        { title: 'WHITEPAPER', tag: 'WHITEPAPER', body: 'ISSCC 2027 Plenary Paper' },
        { title: 'SHIPPING', tag: 'SHIPPING', body: '2027 Q1 Mass Production' },
      ],
    },
  ],
};

export const DECK_02_EDITORIAL_VOGUE: SlideDeckIR = {
  version: '2.0',
  meta: {
    title: 'MAISON LUMIÈRE',
    subtitle: '静奢建筑与触觉回归 — 2026 全球空间美学策展提案',
    author: 'Atelier Lumière Paris · Shanghai',
    date: 'ISSUE NO. 14 // AUTUMN CURATION',
    brand_mark: 'MAISON LUMIÈRE',
    style_id: 'editorial-vogue',
    playbook_id: 'brand-manifesto',
    locale: 'zh-CN',
  },
  slides: [
    {
      id: 'v1-cover',
      archetype: 'cover-cinematic',
      bleed_mark: '14',
      side_note: 'ISSUE NO.14 — TACTILE ARCHITECTURE & LIGHT',
      eyebrow: 'Curatorial Manifesto // Autumn–Winter',
      title: '在喧嚣像素时代，重建**可触摸的沉默与骨相**',
      title_morph_id: 'lumiere-title',
      subtitle:
        '当光滑冰冷的屏幕吞噬了日常感知的颗粒度，真正的高奢空间正在从“视觉炫技”退回天然洞石、未漂白亚麻与午后斜阳的诚实对话。',
      media: {
        src: 'art://travertine-linen-sculpture',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
        caption: 'PLATE 01 — ROMAN TRAVERTINE & BELGIAN LINEN',
      },
    },
    {
      id: 'v2-interlock',
      archetype: 'editorial-magazine',
      transition: 'portal',
      bleed_mark: '02',
      eyebrow: 'CHAPTER I // ARCHITECTURAL INTERLOCK',
      title: '字跨明暗交界，打破**图像与排印割裂的藩篱**',
      subtitle:
        '拒绝将空间摄影缩进局促的方框。让石灰岩螺旋穹顶化作左侧通顶画窗，以建筑切口衬板承载锋利排印。',
      media: {
        src: 'art://vogue-spiral-stair',
        camera_mode: 'portal-left',
        morph_id: 'cinema-bg',
      },
      items: [
        {
          title: '洞石孔隙的时间呼吸',
          body: '保留罗马洞石未经树脂封堵的天然蜂窝气孔，让侧向低角度天光在石壁切出微缩峡谷般的漫反射阴影。',
        },
        {
          title: '重磅原麻的声学包裹',
          body: '以经纬分明的未漂白亚麻垂幔软化硬朗石材棱角，吸收高频混响，构筑修道院般的静谧声场。',
        },
      ],
    },
    {
      id: 'v3-quote',
      archetype: 'quote-manifesto',
      transition: 'morph',
      bleed_mark: '“',
      media: {
        src: 'art://monolith-chiaroscuro',
        camera_mode: 'vertical-slit',
        morph_id: 'cinema-bg',
      },
      quote: {
        text: '真正的奢华从不是装饰的堆砌，而是当一切冗余被克制剥离后，**光落在粗粝原石上那道恰到好处的阴影**。',
        author: 'Claire Moreau',
        role: 'Maison Lumière 巴黎首席空间策展总监',
      },
    },
    {
      id: 'v4-golden',
      archetype: 'split-golden-ratio',
      transition: 'portal',
      bleed_mark: '04',
      eyebrow: 'CHAPTER II // SPATIAL CHOREOGRAPHY',
      title: '先抑后扬：三段式明暗压缩的**心理降速序厅**',
      subtitle: '以光通量的戏剧性落差洗去访客步入展厅前的都市浮躁。',
      media: {
        src: 'art://vogue-spiral-stair',
        camera_mode: 'portal-left',
        morph_id: 'cinema-bg',
      },
      items: [
        {
          tag: 'COMPRESSION // 15 LUX',
          title: '玄关暗巷收敛视线',
          metric: '2.4 m',
          body: '刻意压低入口廊道挑高，仅留地面一道洗墙暖光引导脚步放缓。',
        },
        {
          tag: 'RELEASE // 380 LUX',
          title: '旋梯光井豁然释放',
          metric: '7.8 m',
          accent: true,
          body: '步出暗巷瞬间迎接近八米挑高弧形天窗，自然天光沿旋转石阶倾泻而下。',
        },
      ],
    },
    {
      id: 'v5-stagger',
      archetype: 'cards-3-staggered',
      bleed_mark: '05',
      eyebrow: 'CHAPTER III // MULTI-SENSORY ARCHIVE',
      title: '超越视觉的**三维五感空间记忆标尺**',
      subtitle: '摒弃生硬展板，让空间气质同时镌刻在指尖温度、嗅觉与听觉余韵里。',
      items: [
        {
          tag: 'LUMINANCE',
          title: '日落色温无感随动',
          icon: 'aperture',
          metric: '2700K',
          body: '全馆照明随室外暮色自动向烛光暖调平滑过渡，赋予黄昏展厅神圣仪式感。',
        },
        {
          tag: 'OLFACTORY',
          title: '冷萃矿物与雪松印记',
          icon: 'feather',
          metric: 'No.07',
          accent: true,
          body: '将雨后石灰岩、干雪松木屑与岩兰草气息隐匿于微风循环系统之中。',
        },
        {
          tag: 'ACOUSTICS',
          title: '图书馆级留白声景',
          icon: 'sliders',
          metric: '32 dB',
          body: '精密控制室内背景噪底，唯留庭院水滴落入黑石钵的清脆自然泛音。',
        },
      ],
    },
    {
      id: 'v6-roadmap',
      archetype: 'roadmap-milestones',
      eyebrow: 'CHAPTER IV // GLOBAL EXHIBITION CALENDAR',
      title: '2026–2027 四城巡回**建筑美学特展日历**',
      items: [
        {
          tag: 'PARIS // OCT 2026',
          title: '玛黑区百年铸铁工坊首展',
          metric: '1,200 ㎡',
          accent: true,
          body: '在十九世纪砖拱天窗下呈现洞石与原麻首发大型空间装置。',
        },
        {
          tag: 'SHANGHAI // DEC 2026',
          title: '西岸美术馆大道江畔展亭',
          metric: '1,850 ㎡',
          body: '引入黄浦江冬日晨雾意象，打造水院环绕式静谧长廊。',
        },
        {
          tag: 'MILAN // APR 2027',
          title: '米兰设计周古修道院回廊',
          metric: '960 ㎡',
          body: '当代极简几何切面与五百年历史石柱群展开跨时空对话。',
        },
        {
          tag: 'KYOTO // SEP 2027',
          title: '东山町家枯山水私享终章',
          metric: '640 ㎡',
          body: '每日仅开放 40 席预约凝视时段，回归极致东方幽玄尺度。',
        },
      ],
    },
    {
      id: 'v7-close',
      archetype: 'closing-beacon',
      transition: 'morph',
      bleed_mark: 'FIN',
      eyebrow: 'ATELIER LUMIÈRE // PRIVATE SALON',
      title: '唯有经得起凝视的肌理，**方能对抗速朽**。',
      title_morph_id: 'lumiere-title',
      subtitle: '诚邀莅临巴黎与上海预览沙龙，共启空间诗学新章。',
      media: {
        src: 'art://vogue-spiral-stair',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
      },
      items: [
        { title: 'CURATORIAL DESK', tag: 'CURATORIAL DESK', body: 'salon@maison-lumiere.art' },
        { title: 'CITIES', tag: 'CITIES', body: 'Paris · Shanghai · Milan · Kyoto' },
      ],
    },
  ],
};

export const DECK_03_ORIENTAL_ZEN: SlideDeckIR = {
  version: '2.0',
  meta: {
    title: '云林造物 · 计白当黑',
    subtitle: '宋代一角留白精神与当代江南院落空间营造',
    author: '云林建筑与人文研究所',
    date: '丙午年 · 秋集',
    brand_mark: '云林造物 // YUNLIN',
    style_id: 'oriental-ink-zen',
    playbook_id: 'brand-manifesto',
    locale: 'zh-CN',
  },
  slides: [
    {
      id: 'z1-cover',
      archetype: 'cover-cinematic',
      vertical_title: true,
      bleed_mark: '白',
      eyebrow: 'ORIENTAL POETICS // 宋人营造考',
      title: '计白当黑\n**安顿天地山林**',
      title_morph_id: 'zen-title',
      subtitle:
        '不求雕梁画栋之繁复，唯取宋代马远折枝一角之疏朗骨相。以素宣粉墙为纸，以苍崖丹叶为墨，重构当代中国人的精神栖居。',
      media: {
        src: 'art://oriental-ink-cliff',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
        caption: '卷首图 · 马远一角构图宣纸宿墨丹叶意境',
      },
    },
    {
      id: 'z2-statement',
      archetype: 'statement-impact',
      transition: 'morph',
      bleed_mark: '境',
      eyebrow: '卷壹 // 留白之哲学',
      title: '西方建筑向天空争夺高度，而东方园林向内心**退让出留白的深度**。',
      title_morph_id: 'zen-title',
      subtitle: '留白并非空无一物，而是特意为四时风声、晨昏日影与居者思绪预留的容器。',
      items: [
        {
          title: '疏可走马',
          body: '大面积澄明水院与素白宣墙涤荡视觉噪杂，令都市焦灼心神瞬时沉静。',
        },
        {
          title: '密不透风',
          body: '屋角一株横斜红叶、数块斧劈黑山石精妙咬合，于极简处见无穷生机。',
        },
        {
          title: '隔而不绝',
          body: '以细密竹帘、漏窗与晨雾取代生硬实墙，营造含蓄深远的空间余韵。',
        },
      ],
    },
    {
      id: 'z3-split',
      archetype: 'split-media-50',
      transition: 'portal',
      bleed_mark: '观',
      eyebrow: '卷贰 // 步移景异三法',
      title: '无心画框：以建筑之檐，**裁取流动山水长卷**',
      subtitle: '将计成《园冶》造园法则转译为极简现代框景语言。',
      media: {
        src: 'art://oriental-water-pavilion',
        camera_mode: 'portal-right',
        morph_id: 'cinema-bg',
      },
      items: [
        {
          title: '抑景藏幽 · 三折汀步',
          body: '入口设素面影壁障目，经三折青石水上汀步转折，百平镜面寒潭方才豁然入怀。',
        },
        {
          title: '低窗纳水 · 卧游听雨',
          body: '茶室正席舍弃满幅落地窗，仅于离地四十公分处开横长低窗，专取水面涟漪与修竹根节。',
        },
        {
          title: '镜潭借天 · 云影徘徊',
          body: '院心铺设深墨色黑山石静水盘，将天际流云、飞鸟与晚霞尽数收纳于方寸院心。',
        },
      ],
    },
    {
      id: 'z4-metric',
      archetype: 'hero-metric',
      transition: 'morph',
      bleed_mark: '寂',
      eyebrow: '卷叁 // 空间尺度与留白配比',
      title: '三分匠作，七分天成：**克制到极致的院落留白率**',
      media: {
        src: 'art://oriental-ink-cliff',
        camera_mode: 'vertical-slit',
        morph_id: 'cinema-bg',
      },
      hero_metric: {
        value: '72',
        unit: '%',
        delta: 'SONG DYNASTY MINIMALIST VOID RATIO',
        label: '全院水面、素墙与天空无遮挡留白面积占比',
        description:
          '严苛控制建筑实体占地不超三成，让风道、天光与水汽在院落中自由吐纳呼吸。',
      },
      overlap_note: {
        title: '0 金属钉 · 古法碳化杉木榫卯',
        body: '沿袭宋《营造法式》燕尾直榫形制，历经江南梅雨寒暑而严丝合缝，散发草木沉香。',
        position: 'bottom-right',
        morph_id: 'zen-overlap',
      },
    },
    {
      id: 'z5-timeline',
      archetype: 'process-timeline',
      eyebrow: '卷肆 // 十二时辰光影谱',
      title: '顺时而居：院落一日四时的**光影情绪节律**',
      items: [
        {
          tag: '卯时 · 06:00',
          title: '晨雾竹露',
          metric: '东曦初透',
          body: '微凉晨光穿过东侧修竹格栅，在宣浆素墙投下摇曳生姿的淡淡水墨斜影。',
        },
        {
          tag: '午时 · 12:00',
          title: '深檐庇荫',
          metric: '挑檐 1.8m',
          accent: true,
          body: '深远碳化木挑檐精准遮蔽盛夏正午烈日，室内唯有水面反射的清凉波光轻晃。',
        },
        {
          tag: '酉时 · 18:00',
          title: '丹叶映水',
          metric: '朱砂暮色',
          body: '夕照余晖点燃崖畔一枝红叶，整座静谧水院化作一方微醺的宋代朱砂砚池。',
        },
        {
          tag: '亥时 · 21:30',
          title: '石灯听雨',
          metric: '月白微光',
          body: '贴地青石灯笼泛起温润烛色，仅照亮脚下青苔汀步，将璀璨星河归还夜空。',
        },
      ],
    },
    {
      id: 'z6-quote',
      archetype: 'quote-manifesto',
      transition: 'portal',
      bleed_mark: '道',
      media: {
        src: 'art://oriental-water-pavilion',
        camera_mode: 'vertical-slit',
        morph_id: 'cinema-bg',
      },
      quote: {
        text: '虽由人作，**宛自天开**。造物之至高境界，终究是让人忘却一切设计伎俩，只觉万物本该如此静美生长。',
        author: '计成《园冶》',
        role: '明代造园宗师 · 东方空间美学圭臬',
      },
    },
    {
      id: 'z7-close',
      archetype: 'closing-beacon',
      transition: 'morph',
      bleed_mark: '雅',
      eyebrow: 'YUNLIN ATELIER // 苏州 · 杭州 · 京都',
      title: '心有丘壑，**眉目山河**。',
      title_morph_id: 'zen-title',
      subtitle: '云林造物《当代东方院落营造图录》秋日水院雅集现已启幕。',
      media: {
        src: 'art://oriental-water-pavilion',
        camera_mode: 'full-bleed-right-subject',
        morph_id: 'cinema-bg',
      },
      items: [
        { title: '姑苏本院', tag: '姑苏本院', body: '苏州平江历史街区竹隐巷 12 号' },
        { title: '雅集预约', tag: '雅集预约', body: 'visit@yunlin-craft.cn' },
      ],
    },
  ],
};
