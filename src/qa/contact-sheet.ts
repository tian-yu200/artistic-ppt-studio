/**
 * Tier-2 高清视觉快照审片矩阵生成器 (Contact Sheet Visual QA Generator)
 * 将整套演示文稿每一页渲染为高分快照并合成在一张 3 列精装审片大图上，
 * 供多模态模型与设计师一眼审视全局留白、光影连贯性、视觉重心与排版品质。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SlideDeckIR } from '../types/ir.js';
import { acquireBrowser, createFastHeadlessContext } from '../utils/browser.js';
import { escapeHtml, stripRichMarkers } from '../utils/typography.js';

export interface ContactSheetOptions {
  htmlPath: string;
  deck: SlideDeckIR;
  outputPngPath: string;
  /** 可选输出单页高清特写 PNG 的页码索引数组 (0-based) */
  spotlightSlides?: number[];
}

export async function renderContactSheet(options: ContactSheetOptions): Promise<string[]> {
  const { htmlPath, deck, outputPngPath, spotlightSlides = [] } = options;
  const browser = await acquireBrowser();
  const context = await createFastHeadlessContext(browser, {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const savedFiles: string[] = [];

  try {
    const absHtml = path.resolve(htmlPath).replace(/\\/g, '/');
    await page.goto(`file:///${absHtml}?headless=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(100);

    const thumbsDataUri: string[] = [];
    for (let i = 0; i < deck.slides.length; i++) {
      await page.evaluate((idx) => (window as any).__deckGoTo(idx), i);
      await page.waitForTimeout(35);
      const buf = await page.locator('#deck-stage').screenshot({ type: 'png' });
      thumbsDataUri.push(`data:image/png;base64,${buf.toString('base64')}`);

      if (spotlightSlides.includes(i)) {
        const spotPath = outputPngPath.replace(
          /\.png$/i,
          `-slide-${String(i + 1).padStart(2, '0')}.png`
        );
        fs.mkdirSync(path.dirname(spotPath), { recursive: true });
        fs.writeFileSync(spotPath, buf);
        savedFiles.push(spotPath);
      }
    }

    // 构建 3 列高清审片台网格 HTML
    const cols = 3;
    const sheetHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 2160px;
    background: #0B0E14;
    color: #F1F5F9;
    font-family: "Inter", "Microsoft YaHei UI", sans-serif;
    padding: 44px 52px 56px;
  }
  .sheet-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 32px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .sheet-title { font-size: 28px; font-weight: 800; }
  .sheet-meta { font-family: Consolas, monospace; font-size: 15px; color: #38BDF8; }
  .grid {
    display: grid;
    grid-template-columns: repeat(${cols}, 1fr);
    gap: 28px;
  }
  .cell {
    background: #141923;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    overflow: hidden;
  }
  .cell img {
    display: block;
    width: 100%;
    height: auto;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .cell-bar {
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #94A3B8;
  }
  .morph-badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(56, 189, 248, 0.16);
    color: #38BDF8;
    font-family: Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="sheet-head">
    <div class="sheet-title">${escapeHtml(stripRichMarkers(deck.meta.title))} — Visual QA Contact Sheet</div>
    <div class="sheet-meta">STYLE: ${escapeHtml(deck.meta.style_id)} · SLIDES: ${
      deck.slides.length
    }</div>
  </div>
  <div class="grid">
    ${thumbsDataUri
      .map((uri, idx) => {
        const s = deck.slides[idx];
        const hasMorph =
          s.transition === 'morph' ||
          Boolean(
            s.title_morph_id ||
              s.container_morph_id ||
              s.hero_metric?.morph_id ||
              s.items?.some((it) => it.morph_id)
          );
        return `<div class="cell">
          <img src="${uri}" />
          <div class="cell-bar">
            <span><strong>#${String(idx + 1).padStart(2, '0')}</strong> · ${escapeHtml(
          s.archetype
        )}</span>
            ${hasMorph ? '<span class="morph-badge">MORPH ⇄</span>' : ''}
          </div>
        </div>`;
      })
      .join('')}
  </div>
</body>
</html>`;

    const tmpSheetHtml = path.join(
      os.tmpdir(),
      `contact-sheet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.html`
    );
    fs.writeFileSync(tmpSheetHtml, sheetHtml, 'utf-8');

    const sheetPage = await browser.newPage({
      viewport: { width: 2160, height: 800 },
    });
    await sheetPage.goto(`file:///${tmpSheetHtml.replace(/\\/g, '/')}`, {
      waitUntil: 'load',
    });
    fs.mkdirSync(path.dirname(outputPngPath), { recursive: true });
    await sheetPage.screenshot({ path: outputPngPath, fullPage: true, type: 'png' });
    await sheetPage.close();
    fs.unlinkSync(tmpSheetHtml);

    savedFiles.unshift(outputPngPath);
    return savedFiles;
  } finally {
    await context.close().catch(() => {});
  }
}
