/**
 * OpenXML 原生平滑切换 (p159:morph)、原生图表美化与原生 OMML 公式双轨封装引擎 v4.0
 * 自动审计原生文本 (<a:t>)、原生三线表 (<a:tbl>)、原生可编辑统计图表 (ppt/charts/chart*.xml)、
 * 原生矢量形状 (<p:sp> / <a:custGeom>)、原生可编辑公式 (<a14:m>/<m:oMath>)、
 * 动态真图视窗 (!!cinema-bg) 及跨页平滑变形匹配链。
 */
import JSZip from 'jszip';
import type { SlideDeckIR } from '../types/ir.js';
import { enhanceChartXml, type ChartEnhancementMeta } from './chart-xml-enhancer.js';
import { buildNativeOmmlShapeXml } from './math-to-omml.js';

export interface OmmlReplacementSpec {
  objectName: string;
  ommlParaXml: string;
  align: 'l' | 'ctr' | 'r';
}

export interface MorphInjectorOptions {
  chartMetas?: ChartEnhancementMeta[];
  ommlReplacements?: Map<number, OmmlReplacementSpec[]>;
}

export interface PptxAuditSummary {
  slideCount: number;
  nativeTextNodesCount: number;
  nativeTablesCount: number;
  nativeChartsCount: number;
  nativeShapesCount: number;
  nativeOmmlCount: number;
  nativeCustGeomCount: number;
  dynamicArtPortalsCount: number;
  morphSlidesInjected: number[];
  matchedMorphPairs: Array<{ slideFrom: number; slideTo: number; sharedNames: string[] }>;
}

function buildMorphTransitionXml(durationMs = 1050): string {
  const dur = Math.max(750, Math.min(1600, Math.round(durationMs)));
  return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159"><p:transition spd="med" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="${dur}"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="med"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>`;
}

function buildFadeTransitionXml(durationMs = 620): string {
  const dur = Math.max(400, Math.min(1000, Math.round(durationMs)));
  return `<p:transition spd="med" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="${dur}"><p:fade/></p:transition>`;
}

function injectTransitionIntoSlideXml(xml: string, transitionBlock: string): string {
  let cleaned = xml.replace(/<p:transition\b[^>]*\/>/g, '');
  cleaned = cleaned.replace(/<p:transition\b[^>]*>[\s\S]*?<\/p:transition>/g, '');

  const timingIdx = cleaned.indexOf('<p:timing');
  const extIdx = cleaned.indexOf('<p:extLst');
  const endSldIdx = cleaned.lastIndexOf('</p:sld>');

  let insertPos = endSldIdx;
  if (timingIdx !== -1 && timingIdx < insertPos) insertPos = timingIdx;
  else if (extIdx !== -1 && extIdx < insertPos) insertPos = extIdx;

  if (insertPos === -1) return cleaned;
  return cleaned.slice(0, insertPos) + transitionBlock + cleaned.slice(insertPos);
}

function extractBangObjectNames(slideXml: string): Set<string> {
  const names = new Set<string>();
  const regex = /<p:(?:cNvPr)\b[^>]*\bname="(!![^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(slideXml)) !== null) {
    names.add(m[1]);
  }
  return names;
}

