/**
 * PPTX OpenXML 深度缺陷审计与 PowerPoint 原生渲染导出质检器
 * 1. auditPptxOpenXmlDefects: 逐页扫描 ppt/slides/slide*.xml 与 ppt/charts/chart*.xml，
 *    精准捕获泄漏的 U+2060、PptxGenJS line:{width:0} 黑边陷阱、假三线表竖边框及裸 General 图表格式，
 *    同时统计原生 OMML 公式 (<a14:m>) 与原生矢量路径 (<a:custGeom>) 覆盖度。
 * 2. exportPptxSlidesViaPowerPoint: 优先通过本机 PowerPoint COM 接口静默导出高清逐页 PNG，
 *    无 PowerPoint 时自动降级检测 LibreOffice (soffice)，全无则安全返回空数组。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';

export interface PptxDefectReport {
  pptxPath: string;
  slideCount: number;
  leakedWordJoinerCount: number;
  zeroWidthBlackLineCount: number; // w="12700" 且 color="333333" 的误触线或空 border 残留
  fakeTableVertBorderCount: number; // <a:lnL w="0"><a:solidFill><a:srgbClr val="666666"/>
  ommlFormulaCount: number; // <a14:m> 出现次数
  ommlAlternateContentConflictCount: number; // 包裹 <a14:m> 的 <mc:AlternateContent> 次数（会触发 WPS 重影）
  custGeomCount: number; // <a:custGeom> 出现次数
  chartCount: number;
  bareGeneralChartCount: number; // <c:dLbls> 或 <c:valAx> 中存在 formatCode="General"
  duplicateSeriesIdxCount: number; // Combo 等图表中多个 <c:ser> 共享同一 <c:idx>（会触发 PowerPoint 打不开报错）
  passed: boolean;
  details: string[];
}

function sortNumericArchivePaths(files: string[], regex: RegExp): string[] {
  return files
    .filter((f) => regex.test(f))
    .sort((a, b) => {
      const na = Number(a.match(regex)?.[1] ?? 0);
      const nb = Number(b.match(regex)?.[1] ?? 0);
      return na - nb;
    });
}

function countMatches(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function chartHasBareGeneralFormat(chartXml: string): boolean {
  const targetBlocks = [
    ...(chartXml.match(/<c:dLbls\b[^>]*>[\s\S]*?<\/c:dLbls>/g) ?? []),
    ...(chartXml.match(/<c:valAx\b[^>]*>[\s\S]*?<\/c:valAx>/g) ?? []),
  ];
  return targetBlocks.some((block) => /<c:numFmt\b[^>]*\bformatCode="General"/i.test(block));
}

/**
 * 审计生成的 .pptx 压缩包内的 OpenXML 原生对象质量与常见 PptxGenJS 陷阱
 */
