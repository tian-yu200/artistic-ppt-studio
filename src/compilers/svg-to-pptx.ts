/**
 * SVG-to-PPTX 原生矢量编译引擎 (OpenXML / PptxGenJS custGeom & prstGeom)
 * 职责：
 * 1. 解析 ICON_PATHS 内全部 SVG 基本图元（rect/circle/ellipse/line/polyline/polygon/path）
 *    并从 24x24 viewBox 等比映射到舞台像素包围盒再转为 PowerPoint 英寸坐标系；
 * 2. 完整支持 SVG Path 全部指令（M/L/H/V/C/S/Q/T/A/Z 大小写），其中椭圆弧 A/a 按 W3C SVG 1.1
 *    Appendix F.6.5/F.6.6 规范精确切分为 <= 90° 的三次贝塞尔段；
 * 3. 支持架构图/连接线三次贝塞尔边（addCubicBezierEdgeToSlide）输出原生可编辑 custGeom。
 */
import { ICON_PATHS, resolveIconKey } from '../engine/icons.js';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
export const PPT_W_IN = 13.333;
export const PPT_H_IN = 7.5;

/** 防止 PowerPoint/OpenXML <a:path w="0"> 或 <a:path h="0"> 退化的最小形状尺寸（英寸） */
const MIN_SHAPE_IN = 0.02;

export const pxToInX = (px: number): number =>
  Number(((px / STAGE_W) * PPT_W_IN).toFixed(4));

export const pxToInY = (py: number): number =>
  Number(((py / STAGE_H) * PPT_H_IN).toFixed(4));

const rawPxToInX = (px: number): number => (px / STAGE_W) * PPT_W_IN;
const rawPxToInY = (py: number): number => (py / STAGE_H) * PPT_H_IN;
const roundIn = (inches: number): number => Number(inches.toFixed(5));

type PathSegment =
  | { kind: 'line'; x: number; y: number }
  | {
      kind: 'cubic';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { kind: 'quad'; x1: number; y1: number; x: number; y: number };

interface SvgSubpath {
  startX: number;
  startY: number;
  segments: PathSegment[];
  closed: boolean;
}

interface InchBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type PptxPoint =
  | { moveTo: true; x: number; y: number }
  | { x: number; y: number }
  | {
      x: number;
      y: number;
      curve: {
        type: 'cubic';
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };
    }
  | {
      x: number;
      y: number;
      curve: {
        type: 'quadratic';
        x1: number;
        y1: number;
      };
    }
  | { close: true };

/**
 * 规范化十六进制颜色为 6 位大写无 '#' 字符串
 */
function normalizeHex(colorHex: string, fallback = '111827'): string {
  const cleaned = (colorHex || '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (/^[0-9A-F]{8}$/.test(cleaned)) {
    return cleaned.slice(0, 6);
  }
  return fallback;
}

/**
 * 基于绝对英寸极值计算外接框，若宽或高小于 0.02 英寸则居中对称外扩，确保无零宽高退化
 */
function normalizeInchBox(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): InchBox {
  const rawW = Math.max(0, maxX - minX);
  const rawH = Math.max(0, maxY - minY);
  const wExact = Math.max(MIN_SHAPE_IN, rawW);
  const hExact = Math.max(MIN_SHAPE_IN, rawH);
  const x = roundIn(minX - (wExact - rawW) / 2);
  const y = roundIn(minY - (hExact - rawH) / 2);
  const w = Math.max(MIN_SHAPE_IN, roundIn(wExact));
  const h = Math.max(MIN_SHAPE_IN, roundIn(hExact));
  return { x, y, w, h };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function parseSvgAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(attrStr)) !== null) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attrs;
}

function parseAttrNumber(attrs: Record<string, string>, key: string, fallback = 0): number {
  const raw = attrs[key];
  if (raw === undefined) return fallback;
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : fallback;
}

function parseNumberList(input: string): number[] {
  const nums: number[] = [];
  const numRe = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = numRe.exec(input)) !== null) {
    const val = Number(match[0]);
    if (Number.isFinite(val)) {
      nums.push(val);
    }
  }
  return nums;
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy;
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (len === 0) return 0;
  const ratio = clamp(dot / len, -1, 1);
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  return sign * Math.acos(ratio);
}