function ensureSlideMathNamespaces(slideXml: string): string {
  return slideXml.replace(/<p:sld\b([^>]*)>/, (_full, attrs: string) => {
    let updated = attrs;
    if (!/\bxmlns:mc=/.test(updated)) {
      updated += ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';
    }
    if (!/\bxmlns:a14=/.test(updated)) {
      updated += ' xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"';
    }
    if (!/\bxmlns:m=/.test(updated)) {
      updated += ' xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
    }
    return `<p:sld${updated}>`;
  });
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureCjkKinsokuProps(slideXml: string): string {
  // 仅对幻灯片普通文本框 <a:pPr ...> 启用中文避头尾断行与标点悬挂，提升 PowerPoint 折行与 HTML 的一致性
  return slideXml.replace(/<a:pPr\b([^>]*?)(\/?)>/g, (full, attrs: string, selfClose: string) => {
    if (/\beaLnBrk=/.test(attrs)) return full;
    return `<a:pPr${attrs} eaLnBrk="1" hangingPunct="1"${selfClose}>`;
  });
}

function replaceFormulaPicsWithOmml(
  slideXml: string,
  specs: OmmlReplacementSpec[]
): string {
  if (!specs || specs.length === 0) return slideXml;
  let xml = ensureSlideMathNamespaces(slideXml);

  specs.forEach((spec, idx) => {
    const escapedName = escapeRegExp(spec.objectName);
    const spRegex = new RegExp(
      `<p:sp>(?:(?!<\\/p:sp>)[\\s\\S])*?name="${escapedName}"[\\s\\S]*?<\\/p:sp>`
    );
    const picRegex = new RegExp(
      `<p:pic>(?:(?!<\\/p:pic>)[\\s\\S])*?name="${escapedName}"[\\s\\S]*?<\\/p:pic>`
    );
    const match = spRegex.exec(xml) ?? picRegex.exec(xml);
    if (!match) return;

    const targetXml = match[0];
    const idMatch = targetXml.match(/<p:cNvPr\b[^>]*\bid="(\d+)"/);
    const offMatch = targetXml.match(/<a:off\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"/);
    const extMatch = targetXml.match(/<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    if (!idMatch || !offMatch || !extMatch) return;

    const shapeId = Number(idMatch[1]);
    const xEmu = Number(offMatch[1]);
    const yEmu = Number(offMatch[2]);
    const cxEmu = Number(extMatch[1]);
    const cyEmu = Number(extMatch[2]);

    const nativeShapeXml = buildNativeOmmlShapeXml({
      shapeId,
      name: `Native Formula ${idx + 1}`,
      xEmu,
      yEmu,
      cxEmu,
      cyEmu,
      ommlParaXml: spec.ommlParaXml,
      align: spec.align,
    });

    xml = xml.slice(0, match.index) + nativeShapeXml + xml.slice(match.index + targetXml.length);
  });

  return xml;
}

export async function injectMorphTransitionsAndAudit(
  pptxBuffer: Buffer,
  deck: SlideDeckIR,
  durationMs = 1050,
  options: MorphInjectorOptions = {}
): Promise<{ buffer: Buffer; audit: PptxAuditSummary }> {
  const zip = await JSZip.loadAsync(pptxBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)![1]);
      const nb = Number(b.match(/slide(\d+)\.xml/)![1]);
      return na - nb;
    });

  const chartFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/chart(\d+)\.xml/)![1]);
      const nb = Number(b.match(/chart(\d+)\.xml/)![1]);
      return na - nb;
    });

  // 1. 增强原生图表 OpenXML（面积渐变、折线空心圆点、Combo 去重图例、极简轴线）
  if (options.chartMetas && options.chartMetas.length > 0) {
    for (let ci = 0; ci < chartFiles.length; ci++) {
      const meta = options.chartMetas[ci];
      if (!meta) continue;
      const cxml = await zip.file(chartFiles[ci])!.async('string');
      zip.file(chartFiles[ci], enhanceChartXml(cxml, meta));
    }
  }

  // 2. 逐页注入原生 OMML 公式、Morph 转场并统计全量原生对象
  const slideXmls: string[] = [];
  const bangSets: Set<string>[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    let xml = await zip.file(slideFiles[i])!.async('string');
    if (deck.meta.locale !== 'en-US') {
      xml = ensureCjkKinsokuProps(xml);
    }
    const ommlSpecs = options.ommlReplacements?.get(i);
    if (ommlSpecs && ommlSpecs.length > 0) {
      xml = replaceFormulaPicsWithOmml(xml, ommlSpecs);
    }
    slideXmls.push(xml);
    bangSets.push(extractBangObjectNames(xml));
  }

  let nativeTextNodesCount = 0;
  let nativeTablesCount = 0;
  let nativeShapesCount = 0;
  let nativeOmmlCount = 0;
  let nativeCustGeomCount = 0;
  let dynamicArtPortalsCount = 0;

  const morphSlidesInjected: number[] = [];
  const matchedMorphPairs: PptxAuditSummary['matchedMorphPairs'] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const irSlide = deck.slides[i];
    const requested = irSlide?.transition;
    let sharedWithPrev: string[] = [];

    if (i > 0) {
      const prevNames = bangSets[i - 1];
      const currNames = bangSets[i];
      sharedWithPrev = Array.from(currNames).filter((n) => prevNames.has(n));
    }

    const shouldMorph =
      i > 0 &&
      (sharedWithPrev.length > 0 ||
        requested === 'morph' ||
        requested === 'parallax' ||
        requested === 'portal');

    let updatedXml = slideXmls[i];
    if (shouldMorph) {
      updatedXml = injectTransitionIntoSlideXml(
        updatedXml,
        buildMorphTransitionXml(Math.max(980, durationMs))
      );
      morphSlidesInjected.push(i + 1);
      if (sharedWithPrev.length > 0) {
        matchedMorphPairs.push({
          slideFrom: i,
          slideTo: i + 1,
          sharedNames: sharedWithPrev,
        });
      }
    } else if (i > 0) {
      updatedXml = injectTransitionIntoSlideXml(
        updatedXml,
        buildFadeTransitionXml(600)
      );
    }

    const textMatches = updatedXml.match(/<a:t\b[^>]*>/g);
    if (textMatches) nativeTextNodesCount += textMatches.length;
    const tableMatches = updatedXml.match(/<a:tbl\b[^>]*>/g);
    if (tableMatches) nativeTablesCount += tableMatches.length;
    const spMatches = updatedXml.match(/<p:sp\b[^>]*>/g);
    if (spMatches) nativeShapesCount += spMatches.length;
    const ommlMatches = updatedXml.match(/<a14:m\b[^>]*>/g);
    if (ommlMatches) nativeOmmlCount += ommlMatches.length;
    const custGeomMatches = updatedXml.match(/<a:custGeom\b[^>]*>/g);
    if (custGeomMatches) nativeCustGeomCount += custGeomMatches.length;
    const picBangMatches = updatedXml.match(/<p:pic>[\s\S]*?name="!![^"]+"/g);
    if (picBangMatches) dynamicArtPortalsCount += picBangMatches.length;

    zip.file(slideFiles[i], updatedXml);
  }

  const outBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    buffer: outBuffer,
    audit: {
      slideCount: slideFiles.length,
      nativeTextNodesCount,
      nativeTablesCount,
      nativeChartsCount: chartFiles.length,
      nativeShapesCount,
      nativeOmmlCount,
      nativeCustGeomCount,
      dynamicArtPortalsCount,
      morphSlidesInjected,
      matchedMorphPairs,
    },
  };
}
