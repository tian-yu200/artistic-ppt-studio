# Artistic-PPT Universal Workflow Studio (v3.0 Master Edition)

**跨模型、跨 Agent 通用的殿堂级艺术演示双擎编译系统（100% 纯离线 Web Cinema + 五层全栈真原生可编辑 Morph PPTX）**。

彻底告别“SaaS 圆角框套娃”与“伪先锋装饰符号机械堆砌”，深度融合 **流派克制美学（`StylePack.decor`）、中文语义分词不断词排印（`Intl.Segmenter` + `U+2060`）、工业级防碰撞数据可视化与全栈原生 OpenXML 对象映射**。任何大模型或智能体只需输出轻量语义化的 `SlideDeck IR` JSON，即可一键同源编译出：

1. **100% 纯离线单文件 Web Cinema（`.html`）**：
   - **零外网依赖**：彻底移除在线 Google Fonts 外链，KaTeX 数学字体 Base64 内联，政企保密内网与离线答辩室打开字距与折行分毫不差。
   - **T 键全联动实时换肤**：按下 `T` 键在 12 套艺术宇宙间切换时，背景氛围 SVG、动态画窗专属配图、图表字色同步无感更新；内置 `O` 分镜鸟瞰、`S` 提词计时台与 `L` 光学激光笔。
2. **五层全栈真原生可编辑 Morph PPTX（`.pptx`）**：
   - **Layer 0（纯净无死线基底）**：仅采样宣纸/暗夜光影与低干扰水印，不含任何焊死在背景里的分割线、图表或公式；
   - **Layer 1（动态艺术画窗 `!!cinema-bg`）**：高定负空间真图独立写入 `<p:pic name="!!cinema-bg">`，跨页触发 PowerPoint 原生 `<p159:morph option="byObject"/>` 平滑推轨与缩放穿梭；
   - **Layer 2（原生几何结构 `pSlide.addShape`）**：页面建筑分割线、跨界切口衬板（15:1 恒定对比度）、色温自适应叠压铭牌、拓扑架构节点卡片**全部为原生可移动矢量形状**；
   - **Layer 3（真原生可编辑 Excel 图表 `pSlide.addChart` + 独立高清透明公式图层）**：柱状、分组柱状、横向条形、折线、面积、环形图内嵌原生 `ppt/charts/chart*.xml`，双击直接修改数据；LaTeX 推导式与符号表拆分为独立 Alpha 透明 PNG 图层，增删正文绝不穿帮；
   - **Layer 4（100% 原生可编辑文本与顶刊三线表）**：升级现代中文字体栈（华文中宋 / 等线 / 楷体 / 微软雅黑 UI），支持正统中式竖排 (`eaVert`)。

---
## 支持作者
如果这个项目帮到了你，可以在爱发电支持我：[Artistic-PPT 视觉工坊 · afdian.com/a/artisticppt](https://afdian.com/a/artisticppt) —— 真原生全可编辑 PPT：Excel 图表、OMML 公式，竞赛答辩。

---

## 核心资产与质检体系

- **12 套艺术风格一对一专属真图库（共 18 张内置 60%+ 负空间艺术资产，`assets/art-library/`）**：
  覆盖硅光晶圆微距、CNC 钛金腔体、玄武岩体积光、液态镀铬多面体、罗马洞石亚麻、美术馆旋梯、手作赤陶花器、宋代马远一角水墨、烟雨水院、苏黎世黑白红钢构、包豪斯机械旋钮、石英色散棱镜、光学视触觉波纹、深海藏蓝幕墙、绿电枢纽港及经典物理阻尼谐振双摆频闪轨迹。
- **睁眼级无头几何碰撞门禁（`src/qa/linter.ts`）**：
  编译期自动在无头 Chromium 中遍历全页 SVG `<text>` 与 HTML 语义文本节点的真实 `BoundingClientRect`，两两检测矩形碰撞（`TEXT_COLLISION`）与越界溢出，配合 `ANTI_BOXIFICATION` 密度审计确保零叠字、零裁切落盘。

---

## 命令行快速开始 (CLI)

```bash
# 1. 编译单套演示文稿（产出纯离线 .html + 全原生可编辑 .pptx + 高清审片矩阵 .contact-sheet.png）
node bin/artistic-ppt.mjs compile demo/artistic-ppt-demo.ir.json --out-dir ./demo --name artistic-ppt-demo

# 2. 一键渲染全量 12 套艺术风格一对一真图预览画廊
node bin/artistic-ppt.mjs preview-styles --title "重塑视觉叙事的空间与张力" --all --out-dir ./previews

# 3. 运行无头碰撞与溢出质检
node bin/artistic-ppt.mjs lint showcase/04-aurora-glass-pitch/04-aurora-glass-pitch.ir.json

# 4. 全量重铸 12 风格画廊 + 6 套旗舰样板 + 门面 Demo 并执行 OpenXML 硬核解包验收
npm run build && npm run showcase && npm run verify
```

---

## 跨 Agent 与跨模型接入

1. **本地 Coding Agents（Antigravity / Claude Code / Cursor / Codex / Windsurf / Gemini CLI）**：直接读取根目录 [SKILL.md](SKILL.md)，或将便携目录 `skills/artistic-ppt/` 放入全局技能目录。
2. **多智能体工作流（LangGraph / Dify / AutoGen / CrewAI）**：加载 [prompts/universal-ir-architect.md](prompts/universal-ir-architect.md) 输出 JSON 后调用 CLI `compile`。
3. **纯网页聊天窗口（无代码环境）**：粘贴 [prompts/standalone-chat-html.md](prompts/standalone-chat-html.md) 直出单文件 `.html`。