/**
 * 将 SVG 椭圆弧参数 (A/a) 转为精确的三次贝塞尔段（每段跨度 <= 90°）
 * 严格遵循 W3C SVG 1.1 Appendix F.6.5 & F.6.6 中心化参数方程转换
 */
function svgArcToCubicSegments(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  xAxisRotationDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  x2: number,
  y2: number
): PathSegment[] {
  if (x1 === x2 && y1 === y2) {
    return [];
  }

  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) {
    return [{ kind: 'line', x: x2, y: y2 }];
  }

  const phi = (xAxisRotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  // F.6.6.2 半径放大校准，确保中心根号非负
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  // F.6.5.2 旋转坐标系中心
  const num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  const den = rxSq * y1pSq + rySq * x1pSq;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const coef = den > 0 ? sign * Math.sqrt(Math.max(0, num / den)) : 0;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  // F.6.5.3 还原中心点
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // F.6.5.4-6 起始角与扫掠角
  const v1x = (x1p - cxp) / rx;
  const v1y = (y1p - cyp) / ry;
  const v2x = (-x1p - cxp) / rx;
  const v2y = (-y1p - cyp) / ry;

  const theta1 = vectorAngle(1, 0, v1x, v1y);
  let dTheta = vectorAngle(v1x, v1y, v2x, v2y);

  if (sweepFlag === 0 && dTheta > 0) {
    dTheta -= Math.PI * 2;
  } else if (sweepFlag === 1 && dTheta < 0) {
    dTheta += Math.PI * 2;
  }

  const segCount = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segCount;
  const k = (4 / 3) * Math.tan(delta / 4);

  const mapPoint = (u: number, v: number): { x: number; y: number } => ({
    x: cx + cosPhi * rx * u - sinPhi * ry * v,
    y: cy + sinPhi * rx * u + cosPhi * ry * v,
  });

  const segments: PathSegment[] = [];
  for (let i = 0; i < segCount; i++) {
    const t1 = theta1 + i * delta;
    const t2 = theta1 + (i + 1) * delta;

    const cosT1 = Math.cos(t1);
    const sinT1 = Math.sin(t1);
    const cosT2 = Math.cos(t2);
    const sinT2 = Math.sin(t2);

    const p1 = mapPoint(cosT1 - k * sinT1, sinT1 + k * cosT1);
    const p2 = mapPoint(cosT2 + k * sinT2, sinT2 - k * cosT2);
    const end = i === segCount - 1 ? { x: x2, y: y2 } : mapPoint(cosT2, sinT2);

    segments.push({
      kind: 'cubic',
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      x: end.x,
      y: end.y,
    });
  }

  return segments;
}

/**
 * 字符流式 SVG Path 数据解析器（支持无分隔负号、小数点粘连及 A/a 标志位紧凑写法）
 */
class SvgPathScanner {
  private pos = 0;
  private readonly len: number;

  constructor(private readonly d: string) {
    this.len = d.length;
  }

  skipSeparators(): void {
    while (this.pos < this.len) {
      const ch = this.d[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') {
        this.pos++;
      } else {
        break;
      }
    }
  }

  hasMore(): boolean {
    this.skipSeparators();
    return this.pos < this.len;
  }

  peekCommand(): string | null {
    this.skipSeparators();
    if (this.pos >= this.len) return null;
    const ch = this.d[this.pos];
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(ch)) {
      this.pos++;
      return ch;
    }
    return null;
  }

  hasNextNumber(): boolean {
    this.skipSeparators();
    if (this.pos >= this.len) return false;
    const ch = this.d[this.pos];
    return (ch >= '0' && ch <= '9') || ch === '+' || ch === '-' || ch === '.';
  }

  readNumber(): number | null {
    this.skipSeparators();
    if (this.pos >= this.len) return null;
    const slice = this.d.slice(this.pos);
    const match = slice.match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (!match) return null;
    this.pos += match[0].length;
    const val = Number(match[0]);
    return Number.isFinite(val) ? val : null;
  }

  readFlag(): number | null {
    this.skipSeparators();
    if (this.pos >= this.len) return null;
    const ch = this.d[this.pos];
    if (ch === '0' || ch === '1') {
      this.pos++;
      return Number(ch);
    }
    return null;
  }
}

