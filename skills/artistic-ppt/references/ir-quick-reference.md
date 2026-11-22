# SlideDeck IR v3.0 速查手册 (Master Quick Reference)

## 1. 核心平面构成、克制装饰与视差字段（支持 `"version": "2.0"` 或 `"3.0"`）
- `slides[].vertical_title`: `true` 时封面主标切换为东方传统书卷竖排（`writing-mode: vertical-rl` + `eaVert` 原生 PPTX 竖排），配合 `oriental-ink-zen` 自动加盖紧随末列之下的动态朱砂篆印。
- `slides[].seal_text`: 可选，1~4 字自定义朱砂篆印印文（未填时自动从 `brand_mark / title / author` 提取前 2 个汉字，同步生成为 PPTX 原生可编辑形状与文本）。
- `slides[].bleed_mark`: 可选，1~3 字符低干扰切边水印（高密图表/表格/拓扑页及高管/学术风格会自动抑制，切勿硬塞无意义数字）。
- `slides[].side_note`: 可选，纯英文大写短铭牌（如 `"ISSUE 14 — TACTILE LIGHT"`，严禁填入中文）。
- `slides[].overlap_note`: `{ "title": "...", "body": "...", "position": "bottom-right", "morph_id": "ov-1" }` 色温自适应跨层铭牌。
- `slides[].transition`: `"morph"` | `"parallax"` | `"portal"` | `"fade"`。
- `media.src`（18 张内置 60%+ 负空间高定真图库，12 风格一对一零撞图）：
  - 暗夜科技：`art://silicon-photonic-macro`、`art://apple-titanium-cavity`、`art://monolith-chiaroscuro`、`art://cyber-stage-laser`、`art://neo-brutal-chrome`
  - 杂志人文：`art://travertine-linen-sculpture`、`art://vogue-spiral-stair`、`art://warm-humanist-craft`
  - 东方水墨：`art://oriental-ink-cliff`、`art://oriental-water-pavilion`
  - 网格工业：`art://swiss-architectural-grid`、`art://brutalist-bauhaus-concrete`
  - 创投极光：`art://aurora-crystal-prism`、`art://aurora-tactile-ripples`
  - 战略科研：`art://executive-cobalt-horizon`、`art://executive-green-port`、`art://nature-pendulum-trace`
- `media.camera_mode`（配合相同 `media.morph_id: "cinema-bg"` 驱动跨页丝滑视差穿梭）：
  - `full-bleed-right-subject`：全出血右置主体 + 左侧平滑负空间港湾
  - `portal-left`：左侧 `660px` 无框竖幅画廊视窗（配合 `editorial-magazine` 建筑切口衬板实现恒定 15:1 对比度跨界标题！）
  - `portal-right`：右侧 `800px` 通顶全出血艺术画幅
  - `vertical-slit`：右侧 `356px` 建筑垂直光隙切片
  - `pan-zoom-detail`：左半屏 `860px` 全高微距推镜特写暗窗

## 2. 多幕递进视差与原生可编辑图表片段示例
```json
{
  "version": "2.0",
  "meta": { "title": "MAISON LUMIÈRE", "style_id": "editorial-vogue" },
  "slides": [
    {
      "id": "s1",
      "archetype": "cover-cinematic",
      "bleed_mark": "14",
      "side_note": "ISSUE 14 — ARCHITECTURAL LIGHT",
      "eyebrow": "Prologue",
      "title": "在喧嚣像素时代，重建**可触摸的沉默与骨相**",
      "subtitle": "以中画幅负空间真图与克制标尺重塑空间呼吸。",
      "media": { "src": "art://travertine-linen-sculpture", "camera_mode": "full-bleed-right-subject", "morph_id": "cinema-bg" }
    },
    {
      "id": "s2",
      "archetype": "editorial-magazine",
      "transition": "portal",
      "eyebrow": "ARCHITECTURAL INTERLOCK",
      "title": "字跨明暗交界，打破**图文割裂的藩篱**",
      "subtitle": "建筑切口衬板横跨左画窗与右纸面，明暗双端恒定 15:1 对比度。",
      "media": { "src": "art://vogue-spiral-stair", "camera_mode": "portal-left", "morph_id": "cinema-bg" },
      "items": [
        { "title": "洞石孔隙呼吸", "body": "保留天然蜂窝气孔，侧向天光切出漫反射阴影。" },
        { "title": "原麻声学包裹", "body": "未漂白亚麻垂幔吸收高频混响，构筑静谧声场。" }
      ]
    }
  ]
}
```
