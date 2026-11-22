/**
 * "Show, Don't Tell" 视觉风格预览对比卡生成器 (Visual Style Discovery)
 * 根据用户给定的标题与场景，一键生成 3 套推荐风格或全量 12 套艺术风格的真实渲染预览网格。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SlideDeckIR, StylePack } from '../types/ir.js';
import { ALL_STYLE_PACKS, recommendStylesByQuery } from '../styles/index.js';
import { compileDeckToHtml } from '../compilers/html-compiler.js';
import { acquireBrowser, createFastHeadlessContext } from '../utils/browser.js';
import { escapeHtml } from '../utils/typography.js';

export interface StylePreviewOptions {
  title: string;
  subtitle?: string;
  query?: string;
  allStyles?: boolean;
  outputDir: string;
}

export async function generateStyleDiscoveryPreview(
  opts: StylePreviewOptions
): Promise<{ htmlGalleryPath: string; pngGalleryPath: string; styles: StylePack[] }> {
  const styles = opts.allStyles
    ? ALL_STYLE_PACKS
    : recommendStylesByQuery(opts.query || opts.title);

  fs.mkdirSync(opts.outputDir, { recursive: true });
  const browser = await acquireBrowser();
  const context = await createFastHeadlessContext(browser, {
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  const cards: Array<{ pack: StylePack; dataUri: string }> = [];

  try {
    for (const pack of styles) {
      const sampleDeck: SlideDeckIR = {
        version: '1.0',
        meta: {
          title: opts.title,
          subtitle: opts.subtitle || pack.description,
          author: 'Artistic-PPT Style Discovery',
          date: '2026 EDITION',
          style_id: pack.id,
        },
        slides: [
          {
            id: 'preview-cover',
            archetype:
              pack.category === 'editorial'
                ? 'cover-editorial-split'
                : pack.id === 'swiss-grid-modern'
                ? 'cover-swiss-grid'
                : 'cover-cinematic',
            eyebrow: `STYLE // ${pack.id.toUpperCase()}`,
            title: opts.title,
            subtitle: opts.subtitle || pack.description,
          },
        ],
      };

      const singleHtml = compileDeckToHtml(sampleDeck);
      const tmp = path.join(os.tmpdir(), `style-prev-${pack.id}-${Date.now()}.html`);
      fs.writeFileSync(tmp, singleHtml, 'utf-8');
      await page.goto(`file:///${tmp.replace(/\\/g, '/')}?headless=1`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(120);
      const buf = await page.locator('#deck-stage').screenshot({ type: 'png' });
      cards.push({
        pack,
        dataUri: `data:image/png;base64,${buf.toString('base64')}`,
      });
      fs.unlinkSync(tmp);
    }

    const cols = styles.length <= 3 ? 3 : 4;
    const galleryHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<title>Artistic-PPT 视觉风格预览面板</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #090C12;
    color: #F8FAFC;
    font-family: "Inter", "Microsoft YaHei UI", sans-serif;
    padding: 48px 56px;
    width: ${cols === 3 ? 2040 : 2400}px;
  }
  h1 { font-size: 32px; margin-bottom: 10px; }
  p.lead { color: #94A3B8; font-size: 16px; margin-bottom: 36px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(${cols}, 1fr);
    gap: 28px;
  }
  .card {
    background: #121722;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    overflow: hidden;
  }
  .card img { width: 100%; display: block; }
  .info { padding: 16px 20px; }
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .id-pill { font-family: Consolas, monospace; font-size: 12px; color: #38BDF8; }
  .desc { font-size: 13.5px; color: #94A3B8; line-height: 1.55; }
</style>
</head>
<body>
  <h1>Show, Don't Tell — 12 大殿堂级视觉风格预览</h1>
  <p class="lead">直接选择您最心仪的 style_id，工作流将自动应用全套色彩光场、中西文字体与动效参数。</p>
  <div class="grid">
    ${cards
      .map(
        ({ pack, dataUri }) => `<div class="card">
          <img src="${dataUri}" alt="${escapeHtml(pack.name)}"/>
          <div class="info">
            <div class="head">
              <strong>${escapeHtml(pack.name_zh)}</strong>
              <span class="id-pill">${escapeHtml(pack.id)}</span>
            </div>
            <div class="desc">${escapeHtml(pack.description)}</div>
          </div>
        </div>`
      )
      .join('')}
  </div>
</body>
</html>`;

    const htmlGalleryPath = path.join(opts.outputDir, 'style-discovery-gallery.html');
    const pngGalleryPath = path.join(opts.outputDir, 'style-discovery-gallery.png');
    fs.writeFileSync(htmlGalleryPath, galleryHtml, 'utf-8');

    const gPage = await browser.newPage({
      viewport: { width: cols === 3 ? 2040 : 2400, height: 900 },
    });
    await gPage.goto(`file:///${path.resolve(htmlGalleryPath).replace(/\\/g, '/')}`, {
      waitUntil: 'load',
    });
    await gPage.screenshot({ path: pngGalleryPath, fullPage: true, type: 'png' });
    await gPage.close();

    return { htmlGalleryPath, pngGalleryPath, styles };
  } finally {
    await context.close().catch(() => {});
  }
}
