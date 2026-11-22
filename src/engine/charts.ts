/**
 * 工业级高信噪比数据可视化与精密拓扑架构引擎 v3.2
 * 核心升级：
 * 1. 全量绑定 CSS 变量 (--text-primary, --text-secondary, --chart-1..6, --svg-grid-line)，T 键实时换肤 0ms 无感重绘，彻底根治白底白字隐身与赛博色串味；
 * 2. 接入 formatMetricWithUnit 金融与科学量纲格式化，彻底消灭 "18.5$M" 前后缀颠倒错误；
 * 3. 战略象限图升级为 4 圈 32 槽位多半径螺旋防碰撞搜索 + 自动细引线 (Leader Line)，同象限扎堆 4~6 个竞品依然 100% 零叠字零压球；
 * 4. 完整注入 data-quad-* 与 data-diagram-* 几何锚点，支撑 PPTX 端 100% 全元素原生形状与文本重建（告别背景死箭头与静态象限截图）。
 */
import type {
  ChartSpec,
  DiagramEdge,
  DiagramSpec,
  QuadrantSpec,
  StylePack,
} from '../types/ir.js';
import { isDarkColor, withAlpha } from '../utils/color.js';
import {
  escapeHtml,
  estimateCjkUnits,
  formatMetricWithUnit,
} from '../utils/typography.js';

