# Artistic-PPT Universal Workflow — 调研总结与工程架构蓝图

本文档为 `e:\new-ppt` 项目的持久化调研成果与架构设计蓝图，供后续长周期开发任务（如 `/goal`）及跨 Agent 协作直接读取参考。

## 1. 核心设计哲学
1. **空间光场取代纯色平铺**：使用 OLED 深空炭黑（`#07080C`）配径向透光（Radial Bloom）与 SVG 分形噪点（`feTurbulence`），或使用宣纸暖白（`#F5F2EB`）配多层柔和漫反射阴影与纸张肌理；物理级毛玻璃需具备底层色斑、低透模糊、`1px` 渐变折射高光边（Specular Rim）与环境阻塞阴影。
2. **排印即建筑（中西文混排精密规范）**：
   - 极端字号对比：巨型视觉锚点（`72pt~148pt`，紧字距 `-0.03em`，等宽数字 `tabular-nums`）对比精致眉标（`11pt~13pt`，宽字距 `+0.18em`）与克制正文（`16pt~20pt`，中文行高强制 `1.55~1.75` 杜绝裁切，单行 `22~34` 字）。
   - 免费商用大师字体链：现代科技（`Inter Tight / HarmonyOS Sans SC / JetBrains Mono`）、艺术画册（`Playfair Display / Noto Serif SC`）、先锋潮流（`Syne / Smiley Sans`）、东方留白（`EB Garamond / LXGW WenKai`）。
3. **呼吸感节拍与共享元素运镜（Morph / Auto-Animate）**：
   - 遵循 Duarte Sparkline 情绪节拍，严禁连续两页使用相同版式，交替编排“高密拆解页（Bento Grid）”与“高留白爆点页（全屏金句/巨型单指标）”。
   - 跨页共享 `morph_id`：Web 端编译为平滑补间与弹簧物理曲线 `cubic-bezier(0.22, 1, 0.36, 1)`；PPTX 端自动写入 `!!morph_id` 选择窗格对象名并注入 OpenXML `<p159:morph option="byObject"/>` 原生平滑切换。
4. **Anti-AI-Slop 硬性负向约束（代码级拦截）**：
   - 严禁标题正下方装饰短横线；严禁 Emoji 充当图标；严禁连续三等分图标卡片；严禁无意义角落悬浮几何图形；严禁项目符号朗读墙。

## 2. 正交资产矩阵规划
- **12 大艺术风格包 (`styles/`)**：`apple-keynote-dark`、`aurora-glass-light`、`linear-precision`、`editorial-vogue`、`swiss-grid-modern`、`oriental-ink-zen`、`config-neo-brutal`、`executive-consulting`、`nature-academic`、`stage-cyber-spotlight`、`warm-humanist`、`bauhaus-industrial`。
- **8 大主题叙事剧本 (`playbooks/`)**：旗舰新品发布、VC 融资路演、高管战略汇报（SCQA）、技术架构深度推镜、顶刊学术答辩、品牌艺术策展、大师课工作坊、晋升述职（STAR）。
- **22+ 版式原型 (`archetypes/`)**：涵盖破界封面、不对称 Bento 矩阵、巨型数字锚点、黄金分割出血图文、局部卡片推镜聚焦、时间轴流转、三线表/矢量数据图等。

## 3. 五阶段工程实施路线
- **Phase 1**：`SlideDeck IR` JSON Schema + 中西文排版/对比度工具 + 12 套风格 Token + 8 套叙事剧本。
- **Phase 2**：程序化 SVG/Canvas 艺术光影背景引擎 + 22+ 响应式版式原型与高颜值图表组件。
- **Phase 3**：双轨同源编译器（零依赖单文件 Web Cinema HTML 编译器 + 4K 光影底图合成与原生可编辑文字/OpenXML `p159:morph` PPTX 编译器）。
- **Phase 4**：Tier-1 毫秒级 DOM 几何防溢出/防碰撞/Anti-Slop 自愈质检器 + Tier-2 Contact Sheet 缩略图矩阵与 Show-Don't-Tell 风格预览器。
- **Phase 5**：跨平台 `SKILL.md` + CLI 工具 + 跨模型通用纯 Prompt 蒸馏包 + 多风格旗舰 Showcase 样板成品验收。
