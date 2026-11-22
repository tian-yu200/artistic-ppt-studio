/**
 * Chart OpenXML 视觉增强引擎 (Chart OpenXML Enhancer)
 * 负责对 PptxGenJS 生成的原生 ppt/charts/chart*.xml 进行工业级精细美化：
 * 1. 面积图垂直淡出渐变填充 (<a:gradFill>) 并剥离多余边框；
 * 2. 折线图与 Combo 折线层空心圆环标记点 (背景色实心内圆 + 系列色外框)；
 * 3. Combo 面积+折线图自动注入 <c:legendEntry><c:delete val="1"/></c:legendEntry> 防重复图例；
 * 4. 极简坐标轴边框线与隐藏主刻度线，对齐 Web Cinema 视觉质感。
 */
import type { ChartSpec } from '../types/ir.js';

export interface ChartEnhancementMeta {
  chartType: ChartSpec['type'];
  bgPrimaryHex: string;
  borderHex: string;
  seriesColors: string[];
  seriesCount: number;
  isComboAreaLine: boolean;
}

function normalizeHex(hex: string | undefined, fallback: string): string {
  if (!hex) return fallback;
  const cleaned = hex.trim().replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(cleaned) ? cleaned : fallback;
}

function extractFirstHexColor(xml: string): string | undefined {
  const match = xml.match(/<a:srgbClr\b[^>]*\bval="([0-9A-Fa-f]{6})"/);
  return match?.[1]?.toUpperCase();
}

function resolveSeriesHex(
  serXml: string,
  fallbackIndex: number,
  meta: ChartEnhancementMeta,
  useModulo: boolean
): string {
  const idxMatch = serXml.match(/<c:idx\b[^>]*\bval="(\d+)"/);
  const idx = idxMatch ? Number(idxMatch[1]) : fallbackIndex;

  if (meta.seriesColors.length > 0) {
    const divisor = meta.seriesCount > 0 ? meta.seriesCount : meta.seriesColors.length;
    const mappedIdx = useModulo && divisor > 0 ? idx % divisor : idx;
    const candidate =
      meta.seriesColors[mappedIdx] ??
      meta.seriesColors[mappedIdx % meta.seriesColors.length];
    if (candidate) {
      return normalizeHex(candidate, '2563EB');
    }
  }

  return normalizeHex(extractFirstHexColor(serXml), '2563EB');
}

function buildAreaGradientFillXml(hex: string): string {
  return (
    `<a:gradFill rotWithShape="1"><a:gsLst>` +
    `<a:gs pos="0"><a:srgbClr val="${hex}"><a:alpha val="36000"/></a:srgbClr></a:gs>` +
    `<a:gs pos="100000"><a:srgbClr val="${hex}"><a:alpha val="2500"/></a:srgbClr></a:gs>` +
    `</a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`
  );
}

function buildHollowMarkerSpPrXml(bgHex: string, serHex: string): string {
  return (
    `<c:spPr>` +
    `<a:solidFill><a:srgbClr val="${bgHex}"/></a:solidFill>` +
    `<a:ln w="25400" cap="flat"><a:solidFill><a:srgbClr val="${serHex}"/></a:solidFill><a:prstDash val="solid"/><a:round/></a:ln>` +
    `<a:effectLst/>` +
    `</c:spPr>`
  );
}

/**
 * 仅处理 <c:ser> 顶层的 <c:spPr>，避免误伤 <c:dLbls> 或 <c:dPt> 内部的 <c:spPr>
 */