export async function auditPptxOpenXmlDefects(pptxPath: string): Promise<PptxDefectReport> {
  const absPath = path.resolve(pptxPath);
  const buf = fs.readFileSync(absPath);
  const zip = await JSZip.loadAsync(buf);

  const allFiles = Object.keys(zip.files);
  const slideFiles = sortNumericArchivePaths(allFiles, /^ppt\/slides\/slide(\d+)\.xml$/);
  const chartFiles = sortNumericArchivePaths(allFiles, /^ppt\/charts\/chart(\d+)\.xml$/);

  let leakedWordJoinerCount = 0;
  let zeroWidthBlackLineCount = 0;
  let fakeTableVertBorderCount = 0;
  let ommlFormulaCount = 0;
  let ommlAlternateContentConflictCount = 0;
  let custGeomCount = 0;
  let bareGeneralChartCount = 0;
  let duplicateSeriesIdxCount = 0;
  const details: string[] = [];

  for (const sf of slideFiles) {
    const xml = await zip.file(sf)!.async('string');
    const slideWithoutChart = xml.replace(/<c:chart\b[^>]*(?:\/>|>[\s\S]*?<\/c:chart>)/g, '');

    const joinerHits = countMatches(xml, /\u2060/g);
    if (joinerHits > 0) {
      leakedWordJoinerCount += joinerHits;
      details.push(`[DEFECT] ${sf}: 发现 ${joinerHits} 处泄漏的 U+2060 Word Joiner`);
    }

    // PptxGenJS line:{width:0} 会退化为 w="12700" 且默认 color="333333" 的 1pt 黑框
    const blackLineHits = countMatches(
      slideWithoutChart,
      /<a:ln\b[^>]*\bw="12700"[^>]*>\s*<a:solidFill>\s*<a:srgbClr\b[^>]*\bval="333333"/gi
    );
    if (blackLineHits > 0) {
      zeroWidthBlackLineCount += blackLineHits;
      details.push(
        `[DEFECT] ${sf}: 发现 ${blackLineHits} 处 PptxGenJS line:{width:0} 残留 (w="12700", color="333333")`
      );
    }

    // 仅匹配表格左右竖框 (<a:lnL>/<a:lnR>)，避免误报正常的表格横线 (<a:lnT>/<a:lnB>)
    const fakeVertHits = countMatches(
      slideWithoutChart,
      /<a:ln[LR]\b(?![^>]*\bw="(?!0")[^"]*")[^>]*>\s*<a:solidFill>\s*<a:srgbClr\b[^>]*\bval="666666"/gi
    );
    if (fakeVertHits > 0) {
      fakeTableVertBorderCount += fakeVertHits;
      details.push(
        `[DEFECT] ${sf}: 发现 ${fakeVertHits} 处假三线表竖边框残留 (<a:lnL/lnR w="0" ... 666666>)`
      );
    }

    const ommlAcHits = countMatches(
      xml,
      /<mc:AlternateContent\b[^>]*>(?:(?!<\/mc:AlternateContent>)[\s\S])*?<a14:m\b[\s\S]*?<\/mc:AlternateContent>/g
    );
    if (ommlAcHits > 0) {
      ommlAlternateContentConflictCount += ommlAcHits;
      details.push(
        `[DEFECT] ${sf}: 发现 ${ommlAcHits} 处包裹 <a14:m> 的 <mc:AlternateContent>（会导致 WPS 叠画重影或空白）`
      );
    }

    ommlFormulaCount += countMatches(xml, /<a14:m\b[^>]*>/g);
    custGeomCount += countMatches(xml, /<a:custGeom\b[^>]*>/g);
  }

  for (const cf of chartFiles) {
    const cxml = await zip.file(cf)!.async('string');

    const chartJoiners = countMatches(cxml, /\u2060/g);
    if (chartJoiners > 0) {
      leakedWordJoinerCount += chartJoiners;
      details.push(`[DEFECT] ${cf}: 发现 ${chartJoiners} 处泄漏的 U+2060 Word Joiner`);
    }

    if (chartHasBareGeneralFormat(cxml)) {
      bareGeneralChartCount += 1;
      details.push(`[DEFECT] ${cf}: <c:dLbls> 或 <c:valAx> 中存在裸 formatCode="General"`);
    }

    // 检查所有 <c:ser> 的 <c:idx val="..."/> 是否存在重复（常见于 Combo 图复用同一 data 引用导致的 COM 崩溃）
    const seenSerIdx = new Set<string>();
    const serBlocks = cxml.match(/<c:ser\b[^>]*>[\s\S]*?<\/c:ser>/g) ?? [];
    for (const serXml of serBlocks) {
      const idxMatch = serXml.match(/<c:idx\b[^>]*\bval="(\d+)"/);
      if (idxMatch) {
        const idxVal = idxMatch[1];
        if (seenSerIdx.has(idxVal)) {
          duplicateSeriesIdxCount += 1;
          details.push(`[DEFECT] ${cf}: 存在重复的系列 <c:idx val="${idxVal}"/>`);
        } else {
          seenSerIdx.add(idxVal);
        }
      }
    }
  }

  if (slideFiles.length === 0) {
    details.push('[DEFECT] PPTX 中未包含任何 ppt/slides/slide*.xml');
  }

  const passed =
    slideFiles.length > 0 &&
    leakedWordJoinerCount === 0 &&
    zeroWidthBlackLineCount === 0 &&
    fakeTableVertBorderCount === 0 &&
    ommlAlternateContentConflictCount === 0 &&
    bareGeneralChartCount === 0 &&
    duplicateSeriesIdxCount === 0;

  details.push(
    `[SUMMARY] slides=${slideFiles.length}, charts=${chartFiles.length}, omml=${ommlFormulaCount}, custGeom=${custGeomCount}, passed=${passed}`
  );

  return {
    pptxPath: absPath,
    slideCount: slideFiles.length,
    leakedWordJoinerCount,
    zeroWidthBlackLineCount,
    fakeTableVertBorderCount,
    ommlFormulaCount,
    ommlAlternateContentConflictCount,
    custGeomCount,
    chartCount: chartFiles.length,
    bareGeneralChartCount,
    duplicateSeriesIdxCount,
    passed,
    details,
  };
}