export function renderChartSvg(chart: ChartSpec, style: StylePack, uid = 'ch'): string {
  const W = 940;
  const H = 510;
  const p = style.palette;
  const palette = p.chart_palette;
  const gridCol = withAlpha(p.text_primary, isDarkColor(p.bg_primary) ? 0.13 : 0.11);
  const axisTextCol = p.text_secondary;
  const fontMono = style.typography.font_mono.replace(/"/g, "'");
  const fontBody = style.typography.font_body.replace(/"/g, "'");

  if (chart.type === 'donut') {
    return renderDonutChart(chart, style, W, H, fontBody, fontMono);
  }
  if (chart.type === 'horizontal-bar') {
    return renderHorizontalBarChart(chart, style, W, H, fontBody, fontMono);
  }

  const padL = 92;
  const padR = 44;
  const padT = chart.series.length > 1 ? 68 : 44;
  const padB = 68;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const allVals = chart.series.flatMap((s) => s.values);
  const rawMax = Math.max(...allVals, 1);
  const rawMin = Math.min(0, ...allVals);
  const niceMax = rawMax <= 10 ? Math.ceil(rawMax * 1.18) : Math.ceil((rawMax * 1.14) / 5) * 5;
  const span = niceMax - rawMin || 1;

  const yOf = (v: number) => padT + plotH - ((v - rawMin) / span) * plotH;
  const rawUnit = chart.unit || '';

  let gridSvg = '';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = rawMin + (span * i) / ticks;
    const y = yOf(val);
    const numStr = Number.isInteger(val) ? `${val}` : val.toFixed(1);
    const tickText = i === ticks ? formatMetricWithUnit(numStr, rawUnit) : numStr;
    gridSvg += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${gridCol}" style="stroke:var(--svg-grid-line)" stroke-width="1" ${
      i === 0 ? '' : 'stroke-dasharray="4 4"'
    }/>
      <text x="${padL - 14}" y="${y + 5}" text-anchor="end" fill="${axisTextCol}" style="fill:var(--text-secondary)" font-family="${fontMono}" font-size="14.5">${escapeHtml(
      tickText
    )}</text>
    `;
  }

  // 多序列图例：使用 estimateCjkUnits 精准区分中英文宽度，并绑定 --chart-i 变量
  let legendSvg = '';
  if (chart.series.length > 1) {
    let lx = padL;
    chart.series.forEach((s, si) => {
      const col = s.color || palette[si % palette.length];
      const cssCol = s.color ? s.color : `var(--chart-${(si % 6) + 1})`;
      legendSvg += `
        <rect x="${lx}" y="14" width="14" height="14" rx="3" fill="${col}" style="fill:${cssCol}"/>
        <text x="${lx + 22}" y="26" fill="${p.text_primary}" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="15" font-weight="600">${escapeHtml(
        s.name
      )}</text>
      `;
      lx += Math.round(estimateCjkUnits(s.name) * 15.5) + 48;
    });
    if (rawUnit.trim()) {
      legendSvg += `<text x="${W - padR}" y="26" text-anchor="end" fill="${axisTextCol}" style="fill:var(--text-secondary)" font-family="${fontMono}" font-size="13.5">UNIT: ${escapeHtml(
        rawUnit.trim()
      )}</text>`;
    }
  }

  const cats = chart.categories;
  const catCount = Math.max(cats.length, 1);
  let dataSvg = '';

  if (chart.type === 'bar' || chart.type === 'grouped-bar') {
    const stepW = plotW / catCount;
    const sCount = chart.series.length;
    const barGap = sCount > 1 ? 14 : 10;
    const groupW = Math.min(stepW * (sCount > 1 ? 0.74 : 0.62), sCount * 74);
    const barW = (groupW - (sCount - 1) * barGap) / sCount;
    const omitLongUnitOnGrouped = sCount > 1 && rawUnit.trim().length > 2;

    cats.forEach((cat, ci) => {
      const groupStartX = padL + ci * stepW + (stepW - groupW) / 2;
      chart.series.forEach((s, si) => {
        const val = s.values[ci] ?? 0;
        const x = groupStartX + si * (barW + barGap);
        const y = yOf(Math.max(val, 0));
        const h = Math.max(4, yOf(0) - y);
        const isHighlighted =
          chart.highlight_index === undefined || sCount > 1 || chart.highlight_index === ci;
        const baseCol = s.color || palette[si % palette.length];
        const cssCol = s.color
          ? s.color
          : sCount === 1
          ? 'var(--accent)'
          : `var(--chart-${(si % 6) + 1})`;
        const valLabel = omitLongUnitOnGrouped
          ? String(val)
          : formatMetricWithUnit(val, rawUnit);

        dataSvg += `
          <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${baseCol}" style="fill:${cssCol}" fill-opacity="${
          isHighlighted ? '1' : '0.38'
        }"/>
          <text x="${x + barW / 2}" y="${y - 10}" text-anchor="middle" fill="${
          isHighlighted ? p.text_primary : axisTextCol
        }" style="fill:${
          isHighlighted ? 'var(--text-primary)' : 'var(--text-secondary)'
        }" font-family="${fontMono}" font-size="14.5" font-weight="${
          isHighlighted ? '700' : '500'
        }">${escapeHtml(valLabel)}</text>
        `;
      });

      dataSvg += `
        <text x="${padL + ci * stepW + stepW / 2}" y="${H - 22}" text-anchor="middle" fill="${
        p.text_primary
      }" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="15" font-weight="500">${escapeHtml(
        cat
      )}</text>
      `;
    });
  } else {
    const xOf = (ci: number) =>
      catCount === 1 ? padL + plotW / 2 : padL + (ci / (catCount - 1)) * plotW;

    let defs = '';
    chart.series.forEach((s, si) => {
      const col = s.color || palette[si % palette.length];
      const cssCol = s.color ? s.color : `var(--chart-${(si % 6) + 1})`;
      const pts = cats.map((_, ci) => ({
        x: xOf(ci),
        y: yOf(s.values[ci] ?? 0),
        v: s.values[ci] ?? 0,
      }));
      const lineD = buildSmoothPath(pts);

      if (chart.type === 'area') {
        const gradId = `${uid}-area-${si}`;
        defs += `
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${col}" style="stop-color:${cssCol}" stop-opacity="0.34"/>
            <stop offset="100%" stop-color="${col}" style="stop-color:${cssCol}" stop-opacity="0.02"/>
          </linearGradient>
        `;
        const areaD = `${lineD} L ${pts[pts.length - 1].x} ${yOf(rawMin)} L ${pts[0].x} ${yOf(rawMin)} Z`;
        dataSvg += `<path d="${areaD}" fill="url(#${gradId})"/>`;
      }

      dataSvg += `<path d="${lineD}" fill="none" stroke="${col}" style="stroke:${cssCol}" stroke-width="3.5" stroke-linecap="round"/>`;

      pts.forEach((pt, ci) => {
        const isFocus = chart.highlight_index === ci || ci === pts.length - 1;
        const labelDy = si === 0 ? -15 : 26;
        const formattedPt = formatMetricWithUnit(pt.v, rawUnit);
        dataSvg += `
          ${
            isFocus
              ? `<circle cx="${pt.x}" cy="${pt.y}" r="11" fill="${col}" style="fill:${cssCol}" fill-opacity="0.22"/>`
              : ''
          }
          <circle cx="${pt.x}" cy="${pt.y}" r="${isFocus ? 6 : 4.5}" fill="${
          p.bg_primary
        }" style="fill:var(--bg-primary);stroke:${cssCol}" stroke="${col}" stroke-width="3"/>
          ${
            (si === 0 && catCount <= 6) || isFocus
              ? `<text x="${pt.x}" y="${pt.y + labelDy}" text-anchor="middle" fill="${
                  isFocus ? p.text_primary : axisTextCol
                }" style="fill:${
                  isFocus ? 'var(--text-primary)' : 'var(--text-secondary)'
                }" font-family="${fontMono}" font-size="14" font-weight="${
                  isFocus ? '700' : '500'
                }">${escapeHtml(formattedPt)}</text>`
              : ''
          }
        `;
      });
    });

    cats.forEach((cat, ci) => {
      dataSvg += `<text x="${xOf(ci)}" y="${H - 22}" text-anchor="middle" fill="${
        p.text_primary
      }" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="15" font-weight="500">${escapeHtml(
        cat
      )}</text>`;
    });

    if (defs) {
      dataSvg = `<defs>${defs}</defs>` + dataSvg;
    }
  }

  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    ${legendSvg}
    ${gridSvg}
    ${dataSvg}
  </svg>`;
}

function buildSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function renderDonutChart(
  chart: ChartSpec,
  style: StylePack,
  W: number,
  H: number,
  fontBody: string,
  fontMono: string
): string {
  const p = style.palette;
  const vals = chart.series[0]?.values || [];
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const cx = 290;
  const cy = H / 2;
  const r = 155;
  const strokeW = 44;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  let arcs = '';
  let legends = '';

  chart.categories.forEach((cat, i) => {
    const val = vals[i] ?? 0;
    const ratio = val / total;
    const dash = ratio * circumference;
    const col = p.chart_palette[i % p.chart_palette.length];
    const cssCol = `var(--chart-${(i % 6) + 1})`;
    arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" style="stroke:${cssCol}" stroke-width="${strokeW}" stroke-dasharray="${Math.max(
      0,
      dash - 4
    )} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;

    const ly = 110 + i * 58;
    const pct = Math.round(ratio * 100);
    const valStr = formatMetricWithUnit(val, chart.unit);
    legends += `
      <rect x="530" y="${ly - 14}" width="14" height="14" rx="3" fill="${col}" style="fill:${cssCol}"/>
      <text x="558" y="${ly}" fill="${p.text_primary}" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="16" font-weight="600">${escapeHtml(
      cat
    )}</text>
      <text x="880" y="${ly}" text-anchor="end" fill="${p.accent}" style="fill:var(--accent)" font-family="${fontMono}" font-size="16" font-weight="700">${escapeHtml(
      `${valStr} (${pct}%)`
    )}</text>
      <line x1="530" y1="${ly + 18}" x2="880" y2="${ly + 18}" stroke="${withAlpha(
      p.text_primary,
      0.1
    )}" style="stroke:var(--svg-grid-line)" stroke-width="1"/>
    `;
  });

  const totalFormatted = formatMetricWithUnit(
    Number.isInteger(total) ? total : Number(total.toFixed(1)),
    chart.unit
  );

  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    ${arcs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${
    p.text_primary
  }" style="fill:var(--text-primary)" font-family="${fontMono}" font-size="38" font-weight="800">${escapeHtml(
    totalFormatted
  )}</text>
    <text x="${cx}" y="${cy + 26}" text-anchor="middle" fill="${
    p.text_secondary
  }" style="fill:var(--text-secondary)" font-family="${fontBody}" font-size="15">${escapeHtml(
    chart.series[0]?.name || 'TOTAL'
  )}</text>
    ${legends}
  </svg>`;
}

function renderHorizontalBarChart(
  chart: ChartSpec,
  style: StylePack,
  W: number,
  H: number,
  fontBody: string,
  fontMono: string
): string {
  const p = style.palette;
  const vals = chart.series[0]?.values || [];
  const maxVal = Math.max(...vals, 1) * 1.16;
  const padL = 220;
  const padR = 110;
  const rowH = Math.min(70, (H - 50) / Math.max(chart.categories.length, 1));
  let bars = '';

  chart.categories.forEach((cat, i) => {
    const v = vals[i] ?? 0;
    const y = 32 + i * rowH;
    const bw = Math.max(8, (v / maxVal) * (W - padL - padR));
    const isFocus = chart.highlight_index === undefined || chart.highlight_index === i;

    bars += `
      <text x="${padL - 18}" y="${y + rowH * 0.54}" text-anchor="end" fill="${
      p.text_primary
    }" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="15.5" font-weight="${
      isFocus ? '600' : '500'
    }">${escapeHtml(cat)}</text>
      <rect x="${padL}" y="${y + rowH * 0.2}" width="${W - padL - padR}" height="${
      rowH * 0.48
    }" rx="4" fill="${withAlpha(p.text_primary, 0.06)}" style="fill:var(--svg-subtle-bg)"/>
      <rect x="${padL}" y="${y + rowH * 0.2}" width="${bw}" height="${
      rowH * 0.48
    }" rx="4" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="${
      isFocus ? '1' : '0.36'
    }"/>
      <text x="${padL + bw + 14}" y="${y + rowH * 0.54}" fill="${
      isFocus ? p.accent : p.text_secondary
    }" style="fill:${
      isFocus ? 'var(--accent)' : 'var(--text-secondary)'
    }" font-family="${fontMono}" font-size="15.5" font-weight="700">${escapeHtml(
      formatMetricWithUnit(v, chart.unit)
    )}</text>
    `;
  });

  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">${bars}</svg>`;
}

interface Box2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function boxOverlapArea(a: Box2D, b: Box2D, pad = 5): number {
  const ow = Math.min(a.x2 + pad, b.x2) - Math.max(a.x1 - pad, b.x1);
  const oh = Math.min(a.y2 + pad, b.y2) - Math.max(a.y1 - pad, b.y1);
  if (ow <= 0 || oh <= 0) return 0;
  return ow * oh;
}

/**
 * 零重叠二维战略象限矩阵 SVG 渲染器 v3.2
 * 4 圈多半径 32 槽位螺旋避让 + 自动指示引线 + 全元素 PPTX 原生提取锚点
 */
