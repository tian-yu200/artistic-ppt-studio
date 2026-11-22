# Artistic-PPT Universal Workflow — 锁定技术规范与 `/goal` 验收总纲 (SPEC_LOCKED)

## 一、 用户已确认锁定的顶配默认决策
1. **双轨同源输出（Dual-Track Output）**：
   - **轨道 A（Web Cinema HTML）**：零外部运行时依赖的单文件 `.html`（严格锁定 `1920×1080` 舞台等比自适应缩放，内置共享元素平滑补间运镜、弹簧阻尼错峰动画、演讲者备注与计时台、激光笔、全屏缩略图概览及实时主题预览切换）。
   - **轨道 B（Hybrid Native Morph PPTX）**：分层混合渲染的原生可编辑 `.pptx`——底层通过本地无头 Chromium（复用本机 Chrome/Edge）将程序化 SVG 流体极光、径向环境光、胶片噪点（`feTurbulence`）与物理毛玻璃衬底渲染为超清底图；顶层通过精确几何坐标映射生成 **100% 原生可编辑的 PowerPoint 文本框、矢量形状与数据图表**（强制中文安全行高 `1.55~1.75` 彻底杜绝 CJK 裁切）；自动为跨页共享 `morph_id` 元素写入 `!!morph_id` 对象名称并向 `slideN.xml` 注入 OpenXML `<p159:morph option="byObject"/>` 原生平滑切换（附带 `<p:fade/>` 兼容回退）。
2. **底层技术栈与本机实测环境**：
   - **主引擎语言栈**：`Node.js v24.18.0` + `TypeScript`（原生 ESM，配合 `pptxgenjs`、`jszip`、`ajv`、`playwright-core` 直接调用本机已安装的 Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe` 或 Edge，无需下载数百 MB 浏览器二进制包）。
   - **跨模型与跨 Agent 通用封装**：
     1. 标准 `SKILL.md`（兼容 Antigravity、Claude Code、Cursor、Codex、Windsurf、Gemini CLI、OpenCode）；
     2. 命令行 CLI 工具（`npx artistic-ppt` / `node bin/cli.mjs`，供任意 Python/Node 多智能体框架一键调用）；
     3. 跨模型通用纯 Prompt 蒸馏包（`prompts/`，供无代码环境的纯对话大模型直接输出艺术级单文件 HTML 或标准 `SlideDeck IR`）。
3. **全量资产矩阵与黄金标杆样板**：
   - 完整实现 **12 套殿堂级艺术风格包 × 8 套行业主题叙事剧本 × 22+ 高审美版式原型**；
   - 重点精雕细琢 **6 套不同艺术流派的旗舰完整样板演示稿（Showcase Decks，每套同时产出 `.html` 与带平滑切换的可编辑 `.pptx`）**：
     1. **Apple Keynote 暗夜光影 Bento 风**（旗舰 AI/硬件新品发布会）
     2. **Vogue / Kinfolk 杂志画册艺术风**（先锋品牌策展与创意提案）
     3. **新中式东方留白水墨风**（东方美学/文化艺术主题）
     4. **Aurora 流体极光物理毛玻璃风**（前沿科技融资路演 VC Pitch Deck）
     5. **McKinsey / Sequoia 战略咨询高管风**（商业战略复盘与高密数据图表）
     6. **Nature / Science 顶刊精密学术风**（科研论文答辩，含公式与三线表）

---

## 二、 严苛验收标准（Goal Completion Criteria）
开启 `/goal` 后，必须逐一完成并验证以下全部指标方可结项：
- [x] **Schema 与正交资产完备性**：`SlideDeck IR` JSON Schema 校验通过；12 套 `styles`、8 套 `playbooks`、24 套 `archetypes` 全部实装，绝非空壳占位。
- [x] **Anti-AI-Slop 与几何零缺陷（Tier-1 Linter 100% 通过）**：
  - 零文字溢出（`scrollHeight <= clientHeight` 自动检测与字号阶梯自愈）；
  - 零非法元素重叠碰撞；
  - 前景文字与真实背景对比度通过 WCAG 可读性校验；
  - 零标题下划线指纹、零 Emoji 充当图标、零死板连续同构版式。
- [x] **PPTX 原生可编辑与 Morph 平滑切换实测验证**：
  - 解包检查生成的 `.pptx` XML 结构：确认包含原生 `<p:sp>` 可编辑文本节点（非整页死截图）、包含 `cNvPr name="!!..."` 匹配属性、包含 `<p159:morph option="byObject"/>` 扩展块。
- [x] **视觉快照闭环验收（Tier-2 Visual QA）**：
  - 为全部 6 套旗舰样板生成高清缩略图矩阵（Contact Sheet PNG），逐一进行多模态视觉检视，确保光影层次、中西文混排呼吸感、留白比例与图表精致度达到设计工作室水准，零渲染瑕疵。
- [x] **全套复用文档就绪**：根目录与技能目录具备开箱即用的 `SKILL.md`、CLI 使用指南、跨模型 System Prompt 模板及完整架构说明。