function enhanceAreaSeriesBlock(
  serXml: string,
  seriesIdxFallback: number,
  meta: ChartEnhancementMeta
): string {
  const hex = resolveSeriesHex(serXml, seriesIdxFallback, meta, meta.isComboAreaLine);
  const gradFillXml = buildAreaGradientFillXml(hex);

  // 定位系列主体子标签边界，确保只替换直属于 <c:ser> 的第一个 <c:spPr>
  const bodyBoundaryMatch = serXml.match(/<(?:c:invertIfNegative|c:dLbls|c:dPt|c:cat|c:val)\b/);
  const splitPos = bodyBoundaryMatch?.index ?? serXml.length;
  const headerPart = serXml.slice(0, splitPos);
  const bodyPart = serXml.slice(splitPos);

  const spPrRegex = /<c:spPr\b[^>]*>[\s\S]*?<\/c:spPr>/;
  if (!spPrRegex.test(headerPart)) {
    const newSpPr = `<c:spPr>${gradFillXml}<a:ln><a:noFill/></a:ln><a:effectLst/></c:spPr>`;
    return headerPart + newSpPr + bodyPart;
  }

  const updatedHeader = headerPart.replace(spPrRegex, (spPrXml) => {
    let next = spPrXml;

    if (/<a:solidFill\b[^>]*>[\s\S]*?<\/a:solidFill>/.test(next)) {
      next = next.replace(/<a:solidFill\b[^>]*>[\s\S]*?<\/a:solidFill>/, gradFillXml);
    } else if (/<a:gradFill\b[^>]*>[\s\S]*?<\/a:gradFill>/.test(next)) {
      next = next.replace(/<a:gradFill\b[^>]*>[\s\S]*?<\/a:gradFill>/, gradFillXml);
    } else if (/<a:noFill\s*\/>/.test(next)) {
      next = next.replace(/<a:noFill\s*\/>/, gradFillXml);
    } else {
      next = next.replace(/^<c:spPr\b[^>]*>/, (openTag) => `${openTag}${gradFillXml}`);
    }

    // 去除面积图系列残留边框（显式设为 <a:ln><a:noFill/></a:ln> 以覆盖主题默认描边）
    next = next.replace(/<a:ln\b[^>]*>[\s\S]*?<\/a:ln>/g, '');
    next = next.replace(/<a:ln\b[^>]*\/>/g, '');
    if (/<a:effectLst\b/.test(next)) {
      next = next.replace(/<a:effectLst\b/, '<a:ln><a:noFill/></a:ln><a:effectLst');
    } else {
      next = next.replace(/<\/c:spPr>$/, '<a:ln><a:noFill/></a:ln></c:spPr>');
    }

    return next;
  });

  return updatedHeader + bodyPart;
}

function enhanceAreaChartBlocks(chartXml: string, meta: ChartEnhancementMeta): string {
  return chartXml.replace(/<c:areaChart\b[^>]*>[\s\S]*?<\/c:areaChart>/g, (areaBlock) => {
    let idxCounter = 0;
    return areaBlock.replace(/<c:ser\b[^>]*>[\s\S]*?<\/c:ser>/g, (serXml) => {
      const enhanced = enhanceAreaSeriesBlock(serXml, idxCounter, meta);
      idxCounter++;
      return enhanced;
    });
  });
}

function enhanceLineSeriesBlock(
  serXml: string,
  seriesIdxFallback: number,
  meta: ChartEnhancementMeta
): string {
  const serHex = resolveSeriesHex(serXml, seriesIdxFallback, meta, meta.isComboAreaLine);
  const bgHex = normalizeHex(meta.bgPrimaryHex, 'FFFFFF');
  const hollowSpPr = buildHollowMarkerSpPrXml(bgHex, serHex);

  const markerRegex = /<c:marker\b[^>]*>[\s\S]*?<\/c:marker>/;
  if (markerRegex.test(serXml)) {
    return serXml.replace(markerRegex, (markerXml) => {
      if (/<c:symbol\b[^>]*\bval="none"/.test(markerXml)) {
        return markerXml;
      }
      if (/<c:spPr\b[^>]*>[\s\S]*?<\/c:spPr>/.test(markerXml)) {
        return markerXml.replace(/<c:spPr\b[^>]*>[\s\S]*?<\/c:spPr>/, hollowSpPr);
      }
      return markerXml.replace(/<\/c:marker>$/, `${hollowSpPr}</c:marker>`);
    });
  }

  // 若原始 XML 未生成 <c:marker>，在 <c:cat> 或 <c:val> 之前补齐空心圆点标记
  const fallbackMarker = `<c:marker><c:symbol val="circle"/><c:size val="6"/>${hollowSpPr}</c:marker>`;
  if (/<c:cat\b/.test(serXml)) {
    return serXml.replace(/<c:cat\b/, `${fallbackMarker}<c:cat`);
  }
  if (/<c:val\b/.test(serXml)) {
    return serXml.replace(/<c:val\b/, `${fallbackMarker}<c:val`);
  }
  return serXml;
}

function enhanceLineChartBlocks(chartXml: string, meta: ChartEnhancementMeta): string {
  return chartXml.replace(/<c:lineChart\b[^>]*>[\s\S]*?<\/c:lineChart>/g, (lineBlock) => {
    let idxCounter = 0;
    return lineBlock.replace(/<c:ser\b[^>]*>[\s\S]*?<\/c:ser>/g, (serXml) => {
      const enhanced = enhanceLineSeriesBlock(serXml, idxCounter, meta);
      idxCounter++;
      return enhanced;
    });
  });
}

