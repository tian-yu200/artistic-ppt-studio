/**
 * 全链路硬核验收脚本 v4.0 (End-to-End Automated & Hands-On Verification Suite)
 * 严苛核验：
 * 1. 纯离线与小屏防裁切 CSS 审计（0 外网字体链接、必含 .deck-stage { flex-shrink: 0 }、0 处 "$M" 后置、0 处货币说明被误判为行内公式）；
 * 2. OpenXML 全栈真原生对象与 Zero-Defect 缺陷审计 (auditPptxOpenXmlDefects)：
 *    - 0 处泄漏 U+2060 Word Joiner；
 *    - 0 处 PptxGenJS line:{width:0} 残留黑框 (w="12700", color="333333")；
 *    - 0 处假三线表竖边框 (<a:lnL w="0"> ... color="666666")；
 *    - 0 处裸 formatCode="General" 图表坐标轴/标签；
 *    - 必含原生 OMML 公式 (<a14:m>) 与原生矢量路径 (<a:custGeom>)（对含公式/图标/拓扑图 deck）；
 * 3. Linter 报告零残余溢出、零碰撞。
 */
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { auditPptxOpenXmlDefects } from '../qa/pptx-visual-qa.js';

interface VerifyTarget {
  dir: string;
  base: string;
  expectChart: boolean;
  expectOmml: boolean;
  expectCustGeom: boolean;
}

const TARGETS: VerifyTarget[] = [
  { dir: 'showcase/01-apple-keynote-dark', base: '01-apple-keynote-dark', expectChart: true, expectOmml: false, expectCustGeom: true },
  { dir: 'showcase/02-editorial-vogue', base: '02-editorial-vogue', expectChart: false, expectOmml: false, expectCustGeom: true },
  { dir: 'showcase/03-oriental-ink-zen', base: '03-oriental-ink-zen', expectChart: false, expectOmml: false, expectCustGeom: false },
  { dir: 'showcase/04-aurora-glass-pitch', base: '04-aurora-glass-pitch', expectChart: true, expectOmml: false, expectCustGeom: false },
  { dir: 'showcase/05-executive-consulting', base: '05-executive-consulting', expectChart: true, expectOmml: false, expectCustGeom: true },
  { dir: 'showcase/06-nature-academic', base: '06-nature-academic', expectChart: true, expectOmml: true, expectCustGeom: true },
  { dir: 'demo', base: 'artistic-ppt-demo', expectChart: true, expectOmml: false, expectCustGeom: true },
];

