/**
 * v2.0 破界错版 + 字图空间穿插 + 超画幅视差运镜 (PoC 概念验证渲染器)
 * 直接使用内置生图引擎产出的真实中画幅光影大片，验证告别“圆角框 AI 味”后的美术馆级视觉冲击力。
 */
import fs from 'node:fs';
import path from 'node:path';
import { acquireBrowser, closeBrowserPool, createFastHeadlessContext } from '../utils/browser.js';

async function buildV2Poc() {
  const artifactDir = 'C:/Users/yqs20/.gemini/antigravity/brain/1865c3e3-000b-4266-8b32-ab7c9dcf6cea';
  const imgPath = path.join(artifactDir, 'art_test_monolith_1794947138070.jpg');
  const imgB64 = `data:image/jpeg;base64,${fs.readFileSync(imgPath).toString('base64')}`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #060608;
    color: #F4F1EA;
    font-family: "Inter", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif;
    padding: 44px 52px;
    width: 2240px;
  }
  .poc-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 32px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(244,241,234,0.15);
  }
  .poc-header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
  .poc-header span { font-family: Consolas, monospace; font-size: 14px; color: #D4A359; }
  .slides-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .frame-wrap { display: flex; flex-direction: column; gap: 12px; }
  .caption { font-size: 13.5px; color: #A39E93; font-family: Consolas, monospace; }

  /* 16:9 缩比高精画板 (960x540 逻辑放大为超清采样) */
  .canvas {
    position: relative;
    width: 696px;
    height: 391.5px;
    overflow: hidden;
    background: #08090C;
    border: 1px solid rgba(255,255,255,0.12);
  }

  /* ================= SLIDE 01: 全出血破界巨字 + 错版负空间 + 杂志竖排侧记 ================= */
  .s1-bg {
    position: absolute;
    inset: -6% -8% -6% -2%;
    background-image: url('${imgB64}');
    background-size: cover;
    background-position: center right;
  }
  .s1-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(95deg, rgba(6,7,10,0.92) 0%, rgba(6,7,10,0.68) 44%, rgba(6,7,10,0.05) 78%);
  }
  .s1-bleed-giant {
    position: absolute;
    left: -18px;
    bottom: -46px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 180px;
    font-weight: 700;
    line-height: 0.8;
    letter-spacing: -0.06em;
    color: rgba(244, 241, 234, 0.055);
    pointer-events: none;
  }
  .s1-vertical-note {
    position: absolute;
    left: 22px;
    top: 32px;
    writing-mode: vertical-rl;
    font-family: Consolas, monospace;
    font-size: 8.5px;
    letter-spacing: 0.28em;
    color: rgba(212, 163, 89, 0.78);
    text-transform: uppercase;
  }
  .s1-cross {
    position: absolute;
    font-family: Consolas, monospace;
    font-size: 11px;
    color: rgba(244,241,234,0.35);
  }
  .s1-main {
    position: absolute;
    left: 62px;
    top: 86px;
    width: 390px;
  }
  .s1-serif-en {
    font-family: Georgia, "Playfair Display", serif;
    font-style: italic;
    font-size: 15px;
    color: #D4A359;
    margin-bottom: 10px;
  }
  .s1-title {
    font-family: "Noto Serif SC", "Songti SC", "SimSun", serif;
    font-size: 38px;
    font-weight: 700;
    line-height: 1.16;
    letter-spacing: -0.02em;
    color: #F7F4EE;
  }
  .s1-line {
    width: 88px;
    height: 1px;
    background: rgba(212,163,89,0.65);
    margin: 20px 0 16px -24px; /* 故意向左破格错位延伸！ */
  }
  .s1-sub {
    font-size: 11px;
    line-height: 1.75;
    color: rgba(244,241,234,0.72);
    width: 295px;
  }
  .s1-viewfinder {
    position: absolute;
    right: 26px;
    bottom: 22px;
    padding: 6px 10px;
    border-left: 1px solid #D4A359;
    font-family: Consolas, monospace;
    font-size: 8.5px;
    color: rgba(244,241,234,0.78);
    background: rgba(8,9,12,0.45);
    backdrop-filter: blur(8px);
  }

  /* ================= SLIDE 02: 镜头右推视差放大 + 非对称画框裁切错版叠压 ================= */
  .s2-canvas {
    background: #F2ECE1;
    color: #151412;
  }
  .s2-bleed-num {
    position: absolute;
    right: -14px;
    top: -28px;
    font-family: Georgia, serif;
    font-size: 165px;
    font-weight: 700;
    color: rgba(21, 20, 18, 0.055);
    line-height: 0.85;
  }
  .s2-art-portal {
    position: absolute;
    left: 0;
    top: 48px;
    width: 305px;
    height: 344px;
    overflow: hidden;
  }
  .s2-art-portal img {
    width: 560px;
    height: 360px;
    object-fit: cover;
    object-position: right center;
    transform: translate(-210px, -8px) scale(1.18); /* 视差推镜特写拱门光束！ */
  }
  /* 标题直接横跨深色摄影画框与米白纸面交界线！ */
  .s2-overlap-headline {
    position: absolute;
    left: 228px;
    top: 74px;
    width: 420px;
    z-index: 5;
  }
  .s2-overlap-headline .kicker {
    font-family: Consolas, monospace;
    font-size: 9px;
    letter-spacing: 0.22em;
    color: #9E5A24;
    margin-bottom: 8px;
    padding-left: 88px;
  }
  .s2-overlap-headline h2 {
    font-family: "Noto Serif SC", "SimSun", serif;
    font-size: 31px;
    line-height: 1.22;
    font-weight: 700;
    color: #151412;
    background: linear-gradient(90deg, #F7F4EE 0%, #F7F4EE 18%, #151412 18.5%, #151412 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .s2-editorial-cols {
    position: absolute;
    left: 342px;
    top: 196px;
    right: 42px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    border-top: 1px solid rgba(21,20,18,0.18);
    padding-top: 18px;
  }
  .s2-col-num {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 20px;
    color: #9E5A24;
    margin-bottom: 6px;
  }
  .s2-col-title {
    font-size: 12.5px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .s2-col-body {
    font-size: 10px;
    line-height: 1.72;
    color: #524C44;
  }

  /* ================= SLIDE 03: 极致孤品留白 + 破格对角张力锚点 (无任何冗余圆角框！) ================= */
  .s3-canvas {
    background: #0B0B0E;
  }
  .s3-bg-slice {
    position: absolute;
    right: 54px;
    top: 0;
    width: 168px;
    height: 100%;
    overflow: hidden;
    opacity: 0.82;
  }
  .s3-bg-slice img {
    width: 696px;
    height: 392px;
    object-fit: cover;
    transform: translate(-410px, 0) scale(1.25);
  }
  .s3-giant-metric {
    position: absolute;
    left: 56px;
    top: 64px;
    font-family: Georgia, serif;
    font-size: 98px;
    font-weight: 400;
    letter-spacing: -0.04em;
    color: #F4F1EA;
    line-height: 0.92;
  }
  .s3-giant-metric em {
    font-size: 36px;
    color: #D4A359;
    font-style: italic;
    margin-left: 6px;
  }
  .s3-axis-line {
    position: absolute;
    left: 56px;
    right: 36px;
    top: 206px;
    height: 1px;
    background: linear-gradient(90deg, #D4A359 0%, rgba(244,241,234,0.16) 65%, rgba(244,241,234,0.4) 100%);
  }
  .s3-statement {
    position: absolute;
    left: 56px;
    top: 232px;
    width: 360px;
  }
  .s3-statement h3 {
    font-family: "Noto Serif SC", "SimSun", serif;
    font-size: 21px;
    font-weight: 700;
    margin-bottom: 10px;
    color: #F4F1EA;
  }
  .s3-statement p {
    font-size: 10.5px;
    line-height: 1.75;
    color: rgba(244,241,234,0.65);
  }
  .s3-floating-tag {
    position: absolute;
    right: 78px;
    bottom: 34px;
    background: #F2ECE1;
    color: #151412;
    padding: 14px 18px;
    width: 195px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.7);
  }
  .s3-floating-tag strong {
    display: block;
    font-size: 16px;
    font-family: Georgia, serif;
    margin-bottom: 4px;
  }
  .s3-floating-tag span {
    font-size: 9.5px;
    color: #575148;
    line-height: 1.5;
    display: block;
  }
</style>
</head>
<body>
  <div class="poc-header">
    <h1>v2.0 破界错版 · 真实光影 · 跨界穿插 · 视差推镜三连页概念验证 (Zero-Boxification PoC)</h1>
    <span>AI GENERATED HASSELBLAD VISUAL + BROKEN GRID + PARALLAX MORPH</span>
  </div>
  <div class="slides-row">
    <!-- Slide 1 -->
    <div class="frame-wrap">
      <div class="canvas">
        <div class="s1-bg"></div>
        <div class="s1-scrim"></div>
        <div class="s1-bleed-giant">26</div>
        <div class="s1-vertical-note">ISSUE 01 — ARCHITECTURAL LIGHT</div>
        <span class="s1-cross" style="left:22px;bottom:20px">+</span>
        <span class="s1-cross" style="right:22px;top:20px">+</span>
        <div class="s1-main">
          <div class="s1-serif-en">Prologue // Beyond Flatness</div>
          <h2 class="s1-title">当光撕裂沉默，<br/>空间便有了骨相</h2>
          <div class="s1-line"></div>
          <p class="s1-sub">彻底摒弃千篇一律的网页圆角框与廉价矢量底纹。以中画幅负空间光影真图入画，用留白与破界标尺重塑视觉呼吸。</p>
        </div>
        <div class="s1-viewfinder">01 / 03 &nbsp;→&nbsp; ZOOM INTO ARCH</div>
      </div>
      <div class="caption">#01 全出血光影负空间 + 左下破界切边巨字 "26" + 竖排杂志侧舷铭牌</div>
    </div>

    <!-- Slide 2 -->
    <div class="frame-wrap">
      <div class="canvas s2-canvas">
        <div class="s2-bleed-num">02</div>
        <div class="s2-art-portal">
          <img src="${imgB64}" alt=""/>
        </div>
        <div class="s2-overlap-headline">
          <div class="kicker">BROKEN GRID &amp; INTERLOCK</div>
          <h2>字跨黑白交界，<br/>打破图文割裂的藩篱</h2>
        </div>
        <div class="s2-editorial-cols">
          <div>
            <div class="s2-col-num">I.</div>
            <div class="s2-col-title">跨界反相穿插排印</div>
            <div class="s2-col-body">主标题直接横跨左侧深色拱门特写与右侧暖棉纸面，压图部分自动反白、落纸部分浓墨呈现，视线一气呵成。</div>
          </div>
          <div>
            <div class="s2-col-num">II.</div>
            <div class="s2-col-title">同源大图视差推镜</div>
            <div class="s2-col-body">左侧画窗与第一页共享同一对象锚点 !!cinema-bg，翻页时背景收缩为竖幅画廊窗并放大拱门光束局部。</div>
          </div>
        </div>
      </div>
      <div class="caption">#02 跨界反相穿插标题 (一半压深图反白/一半落宣纸浓墨) + 同源视差局部推镜</div>
    </div>

    <!-- Slide 3 -->
    <div class="frame-wrap">
      <div class="canvas s3-canvas">
        <div class="s3-bg-slice">
          <img src="${imgB64}" alt=""/>
        </div>
        <div class="s3-giant-metric">94.8<em>%</em></div>
        <div class="s3-axis-line"></div>
        <div class="s3-statement">
          <h3>零外框束缚的视觉绝对统治力</h3>
          <p>砍掉所有多余的半透明圆角盒子后，72% 的纯粹黑金留白将观众全部注意力锁死在唯一的核心数字与右侧垂直光隙切片之上。</p>
        </div>
        <div class="s3-floating-tag">
          <strong>Overlap Note</strong>
          <span>撞色纸感铭牌故意跨压在垂直光束切片下沿，形成前景、中景、远景三层纵深。</span>
        </div>
      </div>
      <div class="caption">#03 垂直光隙画幅切片 + 零圆角框孤品级留白 + 跨层叠压撞色铭牌</div>
    </div>
  </div>
</body>
</html>`;

  const tmpHtml = path.join(artifactDir, 'v2_poc_preview.html');
  const outPng = path.join(artifactDir, 'v2_poc_preview.png');
  fs.writeFileSync(tmpHtml, html, 'utf-8');

  const browser = await acquireBrowser();
  const ctx = await createFastHeadlessContext(browser, {
    viewport: { width: 2240, height: 640 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`file:///${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: outPng, fullPage: true, type: 'png' });
  await ctx.close();
  await closeBrowserPool();
  console.log('Saved PoC PNG:', outPng);
}

buildV2Poc().catch(console.error);