function injectComboLegendEntries(chartXml: string, meta: ChartEnhancementMeta): string {
  if (!meta.isComboAreaLine || meta.seriesCount <= 0) {
    return chartXml;
  }

  return chartXml.replace(/<c:legend\b[^>]*>[\s\S]*?<\/c:legend>/, (legendXml) => {
    const existingDeletedIndices = new Set<number>();
    const existingEntryRegex = /<c:legendEntry\b[^>]*>[\s\S]*?<c:idx\b[^>]*\bval="(\d+)"[\s\S]*?<\/c:legendEntry>/g;
    let m: RegExpExecArray | null;
    while ((m = existingEntryRegex.exec(legendXml)) !== null) {
      existingDeletedIndices.add(Number(m[1]));
    }

    let injectedEntries = '';
    for (let i = 0; i < meta.seriesCount; i++) {
      if (!existingDeletedIndices.has(i)) {
        injectedEntries += `<c:legendEntry><c:idx val="${i}"/><c:delete val="1"/></c:legendEntry>`;
      }
    }

    if (!injectedEntries) {
      return legendXml;
    }

    if (/<c:legendPos\b[^>]*\/>/.test(legendXml)) {
      return legendXml.replace(/(<c:legendPos\b[^>]*\/>)/, `$1${injectedEntries}`);
    }
    if (/<c:legendPos\b[^>]*>[\s\S]*?<\/c:legendPos>/.test(legendXml)) {
      return legendXml.replace(/(<c:legendPos\b[^>]*>[\s\S]*?<\/c:legendPos>)/, `$1${injectedEntries}`);
    }
    return legendXml.replace(/^(<c:legend\b[^>]*>)/, `$1${injectedEntries}`);
  });
}

function cleanChartAxes(chartXml: string, meta: ChartEnhancementMeta): string {
  const borderHex = normalizeHex(meta.borderHex, 'CBD5E1');
  const cleanAxisLn =
    `<a:ln w="9525" cap="flat"><a:solidFill><a:srgbClr val="${borderHex}"/></a:solidFill>` +
    `<a:prstDash val="solid"/><a:round/></a:ln>`;

  return chartXml.replace(/<c:(catAx|valAx|dateAx)\b[^>]*>[\s\S]*?<\/c:\1>/g, (axisXml) => {
    // 临时屏蔽网格线与轴标题内的 <c:spPr>，防止误改虚线网格样式
    const preservedBlocks: string[] = [];
    let masked = axisXml.replace(
      /<c:(?:majorGridlines|minorGridlines|title)\b[^>]*>[\s\S]*?<\/c:(?:majorGridlines|minorGridlines|title)>/g,
      (block) => {
        const token = `__PRESERVED_AXIS_CHILD_${preservedBlocks.length}__`;
        preservedBlocks.push(block);
        return token;
      }
    );

    masked = masked.replace(
      /<c:majorTickMark\b[^>]*\/>|<c:majorTickMark\b[^>]*>[\s\S]*?<\/c:majorTickMark>/g,
      '<c:majorTickMark val="none"/>'
    );

    masked = masked.replace(/<c:spPr\b[^>]*>[\s\S]*?<\/c:spPr>/g, (spPrXml) => {
      if (/<a:ln\b[^>]*>[\s\S]*?<a:noFill\s*\/>[\s\S]*?<\/a:ln>/.test(spPrXml)) {
        return spPrXml;
      }
      if (/<a:ln\b[^>]*>[\s\S]*?<\/a:ln>/.test(spPrXml)) {
        return spPrXml.replace(/<a:ln\b[^>]*>[\s\S]*?<\/a:ln>/, cleanAxisLn);
      }
      if (/<a:ln\b[^>]*\/>/.test(spPrXml)) {
        return spPrXml.replace(/<a:ln\b[^>]*\/>/, cleanAxisLn);
      }
      return spPrXml.replace(/<\/c:spPr>$/, `${cleanAxisLn}</c:spPr>`);
    });

    return masked.replace(/__PRESERVED_AXIS_CHILD_(\d+)__/g, (_, idxStr) => preservedBlocks[Number(idxStr)] ?? '');
  });
}

/**
 * 增强 PptxGenJS 生成的原生 OpenXML 图表 XML
 */
export function enhanceChartXml(chartXml: string, meta: ChartEnhancementMeta): string {
  let result = chartXml;
  result = enhanceAreaChartBlocks(result, meta);
  result = enhanceLineChartBlocks(result, meta);
  result = injectComboLegendEntries(result, meta);
  result = cleanChartAxes(result, meta);
  return result;
}
