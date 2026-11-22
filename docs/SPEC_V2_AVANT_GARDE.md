# Artistic-PPT v2.0 — 去 AI 味 · 错版破界与电影视差运镜重构总纲 (SPEC_V2_AVANT_GARDE)

本文档锁定了经用户实测样张认可的 **v2.0 全面重构工程标准**，供开启 `/goal` 后作为最高准则严格执行。

---

## 一、 核心重构目标：彻底铲除“SaaS 圆角仪表盘味”，建立美术馆/发布会级视觉框架

1. **去圆角盒化（Zero-Boxification & Frameless Architecture）**：
   - 废除 v1.0 满屏套用半透明圆角框（`surface-card`）的死板做法；**全套演示中 70% 以上的版式必须采用无外框自由平面构成**，依靠大尺度留白（60%~75% 负空间）、极端字号反差（`240px~420px` 破界切边水印巨字 vs `13px` 精密微注）、`1px` 贯通建筑轴线、微十字准星 `+` 与 `90°` 竖排杂志侧舷铭牌（Vertical Side-Notes）建立秩序。
2. **错版、破界与跨界穿插构图（Broken Grid & Interlock System）**：
   - **跨界双色反相排印（Cross-Boundary Split Headline）**：标题直接横跨深色摄影画窗与浅色画册纸面交界线（压深图部分反白、落浅纸部分浓墨，或使用 `mix-blend-mode: difference`），打破“左图右文互不往来”的呆板分栏。
   - **出画裁切巨字（Bleed-Edge Giant Numerals）**：章节数字、年份或核心符号故意向画布边缘外推出 `25%~40%` 截断，制造先锋海报张力。
   - **三层空间穿插叠压（3-Plane Depth Layering）**：建立“远景艺术底图/巨字 → 中景光隙画幅切片与轴线 → 前景跨界叠压纸签（Overlap Note）与主标题”的立体 Z 轴纵深。
   - **中式竖排书卷构图**：针对新中式与人文策展风格，原生支持 `writing-mode: vertical-rl` 竖排大标题、朱砂印章铭牌与宋代马远“一角构图”留白美学。
3. **内置大师级负空间生图管线（`src/art-direction/`）**：
   - 将“生图提示词工程”编码为标准模块：为全部 12 种风格内置 **负空间港湾生图配方生成器（Negative-Space Harbor Prompt Builder）**，精确控制机位视角（仰视巨构、微距浅景深、俯瞰流形）、戏剧性布光（伦勃朗侧逆光、丁达尔体积光束、晨雾漫射）与指定方位的留白占比（左 60% / 左上 65% / 中央留空等）。
   - 调用内置 `image-generator` 为核心风格与 6 套旗舰样板批量生成并沉淀高定真图资产库（`assets/art-library/`），同时保留高审美艺术机理回退能力，确保跨模型、跨环境均可无缝复用。
4. **双端真·电影级视差与画框遮罩穿梭转场（Cinematic Parallax & Portal Morph）**：
   - **Web Cinema HTML v2**：升级翻页引擎，支持 **前中后三层不同速率视差位移（3-Layer Parallax）**、**`clip-path: inset(...)` 画廊遮罩非对称擦除 + 画幅内部 `scale(1.16 -> 1.0)` 呼吸落位**，以及共享 `data-morph-id` 跨页焦点飞跃。
   - **Hybrid Native Morph PPTX v2（超画幅动态背景黑科技）**：突破静态 `slide.background` 不可动画的限制！对于需要镜头推拉摇移与窗口穿梭的连贯页面，将 4K 艺术真图作为带 `objectName: "!!cinema-bg"` 或 `"!!portal-art"` 的独立可裁剪/可缩放原生图片图层写入 PPTX 底层，跨页改变其坐标与尺寸（如从全屏远景 `15.5×8.7 in` 推轨横摇至局部特写或收缩为左侧 `5.2×6.4 in` 竖幅画窗），并将 `<p159:morph option="byObject"/>` 持续时间精准设定在 `1100ms ~ 1350ms` 电影运镜区间，配合顶层 100% 原生可编辑文字实现大片级丝滑放映！
5. **升级版审美质检门禁（`src/qa/linter.ts` v2）**：
   - 新增 **Anti-Boxification 密度审计**（若单套 Deck 连续多页堆砌常规封闭卡片则发出审美降级警告），并完整保留 Schema 校验、Emoji 拦截与无头 DOM 零溢出核验。
6. **全生态复用文档与 6 套殿堂级样板全面焕新**：
   - 同步更新 `SlideDeck IR` Schema（新增错版/穿插/视差运镜/生图指令字段）、根目录与便携包 `SKILL.md`、跨模型 `prompts/` 蒸馏包（含生图 + 错版 HTML 直出提示词）；
   - 以 v2.0 先锋错版标准 + 真实生图资产彻底重铸全部 **6 套旗舰样板**，逐一解包验证 OpenXML `!!cinema-bg` / `p159:morph` 结构，并通过多模态读取全部 6 张高清 `contact-sheet.png` 逐页严苛审片验收！

---

## 二、 `/goal` 结项硬性验收清单
- [x] `src/art-direction/` 12 风格负空间生图提示词引擎实装，且使用 `image-generator` 生成的高定艺术真图已归档至 `assets/art-library/`（共 10 张涵盖建筑光影、东方水墨、烟雨水院、微距硅光晶圆、静奢罗马洞石、极光水晶棱镜、深海摩天幕墙、Nature 辛流形光雕、剧场激光、包豪斯混凝土的大师级真图）。
- [x] 24 套版式原型库完成 v2.0 去圆角盒化与错版破界升级（涵盖跨界反相穿插、切边巨字、竖排侧舷/书卷题跋、垂直光隙切片、画廊视窗、跨层纸签叠压、无框高信噪比图表与三线表等）。
- [x] Web 编译器支持 3 层视差 + `clip-path` 画帘遮罩过渡；PPTX 编译器支持 `!!cinema-bg` 动态艺术大图跨页平滑推拉摇移 + `Range` 逐字测量的跨界双色原生可编辑文字与表格。
- [x] 全部 6 套旗舰样板重铸完成，零文字溢出、零生硬死板圆角盒堆砌，OpenXML 核验 100% 通过，且全部 6 张 `contact-sheet.png` 经多模态逐帧目视验收达到美术馆/发布会百赞水准。
- [x] `SKILL.md`、`skills/artistic-ppt/`、`prompts/` 与 `README.md` 全部同步升级至 v2.0 规范。