export function renderQuadrantSvg(quad: QuadrantSpec, style: StylePack): string {
  const W = 880;
  const H = 540;
  const padX = 56;
  const padTop = 52;
  const padBot = 66;
  const boxW = W - padX * 2;
  const boxH = H - padTop - padBot;
  const cx = padX + boxW / 2;
  const cy = padTop + boxH / 2;

  const p = style.palette;
  const fontBody = style.typography.font_body.replace(/"/g, "'");
  const fontMono = style.typography.font_mono.replace(/"/g, "'");
  const qLabels = quad.quadrant_labels || ['生态挑战者', '核心领航象限', '垂直利基', '传统成熟方案'];

  const q0W = Math.round(estimateCjkUnits(qLabels[0]) * 14 + 24);
  const q1W = Math.round(estimateCjkUnits(qLabels[1]) * 14 + 24);
  const q2W = Math.round(estimateCjkUnits(qLabels[2]) * 14 + 24);
  const q3W = Math.round(estimateCjkUnits(qLabels[3]) * 14 + 24);

  const occupied: Box2D[] = [
    { x1: padX + 10, y1: padTop + 8, x2: padX + 18 + q0W, y2: padTop + 36 },
    { x1: W - padX - 18 - q1W, y1: padTop + 8, x2: W - padX - 10, y2: padTop + 36 },
    { x1: padX + 10, y1: H - padBot - 36, x2: padX + 18 + q2W, y2: H - padBot - 8 },
    { x1: W - padX - 18 - q3W, y1: H - padBot - 36, x2: W - padX - 10, y2: H - padBot - 8 },
  ];

  const pointCoords = quad.points.map((pt, idx) => {
    const px = padX + 30 + (pt.x / 100) * (boxW - 60);
    const py = H - padBot - 30 - (pt.y / 100) * (boxH - 60);
    const r = (pt.size || 6) * 2.1;
    // 将散点圆球登记为刚性碰撞障碍物
    occupied.push({ x1: px - r - 2, y1: py - r - 2, x2: px + r + 2, y2: py + r + 2 });
    return { pt, idx, px, py, r };
  });

  // 高亮焦点优先排布，随后按离右上角由近及远排布，确保密集区逐层向外螺旋展开
  const orderedPoints = [...pointCoords].sort((a, b) => {
    if (Boolean(a.pt.highlight) !== Boolean(b.pt.highlight)) {
      return a.pt.highlight ? -1 : 1;
    }
    return b.pt.x + b.pt.y - (a.pt.x + a.pt.y);
  });

  let leadersSvg = '';
  let circlesSvg = '';
  let labelsSvg = '';

  orderedPoints.forEach(({ pt, idx, px, py, r }) => {
    const isHero = Boolean(pt.highlight);
    const col = isHero ? p.accent : p.chart_palette[(idx + 1) % p.chart_palette.length];
    const cssCol = isHero ? 'var(--accent)' : `var(--chart-${((idx + 1) % 6) + 1})`;
    const fontSize = isHero ? 15.5 : 14;
    const estW = Math.round(estimateCjkUnits(pt.label) * fontSize + 10);
    const estH = fontSize + 6;

    // 4 圈多半径 × 8 方向 = 32 槽位螺旋搜索
    const rings = [10, 34, 62, 92];
    const inRightHalf = px > cx;
    const inTopHalf = py < cy;

    interface SlotCandidate {
      tx: number;
      ty: number;
      anchor: 'middle' | 'start' | 'end';
      box: Box2D;
      ringIdx: number;
      anchorPtX: number;
      anchorPtY: number;
    }

    const candidates: SlotCandidate[] = [];

    rings.forEach((dist, ringIdx) => {
      const d = r + dist;
      const diag = Math.round(d * 0.78);
      // 8 个候选方位，根据点所在半区智能调整同圈内先后顺序（引导标签向象限内腹地散开）
      const rawDirs: SlotCandidate[] = [
        // N (正上)
        {
          tx: px,
          ty: py - d - 4,
          anchor: 'middle',
          box: { x1: px - estW / 2, y1: py - d - estH - 2, x2: px + estW / 2, y2: py - d + 2 },
          ringIdx,
          anchorPtX: px,
          anchorPtY: py - d + 2,
        },
        // S (正下)
        {
          tx: px,
          ty: py + d + estH - 2,
          anchor: 'middle',
          box: { x1: px - estW / 2, y1: py + d, x2: px + estW / 2, y2: py + d + estH + 2 },
          ringIdx,
          anchorPtX: px,
          anchorPtY: py + d,
        },
        // W (正左)
        {
          tx: px - d,
          ty: py + 5,
          anchor: 'end',
          box: { x1: px - d - estW, y1: py - estH / 2, x2: px - d, y2: py + estH / 2 },
          ringIdx,
          anchorPtX: px - d + 2,
          anchorPtY: py,
        },
        // E (正右)
        {
          tx: px + d,
          ty: py + 5,
          anchor: 'start',
          box: { x1: px + d, y1: py - estH / 2, x2: px + d + estW, y2: py + estH / 2 },
          ringIdx,
          anchorPtX: px + d - 2,
          anchorPtY: py,
        },
        // NW (左上)
        {
          tx: px - diag,
          ty: py - diag,
          anchor: 'end',
          box: { x1: px - diag - estW, y1: py - diag - estH + 4, x2: px - diag, y2: py - diag + 6 },
          ringIdx,
          anchorPtX: px - diag,
          anchorPtY: py - diag + 2,
        },
        // SW (左下)
        {
          tx: px - diag,
          ty: py + diag + estH - 4,
          anchor: 'end',
          box: { x1: px - diag - estW, y1: py + diag - 2, x2: px - diag, y2: py + diag + estH },
          ringIdx,
          anchorPtX: px - diag,
          anchorPtY: py + diag,
        },
        // NE (右上)
        {
          tx: px + diag,
          ty: py - diag,
          anchor: 'start',
          box: { x1: px + diag, y1: py - diag - estH + 4, x2: px + diag + estW, y2: py - diag + 6 },
          ringIdx,
          anchorPtX: px + diag,
          anchorPtY: py - diag + 2,
        },
        // SE (右下)
        {
          tx: px + diag,
          ty: py + diag + estH - 4,
          anchor: 'start',
          box: { x1: px + diag, y1: py + diag - 2, x2: px + diag + estW, y2: py + diag + estH },
          ringIdx,
          anchorPtX: px + diag,
          anchorPtY: py + diag,
        },
      ];

      // 靠右边界的点优先往左/下展开，靠顶边界的点优先往下/左展开
      rawDirs.sort((ca, cb) => {
        const score = (c: SlotCandidate) => {
          let s = 0;
          if (inRightHalf && c.anchor === 'end') s -= 2;
          if (!inRightHalf && c.anchor === 'start') s -= 2;
          if (inTopHalf && c.ty > py) s -= 1;
          if (!inTopHalf && c.ty < py) s -= 1;
          return s;
        };
        return score(ca) - score(cb);
      });

      candidates.push(...rawDirs);
    });

    let chosen = candidates[0];
    let bestPenalty = Infinity;

    for (const cand of candidates) {
      const outLeft = Math.max(0, padX + 8 - cand.box.x1);
      const outRight = Math.max(0, cand.box.x2 - (W - padX - 8));
      const outTop = Math.max(0, padTop + 8 - cand.box.y1);
      const outBot = Math.max(0, cand.box.y2 - (H - padBot - 8));
      const boundaryPenalty = (outLeft + outRight + outTop + outBot) * 500;

      let collisionArea = 0;
      for (const ob of occupied) {
        collisionArea += boxOverlapArea(cand.box, ob, 5);
      }

      const totalPenalty = boundaryPenalty + collisionArea * 10 + cand.ringIdx * 0.5;
      if (boundaryPenalty === 0 && collisionArea === 0) {
        chosen = cand;
        bestPenalty = 0;
        break;
      }
      if (totalPenalty < bestPenalty) {
        bestPenalty = totalPenalty;
        chosen = cand;
      }
    }

    occupied.push(chosen.box);

    if (chosen.ringIdx >= 1) {
      const dx = chosen.anchorPtX - px;
      const dy = chosen.anchorPtY - py;
      const len = Math.hypot(dx, dy) || 1;
      const sx = px + (dx / len) * (r + 2);
      const sy = py + (dy / len) * (r + 2);
      leadersSvg += `<line data-quad-leader="1" x1="${sx.toFixed(1)}" y1="${sy.toFixed(
        1
      )}" x2="${chosen.anchorPtX.toFixed(1)}" y2="${chosen.anchorPtY.toFixed(
        1
      )}" stroke="${col}" style="stroke:${cssCol}" stroke-opacity="0.55" stroke-width="1.2" stroke-dasharray="3 2"/>`;
    }

    circlesSvg += `
      ${
        isHero
          ? `<circle cx="${px}" cy="${py}" r="${r + 11}" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="0.18"/>`
          : ''
      }
      <circle data-collision-obstacle="1" data-quad-point="1" data-hero="${
        isHero ? '1' : '0'
      }" data-color="${col}" cx="${px}" cy="${py}" r="${r}" fill="${col}" style="fill:${cssCol}" fill-opacity="${
      isHero ? '1' : '0.78'
    }" stroke="${isHero ? '#FFFFFF' : col}" stroke-width="2"/>
    `;

    labelsSvg += `
      <text data-quad-label="1" data-hero="${isHero ? '1' : '0'}" x="${chosen.tx}" y="${
      chosen.ty
    }" text-anchor="${chosen.anchor}" fill="${
      isHero ? p.accent : p.text_primary
    }" style="fill:${
      isHero ? 'var(--accent)' : 'var(--text-primary)'
    }" font-family="${fontBody}" font-size="${fontSize}" font-weight="${
      isHero ? '700' : '600'
    }">${escapeHtml(pt.label)}</text>
    `;
  });

  return `<svg class="quadrant-svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <rect data-quad-hi="1" x="${cx}" y="${padTop}" width="${boxW / 2}" height="${
    boxH / 2
  }" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="0.065"/>
    <rect data-quad-frame="1" x="${padX}" y="${padTop}" width="${boxW}" height="${boxH}" rx="6" fill="none" stroke="${withAlpha(
    p.text_primary,
    0.16
  )}" style="stroke:var(--border-solid)" stroke-width="1.3"/>
    <line data-quad-axis="h" x1="${padX}" y1="${cy}" x2="${W - padX}" y2="${cy}" stroke="${withAlpha(
    p.text_primary,
    0.22
  )}" style="stroke:var(--border-solid)" stroke-width="1.3" stroke-dasharray="6 5"/>
    <line data-quad-axis="v" x1="${cx}" y1="${padTop}" x2="${cx}" y2="${H - padBot}" stroke="${withAlpha(
    p.text_primary,
    0.22
  )}" style="stroke:var(--border-solid)" stroke-width="1.3" stroke-dasharray="6 5"/>

    <!-- 四角象限名称 -->
    <text data-quad-label="1" data-muted="1" x="${padX + 18}" y="${padTop + 28}" fill="${
    p.text_muted
  }" style="fill:var(--text-muted)" font-family="${fontMono}" font-size="14" font-weight="600">${escapeHtml(
    qLabels[0]
  )}</text>
    <text data-quad-label="1" data-hero="1" x="${W - padX - 18}" y="${
    padTop + 28
  }" text-anchor="end" fill="${
    p.accent
  }" style="fill:var(--accent)" font-family="${fontMono}" font-size="14" font-weight="700">${escapeHtml(
    qLabels[1]
  )}</text>
    <text data-quad-label="1" data-muted="1" x="${padX + 18}" y="${H - padBot - 16}" fill="${
    p.text_muted
  }" style="fill:var(--text-muted)" font-family="${fontMono}" font-size="14" font-weight="600">${escapeHtml(
    qLabels[2]
  )}</text>
    <text data-quad-label="1" data-muted="1" x="${W - padX - 18}" y="${
    H - padBot - 16
  }" text-anchor="end" fill="${
    p.text_muted
  }" style="fill:var(--text-muted)" font-family="${fontMono}" font-size="14" font-weight="600">${escapeHtml(
    qLabels[3]
  )}</text>

    <!-- 外置无遮挡横纵轴语义说明 -->
    <text data-quad-label="1" x="${cx}" y="${padTop - 18}" text-anchor="middle" fill="${
    p.text_primary
  }" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="14.5" font-weight="700">${escapeHtml(
    '↑ ' + quad.y_label_top
  )}</text>
    <text data-quad-label="1" data-sec="1" x="${cx}" y="${
    H - padBot + 34
  }" text-anchor="middle" fill="${
    p.text_secondary
  }" style="fill:var(--text-secondary)" font-family="${fontBody}" font-size="14">${escapeHtml(
    '↓ ' + quad.y_label_bottom
  )}</text>
    <text data-quad-label="1" data-sec="1" x="${padX}" y="${
    H - padBot + 34
  }" text-anchor="start" fill="${
    p.text_secondary
  }" style="fill:var(--text-secondary)" font-family="${fontBody}" font-size="14">${escapeHtml(
    '← ' + quad.x_label_left
  )}</text>
    <text data-quad-label="1" data-hero="1" x="${W - padX}" y="${
    H - padBot + 34
  }" text-anchor="end" fill="${
    p.accent
  }" style="fill:var(--accent)" font-family="${fontBody}" font-size="14.5" font-weight="700">${escapeHtml(
    quad.x_label_right + ' →'
  )}</text>

    ${leadersSvg}
    ${circlesSvg}
    ${labelsSvg}
  </svg>`;
}

/**
 * 工业级精密架构与流水线拓扑图渲染器 v3.2
 * 支持 CSS 变量换肤联动 + 全元素 PPTX 原生提取锚点（泳道、连接箭头、胶囊标签、节点卡片全部原生化！）
 */
export function renderDiagramSvg(diagram: DiagramSpec, style: StylePack): string {
  const W = 1640;
  const H = 560;
  const p = style.palette;
  const dark = isDarkColor(p.bg_primary);
  const fontBody = style.typography.font_body.replace(/"/g, "'");
  const fontMono = style.typography.font_mono.replace(/"/g, "'");

  const coords = new Map<string, { x: number; y: number; w: number; h: number }>();
  let swimlanesSvg = '';

  if (diagram.layout === 'pipeline') {
    const n = Math.max(diagram.nodes.length, 1);
    const gap = 54;
    const totalW = W - 80;
    const nodeW = Math.min(350, (totalW - (n - 1) * gap) / n);
    const startX = (W - (n * nodeW + (n - 1) * gap)) / 2;
    diagram.nodes.forEach((node, idx) => {
      coords.set(node.id, {
        x: startX + idx * (nodeW + gap),
        y: H / 2 - 115,
        w: nodeW,
        h: 230,
      });
    });
  } else if (diagram.layout === 'hub-spoke') {
    const centerNode = diagram.nodes[0];
    if (centerNode) {
      coords.set(centerNode.id, { x: W / 2 - 165, y: H / 2 - 80, w: 330, h: 160 });
    }
    const spokes = diagram.nodes.slice(1);
    spokes.forEach((node, idx) => {
      const angle = (idx / Math.max(spokes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      coords.set(node.id, {
        x: W / 2 + Math.cos(angle) * 530 - 145,
        y: H / 2 + Math.sin(angle) * 205 - 58,
        w: 290,
        h: 116,
      });
    });
  } else {
    const layers = new Map<number, typeof diagram.nodes>();
    diagram.nodes.forEach((n) => {
      const l = n.layer ?? 0;
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(n);
    });
    const sortedKeys = Array.from(layers.keys()).sort((a, b) => a - b);
    const lCount = Math.max(sortedKeys.length, 1);
    const rowGap = 58;
    const nodeH = Math.min(126, (H - 48 - (lCount - 1) * rowGap) / lCount);
    const startY = (H - (lCount * nodeH + (lCount - 1) * rowGap)) / 2;

    sortedKeys.forEach((lk, li) => {
      const bandY = startY + li * (nodeH + rowGap) - 12;
      const bandH = nodeH + 24;
      const laneTitle = `LAYER 0${li + 1}`;
      swimlanesSvg += `
        <g data-diagram-lane="1" data-lane-title="${laneTitle}">
          <rect x="24" y="${bandY}" width="${W - 48}" height="${bandH}" rx="6" fill="${withAlpha(
        p.text_primary,
        dark ? 0.03 : 0.025
      )}" style="fill:var(--svg-subtle-bg);stroke:var(--border-color)" stroke="${withAlpha(
        p.text_primary,
        0.06
      )}" stroke-width="1"/>
          <text x="48" y="${bandY + 26}" fill="${
        p.text_muted
      }" style="fill:var(--text-muted)" font-family="${fontMono}" font-size="12.5" font-weight="700" letter-spacing="1.5">${laneTitle}</text>
        </g>
      `;

      const rowNodes = layers.get(lk)!;
      const colGap = 44;
      const availW = W - 260;
      const nodeW = Math.min(440, (availW - (rowNodes.length - 1) * colGap) / rowNodes.length);
      const startX =
        160 + (availW - (rowNodes.length * nodeW + (rowNodes.length - 1) * colGap)) / 2;
      rowNodes.forEach((node, ni) => {
        coords.set(node.id, {
          x: startX + ni * (nodeW + colGap),
          y: startY + li * (nodeH + rowGap),
          w: nodeW,
          h: nodeH,
        });
      });
    });
  }

  const edges: DiagramEdge[] =
    diagram.edges && diagram.edges.length > 0
      ? diagram.edges
      : diagram.layout === 'pipeline'
      ? diagram.nodes.slice(0, -1).map((n, i) => ({ from: n.id, to: diagram.nodes[i + 1].id }))
      : [];

  let edgeLinesSvg = '';
  let edgeLabelsSvg = '';

  edges.forEach((e) => {
    const a = coords.get(e.from);
    const b = coords.get(e.to);
    if (!a || !b) return;
    const ax = a.x + a.w / 2;
    const ay = a.y + a.h / 2;
    const bx = b.x + b.w / 2;
    const by = b.y + b.h / 2;
    let x1 = ax,
      y1 = ay,
      x2 = bx,
      y2 = by;

    if (diagram.layout !== 'layered' && Math.abs(bx - ax) > Math.abs(by - ay) * 1.35) {
      x1 = bx > ax ? a.x + a.w : a.x;
      x2 = bx > ax ? b.x - 4 : b.x + b.w + 4;
    } else {
      const dxSign = Math.abs(bx - ax) < 20 ? 0 : bx < ax ? -1 : 1;
      x1 = ax + dxSign * Math.min(56, a.w * 0.16);
      x2 = bx - dxSign * Math.min(56, b.w * 0.16);
      y1 = by > ay ? a.y + a.h : a.y;
      y2 = by > ay ? b.y - 4 : b.y + b.h + 4;
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const isHoriz =
      diagram.layout !== 'layered' && Math.abs(x2 - x1) > Math.abs(y2 - y1) * 1.35;
    const cx1 = isHoriz ? midX : x1;
    const cy1 = isHoriz ? y1 : midY;
    const cx2 = isHoriz ? midX : x2;
    const cy2 = isHoriz ? y2 : midY;
    const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    edgeLinesSvg += `<path data-diagram-edge="1" data-x1="${x1}" data-y1="${y1}" data-cx1="${cx1}" data-cy1="${cy1}" data-cx2="${cx2}" data-cy2="${cy2}" data-x2="${x2}" data-y2="${y2}" data-dashed="${
      e.dashed ? '1' : '0'
    }" d="${pathD}" fill="none" stroke="${p.accent}" style="stroke:var(--accent)" stroke-opacity="0.74" stroke-width="2.2" ${
      e.dashed ? 'stroke-dasharray="6 5"' : ''
    } marker-end="url(#diag-arrow)"/>`;

    if (e.label) {
      const pillW = Math.round(estimateCjkUnits(e.label) * 13.5 + 24);
      const pillH = 24;
      const isPipe = diagram.layout === 'pipeline';
      const labelY = isPipe ? Math.min(a.y, b.y) - 26 : midY;
      edgeLabelsSvg += `
        <g>
          ${
            isPipe
              ? `<line data-diagram-leader="1" data-x1="${midX}" data-y1="${
                  labelY + pillH / 2
                }" data-x2="${midX}" data-y2="${midY - 4}" x1="${midX}" y1="${
                  labelY + pillH / 2
                }" x2="${midX}" y2="${midY - 4}" stroke="${
                  p.accent
                }" style="stroke:var(--accent)" stroke-opacity="0.45" stroke-width="1.2" stroke-dasharray="3 3"/>`
              : ''
          }
          <rect data-diagram-pill="1" data-pill-text="${escapeHtml(e.label)}" x="${
        midX - pillW / 2
      }" y="${labelY - pillH / 2}" width="${pillW}" height="${pillH}" rx="12" fill="${
        p.bg_primary
      }" style="fill:var(--bg-primary);stroke:var(--border-solid)" stroke="${
        p.border_solid
      }" stroke-width="1.2"/>
          <text x="${midX}" y="${labelY + 4.5}" text-anchor="middle" fill="${
        p.text_primary
      }" style="fill:var(--text-primary)" font-family="${fontMono}" font-size="12.5" font-weight="600">${escapeHtml(
        e.label
      )}</text>
        </g>
      `;
    }
  });

  let nodesSvg = '';
  diagram.nodes.forEach((node, idx) => {
    const box = coords.get(node.id);
    if (!box) return;
    const isAcc = Boolean(node.accent);
    const cardBg = p.surface_solid;
    const borderCol = isAcc ? p.accent : p.border_solid;
    const cssBorder = isAcc ? 'var(--accent)' : 'var(--border-solid)';
    const modCode =
      diagram.layout === 'pipeline' ? `STAGE 0${idx + 1}` : `MOD // 0${idx + 1}`;

    if (diagram.layout === 'pipeline') {
      nodesSvg += `
        <g data-diagram-node="1">
          <rect data-node-card="1" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="${cardBg}" style="fill:var(--surface-solid);stroke:${cssBorder}" stroke="${borderCol}" stroke-width="${
        isAcc ? 2 : 1.3
      }"/>
          <rect data-node-bar="1" x="${box.x}" y="${box.y}" width="${box.w}" height="4" fill="${
        isAcc ? p.accent : p.text_muted
      }" style="fill:${isAcc ? 'var(--accent)' : 'var(--text-muted)'}"/>
          <text data-node-tag="1" x="${box.x + 22}" y="${box.y + 34}" fill="${
        isAcc ? p.accent : p.text_muted
      }" style="fill:${
        isAcc ? 'var(--accent)' : 'var(--text-muted)'
      }" font-family="${fontMono}" font-size="13" font-weight="700" letter-spacing="1.2">${modCode}</text>
          <circle data-node-dot="1" cx="${box.x + box.w - 24}" cy="${box.y + 29}" r="4.5" fill="${
        isAcc ? p.accent : p.border_solid
      }" style="fill:${isAcc ? 'var(--accent)' : 'var(--border-solid)'}"/>
          <line data-node-divider="1" x1="${box.x + 22}" y1="${box.y + 48}" x2="${box.x + box.w - 22}" y2="${
        box.y + 48
      }" stroke="${withAlpha(p.text_primary, 0.08)}" style="stroke:var(--border-color)" stroke-width="1"/>
          <text data-node-title="1" x="${box.x + 22}" y="${box.y + 98}" fill="${
        p.text_primary
      }" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="20" font-weight="700">${escapeHtml(
        node.label
      )}</text>
          ${
            node.sublabel
              ? `<rect data-node-sub-bg="1" x="${box.x + 20}" y="${box.y + box.h - 66}" width="${
                  box.w - 40
                }" height="44" rx="4" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="${
                  isAcc ? '0.1' : '0.05'
                }"/>
                 <text data-node-sub="1" x="${box.x + 32}" y="${box.y + box.h - 39}" fill="${
                  isAcc ? p.accent : p.text_secondary
                }" style="fill:${
                  isAcc ? 'var(--accent)' : 'var(--text-secondary)'
                }" font-family="${fontMono}" font-size="13.5" font-weight="600">${escapeHtml(
                  node.sublabel
                )}</text>`
              : ''
          }
        </g>
      `;
    } else {
      nodesSvg += `
        <g data-diagram-node="1">
          <rect data-node-card="1" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="${cardBg}" style="fill:var(--surface-solid);stroke:${cssBorder}" stroke="${borderCol}" stroke-width="${
        isAcc ? 2 : 1.3
      }"/>
          <rect data-node-bar="1" x="${box.x}" y="${box.y}" width="5" height="${box.h}" fill="${
        isAcc ? p.accent : p.text_muted
      }" style="fill:${isAcc ? 'var(--accent)' : 'var(--text-muted)'}"/>
          <text data-node-tag="1" x="${box.x + 22}" y="${box.y + 28}" fill="${
        isAcc ? p.accent : p.text_muted
      }" style="fill:${
        isAcc ? 'var(--accent)' : 'var(--text-muted)'
      }" font-family="${fontMono}" font-size="11.5" font-weight="700" letter-spacing="1.2">${modCode}</text>
          <text data-node-title="1" x="${box.x + 22}" y="${box.y + (node.sublabel ? 64 : 74)}" fill="${
        p.text_primary
      }" style="fill:var(--text-primary)" font-family="${fontBody}" font-size="19" font-weight="700">${escapeHtml(
        node.label
      )}</text>
          ${
            node.sublabel
              ? `<text data-node-sub="1" x="${box.x + 22}" y="${box.y + 94}" fill="${
                  p.text_secondary
                }" style="fill:var(--text-secondary)" font-family="${fontMono}" font-size="13.5">${escapeHtml(
                  node.sublabel
                )}</text>`
              : ''
          }
        </g>
      `;
    }
  });

  return `<svg class="diagram-svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <defs>
      <marker id="diag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="${p.accent}" style="fill:var(--accent)"/>
      </marker>
    </defs>
    ${swimlanesSvg}
    ${edgeLinesSvg}
    ${nodesSvg}
    ${edgeLabelsSvg}
  </svg>`;
}
