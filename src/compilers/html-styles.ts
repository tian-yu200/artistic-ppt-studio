/**
 * Web Cinema HTML v3.0 精修样式表
 * 核心升级：
 * 1. 建筑切口衬板 (.interlock-cutout-cartouche) 替代死板渐变劈字，双端恒定 15:1 高对比度；
 * 2. 跨压铭牌 (.overlap-paper-note) 色温同源化（冷调暗黑风采用深钛面板，告别突兀暖黄羊皮纸）；
 * 3. 正统东方竖排书卷立轴 (.layout-cover-vertical-scroll) 与朱砂方印 (.oriental-seal-stamp)；
 * 4. 全面上调辅助字号底限 (>=14px~15px)，提升千人场馆后排可读性。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StylePack } from '../types/ir.js';
import { ALL_STYLE_PACKS } from '../styles/index.js';
import { isDarkColor, mixColors } from '../utils/color.js';

let cachedKatexCss: string | null = null;

export function getInlineKatexCss(): string {
  if (cachedKatexCss !== null) return cachedKatexCss;
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const katexDist = path.resolve(here, '../../node_modules/katex/dist');
    const cssPath = path.join(katexDist, 'katex.min.css');
    if (fs.existsSync(cssPath)) {
      let raw = fs.readFileSync(cssPath, 'utf-8');
      raw = raw.replace(
        /url\(fonts\/([A-Za-z0-9_-]+\.woff2)\)\s*format\("woff2"\)(?:,url\([^)]+\)\s*format\("[^"]+"\))*/g,
        (_match, fileName) => {
          const fp = path.join(katexDist, 'fonts', fileName);
          if (fs.existsSync(fp)) {
            const b64 = fs.readFileSync(fp).toString('base64');
            return `url("data:font/woff2;base64,${b64}") format("woff2")`;
          }
          return '';
        }
      );
      cachedKatexCss = raw;
      return cachedKatexCss;
    }
  } catch {
    // fallback
  }
  cachedKatexCss = `.katex-mathml{position:absolute;clip:rect(1px,1px,1px,1px);padding:0;border:0;height:1px;width:1px;overflow:hidden;}`;
  return cachedKatexCss;
}

export function buildStylePackCssVars(style: StylePack): string {
  const p = style.palette;
  const s = style.surface_style;
  const t = style.typography;
  const dark = isDarkColor(p.bg_primary);

  // 色温同源的跨压铭牌色：暗黑科技用深钛高光面板，亮色/画册用反转深墨铭牌
  const overlapBg = dark
    ? mixColors(p.bg_secondary, '#1E293B', 0.48)
    : p.bg_inverted;
  const overlapFg = dark ? '#F8FAFC' : p.text_on_inverted;
  const overlapMuted = dark ? p.text_secondary : mixColors(p.text_on_inverted, p.bg_inverted, 0.26);

  const cPal = p.chart_palette;

  return `
    --bg-primary: ${p.bg_primary};
    --bg-secondary: ${p.bg_secondary};
    --bg-inverted: ${p.bg_inverted};
    --surface: ${p.surface};
    --surface-accent: ${p.surface_accent};
    --surface-solid: ${p.surface_solid};
    --text-primary: ${p.text_primary};
    --text-secondary: ${p.text_secondary};
    --text-muted: ${p.text_muted};
    --text-on-inverted: ${p.text_on_inverted};
    --accent: ${p.accent};
    --accent-secondary: ${p.accent_secondary};
    --accent-tertiary: ${p.accent_tertiary};
    --border-color: ${p.border};
    --border-solid: ${p.border_solid};
    --chart-1: ${cPal[0] || p.accent};
    --chart-2: ${cPal[1] || p.accent_secondary};
    --chart-3: ${cPal[2] || p.accent_tertiary};
    --chart-4: ${cPal[3] || p.accent};
    --chart-5: ${cPal[4] || p.accent_secondary};
    --chart-6: ${cPal[5] || p.accent_tertiary};
    --svg-grid-line: ${dark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(15, 23, 42, 0.11)'};
    --svg-subtle-bg: ${dark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(15, 23, 42, 0.028)'};
    --cyber-beam-opacity: ${style.atmosphere.pattern === 'cyber-stage-beams' ? '1' : '0.16'};
    --font-display: ${t.font_display};
    --font-body: ${t.font_body};
    --font-mono: ${t.font_mono};
    --display-weight: ${t.display_weight};
    --display-tracking: ${t.display_tracking};
    --body-lh: ${t.body_line_height};
    --card-radius: ${s.radius_px}px;
    --code-bg: ${dark ? 'rgba(10, 14, 24, 0.94)' : '#10141E'};
    --code-text: #E5E9F0;
    --overlap-bg: ${overlapBg};
    --overlap-fg: ${overlapFg};
    --overlap-muted: ${overlapMuted};
    --ease-spring: ${style.motion.easing};
    --dur-ms: ${Math.max(680, Math.min(820, style.motion.duration_ms))}ms;
  `;
}