function parseSvgPathData(d: string): SvgSubpath[] {
  const scanner = new SvgPathScanner(d);
  const subpaths: SvgSubpath[] = [];
  let current: SvgSubpath | null = null;

  let curX = 0;
  let curY = 0;
  let subStartX = 0;
  let subStartY = 0;
  let lastCubicCtrl: { x: number; y: number } | null = null;
  let lastQuadCtrl: { x: number; y: number } | null = null;
  let activeCmd: string | null = null;

  const ensureSubpath = () => {
    if (!current || current.closed) {
      current = { startX: curX, startY: curY, segments: [], closed: false };
      subpaths.push(current);
    }
    return current;
  };

  while (scanner.hasMore()) {
    const explicitCmd = scanner.peekCommand();
    if (explicitCmd !== null) {
      activeCmd = explicitCmd;
    } else if (activeCmd === null || !scanner.hasNextNumber()) {
      break;
    } else if (activeCmd === 'M') {
      activeCmd = 'L';
    } else if (activeCmd === 'm') {
      activeCmd = 'l';
    }

    const cmd = activeCmd;
    const isRel = cmd === cmd.toLowerCase();

    switch (cmd) {
      case 'M':
      case 'm': {
        const nx = scanner.readNumber();
        const ny = scanner.readNumber();
        if (nx === null || ny === null) return subpaths;
        const absX = isRel ? curX + nx : nx;
        const absY = isRel ? curY + ny : ny;
        curX = absX;
        curY = absY;
        subStartX = absX;
        subStartY = absY;
        current = { startX: absX, startY: absY, segments: [], closed: false };
        subpaths.push(current);
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'L':
      case 'l': {
        const nx = scanner.readNumber();
        const ny = scanner.readNumber();
        if (nx === null || ny === null) return subpaths;
        const absX = isRel ? curX + nx : nx;
        const absY = isRel ? curY + ny : ny;
        ensureSubpath().segments.push({ kind: 'line', x: absX, y: absY });
        curX = absX;
        curY = absY;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'H':
      case 'h': {
        const nx = scanner.readNumber();
        if (nx === null) return subpaths;
        const absX = isRel ? curX + nx : nx;
        ensureSubpath().segments.push({ kind: 'line', x: absX, y: curY });
        curX = absX;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'V':
      case 'v': {
        const ny = scanner.readNumber();
        if (ny === null) return subpaths;
        const absY = isRel ? curY + ny : ny;
        ensureSubpath().segments.push({ kind: 'line', x: curX, y: absY });
        curY = absY;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'C':
      case 'c': {
        const x1 = scanner.readNumber();
        const y1 = scanner.readNumber();
        const x2 = scanner.readNumber();
        const y2 = scanner.readNumber();
        const x = scanner.readNumber();
        const y = scanner.readNumber();
        if (x1 === null || y1 === null || x2 === null || y2 === null || x === null || y === null) {
          return subpaths;
        }
        const ax1 = isRel ? curX + x1 : x1;
        const ay1 = isRel ? curY + y1 : y1;
        const ax2 = isRel ? curX + x2 : x2;
        const ay2 = isRel ? curY + y2 : y2;
        const ax = isRel ? curX + x : x;
        const ay = isRel ? curY + y : y;
        ensureSubpath().segments.push({
          kind: 'cubic',
          x1: ax1,
          y1: ay1,
          x2: ax2,
          y2: ay2,
          x: ax,
          y: ay,
        });
        lastCubicCtrl = { x: ax2, y: ay2 };
        lastQuadCtrl = null;
        curX = ax;
        curY = ay;
        break;
      }
      case 'S':
      case 's': {
        const x2 = scanner.readNumber();
        const y2 = scanner.readNumber();
        const x = scanner.readNumber();
        const y = scanner.readNumber();
        if (x2 === null || y2 === null || x === null || y === null) return subpaths;
        const ax1: number = lastCubicCtrl ? 2 * curX - lastCubicCtrl.x : curX;
        const ay1: number = lastCubicCtrl ? 2 * curY - lastCubicCtrl.y : curY;
        const ax2 = isRel ? curX + x2 : x2;
        const ay2 = isRel ? curY + y2 : y2;
        const ax = isRel ? curX + x : x;
        const ay = isRel ? curY + y : y;
        ensureSubpath().segments.push({
          kind: 'cubic',
          x1: ax1,
          y1: ay1,
          x2: ax2,
          y2: ay2,
          x: ax,
          y: ay,
        });
        lastCubicCtrl = { x: ax2, y: ay2 };
        lastQuadCtrl = null;
        curX = ax;
        curY = ay;
        break;
      }
      case 'Q':
      case 'q': {
        const x1 = scanner.readNumber();
        const y1 = scanner.readNumber();
        const x = scanner.readNumber();
        const y = scanner.readNumber();
        if (x1 === null || y1 === null || x === null || y === null) return subpaths;
        const ax1 = isRel ? curX + x1 : x1;
        const ay1 = isRel ? curY + y1 : y1;
        const ax = isRel ? curX + x : x;
        const ay = isRel ? curY + y : y;
        ensureSubpath().segments.push({
          kind: 'quad',
          x1: ax1,
          y1: ay1,
          x: ax,
          y: ay,
        });
        lastQuadCtrl = { x: ax1, y: ay1 };
        lastCubicCtrl = null;
        curX = ax;
        curY = ay;
        break;
      }
      case 'T':
      case 't': {
        const x = scanner.readNumber();
        const y = scanner.readNumber();
        if (x === null || y === null) return subpaths;
        const ax1: number = lastQuadCtrl ? 2 * curX - lastQuadCtrl.x : curX;
        const ay1: number = lastQuadCtrl ? 2 * curY - lastQuadCtrl.y : curY;
        const ax = isRel ? curX + x : x;
        const ay = isRel ? curY + y : y;
        ensureSubpath().segments.push({
          kind: 'quad',
          x1: ax1,
          y1: ay1,
          x: ax,
          y: ay,
        });
        lastQuadCtrl = { x: ax1, y: ay1 };
        lastCubicCtrl = null;
        curX = ax;
        curY = ay;
        break;
      }
      case 'A':
      case 'a': {
        const rx = scanner.readNumber();
        const ry = scanner.readNumber();
        const xAxisRotation = scanner.readNumber();
        const largeArcFlag = scanner.readFlag();
        const sweepFlag = scanner.readFlag();
        const x = scanner.readNumber();
        const y = scanner.readNumber();
        if (
          rx === null ||
          ry === null ||
          xAxisRotation === null ||
          largeArcFlag === null ||
          sweepFlag === null ||
          x === null ||
          y === null
        ) {
          return subpaths;
        }
        const ax = isRel ? curX + x : x;
        const ay = isRel ? curY + y : y;
        const arcSegs = svgArcToCubicSegments(
          curX,
          curY,
          rx,
          ry,
          xAxisRotation,
          largeArcFlag,
          sweepFlag,
          ax,
          ay
        );
        if (arcSegs.length > 0) {
          ensureSubpath().segments.push(...arcSegs);
        }
        curX = ax;
        curY = ay;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'Z':
      case 'z': {
        if (current) {
          current.closed = true;
        }
        curX = subStartX;
        curY = subStartY;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        activeCmd = null;
        break;
      }
      default:
        return subpaths;
    }
  }

  return subpaths;
}

/**
 * 将单个 SVG 子路径转换为独立原生 custGeom 形状并添加到幻灯片
 */
function emitSubpathToSlide(
  pres: any,
  pSlide: any,
  subpath: SvgSubpath,
  mapXIn: (vx: number) => number,
  mapYIn: (vy: number) => number,
  strokeHex: string,
  strokeWidthPt: number
): boolean {
  if (subpath.segments.length === 0) return false;

  const startInX = mapXIn(subpath.startX);
  const startInY = mapYIn(subpath.startY);

  let minX = startInX;
  let maxX = startInX;
  let minY = startInY;
  let maxY = startInY;

  const expandBounds = (xIn: number, yIn: number) => {
    if (xIn < minX) minX = xIn;
    if (xIn > maxX) maxX = xIn;
    if (yIn < minY) minY = yIn;
    if (yIn > maxY) maxY = yIn;
  };

  type MappedSeg =
    | { kind: 'line'; x: number; y: number }
    | { kind: 'cubic'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
    | { kind: 'quad'; x1: number; y1: number; x: number; y: number };

  const mappedSegs: MappedSeg[] = subpath.segments.map((seg) => {
    if (seg.kind === 'line') {
      const x = mapXIn(seg.x);
      const y = mapYIn(seg.y);
      expandBounds(x, y);
      return { kind: 'line', x, y };
    }
    if (seg.kind === 'cubic') {
      const x1 = mapXIn(seg.x1);
      const y1 = mapYIn(seg.y1);
      const x2 = mapXIn(seg.x2);
      const y2 = mapYIn(seg.y2);
      const x = mapXIn(seg.x);
      const y = mapYIn(seg.y);
      expandBounds(x1, y1);
      expandBounds(x2, y2);
      expandBounds(x, y);
      return { kind: 'cubic', x1, y1, x2, y2, x, y };
    }
    const x1 = mapXIn(seg.x1);
    const y1 = mapYIn(seg.y1);
    const x = mapXIn(seg.x);
    const y = mapYIn(seg.y);
    expandBounds(x1, y1);
    expandBounds(x, y);
    return { kind: 'quad', x1, y1, x, y };
  });

  const box = normalizeInchBox(minX, maxX, minY, maxY);
  const relX = (ax: number): number => clamp(roundIn(ax - box.x), 0, box.w);
  const relY = (ay: number): number => clamp(roundIn(ay - box.y), 0, box.h);

  const points: PptxPoint[] = [
    { moveTo: true, x: relX(startInX), y: relY(startInY) },
  ];

  for (const seg of mappedSegs) {
    if (seg.kind === 'line') {
      points.push({ x: relX(seg.x), y: relY(seg.y) });
    } else if (seg.kind === 'cubic') {
      points.push({
        x: relX(seg.x),
        y: relY(seg.y),
        curve: {
          type: 'cubic',
          x1: relX(seg.x1),
          y1: relY(seg.y1),
          x2: relX(seg.x2),
          y2: relY(seg.y2),
        },
      });
    } else {
      points.push({
        x: relX(seg.x),
        y: relY(seg.y),
        curve: {
          type: 'quadratic',
          x1: relX(seg.x1),
          y1: relY(seg.y1),
        },
      });
    }
  }

  if (subpath.closed) {
    points.push({ close: true });
  }

  // 不传 fill 以确保 PptxGenJS 生成标准 <a:noFill/>，避免闭合路径产生默认实体填充
  pSlide.addShape(pres.ShapeType.custGeom, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    line: { color: strokeHex, width: strokeWidthPt },
    points,
  });
  return true;
}

/**
 * 将 ICON_PATHS 内的线性矢量图标按原生 PowerPoint 形状（ellipse/rect/roundRect/custGeom）添加到幻灯片
 * @returns 成功添加到 pSlide 的原生形状数量
 */
export function addSvgIconToSlide(
  pres: any,
  pSlide: any,
  iconName: string,
  boxPx: { x: number; y: number; w: number; h: number },
  strokeHex: string,
  strokeWidthPt?: number
): number {
  const resolved = resolveIconKey(iconName);
  if (!resolved) return 0;

  const innerSvg = ICON_PATHS[resolved];
  if (!innerSvg) return 0;

  if (
    !boxPx ||
    !Number.isFinite(boxPx.x) ||
    !Number.isFinite(boxPx.y) ||
    !Number.isFinite(boxPx.w) ||
    !Number.isFinite(boxPx.h) ||
    boxPx.w <= 0 ||
    boxPx.h <= 0
  ) {
    return 0;
  }

  // 从 24×24 viewBox 等比居中映射到目标像素框
  const scale = Math.min(boxPx.w / 24, boxPx.h / 24);
  const drawW = 24 * scale;
  const drawH = 24 * scale;
  const originX = boxPx.x + (boxPx.w - drawW) / 2;
  const originY = boxPx.y + (boxPx.h - drawH) / 2;

  const mapXIn = (vx: number): number => rawPxToInX(originX + vx * scale);
  const mapYIn = (vy: number): number => rawPxToInY(originY + vy * scale);

  const safeHex = normalizeHex(strokeHex);
  const swPt =
    strokeWidthPt !== undefined && Number.isFinite(strokeWidthPt) && strokeWidthPt > 0
      ? Number(strokeWidthPt.toFixed(2))
      : Math.max(0.75, Number((1.65 * scale * 0.5).toFixed(2)));

  let addedCount = 0;
  const tagRe = /<(rect|circle|ellipse|line|polyline|polygon|path)\b([^>]*?)\/?\s*>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRe.exec(innerSvg)) !== null) {
    const tagName = tagMatch[1].toLowerCase();
    const attrs = parseSvgAttributes(tagMatch[2]);

    switch (tagName) {
      case 'circle': {
        const cx = parseAttrNumber(attrs, 'cx', 0);
        const cy = parseAttrNumber(attrs, 'cy', 0);
        const r = parseAttrNumber(attrs, 'r', 0);
        if (r <= 0) break;

        const box = normalizeInchBox(
          mapXIn(cx - r),
          mapXIn(cx + r),
          mapYIn(cy - r),
          mapYIn(cy + r)
        );
        // 省略 fill 让 PptxGenJS 输出 <a:noFill/>
        pSlide.addShape(pres.ShapeType.ellipse, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          line: { color: safeHex, width: swPt },
        });
        addedCount++;
        break;
      }
      case 'ellipse': {
        const cx = parseAttrNumber(attrs, 'cx', 0);
        const cy = parseAttrNumber(attrs, 'cy', 0);
        const rx = parseAttrNumber(attrs, 'rx', 0);
        const ry = parseAttrNumber(attrs, 'ry', 0);
        if (rx <= 0 || ry <= 0) break;

        const box = normalizeInchBox(
          mapXIn(cx - rx),
          mapXIn(cx + rx),
          mapYIn(cy - ry),
          mapYIn(cy + ry)
        );
        pSlide.addShape(pres.ShapeType.ellipse, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          line: { color: safeHex, width: swPt },
        });
        addedCount++;
        break;
      }
      case 'rect': {
        const rxVal = parseAttrNumber(attrs, 'x', 0);
        const ryVal = parseAttrNumber(attrs, 'y', 0);
        const rw = parseAttrNumber(attrs, 'width', 0);
        const rh = parseAttrNumber(attrs, 'height', 0);
        if (rw <= 0 || rh <= 0) break;

        const hasRx = attrs.rx !== undefined;
        const hasRy = attrs.ry !== undefined;
        let radX = parseAttrNumber(attrs, 'rx', 0);
        let radY = parseAttrNumber(attrs, 'ry', 0);
        if (hasRx && !hasRy) radY = radX;
        else if (!hasRx && hasRy) radX = radY;

        radX = clamp(radX, 0, rw / 2);
        radY = clamp(radY, 0, rh / 2);

        const box = normalizeInchBox(
          mapXIn(rxVal),
          mapXIn(rxVal + rw),
          mapYIn(ryVal),
          mapYIn(ryVal + rh)
        );

        const radiusIn = Math.min(
          rawPxToInX(radX * scale),
          rawPxToInY(radY * scale),
          box.w / 2,
          box.h / 2
        );

        if (radiusIn > 0.0005) {
          pSlide.addShape(pres.ShapeType.roundRect, {
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            rectRadius: roundIn(radiusIn),
            line: { color: safeHex, width: swPt },
          });
        } else {
          pSlide.addShape(pres.ShapeType.rect, {
            x: box.x,
            y: box.y,
            w: box.w,
            h: box.h,
            line: { color: safeHex, width: swPt },
          });
        }
        addedCount++;
        break;
      }
      case 'line': {
        const x1 = parseAttrNumber(attrs, 'x1', 0);
        const y1 = parseAttrNumber(attrs, 'y1', 0);
        const x2 = parseAttrNumber(attrs, 'x2', 0);
        const y2 = parseAttrNumber(attrs, 'y2', 0);
        const subpath: SvgSubpath = {
          startX: x1,
          startY: y1,
          segments: [{ kind: 'line', x: x2, y: y2 }],
          closed: false,
        };
        if (emitSubpathToSlide(pres, pSlide, subpath, mapXIn, mapYIn, safeHex, swPt)) {
          addedCount++;
        }
        break;
      }
      case 'polyline':
      case 'polygon': {
        const coords = parseNumberList(attrs.points || '');
        if (coords.length < 4) break;
        const segments: PathSegment[] = [];
        for (let i = 2; i + 1 < coords.length; i += 2) {
          segments.push({ kind: 'line', x: coords[i], y: coords[i + 1] });
        }
        const subpath: SvgSubpath = {
          startX: coords[0],
          startY: coords[1],
          segments,
          closed: tagName === 'polygon',
        };
        if (emitSubpathToSlide(pres, pSlide, subpath, mapXIn, mapYIn, safeHex, swPt)) {
          addedCount++;
        }
        break;
      }
      case 'path': {
        const d = attrs.d || '';
        if (!d) break;
        const subpaths = parseSvgPathData(d);
        for (const sub of subpaths) {
          if (emitSubpathToSlide(pres, pSlide, sub, mapXIn, mapYIn, safeHex, swPt)) {
            addedCount++;
          }
        }
        break;
      }
    }
  }

  return addedCount;
}

/**
 * 将三次贝塞尔连接线（含控制点）编译为原生可编辑 custGeom 曲线形状
 */
export function addCubicBezierEdgeToSlide(
  pres: any,
  pSlide: any,
  edge: {
    x1: number;
    y1: number;
    cx1: number;
    cy1: number;
    cx2: number;
    cy2: number;
    x2: number;
    y2: number;
  },
  colorHex: string,
  widthPt: number,
  dashed: boolean,
  hasArrow: boolean
): void {
  const padPx = 2;
  const minXPx = Math.min(edge.x1, edge.cx1, edge.cx2, edge.x2) - padPx;
  const maxXPx = Math.max(edge.x1, edge.cx1, edge.cx2, edge.x2) + padPx;
  const minYPx = Math.min(edge.y1, edge.cy1, edge.cy2, edge.y2) - padPx;
  const maxYPx = Math.max(edge.y1, edge.cy1, edge.cy2, edge.y2) + padPx;

  const box = normalizeInchBox(
    rawPxToInX(minXPx),
    rawPxToInX(maxXPx),
    rawPxToInY(minYPx),
    rawPxToInY(maxYPx)
  );

  const relX = (px: number): number =>
    clamp(roundIn(rawPxToInX(px) - box.x), 0, box.w);
  const relY = (py: number): number =>
    clamp(roundIn(rawPxToInY(py) - box.y), 0, box.h);

  const safeHex = normalizeHex(colorHex);
  const safeWidth =
    Number.isFinite(widthPt) && widthPt > 0 ? Number(widthPt.toFixed(2)) : 1;

  // 不传 fill 以生成 <a:noFill/>，避免开放曲线被闭合填充
  pSlide.addShape(pres.ShapeType.custGeom, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    line: {
      color: safeHex,
      width: safeWidth,
      dashType: dashed ? 'dash' : 'solid',
      endArrowType: hasArrow ? 'triangle' : 'none',
    },
    points: [
      { moveTo: true, x: relX(edge.x1), y: relY(edge.y1) },
      {
        x: relX(edge.x2),
        y: relY(edge.y2),
        curve: {
          type: 'cubic',
          x1: relX(edge.cx1),
          y1: relY(edge.cy1),
          x2: relX(edge.cx2),
          y2: relY(edge.cy2),
        },
      },
    ],
  });
}
