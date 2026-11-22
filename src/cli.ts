/**
 * Artistic-PPT 命令行工具 (跨 Agent / 跨语言通用 CLI 接口)
 *
 * 用法示例：
 *   node dist/cli.js compile deck.ir.json --out-dir ./out --name keynote
 *   node dist/cli.js lint deck.ir.json
 *   node dist/cli.js preview-styles --title "AI Spatial OS" --all --out-dir ./previews
 *   node dist/cli.js list-assets
 */
import path from 'node:path';
import {
  ALL_PLAYBOOKS,
  ALL_STYLE_PACKS,
  buildArtisticPresentation,
  closeBrowserPool,
  generateDeckArtPrompts,
  generateStyleDiscoveryPreview,
  lintAndAutoHealDeck,
} from './index.js';
import { readIrFile } from './utils/ir-input.js';

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  try {
    if (cmd === 'compile') {
      const irFile = args[1];
      if (!irFile || irFile.startsWith('--')) {
        throw new Error('请指定输入的 SlideDeck IR JSON 文件路径，例如: artistic-ppt compile deck.ir.json');
      }
      const rawJson = readIrFile(irFile);
      const outDir = path.resolve(
        getArg(args, '--out-dir') || path.dirname(path.resolve(irFile))
      );
      const baseName =
        getArg(args, '--name') ||
        path.basename(irFile).replace(/(\.ir)?\.json$/i, '');
      const htmlOnly = args.includes('--html-only');
      const pptxOnly = args.includes('--pptx-only');
      const noSheet = args.includes('--no-contact-sheet');

      console.log(`[Artistic-PPT] 正在编译: ${irFile} (Style: ${rawJson.meta?.style_id})`);
      const res = await buildArtisticPresentation({
        inputIr: rawJson,
        outDir,
        baseName,
        emitHtml: !pptxOnly,
        emitPptx: !htmlOnly,
        emitContactSheet: !noSheet && !pptxOnly,
      });

      console.log(
        `[Lint & Auto-Heal] 记录数: ${res.lint.issues.length}, 残余溢出: ${res.lint.overflowsRemaining}, 残余碰撞: ${res.lint.collisionsRemaining}`
      );
      for (const iss of res.lint.issues) {
        console.log(`  - [${iss.level.toUpperCase()}] (${iss.code}) ${iss.message}`);
      }
      if (res.htmlPath) console.log(`[HTML] 已生成 (100% 纯离线单文件): ${res.htmlPath}`);
      if (res.pptxResult) {
        const a = res.pptxResult.audit;
        console.log(
          `[PPTX] 已生成: ${res.pptxResult.pptxPath} | 页数=${a.slideCount}, 原生图表=${a.nativeChartsCount}, 原生形状=${a.nativeShapesCount}, 原生公式(OMML)=${a.nativeOmmlCount}, 矢量路径=${a.nativeCustGeomCount}, 动态画窗=${a.dynamicArtPortalsCount}, 原生文本=${a.nativeTextNodesCount}, 原生表=${a.nativeTablesCount}, p159:morph=[${a.morphSlidesInjected.join(',')}]`
        );
      }
      if (res.contactSheetFiles?.length) {
        console.log(`[Visual QA] 审片图已生成: ${res.contactSheetFiles[0]}`);
      }
      return;
    }

    if (cmd === 'lint') {
      const irFile = args[1];
      if (!irFile) throw new Error('请指定 IR JSON 文件路径');
      const rawJson = readIrFile(irFile);
      const res = await lintAndAutoHealDeck(rawJson, !args.includes('--fast'));
      console.log(JSON.stringify({
        validSchema: res.validSchema,
        overflowsRemaining: res.overflowsRemaining,
        slideFontScales: res.slideFontScales,
        issues: res.issues,
      }, null, 2));
      if (!res.validSchema) process.exitCode = 1;
      return;
    }

    if (cmd === 'preview-styles') {
      const title = getArg(args, '--title') || 'Next-Generation Spatial Intelligence';
      const subtitle = getArg(args, '--subtitle');
      const query = getArg(args, '--query');
      const outDir = path.resolve(getArg(args, '--out-dir') || './showcase/style-discovery');
      const allStyles = args.includes('--all');
      const res = await generateStyleDiscoveryPreview({
        title,
        subtitle,
        query,
        allStyles,
        outputDir: outDir,
      });
      console.log(`[Style Discovery] HTML: ${res.htmlGalleryPath}`);
      console.log(`[Style Discovery] PNG : ${res.pngGalleryPath}`);
      return;
    }

    if (cmd === 'art-prompts') {
      const irFile = args[1];
      if (!irFile) throw new Error('请指定 IR JSON 文件路径');
      const rawJson = readIrFile(irFile);
      const prompts = generateDeckArtPrompts(rawJson);
      console.log(JSON.stringify(prompts, null, 2));
      return;
    }

    if (cmd === 'list-assets') {
      console.log('=== 12 大艺术风格包 (Style Packs) ===');
      for (const s of ALL_STYLE_PACKS) {
        console.log(`- ${s.id.padEnd(23)} | ${s.name_zh} | ${s.description}`);
      }
      console.log('\n=== 8 大行业主题叙事剧本 (Theme Playbooks) ===');
      for (const p of ALL_PLAYBOOKS) {
        console.log(`- ${p.id.padEnd(23)} | ${p.name_zh} | 推荐风格: ${p.recommended_styles.join(', ')}`);
      }
      return;
    }

    console.log(`Artistic-PPT Universal CLI v1.0.0
可用命令:
  compile <file.ir.json> [--out-dir <dir>] [--name <basename>] [--html-only] [--pptx-only] [--no-contact-sheet]
  lint <file.ir.json> [--fast]
  preview-styles [--title <str>] [--subtitle <str>] [--query <str>] [--all] [--out-dir <dir>]
  list-assets`);
  } finally {
    await closeBrowserPool();
  }
}

main().catch((err) => {
  console.error('[Artistic-PPT Error]', err);
  process.exit(1);
});