export function buildMasterStylesheet(activeStyle: StylePack, includeKatex: boolean): string {
  const allThemesCss = ALL_STYLE_PACKS.map(
    (sp) => `[data-theme="${sp.id}"] { ${buildStylePackCssVars(sp)} }`
  ).join('\n');

  const katexBlock = includeKatex ? getInlineKatexCss() : '';

  return `
${katexBlock}

:root {
  ${buildStylePackCssVars(activeStyle)}
  --stage-w: 1920px;
  --stage-h: 1080px;
  --stage-scale: 1;
}

${allThemesCss}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050608;
  color: var(--text-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  user-select: none;
}

.viewport-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.deck-stage {
  position: relative;
  width: 1920px;
  height: 1080px;
  flex-shrink: 0;
  transform: scale(var(--stage-scale));
  transform-origin: center center;
  background: var(--bg-primary);
  overflow: hidden;
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.72);
}

body.headless-mode,
body.headless-mode *,
body.headless-mode .slide-frame {
  transition: none !important;
  animation: none !important;
}
body.headless-mode .deck-stage {
  transform: none !important;
  box-shadow: none !important;
}
body.headless-mode .viewport-shell {
  display: block;
  width: 1920px;
  height: 1080px;
}

.slide-frame {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  overflow: hidden;
  --slide-font-scale: 1;
  transition: opacity 420ms var(--ease-spring);
}

.slide-frame.is-active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  z-index: 5;
}

.slide-atmosphere {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* ==================== 克制化先锋微装饰层 ==================== */
.bleed-giant-mark {
  position: absolute;
  z-index: 1;
  font-family: Georgia, var(--font-display);
  font-size: 380px;
  font-weight: 700;
  line-height: 0.78;
  letter-spacing: -0.05em;
  color: var(--text-primary);
  opacity: 0.038;
  pointer-events: none;
  user-select: none;
}
.bleed-bottom-left {
  left: -28px;
  bottom: -78px;
}

.editorial-side-note {
  position: absolute;
  left: 38px;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-muted);
  opacity: 0.62;
  z-index: 6;
  pointer-events: none;
}

.print-crosshair {
  position: absolute;
  z-index: 6;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-muted);
  opacity: 0.34;
  pointer-events: none;
}
.ch-tl { left: 36px; top: 32px; }
.ch-tr { right: 36px; top: 32px; }
.ch-bl { left: 36px; bottom: 32px; }
.ch-br { right: 36px; bottom: 32px; }

/* 东方朱砂篆意印章（紧随竖排末列之下，支持同步导出 PPTX） */
.oriental-seal-stamp {
  width: 42px;
  height: 42px;
  background: #B83B2A;
  color: #F6F4EE;
  font-family: "STZhongsong", "KaiTi", serif;
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 2px;
  padding: 3px;
  margin-top: 20px;
  align-self: flex-start;
  box-shadow: 0 4px 12px rgba(184, 59, 42, 0.22);
}

/* ==================== 动态高定艺术真图视窗 ==================== */
.art-portal {
  position: absolute;
  z-index: 2;
  overflow: hidden;
}

.portal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.portal-full-bleed-right-subject {
  inset: 0;
}
.portal-full-bleed-right-subject .portal-img {
  object-position: right center;
}
.portal-scrim-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    92deg,
    var(--bg-primary) 0%,
    var(--bg-primary) 38%,
    color-mix(in srgb, var(--bg-primary) 92%, transparent) 52%,
    color-mix(in srgb, var(--bg-primary) 36%, transparent) 72%,
    transparent 90%
  );
}

.portal-portal-left {
  left: 0;
  top: 108px;
  width: 660px;
  height: 972px;
}
.portal-portal-left .portal-img {
  object-position: 82% center;
  transform: scale(1.12);
}

.portal-portal-right {
  right: 0;
  top: 0;
  width: 800px;
  height: 1080px;
}
.portal-portal-right .portal-img {
  object-position: right center;
}

.portal-vertical-slit {
  right: 132px;
  top: 0;
  width: 348px;
  height: 1080px;
}
.portal-vertical-slit .portal-img {
  object-position: 82% center;
  transform: scale(1.22);
}

.portal-pan-zoom-detail {
  left: 0;
  top: 0;
  width: 860px;
  height: 1080px;
}
.portal-pan-zoom-detail .portal-img {
  object-position: 84% center;
  transform: scale(1.28);
}
.portal-zoom-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(6, 8, 14, 0.82) 0%,
    rgba(6, 8, 14, 0.52) 50%,
    rgba(6, 8, 14, 0.88) 100%
  );
}

/* 色温同源跨压实体铭牌 */
.overlap-paper-note {
  position: absolute;
  z-index: 12;
  width: 448px;
  padding: 26px 32px;
  background: var(--overlap-bg);
  color: var(--overlap-fg);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
  border-left: 4px solid var(--accent);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.overlap-paper-note.pos-bottom-right {
  right: 204px;
  bottom: 74px;
}
.overlap-paper-note.pos-bottom-left {
  left: 136px;
  bottom: 74px;
}
.overlap-paper-note.pos-top-right {
  right: 180px;
  top: 112px;
}
.overlap-note-title {
  display: block;
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--overlap-fg);
}
.overlap-note-body {
  display: block;
  font-size: 15.5px;
  line-height: 1.62;
  color: var(--overlap-muted);
}

/* ==================== 内容安全层与高可读排印体系 ==================== */
.slide-inner {
  position: relative;
  z-index: 5;
  width: 1920px;
  height: 1080px;
  padding: 60px 136px 56px 136px;
  display: flex;
  flex-direction: column;
}

.slide-chrome-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  margin-bottom: 26px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.chrome-brand, .chrome-index {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.slide-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.slide-footnote {
  margin-top: 16px;
  font-size: 14.5px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: calc(15px * var(--slide-font-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
}

.slide-title {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  line-height: 1.18;
  color: var(--text-primary);
  max-width: 1420px;
}

.slide-subtitle {
  margin-top: 14px;
  font-size: calc(20px * var(--slide-font-scale));
  line-height: 1.62;
  color: var(--text-secondary);
  max-width: 1140px;
}

.hl-accent {
  color: var(--accent);
}

.header-block {
  margin-bottom: 36px;
  flex-shrink: 0;
}

/* ==================== 开放式无框建筑立柱 ==================== */
.open-plinth {
  display: flex;
  flex-direction: column;
  padding: 18px 24px 18px 0;
  position: relative;
}
.plinth-rule-top {
  width: 100%;
  height: 2px;
  background: var(--border-color);
  margin-bottom: 18px;
}
.open-plinth.plinth-accent .plinth-rule-top {
  background: var(--accent);
}
.plinth-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.plinth-num {
  font-family: Georgia, var(--font-mono);
  font-style: italic;
  font-size: 16.5px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.05em;
}
.plinth-metric {
  font-family: var(--font-display);
  font-size: calc(52px * var(--slide-font-scale));
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  margin-bottom: 12px;
}
.open-plinth.plinth-accent .plinth-metric {
  color: var(--accent);
}
.plinth-metric-unit {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 8px;
  display: inline-block;
}
.plinth-title {
  font-family: var(--font-display);
  font-size: calc(23.5px * var(--slide-font-scale));
  font-weight: 700;
  line-height: 1.32;
  color: var(--text-primary);
  margin-bottom: 10px;
}
.plinth-body {
  font-size: calc(17.5px * var(--slide-font-scale));
  line-height: var(--body-lh);
  color: var(--text-secondary);
}
.card-formula {
  margin-top: 12px;
  font-size: 18px;
}

/* ==================== 24 套版式布局精修 ==================== */

/* 1a. Cover Cinematic v3 */
.layout-cover-v2 {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
}
.cover-v2-harbor {
  max-width: 980px;
}
.cover-v2-kicker {
  font-family: Georgia, var(--font-display);
  font-style: italic;
  font-size: 21px;
  color: var(--accent);
  margin-bottom: 18px;
}
.cover-v2-title {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  line-height: 1.16;
  color: var(--text-primary);
}
.cover-v2-offgrid-line {
  width: 180px;
  height: 2px;
  background: var(--accent);
  margin: 32px 0 26px -44px;
}
.cover-v2-sub {
  font-size: 21.5px;
  line-height: 1.68;
  color: var(--text-secondary);
  max-width: 820px;
}
.cover-v2-meta {
  margin-top: 44px;
  font-family: var(--font-mono);
  font-size: 14.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cover-viewfinder {
  position: absolute;
  right: 0;
  bottom: 8px;
  padding: 10px 20px;
  border-left: 2.5px solid var(--accent);
  background: color-mix(in srgb, var(--bg-primary) 78%, transparent);
  backdrop-filter: blur(12px);
  font-family: var(--font-mono);
  font-size: 13.5px;
  letter-spacing: 0.12em;
  color: var(--text-primary);
}
.cover-viewfinder > span,
.portal-right-caption > span {
  display: inline-block;
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
}

/* 1b. 正统宋式书卷竖排立轴封面 (.layout-cover-vertical-scroll) */
.layout-cover-vertical-scroll {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 76px;
  padding-left: 20px;
  position: relative;
}
.vscroll-left-prose {
  width: 440px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: 1.5px solid var(--border-color);
  padding: 8px 0 8px 32px;
}
.vscroll-sub {
  font-size: 19.5px;
  line-height: 1.82;
  color: var(--text-secondary);
  margin: 18px 0 28px;
}
.vscroll-title-col {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}
.vscroll-main-title {
  writing-mode: vertical-rl;
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  line-height: 1.42;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  max-height: 640px;
}

/* 2. Cover Editorial Split */
.layout-cover-editorial-v2 {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
}
.editorial-cover-left {
  width: 900px;
}
.editorial-bleed-title {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  line-height: 1.18;
  letter-spacing: var(--display-tracking);
}
.cover-editorial-sub {
  font-size: 20.5px;
  line-height: 1.68;
  color: var(--text-secondary);
  max-width: 780px;
  margin-bottom: 40px;
}
.cover-editorial-meta {
  font-family: var(--font-mono);
  font-size: 14.5px;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}
.portal-right-caption {
  position: absolute;
  right: 12px;
  bottom: 4px;
  padding: 8px 16px;
  background: color-mix(in srgb, var(--bg-primary) 82%, transparent);
  backdrop-filter: blur(10px);
  font-family: var(--font-mono);
  font-size: 13.5px;
  color: var(--text-primary);
}

/* 3. Cover Swiss Grid */
.layout-cover-swiss-v2 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 468px;
}
.swiss-top-bar {
  display: flex;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--text-primary);
}
.swiss-date {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
}
.swiss-main-zone { margin: auto 0; }
.swiss-bottom-spec {
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 36px;
}
.swiss-author-tag {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  max-width: 320px;
  text-align: right;
  line-height: 1.35;
}

/* 4. Section Chapter */
.layout-section-v2 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 440px;
}
.section-v2-num {
  font-family: Georgia, var(--font-display);
  font-size: 144px;
  font-weight: 700;
  line-height: 0.92;
  color: var(--accent);
}
.section-v2-line {
  width: 100%;
  height: 1.5px;
  background: var(--border-color);
  margin: 28px 0;
}
.chapter-title {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  line-height: 1.18;
}

/* 5. Statement Impact */
.layout-statement-impact {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 1520px;
}
.statement-headline {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  line-height: 1.22;
  letter-spacing: var(--display-tracking);
}
.statement-sub {
  margin-top: 26px;
  font-size: 22.5px;
  line-height: 1.62;
  color: var(--text-secondary);
  max-width: 1120px;
}
.statement-pillars {
  margin-top: 58px;
  padding-top: 30px;
  border-top: 1px solid var(--border-color);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 52px;
}
.pillar-num {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 8px;
}
.pillar-mini-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}
.pillar-mini-body {
  font-size: 17px;
  line-height: 1.62;
  color: var(--text-secondary);
}

/* 6. Hero Metric */
.layout-hero-metric-v2 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 420px;
}
.hm-giant-figure {
  font-family: Georgia, var(--font-display);
  font-size: calc(176px * var(--slide-font-scale));
  font-weight: 700;
  line-height: 0.94;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.hm-unit {
  font-size: 68px;
  color: var(--accent);
  font-style: italic;
  margin-left: 8px;
}
.hm-delta-kicker {
  margin-top: 16px;
  font-family: var(--font-mono);
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.hm-贯通-axis {
  width: calc(100% + 360px);
  height: 1.5px;
  background: var(--accent);
  opacity: 0.55;
  margin: 38px 0 34px;
}
.hm-bottom-grid {
  display: grid;
  grid-template-columns: 1.35fr 0.85fr;
  gap: 52px;
  align-items: start;
}
.hm-statement-title {
  font-family: var(--font-display);
  font-size: 33px;
  font-weight: 700;
  line-height: 1.28;
  margin-bottom: 14px;
}
.hm-body-copy {
  font-size: 18.5px;
  line-height: 1.68;
  color: var(--text-secondary);
}

/* 7. Avant Collage 4 */
.layout-standard {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.avant-collage-4 {
  flex: 1;
  display: grid;
  grid-template-columns: 1.04fr 1fr;
  gap: 54px;
  min-height: 0;
}
.collage-hero-tile {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 44px 48px;
  color: #F8FAFC;
  background: #0B0D14;
}
.collage-hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right center;
}
.collage-hero-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6,8,14,0.22) 0%, rgba(6,8,14,0.9) 76%);
}
.collage-hero-content { position: relative; z-index: 2; }
.collage-hero-metric {
  font-family: var(--font-display);
  font-size: 66px;
  font-weight: 800;
  line-height: 1;
  color: var(--accent);
  margin-bottom: 14px;
}
.collage-hero-title {
  font-family: var(--font-display);
  font-size: 29px;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 10px;
}
.collage-hero-body {
  font-size: 17.5px;
  line-height: 1.62;
  color: rgba(248, 250, 252, 0.86);
}
.collage-side-hairlines {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

/* 8. Open Matrix 5 */
.open-matrix-5 {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 26px 42px;
  align-content: center;
}
.open-matrix-5 > .open-plinth:nth-child(1) { grid-column: span 3; }
.open-matrix-5 > .open-plinth:nth-child(2) { grid-column: span 3; }
.open-matrix-5 > .open-plinth:nth-child(3) { grid-column: span 2; }
.open-matrix-5 > .open-plinth:nth-child(4) { grid-column: span 2; }
.open-matrix-5 > .open-plinth:nth-child(5) { grid-column: span 2; }

/* 9 & 10. Split Open 50 & Golden Broken */
.layout-split-open-50 {
  flex: 1;
  display: flex;
  align-items: center;
  padding-right: 740px;
}
.open-vertical-list {
  display: flex;
  flex-direction: column;
  gap: 26px;
  margin-top: 12px;
}
.open-list-row {
  display: grid;
  grid-template-columns: 52px 1fr;
  padding-top: 18px;
  border-top: 1px solid var(--border-color);
}
.layout-golden-broken {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.golden-broken-right { width: 980px; }
.golden-open-stack {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}

/* 11. Editorial Magazine Interlock v3 (建筑切口衬板 — 横向破界切入左侧画窗 250px，100% 满对比度) */
.layout-editorial-interlock {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-top: 20px;
}
.interlock-cutout-cartouche {
  margin-left: 274px; /* 136px + 274px = 410px，深入左侧 660px 画窗 250px！ */
  background: var(--bg-primary);
  border-left: 4px solid var(--accent);
  padding: 26px 40px 26px 34px;
  box-shadow: -18px 20px 48px rgba(0, 0, 0, 0.16);
  max-width: 1240px;
}
.interlock-headline {
  font-family: var(--font-display);
  font-size: calc(52px * var(--slide-font-scale));
  font-weight: var(--display-weight);
  line-height: 1.22;
  letter-spacing: var(--display-tracking);
  color: var(--text-primary);
}
.interlock-right-body {
  margin-left: 596px; /* x = 136 + 596 = 732px，位于 660px 竖窗右侧留白区 */
  margin-bottom: 20px;
}
.interlock-lead {
  font-size: 20.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  padding-bottom: 26px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 26px;
}
.interlock-roman-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 42px;
}

/* 12. Open Staggered 3 */
.open-staggered-3 {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 52px;
  align-items: start;
  padding-top: 16px;
}
.stagger-col-offset.offset-1 { margin-top: 44px; }
.stagger-col-offset.offset-2 { margin-top: 88px; }

/* 13. Focus Zoom Anatomy */
.layout-zoom-anatomy {
  flex: 1;
  display: grid;
  grid-template-columns: 724px 1fr;
  gap: 84px;
  align-items: center;
}
.zoom-left-overlay {
  color: #F8FAFC;
  padding-right: 28px;
}
.zoom-overlay-title {
  font-family: var(--font-display);
  font-size: calc(46px * var(--slide-font-scale));
  font-weight: var(--display-weight);
  line-height: 1.22;
  color: #F8FAFC;
}
.zoom-overlay-metric {
  margin-top: 44px;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.26);
}
.zoom-big-val {
  font-family: var(--font-display);
  font-size: 70px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1;
}
.zoom-val-label {
  margin-top: 10px;
  font-size: 16.5px;
  color: rgba(248, 250, 252, 0.85);
}
.zoom-lead-copy {
  font-size: 20px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.zoom-callouts-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 14. Chronograph Timeline */
.chronograph-timeline {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.chrono-axis {
  width: 100%;
  height: 2px;
  background: var(--accent);
  opacity: 0.55;
  margin-bottom: -9px;
}
.chrono-grid { display: grid; gap: 36px; }
.chrono-tick-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}
.chrono-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 3px solid var(--text-muted);
  position: relative;
  z-index: 2;
}
.chrono-active .chrono-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 24%, transparent);
}
.chrono-step .plinth-rule-top { display: none; }

/* 15, 16, 18. Open Diagram & Chart Stage */
.open-diagram-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  min-height: 0;
}
.chart-open-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 0.6fr 1.4fr;
  gap: 52px;
  min-height: 0;
  align-items: stretch;
}
.chart-open-grid.chart-full-width { grid-template-columns: 1fr; }
.chart-open-insights {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}
.open-chart-canvas {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 1px solid var(--border-color);
  padding-left: 42px;
  min-height: 0;
}
.chart-open-callout {
  font-size: 18.5px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 8px 0 14px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;
}
.chart-canvas-holder {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 17. Chiaroscuro Versus */
.chiaroscuro-versus {
  flex: 1;
  display: grid;
  grid-template-columns: 0.94fr 1.5px 1.06fr;
  gap: 52px;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-top: 24px;
}
.versus-divider-slash {
  height: 82%;
  background: var(--border-color);
}
.pole-legacy { opacity: 0.78; }
.versus-big-num {
  font-family: var(--font-display);
  font-size: 66px;
  font-weight: 800;
  color: var(--accent);
  margin: 12px 0;
}
.muted-metric { color: var(--text-muted); }
.versus-pole-title {
  font-family: var(--font-display);
  font-size: 31px;
  font-weight: 700;
  margin-bottom: 12px;
}
.versus-open-sub {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}
.versus-open-sub strong {
  display: block;
  font-size: 18px;
  margin-bottom: 4px;
}
.versus-open-sub p {
  font-size: 16.5px;
  color: var(--text-secondary);
  line-height: 1.58;
}

/* 19 & 20. Academic 2-Col & Three-Line Table */
.academic-open-2col {
  flex: 1;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 52px;
  align-items: center;
  min-height: 0;
}
.academic-left-derivation {
  padding-right: 38px;
  border-right: 1px solid var(--border-color);
}
.academic-box-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.eq-num { font-family: var(--font-mono); font-size: 15px; color: var(--text-muted); }
.formula-display-box {
  padding: 26px 20px;
  margin: 14px 0 22px;
  border-top: 1.5px solid var(--text-primary);
  border-bottom: 1.5px solid var(--text-primary);
  background: color-mix(in srgb, var(--accent) 4%, transparent);
  font-size: 25px;
  text-align: center;
}
.symbol-legend-list { display: flex; flex-direction: column; gap: 12px; }
.symbol-row {
  display: grid;
  grid-template-columns: 135px 1fr;
  align-items: center;
  gap: 16px;
}
.symbol-math { font-size: 18px; color: var(--accent); }
.symbol-desc { font-size: 16.5px; color: var(--text-secondary); }
.academic-right-theorems { display: flex; flex-direction: column; gap: 18px; }

.open-table-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.table-caption {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 18px;
}
.three-line-table {
  width: 100%;
  border-collapse: collapse;
  border-top: 2.5px solid var(--text-primary);
  border-bottom: 2.5px solid var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.three-line-table thead tr { border-bottom: 1.5px solid var(--text-primary); }
.three-line-table th {
  padding: 16px 18px;
  font-size: 16.5px;
  font-weight: 700;
}
.three-line-table td {
  padding: 15px 18px;
  font-size: 16.5px;
  color: var(--text-secondary);
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
}
.three-line-table tr.row-sota-highlight {
  background: color-mix(in srgb, var(--accent) 11%, transparent);
}
.three-line-table tr.row-sota-highlight td {
  color: var(--text-primary);
  font-weight: 700;
}
.table-footnote {
  margin-top: 18px;
  font-size: 14.5px;
  color: var(--text-muted);
}

/* 21. Quote Manifesto */
.layout-quote-v2 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 420px;
}
.quote-mark-svg {
  font-family: Georgia, serif;
  font-size: 116px;
  line-height: 0.7;
  color: var(--accent);
  opacity: 0.5;
  margin-bottom: 22px;
}
.manifesto-quote-text {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  line-height: 1.28;
  letter-spacing: var(--display-tracking);
}
.quote-attribution { display: flex; align-items: center; gap: 18px; }
.quote-author {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}
.quote-role { font-size: 17px; color: var(--text-muted); }

/* 22. Code Architecture */
.code-arch-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1.18fr 0.82fr;
  gap: 48px;
  align-items: center;
  min-height: 0;
}
.code-window {
  background: var(--code-bg);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.code-window-bar {
  height: 42px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.code-dots { display: flex; gap: 8px; }
.code-dots span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.22); }
.code-lang-tag { font-family: var(--font-mono); font-size: 13px; color: #94A3B8; }
.code-pre {
  padding: 26px 30px;
  font-family: var(--font-mono);
  font-size: 16px;
  line-height: 1.65;
  color: var(--code-text);
  white-space: pre-wrap;
}
.code-line.line-hl {
  background: rgba(56, 189, 248, 0.18);
  color: #FFFFFF;
}
.code-open-notes { display: flex; flex-direction: column; gap: 22px; }

/* 23. Open Roadmap Columns */
.open-roadmap-columns {
  flex: 1;
  display: grid;
  gap: 42px;
  align-items: start;
  padding-top: 24px;
}

/* 24. Closing Beacon */
.layout-closing-v2 {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 980px;
}
.closing-v2-title {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  line-height: 1.16;
}
.closing-open-meta {
  margin-top: 52px;
  padding-top: 26px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 60px;
}
.closing-meta-col { display: flex; flex-direction: column; gap: 6px; }
.closing-meta-val { font-size: 17.5px; color: var(--text-primary); font-weight: 500; }

/* ==================== Web 路演控制台 HUD ==================== */
body.headless-mode .deck-hud,
body.headless-mode .deck-progress-bar,
body.headless-mode .overview-drawer,
body.headless-mode .theme-drawer,
body.headless-mode .speaker-panel,
body.headless-mode .laser-dot {
  display: none !important;
}

.deck-progress-bar {
  position: fixed;
  left: 0;
  bottom: 0;
  height: 2.5px;
  background: var(--accent);
  z-index: 80;
  transition: width 360ms var(--ease-spring);
}

.deck-hud {
  position: fixed;
  right: 24px;
  bottom: 20px;
  z-index: 85;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  max-width: calc(100vw - 24px);
  overflow-x: auto;
  white-space: nowrap;
  border-radius: 999px;
  background: rgba(12, 14, 20, 0.82);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #E2E8F0;
  font-family: var(--font-mono);
  font-size: 12px;
  opacity: 0.32;
  transition: opacity 220ms ease;
}
.deck-hud:hover { opacity: 1; }
#hud-counter {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  padding: 0 4px;
}
.hud-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}
.hud-btn:hover { background: rgba(255, 255, 255, 0.14); }

.overview-drawer, .theme-drawer {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: rgba(6, 8, 13, 0.94);
  backdrop-filter: blur(22px);
  padding: clamp(20px, 4vw, 48px) clamp(16px, 4vw, 64px);
  overflow-y: auto;
  display: none;
}
.overview-drawer.open, .theme-drawer.open { display: block; }
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  color: #F8FAFC;
  margin-bottom: 28px;
  font-family: var(--font-display);
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(290px, 100%), 1fr));
  gap: 20px;
}
.overview-item {
  padding: 18px 20px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #F1F5F9;
  cursor: pointer;
}
.overview-item:hover, .overview-item.active { border-color: var(--accent); }
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 16px;
}
.theme-chip {
  padding: 18px;
  border-radius: 10px;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.14);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.theme-chip.active { border-color: #38BDF8; }

.speaker-panel {
  position: fixed;
  left: 16px;
  bottom: 68px;
  width: min(460px, calc(100vw - 32px));
  max-height: min(240px, 45vh);
  z-index: 90;
  background: rgba(10, 12, 18, 0.92);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 16px 20px;
  color: #F1F5F9;
  display: none;
  overflow-y: auto;
}
.speaker-panel.open { display: block; }

@media (max-width: 768px) {
  .deck-hud {
    right: 50%;
    bottom: 12px;
    transform: translateX(50%);
    opacity: 0.88;
    padding: 6px 10px;
    gap: 4px;
  }
  .hud-btn { padding: 4px 6px; font-size: 11px; }
}
.laser-dot {
  position: fixed;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #FF2E4C;
  box-shadow: 0 0 18px 6px rgba(255, 46, 76, 0.72);
  pointer-events: none;
  z-index: 120;
  transform: translate(-50%, -50%);
  display: none;
}
.laser-dot.active { display: block; }
`;
}
