---
name: artistic-ppt
description: 殿堂级艺术演示文稿（PPTX / Web Keynote）v3.0 跨模型通用编译工作流技能。彻底摒弃“圆角框仪表盘 AI 味”与“机械伪先锋符号堆砌”，融合流派克制美学（StylePack.decor）、中文语义分词防孤字引擎（Intl.Segmenter）、18 张内置 60%+ 负空间高定艺术真图库（12 风格一对一零撞图）、纯离线单文件 Web Cinema（支持 T 键全联动实时换肤）以及五层全栈原生可编辑 Morph PPTX（原生可编辑 Excel 图表 addChart、原生可移动分割线与拓扑节点 addShape、独立透明 LaTeX 公式图层、!!cinema-bg 动态视差画窗与 p159:morph 平滑切换）。
---

# Artistic-PPT v3.0 Master Workflow (流派克制美学 · 零劈词零叠字 · 全栈真原生可编辑双擎工作流)

本工作流将智能体的“分镜叙事策划”与编译器的“排印几何纪律及原生 OpenXML 工程”彻底解耦，提供跨模型、跨 Agent 开箱即用的演示文稿双轨编译流水线。

---

> `<repo>` = 本仓库根目录（含 `bin/` 与 `package.json` 的目录），首次使用先在该目录执行 `npm install`。需本机装有 Chrome 或 Edge（或设置环境变量 `CHROME_PATH`）。
> 模型输出的 IR 若带 ```json 围栏或前后说明文字、或漏写 `slides[].id`，CLI 会自动剥离/补齐。

## 标准六步执行工作流 (6-Step Master SOP)

### Step 1：按受众语境匹配“艺术风格 × 叙事剧本”（流派克制优先）
从 12 套一对一专属风格 (`style_id`) 中选择（不确定时可运行 `node <repo>/bin/artistic-ppt.mjs preview-styles --title "..." --all` 生成 12 风格全景对比画廊）：
- **暗夜剧场与硬核科技**：`apple-keynote-dark`（硅光波导与钛金腔体）、`linear-precision`（玄武岩体积光巨构）、`stage-cyber-spotlight`（剧场青冰激光地平线）、`config-neo-brutal`（深灰暗场液态镀铬多面体）
- **高奢杂志与东方人文**：`editorial-vogue`（罗马洞石亚麻与美术馆旋梯，支持建筑切口跨界标题）、`oriental-ink-zen`（宋代马远一角水墨与烟雨水院，支持 `vertical_title: true` 正统书卷竖排大标题 + 朱砂篆印）、`warm-humanist`（手作赤陶花器与橄榄枝暖纸）
- **现代主义、董事会战略与顶刊科研**：`swiss-grid-modern`（苏黎世黑白红钢构网格）、`aurora-glass-light`（石英色散棱镜与视触觉波纹）、`executive-consulting`（深海藏蓝幕墙与绿电港，自动关闭裁切十字与竖排边注，保持高管汇报纯净克制）、`nature-academic`（经典物理阻尼谐振双摆频闪轨迹 + 离线内联 KaTeX 公式 + 顶刊三线表，杜绝伪科学 Sci-Slop 插图）、`bauhaus-industrial`（阳极氧化铝与信号橙机械旋钮）

---

### Step 2：编排多幕递进的“60%+ 负空间”艺术真图 (`18 Built-in Artworks`)
1. **单套幻灯片内部严禁“一图到底”（单张 `media.src` 在同一套讲稿中严禁出现 3 次及以上，Linter 强制审计 `REPEATED_MEDIA_ASSET`）**：请从内置 18 张高定真图中为封面、中段深潜与尾声交替搭配同色系递进图像：
   - 科技暗场：`art://silicon-photonic-macro`、`art://apple-titanium-cavity`、`art://monolith-chiaroscuro`、`art://cyber-stage-laser`、`art://neo-brutal-chrome`
   - 杂志/人文：`art://travertine-linen-sculpture`、`art://vogue-spiral-stair`、`art://warm-humanist-craft`
   - 东方水墨：`art://oriental-ink-cliff`、`art://oriental-water-pavilion`
   - 创投/现代/工业：`art://aurora-crystal-prism`、`art://aurora-tactile-ripples`、`art://swiss-architectural-grid`、`art://brutalist-bauhaus-concrete`
   - 战略/科研：`art://executive-cobalt-horizon`、`art://executive-green-port`、`art://nature-pendulum-trace`
2. **自主生图铁律**：调用 `image-generator` 新增配图时，必须将主体控制在右侧 `35%~40%`，左侧 `60%+` 保持纯净无杂物留白港湾，严禁生成伪科学炫光玻璃球或含乱码文字的图片。

---

### Step 3：排印与分镜纪律（零劈词 · 零撞色 · 高信噪比）
1. **中文强调词零空格撕裂**：编写中文文案时，**严禁在中文字符与 `**加粗词**` 之间手动插入西文半角空格**（正确写法：`'重建**可触摸的沉默与骨相**'`）。编译器内置 `Intl.Segmenter` 词级防孤字引擎，确保双音节词与句尾收官词绝不被拦腰劈断。
2. **装饰原语克制使用**：无需也严禁在每一页硬塞无意义数字水印；高密图表/表格/架构页会自动屏蔽巨字水印以避免三层文字打架；`side_note` 仅使用简短英文大写期刊铭牌。
3. **跨界切口与原生结构**：
   - `editorial-magazine` 采用**建筑切口衬板 (Architectural Cutout Cartouche)** 横跨左画窗与右纸面，明暗双端恒定 15:1 对比度；
   - `chart-spotlight` 在导出 `.pptx` 时自动生成 **PowerPoint 原生可编辑 Excel 图表 (`pSlide.addChart`)**；`chart.series` 必须完整覆盖 `title` 与 `callout` 中提及的所有核心指标序列（如论述挣值管理 PV/EV/AC 时必须完整绘制 3 条序列，Linter 审计 `CHART_SERIES_MISMATCH`），且工程量纲与算术口径必须前后自洽；
   - `architecture-flow` 必须为每个节点填写具体工程参数 `sublabel`（如张量维度、产能指标），导出 `.pptx` 时自动生成原生可编辑卡片与文本；
   - `academic-paper-2col` 的公式自动拆分为独立高清透明 Alpha 图层插入 `.pptx`，改字绝不穿帮。

---

### Step 4：连续多页 `cinema-bg` 柔和视差与画窗穿梭
在相邻幻灯片 `media` 中共享 `morph_id: "cinema-bg"` 并切换 `camera_mode`（`full-bleed-right-subject` → `portal-left` → `pan-zoom-detail` → `vertical-slit`），即可在 Web 端激活克制不眩晕的三层视差，并在 `.pptx` 端生成 `<p:pic name="!!cinema-bg">` 触发 `p159:morph` 原生平滑切换。

---

### Step 5 & 6：全离线双轨编译 + 包围盒防碰撞门禁 + 多模态审片
```bash
node <repo>/bin/artistic-ppt.mjs compile <deck.ir.json> --out-dir <out_dir> --name <deck_name>
```
1. 编译器会自动运行无头 Chromium 执行 **SVG `<text>` 与 DOM 文本两两包围盒碰撞检测 (`collisionsRemaining === 0`)** 及溢出阶梯自愈。
2. 交付前**必须使用图像查看工具检视 `<deck_name>.contact-sheet.png`**，逐页确认无断词、无叠字、色温统一、图文高对比后，向用户交付 100% 纯离线 `.html` 与全栈原生可编辑 `.pptx`。
