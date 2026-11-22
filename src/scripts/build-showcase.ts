/**
 * 一键构建并深度验证：12 风格一对一预览画廊 + 6 套旗舰实战样板 + 根目录门面 Demo
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  buildArtisticPresentation,
  closeBrowserPool,
  generateStyleDiscoveryPreview,
} from '../index.js';
import {
  DECK_01_APPLE_KEYNOTE,
  DECK_02_EDITORIAL_VOGUE,
  DECK_03_ORIENTAL_ZEN,
} from './showcase-decks-part1.js';
import {
  DECK_04_AURORA_PITCH,
  DECK_05_EXECUTIVE_CONSULTING,
  DECK_06_NATURE_ACADEMIC,
} from './showcase-decks-part2.js';

const SHOWCASE_LIST = [
  { slug: '01-apple-keynote-dark', deck: DECK_01_APPLE_KEYNOTE },
  { slug: '02-editorial-vogue', deck: DECK_02_EDITORIAL_VOGUE },
  { slug: '03-oriental-ink-zen', deck: DECK_03_ORIENTAL_ZEN },
  { slug: '04-aurora-glass-pitch', deck: DECK_04_AURORA_PITCH },
  { slug: '05-executive-consulting', deck: DECK_05_EXECUTIVE_CONSULTING },
  { slug: '06-nature-academic', deck: DECK_06_NATURE_ACADEMIC },
];

async function run() {
  const rootOut = path.resolve(process.cwd(), 'showcase');
  fs.mkdirSync(rootOut, { recursive: true });

  console.log('===========================================================');
  console.log(' 1/3 正在生成 12 大殿堂级艺术风格一对一同屏预览画廊');
  console.log('===========================================================');
  const gallery = await generateStyleDiscoveryPreview({
    title: '重塑视觉叙事的**空间与艺术张力**',
    subtitle: '一套语义中间表示，十二种独立美学宇宙，纯离线 Web 与全栈原生可编辑 PPTX 双轨同源输出。',
    allStyles: true,
    outputDir: path.join(rootOut, '00-all-12-styles-gallery'),
  });
  console.log(`  -> Gallery PNG : ${gallery.pngGalleryPath}`);

  console.log('\n===========================================================');
  console.log(' 2/3 正在全链路编译、碰撞审计并导出 6 套旗舰实战样板');
  console.log('===========================================================');

  const summaryReport: any[] = [];

  for (const item of SHOWCASE_LIST) {
    const dir = path.join(rootOut, item.slug);
    fs.mkdirSync(dir, { recursive: true });
    const irPath = path.join(dir, `${item.slug}.ir.json`);
    fs.writeFileSync(irPath, JSON.stringify(item.deck, null, 2), 'utf-8');

    console.log(`\n>>> 编译 [${item.slug}] (${item.deck.meta.style_id}) ...`);
    const res = await buildArtisticPresentation({
      inputIr: item.deck,
      outDir: dir,
      baseName: item.slug,
      emitHtml: true,
      emitPptx: true,
      emitContactSheet: true,
      spotlightSlides: [0, 1, 2],
    });

    const audit = res.pptxResult!.audit;
    console.log(
      `    [OK] 页数=${audit.slideCount} | 原生文本=${audit.nativeTextNodesCount} | 原生形状=${audit.nativeShapesCount} | 原生图表=${audit.nativeChartsCount} | 原生表=${audit.nativeTablesCount} | 溢出=${res.lint.overflowsRemaining} | 碰撞=${res.lint.collisionsRemaining}`
    );
    for (const iss of res.lint.issues) {
      console.log(`    [Lint:${iss.level}] ${iss.code}: ${iss.message}`);
    }

    summaryReport.push({
      slug: item.slug,
      style: item.deck.meta.style_id,
      slides: audit.slideCount,
      nativeTextNodes: audit.nativeTextNodesCount,
      nativeShapes: audit.nativeShapesCount,
      nativeCharts: audit.nativeChartsCount,
      nativeTables: audit.nativeTablesCount,
      morphSlides: audit.morphSlidesInjected,
      matchedMorphPairs: audit.matchedMorphPairs,
      overflowsRemaining: res.lint.overflowsRemaining,
      collisionsRemaining: res.lint.collisionsRemaining,
      fontScales: res.lint.slideFontScales,
    });
  }

  console.log('\n===========================================================');
  console.log(' 3/3 正在重编译根目录门面样片 (demo/artistic-ppt-demo)');
  console.log('===========================================================');
  const demoDir = path.resolve(process.cwd(), 'demo');
  const demoIrPath = path.join(demoDir, 'artistic-ppt-demo.ir.json');
  if (fs.existsSync(demoIrPath)) {
    const demoDeck = JSON.parse(fs.readFileSync(demoIrPath, 'utf-8'));
    const demoRes = await buildArtisticPresentation({
      inputIr: demoDeck,
      outDir: demoDir,
      baseName: 'artistic-ppt-demo',
      emitHtml: true,
      emitPptx: true,
      emitContactSheet: true,
    });
    const da = demoRes.pptxResult!.audit;
    console.log(
      `    [DEMO OK] 页数=${da.slideCount} | 原生文本=${da.nativeTextNodesCount} | 原生形状=${da.nativeShapesCount} | 原生图表=${da.nativeChartsCount} | 溢出=${demoRes.lint.overflowsRemaining} | 碰撞=${demoRes.lint.collisionsRemaining}`
    );
    for (const iss of demoRes.lint.issues) {
      console.log(`    [Demo Lint:${iss.level}] ${iss.code}: ${iss.message}`);
    }
    summaryReport.push({
      slug: 'demo/artistic-ppt-demo',
      style: demoDeck.meta.style_id,
      slides: da.slideCount,
      nativeTextNodes: da.nativeTextNodesCount,
      nativeShapes: da.nativeShapesCount,
      nativeCharts: da.nativeChartsCount,
      nativeTables: da.nativeTablesCount,
      morphSlides: da.morphSlidesInjected,
      overflowsRemaining: demoRes.lint.overflowsRemaining,
      collisionsRemaining: demoRes.lint.collisionsRemaining,
      fontScales: demoRes.lint.slideFontScales,
    });
  }

  fs.writeFileSync(
    path.join(rootOut, 'verification-report.json'),
    JSON.stringify(summaryReport, null, 2),
    'utf-8'
  );
  console.log('\n全部样板与门面 Demo 构建完毕！审计报告已保存至 showcase/verification-report.json');
  await closeBrowserPool();
}

run().catch(async (err) => {
  console.error('构建失败:', err);
  await closeBrowserPool();
  process.exit(1);
});
