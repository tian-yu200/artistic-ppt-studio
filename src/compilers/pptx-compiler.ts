/**
 * 轨道 B：真·全栈原生可编辑 PPTX v4.0 编译器 (100% Full-Stack Native OpenXML Engine)
 * 全面对齐 Web Cinema HTML 视觉特性与排版精度：
 * 1. 修复公式图层黑底陷阱 + 注入原生可编辑 Office Math (<a14:m>/<m:oMath>) + 透明 PNG <mc:Fallback>；
 * 2. 修复 PptxGenJS line:{width:0} 黑框与假三线表竖线，实现真·顶刊三线表与富文本单元格；
 * 3. 修复 pxToPt (严格 0.5x)、<br/> 换行丢失、行内 $...$ 拆行、右对齐偏移、跨栏碰撞及中文避头尾断行 (lang="zh-CN" + eaLnBrk)；
 * 4. 全量原生还原：贝塞尔曲线拓扑边、精确节点卡片子元素、SVG 矢量图标 (custGeom)、时间轴圆点、代码行高亮、
 *    Viewfinder 衬底、区块分割线、阴影纵深与 Combo 渐变面积/空心折线/精准居中环形图。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import pptxgenPkg from 'pptxgenjs';
import type { ChartSpec, SlideDeckIR, StylePack } from '../types/ir.js';
import { getStylePack } from '../styles/index.js';
import { acquireBrowser, createFastHeadlessContext } from '../utils/browser.js';
import { isDarkColor, mixColors, toPptxFill, toPptxHex } from '../utils/color.js';
import {
  buildExcelNumFmt,
  formatMetricWithUnit,
  stripRichMarkers,
  stripWordJoiners,
} from '../utils/typography.js';
import { compileDeckToHtml, type HtmlCompileOptions } from './html-compiler.js';
import { addCubicBezierEdgeToSlide, addSvgIconToSlide } from './svg-to-pptx.js';
import { latexToOmmlXml, latexToStyledInlineRuns } from './math-to-omml.js';
import type { ChartEnhancementMeta } from './chart-xml-enhancer.js';
import {
  injectMorphTransitionsAndAudit,
  type OmmlReplacementSpec,
  type PptxAuditSummary,
} from './morph-injector.js';

const PptxGenJS: any = (pptxgenPkg as any).default || pptxgenPkg;

const STAGE_W = 1920;
const STAGE_H = 1080;
const PPT_W_IN = 13.333;
const PPT_H_IN = 7.5;
const EMU_PER_IN = 914400;

const pxToInX = (px: number) => Number(((px / STAGE_W) * PPT_W_IN).toFixed(4));
const pxToInY = (py: number) => Number(((py / STAGE_H) * PPT_H_IN).toFixed(4));
const pxToPt = (px: number) => Math.max(6, Number((px * 0.5).toFixed(1)));
const NO_LINE = { type: 'none' as const };

export interface PptxCompileResult {
  pptxPath: string;
  audit: PptxAuditSummary;
}

type ExtractedInlinePart =
  | {
      kind: 'text';
      text: string;
      highlight: boolean;
      bold: boolean;
      italic?: boolean;
      fontSizePx?: number;
      colorCss?: string;
    }
  | { kind: 'break' }
  | { kind: 'latex'; latex: string; highlight: boolean; bold: boolean };

interface ExtractedTextNode {
  morphId: string | null;
  role: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minLeftPx: number;
  maxRightPx: number;
  fontSizePx: number;
  fontWeight: number;
  colorCss: string;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  lineHeightPx: number;
  letterSpacingPx: number;
  isMono: boolean;
  isSerifTitle: boolean;
  isVertical: boolean;
  isAsciiVertical: boolean;
  isSingleLine: boolean;
  preserveWhitespace: boolean;
  parts: ExtractedInlinePart[];
  codeLines?: Array<{ text: string; highlight: boolean }>;
}

interface ExtractedDynamicPortal {
  domIndex: number;
  morphId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isFullBleed: boolean;
}

interface ExtractedMorphBox {
  morphId: string;
  boxKind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bgCss: string;
  borderCss: string;
  borderLeftCss: string;
  borderLeftWidthPx: number;
}

interface ExtractedRuleLine {
  morphId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  bgCss: string;
}

interface ExtractedChronoDot {
  x: number;
  y: number;
  w: number;
  h: number;
  isActive: boolean;
}

interface ExtractedSvgIcon {
  iconName: string;
  x: number;
  y: number;
  w: number;
  h: number;
  colorCss: string;
  strokeWidth: number;
}

interface ExtractedCodeWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  bgCss: string;
  borderCss: string;
  barH: number;
  barBgCss: string;
  barBorderCss: string;
  dots: Array<{ x: number; y: number; w: number; h: number; bgCss: string }>;
  highlightBands: Array<{ x: number; y: number; w: number; h: number; bgCss: string }>;
  lines: Array<{ text: string; highlight: boolean }>;
}

interface ExtractedFormulaBox {
  domIndex: number;
  latex: string;
  displayMode: boolean;
  isFrame: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSizePx: number;
  colorCss: string;
  bgCss: string;
  borderColorCss: string;
  align: 'left' | 'center' | 'right';
}

interface ExtractedDiagramLane {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ExtractedDiagramEdge {
  x1: number;
  y1: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  x2: number;
  y2: number;
  isCurve: boolean;
  dashed: boolean;
  hasArrow: boolean;
}

interface ExtractedDiagramPill {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSizePx: number;
}

interface ExtractedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ExtractedDiagramNodeDetail {
  nodeIndex: number;
  card: ExtractedRect;
  bar: ExtractedRect | null;
  dot: ExtractedRect | null;
  divider: ExtractedRect | null;
  tag: (ExtractedRect & { text: string; fontSizePx: number }) | null;
  title: (ExtractedRect & { text: string; fontSizePx: number }) | null;
  subBg: ExtractedRect | null;
  sub: (ExtractedRect & { text: string; fontSizePx: number }) | null;
}

interface ExtractedQuadrantData {
  frame: ExtractedRect | null;
  hiZone: ExtractedRect | null;
  axes: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  leaders: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  points: Array<{ x: number; y: number; w: number; h: number; colorCss: string; isHero: boolean }>;
  labels: Array<{
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    align: 'left' | 'center' | 'right';
    fontSizePx: number;
    isHero: boolean;
    isMuted: boolean;
    isSec: boolean;
  }>;
}

interface ExtractedTableCell {
  runs: Array<{ kind: 'text' | 'latex'; text: string; highlight: boolean; bold: boolean }>;
  align: 'left' | 'center' | 'right';
  isHeader: boolean;
  isHighlightRow: boolean;
  isLastRow: boolean;
}

interface ExtractedTable {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSizePx: number;
  colWidthsPx: number[];
  rowHeightsPx: number[];
  rows: ExtractedTableCell[][];
}

function addNativeEditableChart(
  pres: any,
  pSlide: any,
  chart: ChartSpec,
  box: { x: number; y: number; w: number; h: number },
  style: StylePack,
  localeLang: string
): ChartEnhancementMeta {
  const bgPrimaryHex = toPptxHex(style.palette.bg_primary, '0F172A');
  const textPrimaryHex = toPptxHex(style.palette.text_primary, '0F172A');
  const textSecondaryHex = toPptxHex(style.palette.text_secondary, '475569');
  const borderHex = toPptxHex(style.palette.border_solid, 'CBD5E1');
  const accentHex = toPptxHex(style.palette.accent, '2563EB');

  const chartData = chart.series.map((s) => ({
    name: stripWordJoiners(s.name),
    labels: chart.categories.map((c) => stripWordJoiners(c)),
    values: [...s.values],
  }));

  const allVals = chart.series.flatMap((s) => s.values);
  const hasDecimals = allVals.some((v) => !Number.isInteger(v));
  const maxDec = allVals.some((v) => {
    if (Number.isInteger(v)) return false;
    const frac = String(v).split('.')[1] || '';
    return frac.length >= 2;
  })
    ? 2
    : 1;
  const maxAbsVal = allVals.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const dataNumFmt = buildExcelNumFmt(chart.unit, hasDecimals, false, maxDec);
  const axisNumFmt = buildExcelNumFmt(chart.unit, maxAbsVal > 0 && maxAbsVal < 2, true, 1);
  const paletteHexes = style.palette.chart_palette.map((c) => toPptxHex(c, accentHex));

  const isSingleSeriesBar =
    chart.series.length === 1 &&
    (chart.type === 'bar' || chart.type === 'horizontal-bar') &&
    chart.highlight_index !== undefined;

  const mutedBarHex = toPptxHex(
    mixColors(style.palette.accent, style.palette.bg_primary, 0.55),
    borderHex
  );

  const seriesColors =
    chart.series.length > 1
      ? chart.series.map((s, si) =>
          toPptxHex(
            s.color || style.palette.chart_palette[si % style.palette.chart_palette.length],
            accentHex
          )
        )
      : chart.type === 'donut'
      ? paletteHexes
      : isSingleSeriesBar
      ? chart.categories.map((_, ci) =>
          ci === chart.highlight_index ? accentHex : mutedBarHex
        )
      : [accentHex, ...paletteHexes];

  const isDonut = chart.type === 'donut';
  const isAreaCombo = chart.type === 'area';

  // 1. 面积图采用 Area + Line 双层 Combo 图，独立深拷贝 data 避免 PptxGenJS 覆写 _dataIndex 导致重复 <c:idx>
  if (isAreaCombo) {
    const areaData = chartData.map((s) => ({
      name: s.name,
      labels: [...s.labels],
      values: [...s.values],
    }));
    const lineData = chartData.map((s) => ({
      name: s.name,
      labels: [...s.labels],
      values: [...s.values],
    }));

    const comboTypes = [
      {
        type: pres.ChartType.area,
        data: areaData,
        options: {
          barGrouping: 'standard',
          chartColors: seriesColors.slice(0, chart.series.length),
          chartColorsOpacity: 28,
          showValue: false,
        },
      },
      {
        type: pres.ChartType.line,
        data: lineData,
        options: {
          chartColors: seriesColors.slice(0, chart.series.length),
          lineSize: 2.8,
          lineSmooth: false,
          lineDataSymbol: 'circle',
          lineDataSymbolSize: 6,
          showValue: chart.series.length === 1 || chart.categories.length <= 6,
          dataLabelPosition: 't',
          dataLabelFormatCode: dataNumFmt,
          dataLabelColor: textPrimaryHex,
          dataLabelFontFace: style.typography.pptx_font_mono,
          dataLabelFontSize: 9.5,
        },
      },
    ];

    pSlide.addChart(comboTypes, {
      x: pxToInX(box.x),
      y: pxToInY(box.y),
      w: pxToInX(box.w),
      h: pxToInY(box.h),
      showTitle: false,
      showLegend: chart.series.length > 1,
      legendPos: 't',
      legendColor: textPrimaryHex,
      legendFontFace: style.typography.pptx_font_body,
      legendFontSize: 10,
      dataLabelFormatCode: dataNumFmt,
      catAxisLabelColor: textPrimaryHex,
      catAxisLabelFontFace: style.typography.pptx_font_body,
      catAxisLabelFontSize: 9.5,
      valAxisLabelColor: textSecondaryHex,
      valAxisLabelFontFace: style.typography.pptx_font_mono,
      valAxisLabelFontSize: 9,
      valAxisLabelFormatCode: axisNumFmt,
      valGridLine: { color: borderHex, style: 'dash', size: 0.5 },
      catGridLine: { style: 'none' },
    });

    return {
      chartType: chart.type,
      bgPrimaryHex,
      borderHex,
      seriesColors: seriesColors.slice(0, chart.series.length),
      seriesCount: chart.series.length,
      isComboAreaLine: true,
    };
  }

  // 2. 环形图：左侧纯净环图 + 精确居中汇总大字，右侧还原 HTML 杂志级细线列表图例
  if (isDonut) {
    const donutAreaW = box.w * 0.52;
    const donutSize = Math.min(donutAreaW, box.h);
    const donutX = box.x + (donutAreaW - donutSize) / 2;
    const donutY = box.y + (box.h - donutSize) / 2;

    pSlide.addChart(pres.ChartType.doughnut, chartData, {
      x: pxToInX(donutX),
      y: pxToInY(donutY),
      w: pxToInX(donutSize),
      h: pxToInY(donutSize),
      chartColors: paletteHexes,
      holeSize: 62,
      showTitle: false,
      showLegend: false,
      showValue: false,
      showPercent: false,
      dataLabelFormatCode: dataNumFmt,
      valGridLine: { style: 'none' },
      catGridLine: { style: 'none' },
    });

    const vals = chart.series[0]?.values || [];
    const sum = vals.reduce((a, b) => a + b, 0);
    const totalStr = formatMetricWithUnit(
      Number.isInteger(sum) ? sum : Number(sum.toFixed(1)),
      chart.unit
    );
    const subStr = stripWordJoiners(chart.series[0]?.name || 'TOTAL');
    const centerW = Math.min(220, donutSize * 0.54);
    const centerH = 92;
    const donutCenterX = donutX + donutSize / 2 - centerW / 2;
    const donutCenterY = donutY + donutSize / 2 - centerH / 2;

    pSlide.addText(
      [
        {
          text: `${totalStr}`,
          options: {
            fontFace: style.typography.pptx_font_mono,
            fontSize: 19,
            bold: true,
            color: textPrimaryHex,
            lang: localeLang,
            breakLine: true,
          },
        },
        {
          text: subStr,
          options: {
            fontFace: style.typography.pptx_font_body,
            fontSize: 7.5,
            color: textSecondaryHex,
            lang: localeLang,
          },
        },
      ],
      {
        x: pxToInX(donutCenterX),
        y: pxToInY(donutCenterY),
        w: pxToInX(centerW),
        h: pxToInY(centerH),
        align: 'center',
        valign: 'middle',
        margin: 0,
      }
    );

    // 右侧还原 HTML 表格化高信噪比图例（色块 + 类名 + 数值百分比 + 细分隔线）
    const totalSafe = sum || 1;
    const legX = box.x + box.w * 0.55;
    const legW = box.w * 0.43;
    const catCount = Math.max(chart.categories.length, 1);
    const rowStep = Math.min(58, (box.h - 40) / catCount);
    const startY = box.y + (box.h - catCount * rowStep) / 2;
    const dividerFill = toPptxFill(mixColors(style.palette.text_primary, style.palette.bg_primary, 0.88), borderHex);

    chart.categories.forEach((cat, i) => {
      const val = vals[i] ?? 0;
      const pct = Math.round((val / totalSafe) * 100);
      const valStr = formatMetricWithUnit(val, chart.unit);
      const colHex = paletteHexes[i % paletteHexes.length];
      const ry = startY + i * rowStep;

      pSlide.addShape(pres.ShapeType.roundRect, {
        x: pxToInX(legX),
        y: pxToInY(ry + 6),
        w: pxToInX(14),
        h: pxToInY(14),
        rectRadius: 0.02,
        fill: { color: colHex },
        line: NO_LINE,
      });

      pSlide.addText(stripWordJoiners(cat), {
        x: pxToInX(legX + 24),
        y: pxToInY(ry),
        w: pxToInX(legW * 0.56),
        h: pxToInY(28),
        align: 'left',
        valign: 'middle',
        fontFace: style.typography.pptx_font_body,
        fontSize: 8.5,
        bold: true,
        color: textPrimaryHex,
        lang: localeLang,
        margin: 0,
      });

      pSlide.addText(`${valStr} (${pct}%)`, {
        x: pxToInX(legX + legW * 0.56),
        y: pxToInY(ry),
        w: pxToInX(legW * 0.44),
        h: pxToInY(28),
        align: 'right',
        valign: 'middle',
        fontFace: style.typography.pptx_font_mono,
        fontSize: 8.5,
        bold: true,
        color: accentHex,
        lang: localeLang,
        margin: 0,
      });

      pSlide.addShape(pres.ShapeType.rect, {
        x: pxToInX(legX),
        y: pxToInY(ry + 36),
        w: pxToInX(legW),
        h: Math.max(0.01, pxToInY(1)),
        fill: dividerFill || { color: borderHex },
        line: NO_LINE,
      });
    });

    return {
      chartType: chart.type,
      bgPrimaryHex,
      borderHex,
      seriesColors: paletteHexes,
      seriesCount: chart.series.length,
      isComboAreaLine: false,
    };
  }

  // 3. 柱状图 / 分组柱状图 / 横向条形图 / 折线图
  let chartType = pres.ChartType.bar;
  const extraOpts: Record<string, any> = {};

  if (chart.type === 'bar' || chart.type === 'grouped-bar') {
    chartType = pres.ChartType.bar;
    extraOpts.barDir = 'col';
    extraOpts.barGrouping = 'clustered';
    extraOpts.barGapWidthPct = chart.series.length > 1 ? 85 : 110;
    if (isSingleSeriesBar) extraOpts.varyColors = true;
  } else if (chart.type === 'horizontal-bar') {
    chartType = pres.ChartType.bar;
    extraOpts.barDir = 'bar';
    extraOpts.barGrouping = 'clustered';
    extraOpts.barGapWidthPct = 85;
    if (isSingleSeriesBar) extraOpts.varyColors = true;
  } else if (chart.type === 'line') {
    chartType = pres.ChartType.line;
    extraOpts.lineSize = 2.8;
    extraOpts.lineSmooth = true;
    extraOpts.lineDataSymbol = 'circle';
    extraOpts.lineDataSymbolSize = 6;
  }

  pSlide.addChart(chartType, chartData, {
    x: pxToInX(box.x),
    y: pxToInY(box.y),
    w: pxToInX(box.w),
    h: pxToInY(box.h),
    chartColors: seriesColors,
    showTitle: false,
    showLegend: chart.series.length > 1,
    legendPos: 't',
    legendColor: textPrimaryHex,
    legendFontFace: style.typography.pptx_font_body,
    legendFontSize: 10,
    showValue: true,
    dataLabelFormatCode: dataNumFmt,
    dataLabelPosition: chart.type === 'line' ? 't' : 'outEnd',
    dataLabelColor: textPrimaryHex,
    dataLabelFontFace: style.typography.pptx_font_mono,
    dataLabelFontSize: 9.5,
    catAxisLabelColor: textPrimaryHex,
    catAxisLabelFontFace: style.typography.pptx_font_body,
    catAxisLabelFontSize: 9.5,
    valAxisLabelColor: textSecondaryHex,
    valAxisLabelFontFace: style.typography.pptx_font_mono,
    valAxisLabelFontSize: 9,
    valAxisLabelFormatCode: axisNumFmt,
    valGridLine: { color: borderHex, style: 'dash', size: 0.5 },
    catGridLine: { style: 'none' },
    ...extraOpts,
  });

  return {
    chartType: chart.type,
    bgPrimaryHex,
    borderHex,
    seriesColors:
      chart.series.length > 1
        ? seriesColors.slice(0, chart.series.length)
        : [accentHex],
    seriesCount: chart.series.length,
    isComboAreaLine: false,
  };
}

function addNativeLine(
  pres: any,
  pSlide: any,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colorHex: string,
  widthPt: number,
  dashed: boolean,
  hasArrow: boolean
): void {
  const lx = Math.min(x1, x2);
  const ly = Math.min(y1, y2);
  const lw = Math.max(1.5, Math.abs(x2 - x1));
  const lh = Math.max(1.5, Math.abs(y2 - y1));
  pSlide.addShape(pres.ShapeType.line, {
    x: pxToInX(lx),
    y: pxToInY(ly),
    w: pxToInX(lw),
    h: pxToInY(lh),
    flipH: x2 < x1,
    flipV: y2 < y1,
    line: {
      color: colorHex,
      width: widthPt,
      dashType: dashed ? 'dash' : 'solid',
      endArrowType: hasArrow ? 'triangle' : 'none',
    },
  });
}

export async function compileDeckToPptx(
  deck: SlideDeckIR,
  outputPath: string,
  htmlOptions: HtmlCompileOptions = {}
): Promise<PptxCompileResult> {
  const style = getStylePack(deck.meta.style_id, deck.meta.accent_override);
  const htmlContent = compileDeckToHtml(deck, htmlOptions);

  const tmpHtmlPath = path.join(
    os.tmpdir(),
    `artistic-ppt-v4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`
  );
  fs.writeFileSync(tmpHtmlPath, htmlContent, 'utf-8');

  const browser = await acquireBrowser();
  const context = await createFastHeadlessContext(browser, {
    viewport: { width: STAGE_W, height: STAGE_H },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    const fileUrl = `file:///${tmpHtmlPath.replace(/\\/g, '/')}?headless=1`;
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(100);
    // 兼容 tsx / esbuild keepNames 在 page.evaluate 内部函数声明处注入的 __name(...) 辅助调用
    await page.evaluate('globalThis.__name = globalThis.__name || function(t){ return t; };');

    // 注入截图隔离控制样式：彻底隐藏所有将被原生重建的组件，并修复公式透明底模式 (覆盖 html 根背景)
    await page.addStyleTag({
      content: `
        .slide-frame.hide-fg [data-pptx-text="1"],
        .slide-frame.hide-fg [data-pptx-table="1"],
        .slide-frame.hide-fg [data-pptx-morph-box="1"],
        .slide-frame.hide-fg [data-pptx-rule="1"],
        .slide-frame.hide-fg [data-pptx-chart-box="1"],
        .slide-frame.hide-fg [data-pptx-formula-box="1"],
        .slide-frame.hide-fg [data-pptx-diagram="1"],
        .slide-frame.hide-fg [data-pptx-quadrant-box="1"],
        .slide-frame.hide-fg [data-pptx-icon],
        .slide-frame.hide-fg [data-pptx-chrono-dot="1"],
        .slide-frame.hide-fg [data-pptx-code-window="1"],
        .slide-frame.hide-fg [data-pptx-decor-quote="1"],
        .slide-frame.hide-fg .editorial-side-note,
        .slide-frame.hide-fg .print-crosshair {
          visibility: hidden !important;
        }
        .slide-frame.hide-fg [data-pptx-border-host="1"] {
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .slide-frame.hide-portals [data-pptx-dynamic-img="1"] {
          visibility: hidden !important;
        }
        html.formula-alpha-mode,
        html.formula-alpha-mode body,
        html.formula-alpha-mode #deck-stage,
        html.formula-alpha-mode .slide-frame,
        html.formula-alpha-mode .formula-display-box {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        html.formula-alpha-mode .slide-atmosphere,
        html.formula-alpha-mode .art-portal,
        html.formula-alpha-mode .bleed-giant-mark {
          visibility: hidden !important;
        }
      `,
    });

    const pres = new PptxGenJS();
    pres.defineLayout({ name: 'STUDIO_16_9', width: PPT_W_IN, height: PPT_H_IN });
    pres.layout = 'STUDIO_16_9';
    pres.title = stripRichMarkers(deck.meta.title);
    pres.author = deck.meta.author || 'Artistic-PPT Studio v4.0';
    pres.subject = deck.meta.subtitle || '';

    const localeLang = deck.meta.locale === 'en-US' ? 'en-US' : 'zh-CN';
    const isDarkDeck = isDarkColor(style.palette.bg_primary);
    const bgPrimaryHex = toPptxHex(style.palette.bg_primary, isDarkDeck ? '080A0F' : 'F8FAFC');
    const accentHex = toPptxHex(style.palette.accent, '2997FF');
    const borderHex = toPptxHex(style.palette.border_solid, '2D3648');
    const surfaceHex = toPptxHex(style.palette.surface_solid, isDarkDeck ? '141C2B' : 'FFFFFF');
    const textPrimaryHex = toPptxHex(style.palette.text_primary, 'F8FAFC');
    const textSecondaryHex = toPptxHex(style.palette.text_secondary, '94A3B8');
    const textMutedHex = toPptxHex(style.palette.text_muted, '64748B');
    const defaultOverlapHex = isDarkDeck ? '141C2B' : '121318';

    const chartMetas: ChartEnhancementMeta[] = [];
    const ommlReplacements = new Map<number, OmmlReplacementSpec[]>();

    for (let i = 0; i < deck.slides.length; i++) {
      const irSlide = deck.slides[i];
      await page.evaluate((idx) => {
        (window as any).__deckGoTo(idx);
      }, i);
      await page.waitForTimeout(30);

      const extracted = await page.evaluate((slideIdx) => {
        const slideEl = document.getElementById(`slide-${slideIdx}`)!;
        const stageRect = document.getElementById('deck-stage')!.getBoundingClientRect();

        slideEl.querySelectorAll('.katex-mathml').forEach((m) => m.remove());

        function makeSvgMapper(svgEl: SVGSVGElement, vbW: number, vbH: number) {
          const sr = svgEl.getBoundingClientRect();
          const s = Math.min(sr.width / vbW, sr.height / vbH);
          const ox = sr.left - stageRect.left + (sr.width - vbW * s) / 2;
          const oy = sr.top - stageRect.top + (sr.height - vbH * s) / 2;
          return {
            s,
            pt: (vx: number, vy: number) => ({ x: ox + vx * s, y: oy + vy * s }),
          };
        }

        function relBox(el: Element): ExtractedRect {
          const r = el.getBoundingClientRect();
          return {
            x: r.left - stageRect.left,
            y: r.top - stageRect.top,
            w: r.width,
            h: r.height,
          };
        }

        // 1. 动态视窗
        const portals: ExtractedDynamicPortal[] = [];
        slideEl.querySelectorAll('[data-pptx-dynamic-img="1"]').forEach((el, di) => {
          el.setAttribute('data-portal-idx', String(di));
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) return;
          const x = Math.max(0, r.left - stageRect.left);
          const y = Math.max(0, r.top - stageRect.top);
          const w = Math.min(1920, r.width);
          const h = Math.min(1080, r.height);
          portals.push({
            domIndex: di,
            morphId: el.getAttribute('data-morph-id') || `portal-${di}`,
            x,
            y,
            w,
            h,
            isFullBleed: w >= 1914 && h >= 1074,
          });
        });

        // 2. 建筑切口衬板 / 跨压铭牌 / Viewfinder 角标 / 东方朱砂印
        const morphBoxes: ExtractedMorphBox[] = [];
        slideEl.querySelectorAll('[data-pptx-morph-box="1"]').forEach((el) => {
          const morphId = el.getAttribute('data-morph-id') || '';
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          const cs = window.getComputedStyle(el);
          const boxKind =
            el.getAttribute('data-box-kind') ||
            (el.classList.contains('interlock-cutout-cartouche')
              ? 'cartouche'
              : el.classList.contains('oriental-seal-stamp')
              ? 'seal'
              : el.classList.contains('overlap-paper-note')
              ? 'overlap'
              : '');
          morphBoxes.push({
            morphId,
            boxKind,
            x: r.left - stageRect.left,
            y: r.top - stageRect.top,
            w: r.width,
            h: r.height,
            bgCss: cs.backgroundColor,
            borderCss: cs.borderTopColor || cs.borderLeftColor,
            borderLeftCss: cs.borderLeftColor,
            borderLeftWidthPx: parseFloat(cs.borderLeftWidth) || 0,
          });
        });

        // 3. 建筑标尺线 + CSS 结构边线
        const rules: ExtractedRuleLine[] = [];
        slideEl.querySelectorAll('[data-pptx-rule="1"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return;
          const cs = window.getComputedStyle(el);
          rules.push({
            morphId: el.getAttribute('data-morph-id'),
            x: r.left - stageRect.left,
            y: r.top - stageRect.top,
            w: Math.max(1.2, r.width),
            h: Math.max(1.2, r.height),
            bgCss: cs.backgroundColor,
          });
        });

        slideEl.querySelectorAll('[data-pptx-border-host="1"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          const cs = window.getComputedStyle(el);
          const x = r.left - stageRect.left;
          const y = r.top - stageRect.top;

          const topW = parseFloat(cs.borderTopWidth) || 0;
          if (topW >= 0.5 && cs.borderTopStyle !== 'none') {
            rules.push({ morphId: null, x, y, w: r.width, h: topW, bgCss: cs.borderTopColor });
          }
          const botW = parseFloat(cs.borderBottomWidth) || 0;
          if (botW >= 0.5 && cs.borderBottomStyle !== 'none') {
            rules.push({
              morphId: null,
              x,
              y: y + r.height - botW,
              w: r.width,
              h: botW,
              bgCss: cs.borderBottomColor,
            });
          }
          const leftW = parseFloat(cs.borderLeftWidth) || 0;
          if (leftW >= 0.5 && cs.borderLeftStyle !== 'none') {
            rules.push({ morphId: null, x, y, w: leftW, h: r.height, bgCss: cs.borderLeftColor });
          }
          const rightW = parseFloat(cs.borderRightWidth) || 0;
          if (rightW >= 0.5 && cs.borderRightStyle !== 'none') {
            rules.push({
              morphId: null,
              x: x + r.width - rightW,
              y,
              w: rightW,
              h: r.height,
              bgCss: cs.borderRightColor,
            });
          }
        });

        // 4. 时间轴节点圆点
        const chronoDots: ExtractedChronoDot[] = [];
        slideEl.querySelectorAll('[data-pptx-chrono-dot="1"]').forEach((el) => {
          const b = relBox(el);
          if (b.w < 4 || b.h < 4) return;
          chronoDots.push({
            ...b,
            isActive: el.getAttribute('data-active') === '1',
          });
        });

        // 5. 精密矢量图标
        const icons: ExtractedSvgIcon[] = [];
        slideEl.querySelectorAll('[data-pptx-icon]').forEach((el) => {
          const iconName = el.getAttribute('data-pptx-icon');
          if (!iconName) return;
          const b = relBox(el);
          if (b.w < 4 || b.h < 4) return;
          const cs = window.getComputedStyle(el);
          icons.push({
            iconName,
            ...b,
            colorCss: el.getAttribute('data-icon-color') || cs.stroke || cs.color,
            strokeWidth: Number(el.getAttribute('data-icon-stroke') || 1.65),
          });
        });

        // 6. 代码窗体
        const codeWindows: ExtractedCodeWindow[] = [];
        slideEl.querySelectorAll('[data-pptx-code-window="1"]').forEach((cw) => {
          const cwBox = relBox(cw);
          const cwCs = window.getComputedStyle(cw);
          const barEl = cw.querySelector('.code-window-bar');
          const barBox = barEl ? relBox(barEl) : { x: cwBox.x, y: cwBox.y, w: cwBox.w, h: 42 };
          const barCs = barEl ? window.getComputedStyle(barEl) : cwCs;

          const dots: ExtractedCodeWindow['dots'] = [];
          cw.querySelectorAll('.code-dots span').forEach((d) => {
            const db = relBox(d);
            const dcs = window.getComputedStyle(d);
            dots.push({ ...db, bgCss: dcs.backgroundColor });
          });

          const highlightBands: ExtractedCodeWindow['highlightBands'] = [];
          const lines: ExtractedCodeWindow['lines'] = [];
          cw.querySelectorAll('.code-line').forEach((lnEl) => {
            const isHl = lnEl.getAttribute('data-hl-line') === '1' || lnEl.classList.contains('line-hl');
            const rawText = (lnEl.textContent || '').replace(/\u2060/g, '');
            lines.push({ text: rawText, highlight: isHl });
            if (isHl) {
              const lb = relBox(lnEl);
              const lcs = window.getComputedStyle(lnEl);
              highlightBands.push({
                x: cwBox.x + 12,
                y: lb.y - 1,
                w: cwBox.w - 24,
                h: Math.max(lb.h + 2, 22),
                bgCss: lcs.backgroundColor,
              });
            }
          });

          codeWindows.push({
            ...cwBox,
            bgCss: cwCs.backgroundColor,
            borderCss: cwCs.borderTopColor,
            barH: barBox.h,
            barBgCss: barCs.backgroundColor,
            barBorderCss: barCs.borderBottomColor,
            dots,
            highlightBands,
            lines,
          });
        });

        // 7. 图表容器
        let chartBox: ExtractedRect | null = null;
        const chartEl = slideEl.querySelector('[data-pptx-chart-box="1"]');
        if (chartEl) {
          const cr = chartEl.getBoundingClientRect();
          if (cr.width >= 40 && cr.height >= 40) {
            chartBox = {
              x: cr.left - stageRect.left,
              y: cr.top - stageRect.top,
              w: cr.width,
              h: cr.height,
            };
          }
        }

        // 8. 数学公式容器
        const formulas: ExtractedFormulaBox[] = [];
        slideEl.querySelectorAll('[data-pptx-formula-box="1"]').forEach((el, fi) => {
          el.setAttribute('data-formula-idx', String(fi));
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          const cs = window.getComputedStyle(el);
          const ta = cs.textAlign;
          const align: 'left' | 'center' | 'right' =
            ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : 'left';
          formulas.push({
            domIndex: fi,
            latex: el.getAttribute('data-latex') || '',
            displayMode: el.getAttribute('data-display') === '1',
            isFrame: el.getAttribute('data-formula-frame') === '1',
            x: r.left - stageRect.left,
            y: r.top - stageRect.top,
            w: r.width,
            h: r.height,
            fontSizePx: parseFloat(cs.fontSize) || 20,
            colorCss: cs.color,
            bgCss: cs.backgroundColor,
            borderColorCss: cs.borderTopColor,
            align,
          });
        });

        // 9. 拓扑图（泳道 + 三次贝塞尔边 + 引线 + 胶囊标签 + 完整节点卡片细节）
        const diagramLanes: ExtractedDiagramLane[] = [];
        const diagramEdges: ExtractedDiagramEdge[] = [];
        const diagramPills: ExtractedDiagramPill[] = [];
        const diagramNodes: ExtractedDiagramNodeDetail[] = [];

        const diagSvg = slideEl.querySelector('svg.diagram-svg') as SVGSVGElement | null;
        if (diagSvg) {
          const mapper = makeSvgMapper(diagSvg, 1640, 560);

          diagSvg.querySelectorAll('[data-diagram-lane="1"]').forEach((laneG) => {
            const rectEl = laneG.querySelector('rect');
            if (!rectEl) return;
            const b = relBox(rectEl);
            diagramLanes.push({
              title: laneG.getAttribute('data-lane-title') || '',
              ...b,
            });
          });

          diagSvg.querySelectorAll('[data-diagram-edge="1"]').forEach((edgeEl) => {
            const p1 = mapper.pt(
              Number(edgeEl.getAttribute('data-x1') || 0),
              Number(edgeEl.getAttribute('data-y1') || 0)
            );
            const c1 = mapper.pt(
              Number(edgeEl.getAttribute('data-cx1') || edgeEl.getAttribute('data-x1') || 0),
              Number(edgeEl.getAttribute('data-cy1') || edgeEl.getAttribute('data-y1') || 0)
            );
            const c2 = mapper.pt(
              Number(edgeEl.getAttribute('data-cx2') || edgeEl.getAttribute('data-x2') || 0),
              Number(edgeEl.getAttribute('data-cy2') || edgeEl.getAttribute('data-y2') || 0)
            );
            const p2 = mapper.pt(
              Number(edgeEl.getAttribute('data-x2') || 0),
              Number(edgeEl.getAttribute('data-y2') || 0)
            );
            diagramEdges.push({
              x1: p1.x,
              y1: p1.y,
              cx1: c1.x,
              cy1: c1.y,
              cx2: c2.x,
              cy2: c2.y,
              x2: p2.x,
              y2: p2.y,
              isCurve: true,
              dashed: edgeEl.getAttribute('data-dashed') === '1',
              hasArrow: edgeEl.getAttribute('data-no-arrow') !== '1',
            });
          });

          diagSvg.querySelectorAll('[data-diagram-leader="1"]').forEach((ldEl) => {
            const p1 = mapper.pt(
              Number(ldEl.getAttribute('data-x1') || 0),
              Number(ldEl.getAttribute('data-y1') || 0)
            );
            const p2 = mapper.pt(
              Number(ldEl.getAttribute('data-x2') || 0),
              Number(ldEl.getAttribute('data-y2') || 0)
            );
            diagramEdges.push({
              x1: p1.x,
              y1: p1.y,
              cx1: p1.x,
              cy1: p1.y,
              cx2: p2.x,
              cy2: p2.y,
              x2: p2.x,
              y2: p2.y,
              isCurve: false,
              dashed: true,
              hasArrow: false,
            });
          });

          diagSvg.querySelectorAll('[data-diagram-pill="1"]').forEach((pillRect) => {
            const b = relBox(pillRect);
            diagramPills.push({
              text: pillRect.getAttribute('data-pill-text') || '',
              ...b,
              fontSizePx: 12.5 * mapper.s,
            });
          });

          diagSvg.querySelectorAll('[data-diagram-node="1"]').forEach((el, ni) => {
            const cardEl = el.querySelector('[data-node-card="1"]') || el.querySelector('rect') || el;
            const card = relBox(cardEl);
            if (card.w < 20 || card.h < 20) return;

            const barEl = el.querySelector('[data-node-bar="1"]');
            const dotEl = el.querySelector('[data-node-dot="1"]');
            const divEl = el.querySelector('[data-node-divider="1"]');
            const tagEl = el.querySelector('[data-node-tag="1"]');
            const titleEl = el.querySelector('[data-node-title="1"]');
            const subBgEl = el.querySelector('[data-node-sub-bg="1"]');
            const subEl = el.querySelector('[data-node-sub="1"]');

            const readTextItem = (tEl: Element | null, fallbackPx: number) => {
              if (!tEl) return null;
              const b = relBox(tEl);
              const cs = window.getComputedStyle(tEl);
              return {
                ...b,
                text: (tEl.textContent || '').trim(),
                fontSizePx: (parseFloat(cs.fontSize) || fallbackPx) * mapper.s,
              };
            };

            diagramNodes.push({
              nodeIndex: ni,
              card,
              bar: barEl ? relBox(barEl) : null,
              dot: dotEl ? relBox(dotEl) : null,
              divider: divEl ? relBox(divEl) : null,
              tag: readTextItem(tagEl, 12),
              title: readTextItem(titleEl, 19),
              subBg: subBgEl ? relBox(subBgEl) : null,
              sub: readTextItem(subEl, 13.5),
            });
          });
        }

        // 10. 战略象限图
        let quadrantData: ExtractedQuadrantData | null = null;
        const quadSvg = slideEl.querySelector('svg.quadrant-svg') as SVGSVGElement | null;
        if (quadSvg) {
          const mapper = makeSvgMapper(quadSvg, 880, 540);
          const frameEl = quadSvg.querySelector('[data-quad-frame="1"]');
          const hiEl = quadSvg.querySelector('[data-quad-hi="1"]');

          const axes: ExtractedQuadrantData['axes'] = [];
          quadSvg.querySelectorAll('[data-quad-axis]').forEach((ln) => {
            const p1 = mapper.pt(Number(ln.getAttribute('x1')), Number(ln.getAttribute('y1')));
            const p2 = mapper.pt(Number(ln.getAttribute('x2')), Number(ln.getAttribute('y2')));
            axes.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          });

          const leaders: ExtractedQuadrantData['leaders'] = [];
          quadSvg.querySelectorAll('[data-quad-leader="1"]').forEach((ln) => {
            const p1 = mapper.pt(Number(ln.getAttribute('x1')), Number(ln.getAttribute('y1')));
            const p2 = mapper.pt(Number(ln.getAttribute('x2')), Number(ln.getAttribute('y2')));
            leaders.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          });

          const points: ExtractedQuadrantData['points'] = [];
          quadSvg.querySelectorAll('[data-quad-point="1"]').forEach((cir) => {
            const b = relBox(cir);
            const cs = window.getComputedStyle(cir);
            points.push({
              ...b,
              colorCss: cs.fill || cir.getAttribute('data-color') || '',
              isHero: cir.getAttribute('data-hero') === '1',
            });
          });

          const labels: ExtractedQuadrantData['labels'] = [];
          quadSvg.querySelectorAll('[data-quad-label="1"]').forEach((txtEl) => {
            const b = relBox(txtEl);
            if (b.w < 2 || b.h < 2) return;
            const anchor = txtEl.getAttribute('text-anchor') || 'start';
            const align: 'left' | 'center' | 'right' =
              anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
            const cs = window.getComputedStyle(txtEl);
            labels.push({
              text: (txtEl.textContent || '').trim(),
              ...b,
              align,
              fontSizePx: (parseFloat(cs.fontSize) || 14) * mapper.s,
              isHero: txtEl.getAttribute('data-hero') === '1',
              isMuted: txtEl.getAttribute('data-muted') === '1',
              isSec: txtEl.getAttribute('data-sec') === '1',
            });
          });

          quadrantData = {
            frame: frameEl ? relBox(frameEl) : null,
            hiZone: hiEl ? relBox(hiEl) : null,
            axes,
            leaders,
            points,
            labels,
          };
        }

        // 11. 顶刊三线表（保留局部富文本高亮）
        const tables: ExtractedTable[] = [];
        slideEl.querySelectorAll('table[data-pptx-table="1"]').forEach((tbl) => {
          const r = tbl.getBoundingClientRect();
          if (r.width < 10 || r.height < 10) return;
          const trs = Array.from(tbl.querySelectorAll('tr'));
          if (trs.length === 0) return;

          const firstCells = Array.from(trs[0].querySelectorAll('th, td'));
          const colWidthsPx = firstCells.map((c) => c.getBoundingClientRect().width);
          const rowHeightsPx = trs.map((tr) => tr.getBoundingClientRect().height);
          const firstTd = tbl.querySelector('td, th');
          const tableFontPx = firstTd ? parseFloat(window.getComputedStyle(firstTd).fontSize) || 16.5 : 16.5;

          const rows: ExtractedTableCell[][] = trs.map((tr, ri) => {
            const isHi = tr.classList.contains('row-sota-highlight');
            const isLast = ri === trs.length - 1;
            return Array.from(tr.querySelectorAll('th, td')).map((cell) => {
              const cs = window.getComputedStyle(cell);
              const ta = cs.textAlign;
              const align: 'left' | 'center' | 'right' =
                ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : 'left';
              const cellBold = cell.tagName === 'TH' || isHi || parseInt(cs.fontWeight) >= 600;
              const runs: ExtractedTableCell['runs'] = [];
              const collectTableRuns = (
                node: Node,
                inhHl: boolean,
                inhBold: boolean
              ) => {
                node.childNodes.forEach((cn) => {
                  if (cn.nodeType === Node.TEXT_NODE) {
                    const t = cn.textContent || '';
                    if (t) {
                      runs.push({ kind: 'text', text: t, highlight: inhHl, bold: inhBold });
                    }
                  } else if (cn.nodeType === Node.ELEMENT_NODE) {
                    const ce = cn as HTMLElement;
                    if (ce.classList.contains('inline-math')) {
                      const tex = ce.getAttribute('data-latex') || '';
                      if (tex) {
                        runs.push({ kind: 'latex', text: tex, highlight: inhHl, bold: inhBold });
                      }
                      return;
                    }
                    if (ce.tagName === 'BR') {
                      runs.push({ kind: 'text', text: ' ', highlight: inhHl, bold: inhBold });
                      return;
                    }
                    const isHl =
                      inhHl ||
                      ce.classList.contains('hl-accent') ||
                      ce.getAttribute('data-hl') === '1';
                    const isBd =
                      inhBold ||
                      isHl ||
                      ce.tagName === 'STRONG' ||
                      ce.tagName === 'B';
                    collectTableRuns(ce, isHl, isBd);
                  }
                });
              };
              collectTableRuns(cell, false, cellBold);
              return {
                runs,
                align,
                isHeader: cell.tagName === 'TH',
                isHighlightRow: isHi,
                isLastRow: isLast,
              };
            });
          });

          tables.push({
            x: r.left - stageRect.left,
            y: r.top - stageRect.top,
            w: r.width,
            h: r.height,
            fontSizePx: tableFontPx,
            colWidthsPx,
            rowHeightsPx,
            rows,
          });
        });

        // 12. 全量文本框（保留 <br/> 换行、行内 $...$ 数学 AST、uppercase 转换、父列容器安全边界）
        const COL_BOUND_SELECTOR = [
          '.chrono-step',
          '.open-plinth',
          '.pillar-mini',
          '.stagger-col-offset',
          '.closing-meta-col',
          '.overlap-paper-note',
          '.interlock-cutout-cartouche',
          '.code-window',
          '.code-window-bar',
          '.academic-left-derivation',
          '.academic-right-theorems',
          '.zoom-left-overlay',
          '.zoom-right-anatomy',
          '.versus-pole',
          '.open-list-row',
          '.vscroll-left-prose',
          '.cover-v2-harbor',
          '.editorial-cover-left',
          '.layout-cover-swiss-v2',
          '.layout-section-v2',
          '.layout-quote-v2',
          '.layout-closing-v2',
          '.slide-chrome-top',
        ].join(', ');

        function collectParts(
          root: Node,
          inhHighlight: boolean,
          inhBold: boolean,
          upperCase: boolean,
          out: ExtractedInlinePart[],
          rootFontSizePx: number,
          rootColorCss: string,
          inhItalic = false,
          inhFontSizePx?: number,
          inhColorCss?: string
        ) {
          root.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              let t = node.textContent || '';
              if (upperCase) t = t.toUpperCase();
              if (t) {
                out.push({
                  kind: 'text',
                  text: t,
                  highlight: inhHighlight,
                  bold: inhBold,
                  italic: inhItalic || undefined,
                  fontSizePx: inhFontSizePx,
                  colorCss: inhColorCss,
                });
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const ce = node as HTMLElement;
              if (ce.tagName === 'BR') {
                out.push({ kind: 'break' });
                return;
              }
              if (ce.classList.contains('inline-math')) {
                const tex = ce.getAttribute('data-latex') || '';
                if (tex) {
                  out.push({ kind: 'latex', latex: tex, highlight: inhHighlight, bold: inhBold });
                }
                return;
              }
              const ceStyle = window.getComputedStyle(ce);
              const isHl =
                inhHighlight ||
                ce.classList.contains('hl-accent') ||
                ce.classList.contains('hm-unit') ||
                ce.getAttribute('data-hl') === '1';
              const ceWeight = parseInt(ceStyle.fontWeight) || 400;
              const isBd =
                ce.classList.contains('hm-unit') || ce.classList.contains('plinth-metric-unit')
                  ? ceWeight >= 600
                  : inhBold ||
                    ce.classList.contains('hl-accent') ||
                    ce.tagName === 'STRONG' ||
                    ce.tagName === 'B' ||
                    ceWeight >= 600;
              const isIt =
                inhItalic ||
                ce.tagName === 'EM' ||
                ce.tagName === 'I' ||
                ceStyle.fontStyle === 'italic';
              const ceFs = parseFloat(ceStyle.fontSize);
              const customFs =
                Number.isFinite(ceFs) && Math.abs(ceFs - rootFontSizePx) > 2
                  ? ceFs
                  : inhFontSizePx;
              const customColor =
                ceStyle.color && ceStyle.color !== rootColorCss ? ceStyle.color : inhColorCss;

              if (
                ce.classList.contains('hm-unit') ||
                ce.classList.contains('plinth-metric-unit') ||
                (parseFloat(ceStyle.marginLeft) || 0) >= 4
              ) {
                const lastPart = out[out.length - 1];
                if (lastPart && lastPart.kind === 'text' && !/\s$/.test(lastPart.text)) {
                  lastPart.text += ' ';
                }
              }

              collectParts(
                ce,
                isHl,
                isBd,
                upperCase || ceStyle.textTransform === 'uppercase',
                out,
                rootFontSizePx,
                rootColorCss,
                isIt,
                customFs,
                customColor
              );
            }
          });
        }

        const texts: ExtractedTextNode[] = [];

        const pushTextElement = (el: Element, roleOverride?: string, isAsciiVert = false) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          const cs = window.getComputedStyle(el);
          const role = roleOverride || el.getAttribute('data-pptx-role') || 'body';
          const morphId = el.getAttribute('data-morph-id');
          const fontWeight = parseInt(cs.fontWeight) || 400;
          const fontSizePx = parseFloat(cs.fontSize) || 18;
          const lineHeightPx = parseFloat(cs.lineHeight) || fontSizePx * 1.45;
          const letterSpacingPx = parseFloat(cs.letterSpacing) || 0;
          const ta = cs.textAlign;
          const align: 'left' | 'center' | 'right' =
            ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : 'left';
          const valign: 'top' | 'middle' | 'bottom' =
            role === 'seal' || el.closest('.cover-viewfinder, .portal-right-caption, .code-window-bar')
              ? 'middle'
              : 'top';
          const ff = cs.fontFamily.toLowerCase();
          const isMono =
            role === 'code' ||
            role === 'eyebrow' ||
            ff.includes('mono') ||
            ff.includes('consolas') ||
            isAsciiVert;
          const isSerifTitle =
            role === 'decor-quote' || (ff.includes('serif') && !ff.includes('sans-serif'));
          const isVertical = cs.writingMode.includes('vertical') && !isAsciiVert;
          const isUpper = cs.textTransform === 'uppercase';
          const preserveWhitespace =
            role === 'code' ||
            cs.whiteSpace === 'pre' ||
            cs.whiteSpace === 'pre-wrap' ||
            cs.whiteSpace === 'pre-line';

          // 计算去除 CSS padding / border 后的真实文本内容盒坐标（防止 .code-pre / .chart-open-callout 等偏移）
          const padL = role === 'seal' ? 0 : parseFloat(cs.paddingLeft) || 0;
          const padR = role === 'seal' ? 0 : parseFloat(cs.paddingRight) || 0;
          const padT = role === 'seal' ? 0 : parseFloat(cs.paddingTop) || 0;
          const padB = role === 'seal' ? 0 : parseFloat(cs.paddingBottom) || 0;
          const bL = role === 'seal' ? 0 : parseFloat(cs.borderLeftWidth) || 0;
          const bR = role === 'seal' ? 0 : parseFloat(cs.borderRightWidth) || 0;
          const bT = role === 'seal' ? 0 : parseFloat(cs.borderTopWidth) || 0;
          const bB = role === 'seal' ? 0 : parseFloat(cs.borderBottomWidth) || 0;
          const contentX = r.left - stageRect.left + bL + padL;
          const contentY = r.top - stageRect.top + bT + padT;
          const contentW = Math.max(8, r.width - bL - bR - padL - padR);
          const contentH = Math.max(8, r.height - bT - bB - padT - padB);

          // 安全列容器边界：防止向相邻列溢出
          let minLeftPx = 0;
          let maxRightPx = 1910;
          const boundEl = el.closest(COL_BOUND_SELECTOR);
          if (boundEl && role !== 'seal') {
            const br = boundEl.getBoundingClientRect();
            const bcs = window.getComputedStyle(boundEl);
            const bPadL = parseFloat(bcs.paddingLeft) || 0;
            const bPadR = parseFloat(bcs.paddingRight) || 0;
            minLeftPx = Math.max(0, br.left - stageRect.left + bPadL * 0.5);
            maxRightPx = Math.min(1910, br.right - stageRect.left - bPadR * 0.5 + 4);
          }

          const parts: ExtractedInlinePart[] = [];
          let codeLines: Array<{ text: string; highlight: boolean }> | undefined;

          if (role === 'code') {
            const cwLines: Array<{ text: string; highlight: boolean }> = [];
            el.querySelectorAll('.code-line').forEach((lnEl) => {
              const isHl =
                lnEl.getAttribute('data-hl-line') === '1' || lnEl.classList.contains('line-hl');
              cwLines.push({
                text: (lnEl.textContent || '').replace(/\u2060/g, ''),
                highlight: isHl,
              });
            });
            if (cwLines.length > 0) {
              codeLines = cwLines;
            } else {
              parts.push({
                kind: 'text',
                text: (el as HTMLElement).innerText,
                highlight: false,
                bold: false,
              });
            }
          } else {
            collectParts(
              el,
              false,
              fontWeight >= 600,
              isUpper,
              parts,
              fontSizePx,
              cs.color,
              cs.fontStyle === 'italic'
            );
          }

          const hasContent =
            (codeLines && codeLines.length > 0) ||
            parts.some((p) => (p.kind === 'text' ? p.text.trim().length > 0 : p.kind === 'latex'));
          if (!hasContent) return;

          const isSingleLine = !isVertical && !isAsciiVert && contentH <= lineHeightPx * 1.48;

          // 对多行自由换行的标题，贴合 Chromium text-wrap: balance 的真实行宽夹紧文本框，避免 PowerPoint 孤字折行
          let adjX = contentX;
          let adjW = contentW;
          if (role === 'title' && !isSingleLine && !isVertical && !isAsciiVert) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const lineMap = new Map<number, { left: number; right: number }>();
            Array.from(range.getClientRects()).forEach((rc) => {
              if (rc.width < 1 || rc.height < 1) return;
              const rowKey = Math.round(rc.top / Math.max(8, fontSizePx * 0.45));
              const cur = lineMap.get(rowKey);
              if (!cur) lineMap.set(rowKey, { left: rc.left, right: rc.right });
              else {
                cur.left = Math.min(cur.left, rc.left);
                cur.right = Math.max(cur.right, rc.right);
              }
            });
            let maxLineW = 0;
            lineMap.forEach((b) => {
              maxLineW = Math.max(maxLineW, b.right - b.left);
            });
            if (maxLineW > 120 && maxLineW < contentW - 36) {
              const nextW = Math.min(contentW, Math.ceil(maxLineW + 28));
              if (align === 'center') adjX = contentX + (contentW - nextW) / 2;
              else if (align === 'right') adjX = contentX + (contentW - nextW);
              adjW = nextW;
            }
          }

          texts.push({
            morphId,
            role,
            x: adjX,
            y: contentY,
            w: adjW,
            h: contentH,
            minLeftPx,
            maxRightPx,
            fontSizePx,
            fontWeight,
            colorCss: cs.color,
            align,
            valign,
            lineHeightPx,
            letterSpacingPx,
            isMono,
            isSerifTitle,
            isVertical,
            isAsciiVertical: isAsciiVert,
            isSingleLine,
            preserveWhitespace,
            parts,
            codeLines,
          });
        };

        slideEl.querySelectorAll('[data-pptx-text="1"]').forEach((el) => pushTextElement(el));
        slideEl
          .querySelectorAll('[data-pptx-decor-quote="1"]')
          .forEach((el) => pushTextElement(el, 'decor-quote'));
        slideEl
          .querySelectorAll('.editorial-side-note')
          .forEach((el) => pushTextElement(el, 'side-note', true));
        slideEl
          .querySelectorAll('.print-crosshair')
          .forEach((el) => pushTextElement(el, 'crosshair'));

        return {
          portals,
          morphBoxes,
          rules,
          chronoDots,
          icons,
          codeWindows,
          chartBox,
          formulas,
          diagramLanes,
          diagramEdges,
          diagramPills,
          diagramNodes,
          quadrantData,
          tables,
          texts,
        };
      }, i);

      // 2. 优先将公式编译为原生可编辑 OMML（带 1.14x displayMode 视觉字号补偿）；仅当无法转 OMML 时才截取透明 PNG 兜底
      interface PreparedFormula {
        box: ExtractedFormulaBox;
        ommlParaXml: string | null;
        fallbackDataUri?: string;
      }
      const preparedFormulas: PreparedFormula[] = [];
      if (extracted.formulas.length > 0) {
        const needFallbackIndices: number[] = [];
        extracted.formulas.forEach((fm, fi) => {
          const fmHex = toPptxHex(fm.colorCss, textPrimaryHex);
          const fmPt = Math.max(
            8,
            Number((fm.fontSizePx * 0.5 * (fm.displayMode ? 1.14 : 1.0)).toFixed(1))
          );
          const ommlParaXml = fm.latex
            ? latexToOmmlXml(fm.latex, {
                displayMode: fm.displayMode,
                fontSizePt: fmPt,
                colorHex: fmHex,
                align: fm.align,
              })
            : null;
          preparedFormulas.push({ box: fm, ommlParaXml });
          if (!ommlParaXml) {
            needFallbackIndices.push(fi);
          }
        });

        if (needFallbackIndices.length > 0) {
          await page.evaluate(() => document.documentElement.classList.add('formula-alpha-mode'));
          for (const fi of needFallbackIndices) {
            const fm = extracted.formulas[fi];
            const loc = page.locator(`#slide-${i} [data-formula-idx="${fm.domIndex}"]`);
            const buf = await loc.screenshot({ type: 'png', omitBackground: true });
            preparedFormulas[fi].fallbackDataUri = `image/png;base64,${buf.toString('base64')}`;
          }
          await page.evaluate(() => document.documentElement.classList.remove('formula-alpha-mode'));
        }
      }

      // 3. 隐藏全部前景可编辑组件，截取动态高定真图画窗 (Layer 1)
      await page.evaluate((slideIdx) => {
        document.getElementById(`slide-${slideIdx}`)!.classList.add('hide-fg');
      }, i);

      const portalCaptures: Array<ExtractedDynamicPortal & { dataUri: string }> = [];
      let hasFullBleedPortal = false;
      for (const ptl of extracted.portals) {
        if (ptl.isFullBleed) hasFullBleedPortal = true;
        const loc = page.locator(`#slide-${i} [data-portal-idx="${ptl.domIndex}"]`);
        const buf = await loc.screenshot({ type: 'jpeg', quality: 92 });
        portalCaptures.push({
          ...ptl,
          dataUri: `image/jpeg;base64,${buf.toString('base64')}`,
        });
      }

      // 4. 进一步隐藏动态画窗，截取 100% 纯净基底画布 (Layer 0)
      let staticBackdropUri: string | null = null;
      if (!hasFullBleedPortal) {
        await page.evaluate((slideIdx) => {
          document.getElementById(`slide-${slideIdx}`)!.classList.add('hide-portals');
        }, i);

        const staticBackdropBuf = await page.locator('#deck-stage').screenshot({
          type: 'jpeg',
          quality: 92,
        });
        staticBackdropUri = `image/jpeg;base64,${staticBackdropBuf.toString('base64')}`;
      }

      await page.evaluate((slideIdx) => {
        const el = document.getElementById(`slide-${slideIdx}`)!;
        el.classList.remove('hide-fg', 'hide-portals');
      }, i);

      // 5. 在 PptxGenJS 中按全栈原生结构合成
      const pSlide = pres.addSlide();
      pSlide.background = staticBackdropUri
        ? { data: staticBackdropUri }
        : { color: bgPrimaryHex };

      if (irSlide.notes) {
        pSlide.addNotes(stripWordJoiners(irSlide.notes));
      }

      // Layer 1: 动态高定艺术真图视窗 (!!cinema-bg)
      for (const ptl of portalCaptures) {
        pSlide.addImage({
          data: ptl.dataUri,
          objectName: `!!${ptl.morphId}`,
          x: pxToInX(ptl.x),
          y: pxToInY(ptl.y),
          w: pxToInX(ptl.w),
          h: pxToInY(ptl.h),
        });
      }

      // Layer 2a: 原生可移动建筑标尺分割线与 CSS 结构边线
      for (const rule of extracted.rules) {
        const fillObj = toPptxFill(rule.bgCss, borderHex);
        if (!fillObj) continue;
        pSlide.addShape(pres.ShapeType.rect, {
          objectName: rule.morphId ? `!!${rule.morphId}` : undefined,
          x: pxToInX(rule.x),
          y: pxToInY(rule.y),
          w: Math.max(0.01, pxToInX(rule.w)),
          h: Math.max(0.01, pxToInY(rule.h)),
          fill: fillObj,
          line: NO_LINE,
        });
      }

      // Layer 2a+: 时间轴刻度圆点（绘制于 chrono-axis 之上，中心实心遮盖贯通线）
      for (const dot of extracted.chronoDots) {
        if (dot.isActive) {
          const haloPad = 6;
          pSlide.addShape(pres.ShapeType.ellipse, {
            x: pxToInX(dot.x - haloPad),
            y: pxToInY(dot.y - haloPad),
            w: pxToInX(dot.w + haloPad * 2),
            h: pxToInY(dot.h + haloPad * 2),
            fill: { color: accentHex, transparency: 76 },
            line: NO_LINE,
          });
          pSlide.addShape(pres.ShapeType.ellipse, {
            x: pxToInX(dot.x),
            y: pxToInY(dot.y),
            w: pxToInX(dot.w),
            h: pxToInY(dot.h),
            fill: { color: accentHex },
            line: { color: accentHex, width: 1.5 },
          });
        } else {
          pSlide.addShape(pres.ShapeType.ellipse, {
            x: pxToInX(dot.x),
            y: pxToInY(dot.y),
            w: pxToInX(dot.w),
            h: pxToInY(dot.h),
            fill: { color: bgPrimaryHex },
            line: { color: textMutedHex, width: 1.5 },
          });
        }
      }

      // Layer 2b: 前景建筑切口衬板、跨压铭牌、Viewfinder、东方朱砂印、公式底框与代码窗体
      const cardShadow = {
        type: 'outer' as const,
        blur: 16,
        offset: 6,
        angle: 120,
        color: '000000',
        opacity: isDarkDeck ? 0.42 : 0.16,
      };

      for (const box of extracted.morphBoxes) {
        if (box.boxKind === 'seal') {
          pSlide.addShape(pres.ShapeType.roundRect, {
            objectName: box.morphId ? `!!${box.morphId}` : undefined,
            x: pxToInX(box.x),
            y: pxToInY(box.y),
            w: pxToInX(box.w),
            h: pxToInY(box.h),
            rectRadius: 0.02,
            fill: { color: 'B83B2A' },
            line: NO_LINE,
          });
          continue;
        }

        if (box.boxKind === 'viewfinder' || box.boxKind === 'caption-pill') {
          const vfFill = toPptxFill(box.bgCss, bgPrimaryHex) || {
            color: bgPrimaryHex,
            transparency: 20,
          };
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(box.x),
            y: pxToInY(box.y),
            w: pxToInX(box.w),
            h: pxToInY(box.h),
            fill: vfFill,
            line: NO_LINE,
          });
          if (box.borderLeftWidthPx >= 1) {
            pSlide.addShape(pres.ShapeType.rect, {
              x: pxToInX(box.x),
              y: pxToInY(box.y),
              w: pxToInX(Math.max(2.5, box.borderLeftWidthPx)),
              h: pxToInY(box.h),
              fill: { color: toPptxHex(box.borderLeftCss, accentHex) },
              line: NO_LINE,
            });
          }
          continue;
        }

        const fillObj = toPptxFill(box.bgCss, defaultOverlapHex) || { color: defaultOverlapHex };
        if (box.boxKind === 'cartouche') {
          pSlide.addShape(pres.ShapeType.rect, {
            objectName: box.morphId ? `!!${box.morphId}` : undefined,
            x: pxToInX(box.x),
            y: pxToInY(box.y),
            w: pxToInX(box.w),
            h: pxToInY(box.h),
            fill: fillObj,
            line: NO_LINE,
            shadow: cardShadow,
          });
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(box.x),
            y: pxToInY(box.y),
            w: pxToInX(4),
            h: pxToInY(box.h),
            fill: { color: accentHex },
            line: NO_LINE,
          });
        } else {
          // overlap-paper-note: 深色/亮色实体铭牌 + 极淡描边 + 独立左侧 4px Accent 竖条 + 投影
          pSlide.addShape(pres.ShapeType.rect, {
            objectName: box.morphId ? `!!${box.morphId}` : undefined,
            x: pxToInX(box.x),
            y: pxToInY(box.y),
            w: pxToInX(box.w),
            h: pxToInY(box.h),
            fill: fillObj,
            line: { color: borderHex, width: 0.5 },
            shadow: cardShadow,
          });
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(box.x),
            y: pxToInY(box.y),
            w: pxToInX(4),
            h: pxToInY(box.h),
            fill: { color: accentHex },
            line: NO_LINE,
          });
        }
      }

      // 公式展示外框（由原生形状绘制淡底色与上下双实线）
      for (const fm of extracted.formulas) {
        if (!fm.isFrame) continue;
        const fmFill = toPptxFill(fm.bgCss, surfaceHex);
        if (fmFill) {
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(fm.x),
            y: pxToInY(fm.y),
            w: pxToInX(fm.w),
            h: pxToInY(fm.h),
            fill: fmFill,
            line: NO_LINE,
          });
        }
        const fmRuleHex = toPptxHex(fm.borderColorCss, textPrimaryHex);
        pSlide.addShape(pres.ShapeType.rect, {
          x: pxToInX(fm.x),
          y: pxToInY(fm.y),
          w: pxToInX(fm.w),
          h: Math.max(0.012, pxToInY(1.5)),
          fill: { color: fmRuleHex },
          line: NO_LINE,
        });
        pSlide.addShape(pres.ShapeType.rect, {
          x: pxToInX(fm.x),
          y: pxToInY(fm.y + fm.h - 1.5),
          w: pxToInX(fm.w),
          h: Math.max(0.012, pxToInY(1.5)),
          fill: { color: fmRuleHex },
          line: NO_LINE,
        });
      }

      // 代码窗体（外框、顶栏、3颗控制圆点、逐行高亮条全部原生可编辑化）
      let slideCodeLines: Array<{ text: string; highlight: boolean }> | undefined;
      for (const cw of extracted.codeWindows) {
        slideCodeLines = cw.lines;
        const cwFill = toPptxFill(cw.bgCss, '10141E') || { color: '10141E' };
        pSlide.addShape(pres.ShapeType.roundRect, {
          x: pxToInX(cw.x),
          y: pxToInY(cw.y),
          w: pxToInX(cw.w),
          h: pxToInY(cw.h),
          rectRadius: 0.06,
          fill: cwFill,
          line: { color: toPptxHex(cw.borderCss, borderHex), width: 0.75 },
          shadow: cardShadow,
        });

        const barFill = toPptxFill(cw.barBgCss, '161C2B');
        if (barFill) {
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(cw.x),
            y: pxToInY(cw.y),
            w: pxToInX(cw.w),
            h: pxToInY(cw.barH),
            fill: barFill,
            line: NO_LINE,
          });
        }
        pSlide.addShape(pres.ShapeType.rect, {
          x: pxToInX(cw.x),
          y: pxToInY(cw.y + cw.barH - 1),
          w: pxToInX(cw.w),
          h: Math.max(0.01, pxToInY(1)),
          fill: toPptxFill(cw.barBorderCss, '263042') || { color: '263042', transparency: 70 },
          line: NO_LINE,
        });

        for (const d of cw.dots) {
          pSlide.addShape(pres.ShapeType.ellipse, {
            x: pxToInX(d.x),
            y: pxToInY(d.y),
            w: pxToInX(d.w),
            h: pxToInY(d.h),
            fill: toPptxFill(d.bgCss, '475569') || { color: '475569', transparency: 75 },
            line: NO_LINE,
          });
        }

        for (const hb of cw.highlightBands) {
          const hlFill = toPptxFill(hb.bgCss, '38BDF8') || {
            color: '38BDF8',
            transparency: 82,
          };
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(hb.x),
            y: pxToInY(hb.y),
            w: pxToInX(hb.w),
            h: pxToInY(hb.h),
            fill: hlFill,
            line: NO_LINE,
          });
        }
      }

      // Layer 2c: 100% 全元素原生拓扑架构图（泳道 + 平滑三次贝塞尔连接曲线 + 精确节点卡片 + 单行胶囊）
      if (irSlide.diagram && extracted.diagramNodes.length > 0) {
        for (const lane of extracted.diagramLanes) {
          pSlide.addShape(pres.ShapeType.roundRect, {
            x: pxToInX(lane.x),
            y: pxToInY(lane.y),
            w: pxToInX(lane.w),
            h: pxToInY(lane.h),
            rectRadius: 0.04,
            fill: { color: textPrimaryHex, transparency: 96 },
            line: { color: borderHex, width: 0.6 },
          });
          if (lane.title) {
            pSlide.addText(lane.title, {
              x: pxToInX(lane.x + 18),
              y: pxToInY(lane.y + 8),
              w: pxToInX(160),
              h: pxToInY(22),
              fontFace: style.typography.pptx_font_mono,
              fontSize: 6.5,
              bold: true,
              color: textMutedHex,
              lang: localeLang,
              margin: 0,
            });
          }
        }

        for (const edge of extracted.diagramEdges) {
          if (edge.isCurve) {
            addCubicBezierEdgeToSlide(
              pres,
              pSlide,
              edge,
              accentHex,
              edge.hasArrow ? 1.5 : 1.0,
              edge.dashed,
              edge.hasArrow
            );
          } else {
            addNativeLine(
              pres,
              pSlide,
              edge.x1,
              edge.y1,
              edge.x2,
              edge.y2,
              accentHex,
              edge.hasArrow ? 1.5 : 1.0,
              edge.dashed,
              edge.hasArrow
            );
          }
        }

        const isPipeline = irSlide.diagram.layout === 'pipeline';
        extracted.diagramNodes.forEach((nDetail) => {
          const spec = irSlide.diagram!.nodes[nDetail.nodeIndex];
          if (!spec) return;
          const isAcc = Boolean(spec.accent);
          const strokeHex = isAcc ? accentHex : borderHex;
          const card = nDetail.card;

          pSlide.addShape(pres.ShapeType.roundRect, {
            x: pxToInX(card.x),
            y: pxToInY(card.y),
            w: pxToInX(card.w),
            h: pxToInY(card.h),
            rectRadius: 0.04,
            fill: { color: surfaceHex },
            line: { color: strokeHex, width: isAcc ? 1.5 : 1.0 },
          });

          if (nDetail.bar) {
            pSlide.addShape(pres.ShapeType.rect, {
              x: pxToInX(nDetail.bar.x),
              y: pxToInY(nDetail.bar.y),
              w: pxToInX(nDetail.bar.w),
              h: pxToInY(nDetail.bar.h),
              fill: { color: isAcc ? accentHex : textMutedHex },
              line: NO_LINE,
            });
          }

          if (nDetail.dot) {
            pSlide.addShape(pres.ShapeType.ellipse, {
              x: pxToInX(nDetail.dot.x),
              y: pxToInY(nDetail.dot.y),
              w: pxToInX(nDetail.dot.w),
              h: pxToInY(nDetail.dot.h),
              fill: { color: isAcc ? accentHex : borderHex },
              line: NO_LINE,
            });
          }

          if (nDetail.divider) {
            pSlide.addShape(pres.ShapeType.rect, {
              x: pxToInX(nDetail.divider.x),
              y: pxToInY(nDetail.divider.y),
              w: pxToInX(nDetail.divider.w),
              h: Math.max(0.01, pxToInY(1)),
              fill: { color: borderHex, transparency: 40 },
              line: NO_LINE,
            });
          }

          if (nDetail.subBg) {
            pSlide.addShape(pres.ShapeType.roundRect, {
              x: pxToInX(nDetail.subBg.x),
              y: pxToInY(nDetail.subBg.y),
              w: pxToInX(nDetail.subBg.w),
              h: pxToInY(nDetail.subBg.h),
              rectRadius: 0.03,
              fill: { color: accentHex, transparency: isAcc ? 90 : 95 },
              line: NO_LINE,
            });
          }

          // 按提取出的精确相对坐标独立放置 tag / title / sublabel，避免大字合并挤出底边
          if (nDetail.tag) {
            pSlide.addText(stripWordJoiners(nDetail.tag.text), {
              x: pxToInX(nDetail.tag.x),
              y: pxToInY(nDetail.tag.y - 2),
              w: pxToInX(Math.max(80, card.x + card.w - nDetail.tag.x - 16)),
              h: pxToInY(Math.max(18, nDetail.tag.h + 4)),
              valign: 'middle',
              fontFace: style.typography.pptx_font_mono,
              fontSize: pxToPt(nDetail.tag.fontSizePx),
              bold: true,
              color: isAcc ? accentHex : textMutedHex,
              lang: localeLang,
              margin: 0,
            });
          }

          if (nDetail.title) {
            const titleAvailW = Math.max(60, card.x + card.w - nDetail.title.x - 14);
            const titleMaxH = nDetail.sub
              ? Math.max(22, nDetail.sub.y - nDetail.title.y - 2)
              : Math.max(26, card.y + card.h - nDetail.title.y - 8);
            pSlide.addText(stripWordJoiners(spec.label), {
              x: pxToInX(nDetail.title.x),
              y: pxToInY(nDetail.title.y - 2),
              w: pxToInX(titleAvailW),
              h: pxToInY(titleMaxH + 4),
              valign: 'top',
              fontFace: style.typography.pptx_font_body,
              fontSize: pxToPt(nDetail.title.fontSizePx),
              bold: true,
              color: textPrimaryHex,
              lang: localeLang,
              wrap: true,
              margin: 0,
            });
          }

          if (spec.sublabel && nDetail.sub) {
            const subRightLimit = nDetail.subBg ? nDetail.subBg.x + nDetail.subBg.w - 8 : card.x + card.w - 14;
            const subAvailW = Math.max(60, subRightLimit - nDetail.sub.x);
            const subAvailH = isPipeline && nDetail.subBg
              ? nDetail.subBg.h
              : Math.max(20, card.y + card.h - nDetail.sub.y - 4);
            pSlide.addText(stripWordJoiners(spec.sublabel), {
              x: pxToInX(nDetail.sub.x),
              y: pxToInY(isPipeline && nDetail.subBg ? nDetail.subBg.y : nDetail.sub.y - 2),
              w: pxToInX(subAvailW),
              h: pxToInY(subAvailH + 4),
              valign: isPipeline ? 'middle' : 'top',
              fontFace: style.typography.pptx_font_mono,
              fontSize: pxToPt(nDetail.sub.fontSizePx),
              bold: isPipeline,
              color: isAcc ? accentHex : textSecondaryHex,
              lang: localeLang,
              wrap: true,
              margin: 0,
            });
          }
        });

        for (const pill of extracted.diagramPills) {
          const safePillW = pill.w + 18;
          const safePillX = pill.x - 9;
          pSlide.addShape(pres.ShapeType.roundRect, {
            x: pxToInX(safePillX),
            y: pxToInY(pill.y),
            w: pxToInX(safePillW),
            h: pxToInY(pill.h),
            rectRadius: 0.45,
            fill: { color: bgPrimaryHex },
            line: { color: borderHex, width: 0.9 },
          });
          pSlide.addText(stripWordJoiners(pill.text), {
            x: pxToInX(safePillX - 8),
            y: pxToInY(pill.y),
            w: pxToInX(safePillW + 16),
            h: pxToInY(pill.h),
            align: 'center',
            valign: 'middle',
            fontFace: style.typography.pptx_font_mono,
            fontSize: pxToPt(pill.fontSizePx),
            bold: true,
            color: textPrimaryHex,
            lang: localeLang,
            wrap: false,
            margin: 0,
          });
        }
      }

      // Layer 2d: 100% 全元素原生战略象限图（零黑框陷阱 + 单行防溢标签）
      if (irSlide.quadrant && extracted.quadrantData) {
        const qd = extracted.quadrantData;
        if (qd.hiZone) {
          pSlide.addShape(pres.ShapeType.rect, {
            x: pxToInX(qd.hiZone.x),
            y: pxToInY(qd.hiZone.y),
            w: pxToInX(qd.hiZone.w),
            h: pxToInY(qd.hiZone.h),
            fill: { color: accentHex, transparency: 92 },
            line: NO_LINE,
          });
        }
        if (qd.frame) {
          // 不传 fill 以生成 <a:noFill/>
          pSlide.addShape(pres.ShapeType.roundRect, {
            x: pxToInX(qd.frame.x),
            y: pxToInY(qd.frame.y),
            w: pxToInX(qd.frame.w),
            h: pxToInY(qd.frame.h),
            rectRadius: 0.03,
            line: { color: borderHex, width: 1.0 },
          });
        }
        for (const ax of qd.axes) {
          addNativeLine(pres, pSlide, ax.x1, ax.y1, ax.x2, ax.y2, borderHex, 1.0, true, false);
        }
        for (const ld of qd.leaders) {
          addNativeLine(pres, pSlide, ld.x1, ld.y1, ld.x2, ld.y2, accentHex, 0.85, true, false);
        }
        for (const pt of qd.points) {
          const ptHex = pt.isHero ? accentHex : toPptxHex(pt.colorCss, accentHex);
          if (pt.isHero) {
            const haloPad = 8;
            pSlide.addShape(pres.ShapeType.ellipse, {
              x: pxToInX(pt.x - haloPad),
              y: pxToInY(pt.y - haloPad),
              w: pxToInX(pt.w + haloPad * 2),
              h: pxToInY(pt.h + haloPad * 2),
              fill: { color: accentHex, transparency: 80 },
              line: NO_LINE,
            });
          }
          pSlide.addShape(pres.ShapeType.ellipse, {
            x: pxToInX(pt.x),
            y: pxToInY(pt.y),
            w: pxToInX(pt.w),
            h: pxToInY(pt.h),
            fill: { color: ptHex, transparency: pt.isHero ? 0 : 18 },
            line: { color: pt.isHero ? 'FFFFFF' : ptHex, width: 1.2 },
          });
        }
        for (const lb of qd.labels) {
          const pad = 28;
          const bx =
            lb.align === 'center'
              ? lb.x - pad / 2
              : lb.align === 'right'
              ? lb.x - pad
              : lb.x;
          pSlide.addText(stripWordJoiners(lb.text), {
            x: pxToInX(Math.max(0, bx)),
            y: pxToInY(lb.y - 2),
            w: pxToInX(lb.w + pad),
            h: pxToInY(lb.h + 6),
            align: lb.align,
            valign: 'middle',
            fontFace: lb.isMuted ? style.typography.pptx_font_mono : style.typography.pptx_font_body,
            fontSize: pxToPt(lb.fontSizePx),
            bold: lb.isHero || !lb.isSec,
            color: lb.isHero
              ? accentHex
              : lb.isMuted
              ? textMutedHex
              : lb.isSec
              ? textSecondaryHex
              : textPrimaryHex,
            lang: localeLang,
            wrap: false,
            margin: 0,
          });
        }
      }

      // Layer 2e: 原生 SVG 矢量图标（custGeom / ellipse / roundRect，完全独立可缩放可改色）
      for (const ic of extracted.icons) {
        addSvgIconToSlide(
          pres,
          pSlide,
          ic.iconName,
          { x: ic.x, y: ic.y, w: ic.w, h: ic.h },
          toPptxHex(ic.colorCss, accentHex),
          Math.max(1.0, Number((ic.strokeWidth * 0.65).toFixed(2)))
        );
      }

      // Layer 3a: 真·原生可编辑 Excel 统计图表 (含 Combo 渐变面积/空心折线/精准环形图)
      if (irSlide.chart && extracted.chartBox) {
        const meta = addNativeEditableChart(
          pres,
          pSlide,
          irSlide.chart,
          extracted.chartBox,
          style,
          localeLang
        );
        chartMetas.push(meta);
      }

      // Layer 3b: 原生可编辑 Office Math 公式 (<p:sp><p:txBody><a:p><a14:m>/<m:oMath>)，无外层 <mc:AlternateContent> 杜绝 WPS 双重渲染重影
      const slideOmmlSpecs: OmmlReplacementSpec[] = [];
      for (let fi = 0; fi < preparedFormulas.length; fi++) {
        const pf = preparedFormulas[fi];
        const fm = pf.box;
        if (pf.ommlParaXml) {
          const objName = `__omml_formula_${fi}__`;
          pSlide.addShape(pres.ShapeType.rect, {
            objectName: objName,
            x: pxToInX(fm.x),
            y: pxToInY(fm.y),
            w: pxToInX(fm.w),
            h: pxToInY(fm.h),
            line: NO_LINE,
          });
          slideOmmlSpecs.push({
            objectName: objName,
            ommlParaXml: pf.ommlParaXml,
            align: fm.align === 'center' ? 'ctr' : fm.align === 'right' ? 'r' : 'l',
          });
        } else if (pf.fallbackDataUri) {
          pSlide.addImage({
            data: pf.fallbackDataUri,
            x: pxToInX(fm.x),
            y: pxToInY(fm.y),
            w: pxToInX(fm.w),
            h: pxToInY(fm.h),
          });
        }
      }
      if (slideOmmlSpecs.length > 0) {
        ommlReplacements.set(i, slideOmmlSpecs);
      }

      // Layer 4a: 真·顶刊三线表（左右无边框 type:'none'，末行加粗底线，紧凑对齐字号，富文本高亮）
      for (const tbl of extracted.tables) {
        const cellFontPt = Math.max(7.5, Math.min(9.5, pxToPt(tbl.fontSizePx)));
        const pptRows = tbl.rows.map((row) =>
          row.map((cell) => {
            const borderTop = cell.isHeader
              ? { type: 'solid' as const, pt: 1.8, color: textPrimaryHex }
              : NO_LINE;
            const borderBottom = cell.isHeader
              ? { type: 'solid' as const, pt: 1.1, color: textPrimaryHex }
              : cell.isLastRow
              ? { type: 'solid' as const, pt: 1.8, color: textPrimaryHex }
              : { type: 'solid' as const, pt: 0.5, color: borderHex };

            const baseCellColor =
              cell.isHeader || cell.isHighlightRow ? textPrimaryHex : textSecondaryHex;

            const cellTextRuns =
              cell.runs.length > 0
                ? cell.runs
                    .flatMap((rn) => {
                      const runColor = rn.highlight ? accentHex : baseCellColor;
                      if (rn.kind === 'latex') {
                        return latexToStyledInlineRuns(rn.text, {
                          colorHex: runColor,
                          fontSizePt: cellFontPt,
                          bold: rn.bold,
                        }).map((ir) => ({
                          text: stripWordJoiners(ir.text),
                          options: {
                            ...ir.options,
                            lang: 'en-US',
                          },
                        }));
                      }
                      const clean = stripWordJoiners(rn.text);
                      if (!clean) return [];
                      return [
                        {
                          text: clean,
                          options: {
                            bold: rn.bold,
                            color: runColor,
                            fontFace: style.typography.pptx_font_body,
                            fontSize: cellFontPt,
                            lang: localeLang,
                          },
                        },
                      ];
                    })
                    .filter((rn) => rn.text.length > 0)
                : [{ text: '', options: { fontSize: cellFontPt } }];

            return {
              text: cellTextRuns,
              options: {
                align: cell.align,
                valign: 'middle' as const,
                fill: cell.isHighlightRow ? { color: accentHex, transparency: 86 } : undefined,
                border: [borderTop, NO_LINE, borderBottom, NO_LINE],
                margin: [3, 6, 3, 6],
              },
            };
          })
        );

        const colW = tbl.colWidthsPx.map((cw) => pxToInX(cw));
        const rowH = tbl.rowHeightsPx.map((rh) => pxToInY(rh));
        pSlide.addTable(pptRows, {
          x: pxToInX(tbl.x),
          y: pxToInY(tbl.y),
          w: pxToInX(tbl.w),
          colW: colW.length > 0 ? colW : undefined,
          rowH: rowH.length > 0 ? rowH : undefined,
        });
      }

      // Layer 4b: 顶层 100% 原生可编辑文本框（严格 0.5x 字号、列安全夹紧、保留 \n 与行内公式、避头尾断行）
      for (const txt of extracted.texts) {
        let fontFace = txt.isMono
          ? style.typography.pptx_font_mono
          : txt.isSerifTitle
          ? style.typography.pptx_font_title
          : txt.role === 'title'
          ? style.typography.pptx_font_title
          : style.typography.pptx_font_body;

        const baseHex =
          txt.role === 'code'
            ? 'E5E9F0'
            : txt.role === 'side-note'
            ? toPptxHex(mixColors(txt.colorCss, style.palette.bg_primary, 0.35), textMutedHex)
            : txt.role === 'crosshair'
            ? toPptxHex(mixColors(txt.colorCss, style.palette.bg_primary, 0.62), textMutedHex)
            : txt.role === 'decor-quote'
            ? toPptxHex(mixColors(txt.colorCss, style.palette.bg_primary, 0.48), accentHex)
            : toPptxHex(txt.colorCss, textPrimaryHex);

        const fontSizePt = pxToPt(txt.fontSizePx);

        // 规避 STZhongsong 无粗体字重在小字号下触发 GDI 伪粗体错位发虚（改用现代黑体或去粗体）
        let allowBold = true;
        if (fontFace === 'STZhongsong' && fontSizePt < 14) {
          fontFace = style.typography.pptx_font_body;
        }

        let boxX = txt.x;
        let boxY = txt.y;
        let boxW = txt.w;
        let boxH = txt.h;

        if (txt.isVertical) {
          boxW = Math.min(STAGE_W - boxX - 10, txt.w + 18);
          boxH = Math.min(STAGE_H - txt.y - 6, txt.h + 24);
        } else if (txt.isAsciiVertical) {
          boxX = Math.max(0, txt.x - 4);
          boxW = txt.w + 10;
          boxH = Math.min(STAGE_H - txt.y - 6, txt.h + 24);
        } else if (txt.role === 'seal') {
          boxX = Math.max(0, txt.x - 2);
          boxY = Math.max(0, txt.y - 2);
          boxW = txt.w + 4;
          boxH = txt.h + 4;
        } else {
          // 精准外扩冗余且严格夹紧在所属列容器边界内，杜绝跨栏撞车与右对齐漂移
          const padPx = txt.isSingleLine ? 14 : 8;
          if (txt.align === 'center') {
            boxX = Math.max(txt.minLeftPx, txt.x - padPx / 2);
            const rightBound = Math.min(txt.maxRightPx, txt.x + txt.w + padPx / 2);
            boxW = Math.max(txt.w, rightBound - boxX);
          } else if (txt.align === 'right') {
            boxX = Math.max(txt.minLeftPx, txt.x - padPx);
            boxW = Math.max(txt.w, txt.x + txt.w - boxX);
          } else {
            boxX = txt.x;
            const availW = Math.max(txt.w, txt.maxRightPx - txt.x);
            boxW = Math.min(availW, txt.w + padPx);
          }
          boxH = Math.min(STAGE_H - txt.y - 4, txt.h + (txt.isSingleLine ? 6 : 12));
        }

        const lhRatio = txt.lineHeightPx / Math.max(txt.fontSizePx, 1);
        const pptLineMultiple =
          txt.role === 'code'
            ? Number(Math.max(1.0, Math.min(2.0, lhRatio)).toFixed(2))
            : Number(Math.max(1.02, Math.min(1.55, lhRatio * 0.88)).toFixed(2));
        const charSpacingPt =
          txt.letterSpacingPx > 0.6 && !txt.isVertical
            ? Number(Math.min(4.5, txt.letterSpacingPx * 0.42).toFixed(1))
            : undefined;

        const textRuns: any[] = [];
        let pendingBreak = false;

        if (txt.role === 'code' && (txt.codeLines || slideCodeLines)) {
          const linesToRender = txt.codeLines || slideCodeLines!;
          linesToRender.forEach((ln, li) => {
            const isLast = li === linesToRender.length - 1;
            textRuns.push({
              text: ln.text || ' ',
              options: {
                color: ln.highlight ? 'FFFFFF' : 'E5E9F0',
                bold: ln.highlight,
                fontFace,
                fontSize: fontSizePt,
                lang: 'en-US',
                breakLine: !isLast,
              },
            });
          });
        } else if (!txt.preserveWhitespace) {
          // 规范化普通 HTML 文本空白：仅由 <br/> 触发显式换行，避免模板缩进产生多余 <a:br/> 或前导空格
          type NonBreakPart = Exclude<ExtractedInlinePart, { kind: 'break' }>;
          const segments: NonBreakPart[][] = [[]];
          for (const part of txt.parts) {
            if (part.kind === 'break') {
              segments.push([]);
            } else {
              segments[segments.length - 1].push(part);
            }
          }

          segments.forEach((segParts, segIdx) => {
            const normParts: NonBreakPart[] = [];
            let prevEndedWithSpace = true;

            for (const sp of segParts) {
              if (sp.kind === 'latex') {
                normParts.push(sp);
                prevEndedWithSpace = false;
                continue;
              }
              let t = stripWordJoiners(sp.text).replace(/[\r\n\t ]+/g, ' ');
              if (prevEndedWithSpace && t.startsWith(' ')) {
                t = t.slice(1);
              }
              if (t.length > 0) {
                prevEndedWithSpace = t.endsWith(' ');
                normParts.push({ ...sp, text: t });
              }
            }

            while (normParts.length > 0) {
              const last = normParts[normParts.length - 1];
              if (last.kind !== 'text') break;
              const trimmedEnd = last.text.replace(/ +$/g, '');
              if (trimmedEnd.length === 0) {
                normParts.pop();
              } else {
                last.text = trimmedEnd;
                break;
              }
            }

            if (segIdx > 0) {
              if (textRuns.length > 0) {
                textRuns[textRuns.length - 1].options.breakLine = true;
              } else {
                pendingBreak = true;
              }
            }

            for (const np of normParts) {
              if (np.kind === 'latex') {
                const mathColor = np.highlight ? accentHex : baseHex;
                const inlineRuns = latexToStyledInlineRuns(np.latex, {
                  colorHex: mathColor,
                  fontSizePt,
                  bold: allowBold && (np.bold || txt.fontWeight >= 600),
                });
                inlineRuns.forEach((ir, iri) => {
                  textRuns.push({
                    text: stripWordJoiners(ir.text),
                    options: {
                      ...ir.options,
                      lang: 'en-US',
                      softBreakBefore: iri === 0 && pendingBreak ? true : undefined,
                    },
                  });
                  if (iri === 0) pendingBreak = false;
                });
              } else {
                textRuns.push({
                  text: np.text,
                  options: {
                    fontSize: np.fontSizePx ? pxToPt(np.fontSizePx) : fontSizePt,
                    color: np.highlight
                      ? accentHex
                      : np.colorCss
                        ? toPptxHex(np.colorCss, baseHex)
                        : baseHex,
                    bold: allowBold && (np.bold || (!np.fontSizePx && txt.fontWeight >= 600)),
                    italic: np.italic ? true : undefined,
                    lang: localeLang,
                    softBreakBefore: pendingBreak ? true : undefined,
                  },
                });
                pendingBreak = false;
              }
            }
          });
        } else {
          for (const part of txt.parts) {
            if (part.kind === 'break') {
              // 在上一条 run 上设 breakLine: true 或下一条设 softBreakBefore
              if (textRuns.length > 0) {
                textRuns[textRuns.length - 1].options.breakLine = true;
              } else {
                pendingBreak = true;
              }
              continue;
            }

            if (part.kind === 'latex') {
              const mathColor = part.highlight ? accentHex : baseHex;
              const inlineRuns = latexToStyledInlineRuns(part.latex, {
                colorHex: mathColor,
                fontSizePt,
                bold: allowBold && (part.bold || txt.fontWeight >= 600),
              });
              inlineRuns.forEach((ir, iri) => {
                textRuns.push({
                  text: stripWordJoiners(ir.text),
                  options: {
                    ...ir.options,
                    lang: 'en-US',
                    softBreakBefore: iri === 0 && pendingBreak ? true : undefined,
                  },
                });
                if (iri === 0) pendingBreak = false;
              });
              continue;
            }

            const cleanText = stripWordJoiners(part.text);
            if (!cleanText) continue;

            // <pre> 等保留空白节点：按 \r?\n 还原真实折行
            const subLines = cleanText.split(/\r?\n/);
            subLines.forEach((seg, si) => {
              const hasMore = si < subLines.length - 1;
              if (!seg && !hasMore) return;
              textRuns.push({
                text: seg || (hasMore ? ' ' : ''),
                options: {
                  fontSize: part.fontSizePx ? pxToPt(part.fontSizePx) : fontSizePt,
                  color: part.highlight
                    ? accentHex
                    : part.colorCss
                      ? toPptxHex(part.colorCss, baseHex)
                      : baseHex,
                  bold: allowBold && (part.bold || (!part.fontSizePx && txt.fontWeight >= 600)),
                  italic: part.italic ? true : undefined,
                  lang: localeLang,
                  breakLine: hasMore ? true : undefined,
                  softBreakBefore: si === 0 && pendingBreak ? true : undefined,
                },
              });
              if (si === 0) pendingBreak = false;
            });
          }
        }

        if (textRuns.length === 0) continue;

        pSlide.addText(textRuns, {
          objectName: txt.morphId ? `!!${txt.morphId}` : undefined,
          x: pxToInX(boxX),
          y: pxToInY(boxY),
          w: pxToInX(Math.max(8, boxW)),
          h: pxToInY(Math.max(8, boxH)),
          fontFace,
          fontSize: fontSizePt,
          align: txt.role === 'seal' ? 'center' : txt.align,
          valign: txt.valign,
          vert: txt.isVertical ? 'eaVert' : txt.isAsciiVertical ? 'vert' : undefined,
          margin: 0,
          wrap: txt.isSingleLine && txt.role !== 'code' ? false : true,
          ...(txt.role === 'code'
            ? { lineSpacing: Number((txt.lineHeightPx * 0.5).toFixed(2)) }
            : { lineSpacingMultiple: pptLineMultiple }),
          charSpacing: charSpacingPt,
        });
      }
    }

    const rawBuffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;

    const { buffer: finalBuffer, audit } = await injectMorphTransitionsAndAudit(
      rawBuffer,
      deck,
      Math.max(980, style.motion.duration_ms),
      {
        chartMetas,
        ommlReplacements,
      }
    );

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, finalBuffer);

    return {
      pptxPath: outputPath,
      audit,
    };
  } finally {
    await context.close().catch(() => {});
    if (fs.existsSync(tmpHtmlPath)) {
      fs.unlinkSync(tmpHtmlPath);
    }
  }
}
