/**
 * Artistic-PPT Universal Workflow — 统一编排流水线 API
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SlideDeckIR } from './types/ir.js';
import { compileDeckToHtml } from './compilers/html-compiler.js';
import { compileDeckToPptx, type PptxCompileResult } from './compilers/pptx-compiler.js';
import type { PptxAuditSummary } from './compilers/morph-injector.js';
import { lintAndAutoHealDeck, type LintAndHealResult } from './qa/linter.js';
import {
  auditPptxOpenXmlDefects,
  exportPptxSlidesViaPowerPoint,
  type PptxDefectReport,
} from './qa/pptx-visual-qa.js';
import { renderContactSheet } from './qa/contact-sheet.js';
import { generateStyleDiscoveryPreview } from './qa/style-preview.js';
import { closeBrowserPool } from './utils/browser.js';

export * from './types/ir.js';
export * from './styles/index.js';
export * from './playbooks/index.js';
export * from './art-direction/prompt-engine.js';
export {
  compileDeckToHtml,
  compileDeckToPptx,
  lintAndAutoHealDeck,
  renderContactSheet,
  generateStyleDiscoveryPreview,
  auditPptxOpenXmlDefects,
  exportPptxSlidesViaPowerPoint,
  closeBrowserPool,
  type PptxAuditSummary,
  type PptxDefectReport,
};

export interface FullBuildOptions {
  inputIr: SlideDeckIR;
  outDir: string;
  baseName?: string;
  emitHtml?: boolean;
  emitPptx?: boolean;
  emitContactSheet?: boolean;
  spotlightSlides?: number[];
}

export interface FullBuildResult {
  lint: LintAndHealResult;
  htmlPath?: string;
  pptxResult?: PptxCompileResult;
  contactSheetFiles?: string[];
}

/**
 * 端到端全自动构建流水线：
 * Schema校验 → Anti-Slop净化 → 无头DOM溢出自愈 → Web Cinema HTML → 原生Morph PPTX → 视觉快照矩阵
 */
export async function buildArtisticPresentation(
  opts: FullBuildOptions
): Promise<FullBuildResult> {
  const {
    inputIr,
    outDir,
    baseName = 'presentation',
    emitHtml = true,
    emitPptx = true,
    emitContactSheet = true,
    spotlightSlides = [],
  } = opts;

  fs.mkdirSync(outDir, { recursive: true });

  // 1. Tier-1 质检与自适应字号收敛
  const lint = await lintAndAutoHealDeck(inputIr, true);
  if (!lint.validSchema) {
    throw new Error(
      `SlideDeck IR Schema 校验未通过:\n` +
        lint.issues.map((i) => `  - [${i.code}] ${i.message}`).join('\n')
    );
  }

  const healed = lint.healedDeck;
  const htmlOpts = { slideFontScales: lint.slideFontScales };

  // 2. 轨道 A：编译零依赖单文件 Web Cinema HTML
  let htmlPath: string | undefined;
  if (emitHtml || emitContactSheet) {
    const htmlStr = compileDeckToHtml(healed, htmlOpts);
    htmlPath = path.join(outDir, `${baseName}.html`);
    fs.writeFileSync(htmlPath, htmlStr, 'utf-8');
  }

  // 3. 轨道 B：编译分层混合原生可编辑 Morph PPTX
  let pptxResult: PptxCompileResult | undefined;
  if (emitPptx) {
    const pptxPath = path.join(outDir, `${baseName}.pptx`);
    pptxResult = await compileDeckToPptx(healed, pptxPath, htmlOpts);
  }

  // 4. Tier-2：生成视觉审片矩阵 PNG
  let contactSheetFiles: string[] | undefined;
  if (emitContactSheet && htmlPath) {
    const sheetPath = path.join(outDir, `${baseName}.contact-sheet.png`);
    contactSheetFiles = await renderContactSheet({
      htmlPath,
      deck: healed,
      outputPngPath: sheetPath,
      spotlightSlides,
    });
  }

  return {
    lint,
    htmlPath,
    pptxResult,
    contactSheetFiles,
  };
}