function findPowerPointExecutable(): string | null {
  if (process.platform !== 'win32') {
    return null;
  }
  const candidates = [
    process.env.POWERPNT_PATH,
    'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    'C:\\Program Files\\Microsoft Office\\Office16\\POWERPNT.EXE',
    'C:\\Program Files (x86)\\Microsoft Office\\Office16\\POWERPNT.EXE',
    'C:\\Program Files\\Microsoft Office\\root\\Office15\\POWERPNT.EXE',
    'C:\\Program Files (x86)\\Microsoft Office\\Office15\\POWERPNT.EXE',
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function findBinaryInPath(binName: string): string | null {
  const probeCmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const out = execFileSync(probeCmd, [binName], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    const firstLine = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    return firstLine && fs.existsSync(firstLine) ? firstLine : null;
  } catch {
    return null;
  }
}

function findSofficeExecutable(): string | null {
  const candidates = [
    process.env.SOFFICE_PATH,
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return findBinaryInPath('soffice');
}

function listSortedSlidePngs(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const pngs = fs.readdirSync(dirPath).filter((name) => /\.png$/i.test(name));
  pngs.sort((a, b) => {
    const na = a.match(/(\d+)\.png$/i);
    const nb = b.match(/(\d+)\.png$/i);
    if (na && nb) {
      return Number(na[1]) - Number(nb[1]);
    }
    return a.localeCompare(b, 'en');
  });
  return pngs.map((name) => path.join(dirPath, name));
}

function escapePsSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

function cleanStaleSlidePngs(outDir: string): void {
  if (!fs.existsSync(outDir)) return;
  for (const file of fs.readdirSync(outDir)) {
    if (/^(?:幻灯片|Slide|slide[-_]?)\d+\.png$/i.test(file)) {
      fs.unlinkSync(path.join(outDir, file));
    }
  }
}

/**
 * 通过本机 PowerPoint COM 静默导出逐页 PNG（跨平台降级至 soffice，无渲染器时返回空数组）
 */
export async function exportPptxSlidesViaPowerPoint(
  pptxPath: string,
  outDir: string,
  widthPx = 1280,
  heightPx = 720
): Promise<string[]> {
  const absSrc = path.resolve(pptxPath);
  const absOutDir = path.resolve(outDir);

  if (!fs.existsSync(absSrc)) {
    return [];
  }

  const w = Math.max(160, Math.round(widthPx));
  const h = Math.max(90, Math.round(heightPx));

  const powerPointExe = findPowerPointExecutable();
  if (powerPointExe) {
    fs.mkdirSync(absOutDir, { recursive: true });
    cleanStaleSlidePngs(absOutDir);

    const ps1Path = path.join(
      os.tmpdir(),
      `artistic-ppt-export-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ps1`
    );

    const psScript = [
      `$src = '${escapePsSingleQuoted(absSrc)}'`,
      `$dst = '${escapePsSingleQuoted(absOutDir)}'`,
      '$ppt = New-Object -ComObject PowerPoint.Application',
      '$pres = $null',
      'try {',
      '  $pres = $ppt.Presentations.Open($src, -1, 0, 0)',
      `  $pres.Export($dst, "PNG", ${w}, ${h})`,
      '} finally {',
      '  if ($null -ne $pres) {',
      '    try { $pres.Close() } catch {}',
      '    [Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null',
      '  }',
      '  $ppt.Quit()',
      '  [Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null',
      '}',
    ].join('\r\n');

    // 写入 UTF-8 BOM 确保中文 Windows PowerShell 5.1 正确解析含中文的文件路径
    fs.writeFileSync(ps1Path, `\uFEFF${psScript}`, 'utf8');

    try {
      execFileSync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path],
        { timeout: 60000, stdio: 'pipe' }
      );
      return listSortedSlidePngs(absOutDir);
    } finally {
      if (fs.existsSync(ps1Path)) {
        fs.unlinkSync(ps1Path);
      }
    }
  }

  const sofficeExe = findSofficeExecutable();
  if (!sofficeExe) {
    return [];
  }

  fs.mkdirSync(absOutDir, { recursive: true });
  cleanStaleSlidePngs(absOutDir);

  const pdftoppmExe = findBinaryInPath('pdftoppm');
  if (pdftoppmExe) {
    const tmpPdfDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artistic-ppt-pdf-'));
    try {
      execFileSync(
        sofficeExe,
        ['--headless', '--convert-to', 'pdf', '--outdir', tmpPdfDir, absSrc],
        { timeout: 60000, stdio: 'pipe' }
      );
      const pdfFile = fs.readdirSync(tmpPdfDir).find((f) => /\.pdf$/i.test(f));
      if (!pdfFile) {
        return [];
      }
      execFileSync(
        pdftoppmExe,
        ['-png', '-scale-to-x', String(w), '-scale-to-y', String(h), path.join(tmpPdfDir, pdfFile), path.join(absOutDir, 'Slide')],
        { timeout: 60000, stdio: 'pipe' }
      );
      return listSortedSlidePngs(absOutDir);
    } catch {
      return [];
    } finally {
      fs.rmSync(tmpPdfDir, { recursive: true, force: true });
    }
  }

  try {
    execFileSync(
      sofficeExe,
      ['--headless', '--convert-to', 'png', '--outdir', absOutDir, absSrc],
      { timeout: 60000, stdio: 'pipe' }
    );
    return listSortedSlidePngs(absOutDir);
  } catch {
    return [];
  }
}