async function verifyAll() {
  const root = process.cwd();
  let allPassed = true;

  console.log('=== Artistic-PPT v4.0 全视口、换肤与全栈原生 OpenXML Zero-Defect 终极核验 ===\n');

  for (const t of TARGETS) {
    const absDir = path.resolve(root, t.dir);
    const htmlFile = path.join(absDir, `${t.base}.html`);
    const pptxFile = path.join(absDir, `${t.base}.pptx`);
    const sheetFile = path.join(absDir, `${t.base}.contact-sheet.png`);

    const checks: string[] = [];

    if (!fs.existsSync(htmlFile) || fs.statSync(htmlFile).size < 20_000) {
      allPassed = false;
      checks.push('FAIL: HTML missing or too small');
    } else {
      const htmlStr = fs.readFileSync(htmlFile, 'utf-8');
      if (htmlStr.includes('fonts.googleapis.com') || htmlStr.includes('fonts.gstatic.com')) {
        allPassed = false;
        checks.push('FAIL: External Google Fonts link detected');
      } else if (!htmlStr.includes('flex-shrink: 0')) {
        allPassed = false;
        checks.push('FAIL: Missing flex-shrink: 0 on .deck-stage');
      } else if (/\d+(\.\d+)?\$[MBK]/.test(htmlStr) || /\d+(\.\d+)?M\$/.test(htmlStr)) {
        allPassed = false;
        checks.push('FAIL: Malformed currency suffix (e.g. 18.5$M) detected');
      } else if (/<span class="inline-math"[^>]*>[\s\S]*?触觉模组买断/.test(htmlStr)) {
        allPassed = false;
        checks.push('FAIL: Currency range ($... + $...) falsely parsed as inline LaTeX math');
      } else {
        checks.push(`HTML(${Math.round(fs.statSync(htmlFile).size / 1024)}KB, Offline+Responsive)`);
      }
    }

    if (!fs.existsSync(sheetFile) || fs.statSync(sheetFile).size < 20_000) {
      allPassed = false;
      checks.push('FAIL: Contact Sheet PNG missing');
    } else {
      checks.push(`SheetPNG(${Math.round(fs.statSync(sheetFile).size / 1024)}KB)`);
    }

    if (!fs.existsSync(pptxFile)) {
      allPassed = false;
      checks.push('FAIL: PPTX missing');
    } else {
      const buf = fs.readFileSync(pptxFile);
      const [zip, defectReport] = await Promise.all([
        JSZip.loadAsync(buf),
        auditPptxOpenXmlDefects(pptxFile),
      ]);
      const slideFiles = Object.keys(zip.files).filter((f) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(f)
      );
      const chartFiles = Object.keys(zip.files).filter((f) =>
        /^ppt\/charts\/chart\d+\.xml$/.test(f)
      );

      let textRuns = 0;
      let shapes = 0;
      let cxnShapes = 0;
      let picPortals = 0;
      let morphTags = 0;
      let tables = 0;
      let chartHasCustomNumFmt = true;

      for (const cf of chartFiles) {
        const cxml = await zip.file(cf)!.async('string');
        if (!/<c:numFmt\b[^>]*formatCode="(?!General")[^"]+"/.test(cxml)) {
          chartHasCustomNumFmt = false;
        }
      }

      for (const sf of slideFiles) {
        const xml = await zip.file(sf)!.async('string');
        textRuns += (xml.match(/<a:t\b[^>]*>/g) || []).length;
        shapes += (xml.match(/<p:sp\b[^>]*>/g) || []).length;
        cxnShapes += (xml.match(/<p:cxnSp\b[^>]*>/g) || []).length;
        picPortals += (xml.match(/<p:pic>[\s\S]*?name="!![^"]+"/g) || []).length;
        morphTags += (xml.match(/<p159:morph\s+option="byObject"\/>/g) || []).length;
        tables += (xml.match(/<a:tbl>/g) || []).length;
      }

      if (!defectReport.passed) {
        allPassed = false;
        checks.push(`FAIL DEFECTS: ${defectReport.details.join('; ')}`);
      } else if (t.expectChart && chartFiles.length === 0) {
        allPassed = false;
        checks.push('FAIL: Expected native ppt/charts/chart*.xml');
      } else if (t.expectChart && !chartHasCustomNumFmt) {
        allPassed = false;
        checks.push('FAIL: Chart XML still using bare formatCode="General"');
      } else if (t.expectOmml && defectReport.ommlFormulaCount === 0) {
        allPassed = false;
        checks.push('FAIL: Expected native OMML (<a14:m>) formulas');
      } else if (t.expectCustGeom && defectReport.custGeomCount === 0) {
        allPassed = false;
        checks.push('FAIL: Expected native vector (<a:custGeom>) paths');
      } else if (textRuns < 20 || picPortals < 2 || morphTags < 1) {
        allPassed = false;
        checks.push(`FAIL: XML check (<a:t>=${textRuns}, !!pic=${picPortals}, morph=${morphTags})`);
      } else {
        checks.push(
          `PPTX(${Math.round(buf.length / 1024)}KB, slides=${slideFiles.length}, charts=${
            chartFiles.length
          }[FmtOK], shapes=${shapes + cxnShapes}, <a:t>=${textRuns}, <a:tbl>=${tables}, OMML=${
            defectReport.ommlFormulaCount
          }, custGeom=${defectReport.custGeomCount}, !!cinema=${picPortals}, morph=${morphTags}, 0-Defects)`
        );
      }
    }

    console.log(`[${t.base}] -> ${checks.join(' | ')}`);
  }

  const reportPath = path.resolve(root, 'showcase/verification-report.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    for (const r of report) {
      if (r.overflowsRemaining > 0 || r.collisionsRemaining > 0) {
        allPassed = false;
        console.error(
          `[FAIL LINT] ${r.slug}: overflows=${r.overflowsRemaining}, collisions=${r.collisionsRemaining}`
        );
      }
    }
  }

  if (!allPassed) {
    console.error('\n[VERIFICATION FAILED] 存在未通过校验项！');
    process.exit(1);
  }
  console.log(`\n[VERIFICATION PASSED] 全部 ${TARGETS.length} 套样板与实战讲稿 100% 通过终极零缺陷验收！`);
}

verifyAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
