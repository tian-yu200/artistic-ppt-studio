/**
 * LaTeX / MathML -> Office Math Markup Language (OMML) 原生公式与行内富文本编译器
 *
 * 核心职责：
 * 1. 基于 KaTeX 输出的真实 MathML AST，将块级公式无损转换为符合 ISO/IEC 29500 & MS-ODRAWXML 规范的
 *    PowerPoint 原生可编辑 OMML (<m:oMathPara> / <m:oMath>)；
 * 2. 生成标准 DrawingML <mc:AlternateContent> 容器，优先以原生 <a14:m> 公式呈现，
 *    同时保留高保真位图 <mc:Fallback> 兼容旧版阅读器；
 * 3. 将正文行内短公式 ($...$) 编译为单行不折断的 PptxGenJS 富文本 Runs (Cambria Math + 上下标/斜体)。
 */

import katex from 'katex';
import { toPptxHex } from '../utils/color.js';

export interface OmmlCompileOptions {
  displayMode: boolean;
  fontSizePt: number;
  colorHex: string;
  align?: 'left' | 'center' | 'right';
}

export interface NativeOmmlShapeParams {
  shapeId: number;
  name: string;
  xEmu: number;
  yEmu: number;
  cxEmu: number;
  cyEmu: number;
  ommlParaXml: string;
  align: 'l' | 'ctr' | 'r';
}

export interface OmmlAlternateContentParams extends NativeOmmlShapeParams {
  fallbackPicXml: string;
}

export interface InlineMathBaseStyle {
  colorHex: string;
  fontSizePt: number;
  bold?: boolean;
}

export interface InlineMathRun {
  text: string;
  options: Record<string, any>;
}

interface MathMlNode {
  tag: string;
  attrs: Record<string, string>;
  children: MathMlNode[];
  text?: string;
}

interface OmmlContext {
  sz: number;
  colorHex: string;
  aRPr: string;
  ctrlPr: string;
}

interface InlineContext {
  colorHex: string;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  superscript: boolean;
  subscript: boolean;
  scriptLevel: number;
}

// ============================================================================
// 基础 XML / 颜色 / Unicode 映射工具
// ============================================================================

const VOID_TAGS = new Set(['mspace', 'mprescripts', 'none', 'malignmark', 'maligngroup']);
const IGNORED_TAGS = new Set(['annotation', 'annotation-xml']);
const INVISIBLE_MATH_CHARS_RE = /[\u2061\u2062\u2063\u2064]/g;

const CSS_NAMED_COLORS: Record<string, string> = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  yellow: 'FFFF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  gray: '808080',
  grey: '808080',
  orange: 'FFA500',
  purple: '800080',
  navy: '000080',
  teal: '008080',
  maroon: '800000',
  silver: 'C0C0C0',
};

// Unicode Letterlike Symbols 例外表（不在连续 SMP 区间内的标准码位）
const UNICODE_SCRIPT_EXCEPTIONS: Record<string, string> = {
  B: '\u212C',
  E: '\u2130',
  F: '\u2131',
  H: '\u210B',
  I: '\u2110',
  L: '\u2112',
  M: '\u2133',
  R: '\u211B',
  e: '\u212F',
  g: '\u210A',
  o: '\u2134',
};

const UNICODE_DOUBLE_STRUCK_EXCEPTIONS: Record<string, string> = {
  C: '\u2102',
  H: '\u210D',
  N: '\u2115',
  P: '\u2119',
  Q: '\u211A',
  R: '\u211D',
  Z: '\u2124',
};

const UNICODE_FRAKTUR_EXCEPTIONS: Record<string, string> = {
  C: '\u212D',
  H: '\u210C',
  I: '\u2111',
  R: '\u211C',
  Z: '\u2128',
};

// MathML 定界符集合与规范化映射（确保 PowerPoint 可垂直自动伸缩）
const LEFT_DELIM_SET = new Set(['(', '[', '{', '|', '\u2223', '\u2016', '\u2225', '\u27E8', '\u2329', '\u230A', '\u2308']);
const RIGHT_DELIM_SET = new Set([')', ']', '}', '|', '\u2223', '\u2016', '\u2225', '\u27E9', '\u232A', '\u230B', '\u2309']);

const DELIM_NORMALIZE_MAP: Record<string, string> = {
  '\u2223': '|', // DIVIDES -> ASCII pipe，确保 Cambria Math 按伸缩竖线渲染
  '\u2225': '\u2016', // PARALLEL TO -> DOUBLE VERTICAL LINE
  '\u2329': '\u27E8', // LEFT-POINTING ANGLE BRACKET -> MATHEMATICAL LEFT ANGLE BRACKET
  '\u232A': '\u27E9', // RIGHT-POINTING ANGLE BRACKET -> MATHEMATICAL RIGHT ANGLE BRACKET
};

// OMML <m:nary> 支持的大型算子
const NARY_OPERATORS = new Set([
  '\u2211', // ∑
  '\u220F', // ∏
  '\u2210', // ∐
  '\u222B', // ∫
  '\u222C', // ∬
  '\u222D', // ∭
  '\u222E', // ∮
  '\u222F', // ∯
  '\u2230', // ∰
  '\u2A0C', // ⨌
  '\u22C3', // ⋃
  '\u22C2', // ⋂
  '\u22C1', // ⋁
  '\u22C0', // ⋀
  '\u2A01', // ⨁
  '\u2A02', // ⨂
  '\u2A04', // ⨄
  '\u2A06', // ⨆
  '\u2A00', // ⨀
]);

// 重音符号到 Unicode 组合变音符号（Combining Diacritical Marks）的映射
const ACCENT_COMBINING_MAP: Record<string, string> = {
  '^': '\u0302',
  '\u02C6': '\u0302', // ˆ
  '\u0302': '\u0302',
  '~': '\u0303',
  '\u02DC': '\u0303', // ˜
  '\u0303': '\u0303',
  '\u02D9': '\u0307', // ˙
  '\u0307': '\u0307',
  '\u00A8': '\u0308', // ¨
  '\u0308': '\u0308',
  '\u20DB': '\u20DB', // ⃛
  '\u02C7': '\u030C', // ˇ
  '\u030C': '\u030C',
  '\u02CA': '\u0301', // ˊ
  '\u00B4': '\u0301', // ´
  '\u0301': '\u0301',
  '\u02CB': '\u0300', // ˋ
  '\u0060': '\u0300', // `
  '\u0300': '\u0300',
  '\u02D8': '\u0306', // ˘
  '\u0306': '\u0306',
  '\u02C9': '\u0304', // ˉ (\bar)
  '\u00AF': '\u0304', // ¯
  '\u0304': '\u0304',
  '\u20D7': '\u20D7', // ⃗ (\vec)
  '\u20D6': '\u20D6', // ⃖
};

// 二元关系与运算符（用于行内公式自动间距及大型算子吸收边界判定）
const BINARY_STOP_OPS = new Set([
  '=', '\u2260', '<', '>', '\u2264', '\u2265', '\u2248', '\u2261', '\u223C', '\u2243', '\u2245', '\u221D',
  '\u2208', '\u2209', '\u2282', '\u2286', '\u2283', '\u2287', '\u2192', '\u2190', '\u2194', '\u21D2',
  '\u21D4', '\u21A6', '+', '\u2212', '-', '\u00B1', '\u2213', ',', ';', ':',
]);

const INLINE_SPACED_OPS = new Set([
  '=', '\u2260', '<', '>', '\u2264', '\u2265', '\u2248', '\u2261', '\u223C', '\u2243', '\u2245', '\u221D',
  '\u2208', '\u2209', '\u2282', '\u2286', '\u2283', '\u2287', '\u222A', '\u2229', '\u2192', '\u2190',
  '\u2194', '\u21D2', '\u21D4', '\u21A6', '+', '\u2212', '-', '\u22C5', '\u00D7', '\u00F7', '\u00B1',
  '\u2213', '\u2227', '\u2228', '\u2295', '\u2297',
]);

const NAMED_FUNCTION_OPS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp', 'lim', 'limsup',
  'liminf', 'max', 'min', 'sup', 'inf', 'arg', 'argmin', 'argmax', 'det',
  'dim', 'ker', 'gcd', 'Pr', 'hom', 'deg', 'mod',
]);

function xmlEsc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  return str.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos|nbsp);/g, (full, entity: string) => {
    if (entity === 'lt') return '<';
    if (entity === 'gt') return '>';
    if (entity === 'amp') return '&';
    if (entity === 'quot') return '"';
    if (entity === 'apos') return "'";
    if (entity === 'nbsp') return '\u00A0';
    if (entity.startsWith('#x')) {
      const cp = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    }
    if (entity.startsWith('#')) {
      const cp = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    }
    return full;
  });
}

function normalizeHexColor(color: string, fallback = '111827'): string {
  const s = (color || '').trim();
  if (!s) return fallback;
  const bareHex = s.startsWith('#') ? s.slice(1) : s;
  if (/^[0-9a-fA-F]{6}$/.test(bareHex)) {
    return bareHex.toUpperCase();
  }
  const named = CSS_NAMED_COLORS[s.toLowerCase()];
  if (named) return named;
  return toPptxHex(s, fallback);
}

function mapMathVariantUnicode(text: string, variant: string): { mapped: string; allMapped: boolean } {
  const chars = Array.from(text);
  let allMapped = true;
  const mappedChars = chars.map((ch) => {
    const code = ch.codePointAt(0)!;
    if (variant === 'script') {
      if (UNICODE_SCRIPT_EXCEPTIONS[ch]) return UNICODE_SCRIPT_EXCEPTIONS[ch];
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d49c + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d4b6 + (code - 97));
    } else if (variant === 'double-struck') {
      if (UNICODE_DOUBLE_STRUCK_EXCEPTIONS[ch]) return UNICODE_DOUBLE_STRUCK_EXCEPTIONS[ch];
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d538 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d552 + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7d8 + (code - 48));
    } else if (variant === 'fraktur') {
      if (UNICODE_FRAKTUR_EXCEPTIONS[ch]) return UNICODE_FRAKTUR_EXCEPTIONS[ch];
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d504 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d51e + (code - 97));
    }
    allMapped = false;
    return ch;
  });
  return { mapped: mappedChars.join(''), allMapped };
}

function normalizeDelimiterChar(ch: string): string {
  const trimmed = ch.trim();
  if (!trimmed || trimmed === '.') return '';
  return DELIM_NORMALIZE_MAP[trimmed] ?? trimmed;
}

// ============================================================================
// 轻量级 KaTeX MathML XML 解析器
// ============================================================================

function parseTagAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(attrString)) !== null) {
    attrs[m[1]] = decodeHtmlEntities(m[2] ?? m[3] ?? '');
  }
  return attrs;
}

function parseXmlFragment(xml: string): MathMlNode | null {
  const root: MathMlNode = { tag: '__root__', attrs: {}, children: [] };
  const stack: MathMlNode[] = [root];
  const tokenRegex = /<!--[\s\S]*?-->|<\/([a-zA-Z_:][\w:.-]*)\s*>|<([a-zA-Z_:][\w:.-]*)((?:\s+[a-zA-Z_:][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;

  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(xml)) !== null) {
    if (m[0].startsWith('<!--')) continue;

    const closeTag = m[1];
    const openTag = m[2];
    const attrStr = m[3];
    const selfClose = m[4];
    const textChunk = m[5];

    const current = stack[stack.length - 1];
    if (closeTag) {
      for (let idx = stack.length - 1; idx >= 1; idx--) {
        if (stack[idx].tag === closeTag) {
          stack.length = idx;
          break;
        }
      }
      continue;
    }

    if (openTag) {
      const node: MathMlNode = {
        tag: openTag,
        attrs: attrStr ? parseTagAttributes(attrStr) : {},
        children: [],
      };
      if (!IGNORED_TAGS.has(openTag)) {
        current.children.push(node);
      }
      if (!selfClose && !VOID_TAGS.has(openTag)) {
        stack.push(node);
      }
      continue;
    }

    if (textChunk !== undefined) {
      const decoded = decodeHtmlEntities(textChunk);
      if (decoded.length > 0) {
        current.children.push({
          tag: '#text',
          attrs: {},
          children: [],
          text: decoded,
        });
      }
    }
  }

  return root.children[0] ?? null;
}

function parseKatexMathMl(latex: string, displayMode: boolean): MathMlNode | null {
  const cleanLatex = (latex || '').trim();
  if (!cleanLatex) return null;

  let html: string;
  try {
    html = katex.renderToString(cleanLatex, {
      output: 'mathml',
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return null;
  }

  if (!html || html.includes('class="katex-error"')) {
    return null;
  }

  const mathMatch = html.match(/<math\b[\s\S]*?<\/math>/i);
  if (!mathMatch) return null;

  const mathNode = parseXmlFragment(mathMatch[0]);
  if (!mathNode || mathNode.tag !== 'math') return null;

  // 提取 <semantics> 内部的真实公式根节点（忽略 <annotation>）
  const meaningfulChildren = mathNode.children.filter((c) => c.tag !== '#text');
  if (meaningfulChildren.length === 0) return null;

  if (meaningfulChildren[0].tag === 'semantics') {
    const semChildren = meaningfulChildren[0].children.filter((c) => c.tag !== '#text');
    if (semChildren.length === 0) return null;
    return semChildren.length === 1
      ? semChildren[0]
      : { tag: 'mrow', attrs: {}, children: semChildren };
  }

  return meaningfulChildren.length === 1
    ? meaningfulChildren[0]
    : { tag: 'mrow', attrs: {}, children: meaningfulChildren };
}

function getNodeText(node: MathMlNode): string {
  if (node.tag === '#text') return node.text ?? '';
  if (node.children.length === 0) return node.text ?? '';
  return node.children.map(getNodeText).join('');
}

function unwrapSinglePassThrough(node: MathMlNode): MathMlNode {
  let curr = node;
  while (
    (curr.tag === 'mrow' || curr.tag === 'mstyle' || curr.tag === 'mpadded') &&
    curr.children.length === 1 &&
    !curr.attrs.mathcolor &&
    !curr.attrs.mathvariant
  ) {
    curr = curr.children[0];
  }
  return curr;
}

function extractPureSymbol(node: MathMlNode): string | null {
  const curr = unwrapSinglePassThrough(node);
  if (curr.tag === 'mo' || curr.tag === 'mi' || curr.tag === 'mn') {
    const hasElementChild = curr.children.some((c) => c.tag !== '#text');
    if (hasElementChild) return null;
    return getNodeText(curr).replace(INVISIBLE_MATH_CHARS_RE, '').trim();
  }
  return null;
}

function isPureFunctionApplicationMo(node: MathMlNode): boolean {
  if (node.tag !== 'mo') return false;
  if (node.children.some((c) => c.tag !== '#text')) return false;
  const raw = getNodeText(node);
  return raw.length > 0 && raw.replace(INVISIBLE_MATH_CHARS_RE, '').length === 0;
}

// ============================================================================
// OMML 辅助生成器（严格遵循 ISO/IEC 29500-1 与 MS-ODRAWXML 子元素顺序）
// ============================================================================

function buildARPrXml(sz: number, colorHex: string, bold = false): string {
  const bAttr = bold ? ' b="1"' : '';
  return `<a:rPr lang="en-US" sz="${sz}"${bAttr}><a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill><a:latin typeface="Cambria Math"/><a:ea typeface="Cambria Math"/><a:cs typeface="Cambria Math"/></a:rPr>`;
}

function buildOmmlContext(fontSizePt: number, colorHex: string): OmmlContext {
  const sz = Math.max(100, Math.min(400000, Math.round(fontSizePt * 100)));
  const hex = normalizeHexColor(colorHex);
  const aRPr = buildARPrXml(sz, hex);
  return {
    sz,
    colorHex: hex,
    aRPr,
    ctrlPr: `<m:ctrlPr>${aRPr}</m:ctrlPr>`,
  };
}

function withOmmlColor(ctx: OmmlContext, newColor: string): OmmlContext {
  const hex = normalizeHexColor(newColor, ctx.colorHex);
  if (hex === ctx.colorHex) return ctx;
  const aRPr = buildARPrXml(ctx.sz, hex);
  return {
    sz: ctx.sz,
    colorHex: hex,
    aRPr,
    ctrlPr: `<m:ctrlPr>${aRPr}</m:ctrlPr>`,
  };
}

function buildOmmlEmptyRun(ctx: OmmlContext): string {
  return `<m:r><m:rPr><m:nor/></m:rPr>${ctx.aRPr}<m:t/></m:r>`;
}

function buildOmmlRun(
  text: string,
  ctx: OmmlContext,
  opts: { nor?: boolean; scr?: string; sty?: 'p' | 'b' | 'i' | 'bi'; bold?: boolean } = {}
): string {
  // <m:rPr> 严格顺序: <m:lit/>? <m:nor/>? <m:scr/>? <m:sty/>?
  let rPrInner = '';
  if (opts.nor) {
    rPrInner += '<m:nor/>';
  } else {
    if (opts.scr) rPrInner += `<m:scr m:val="${opts.scr}"/>`;
    if (opts.sty) rPrInner += `<m:sty m:val="${opts.sty}"/>`;
  }
  const rPrXml = rPrInner ? `<m:rPr>${rPrInner}</m:rPr>` : '';
  const aRPr = opts.bold ? buildARPrXml(ctx.sz, ctx.colorHex, true) : ctx.aRPr;
  const needPreserve = /^\s|\s$|\s{2,}|\u00A0/.test(text);
  const tAttr = needPreserve ? ' xml:space="preserve"' : '';
  return `<m:r>${rPrXml}${aRPr}<m:t${tAttr}>${xmlEsc(text)}</m:t></m:r>`;
}

function buildOmmlMspace(widthAttr: string | undefined, ctx: OmmlContext): string {
  if (!widthAttr) return '';
  const m = widthAttr.trim().match(/^(-?[\d.]+)(em|ex|px|pt|mu)?$/i);
  if (!m) return '';
  const val = Number(m[1]);
  if (!Number.isFinite(val) || val <= 0.05) return '';
  const unit = (m[2] || 'em').toLowerCase();
  const emApprox = unit === 'em' ? val : unit === 'mu' ? val / 18 : unit === 'ex' ? val * 0.5 : val / 12;
  if (emApprox <= 0.08) return '';
  const spaces = emApprox >= 1.5 ? '  ' : ' ';
  return buildOmmlRun(spaces, ctx, { nor: true });
}

function renderOmmlSlotContent(nodes: MathMlNode[], ctx: OmmlContext): string {
  const xml = renderSequenceToOmml(nodes, ctx);
  return xml || buildOmmlEmptyRun(ctx);
}

function renderOmmlSingleSlot(node: MathMlNode, ctx: OmmlContext): string {
  const xml = renderNodeToOmml(node, ctx);
  return xml || buildOmmlEmptyRun(ctx);
}

function isFenceMo(node: MathMlNode, side: 'left' | 'right'): boolean {
  if (node.tag !== 'mo' || node.children.some((c) => c.tag !== '#text')) return false;
  const ch = getNodeText(node).replace(INVISIBLE_MATH_CHARS_RE, '').trim();
  if (!ch) return false;
  const isLeft = LEFT_DELIM_SET.has(ch);
  const isRight = RIGHT_DELIM_SET.has(ch);
  if (node.attrs.fence === 'true') {
    return side === 'left' ? isLeft : isRight;
  }
  if (node.attrs.stretchy === 'true') {
    return side === 'left' ? isLeft : isRight;
  }
  return false;
}

function tryRenderFenceMrow(node: MathMlNode, ctx: OmmlContext): string | null {
  const children = node.children.filter((c) => !(c.tag === '#text' && !getNodeText(c).trim()));
  if (children.length < 2) return null;

  const first = children[0];
  const last = children[children.length - 1];
  const hasLeftFence = isFenceMo(first, 'left');
  const hasRightFence = isFenceMo(last, 'right');

  if (!hasLeftFence && !hasRightFence) return null;

  // 若仅有单边定界符，确认只有明确 fence="true" 才包成单侧定界 <m:d>，避免误吞一般 stretchy 符号
  if (hasLeftFence && !hasRightFence && first.attrs.fence !== 'true') return null;
  if (!hasLeftFence && hasRightFence && last.attrs.fence !== 'true') return null;

  let begChr = '';
  let endChr = '';
  let body: MathMlNode[];

  if (hasLeftFence && hasRightFence) {
    begChr = normalizeDelimiterChar(getNodeText(first));
    endChr = normalizeDelimiterChar(getNodeText(last));
    body = children.slice(1, -1);
  } else if (hasLeftFence) {
    begChr = normalizeDelimiterChar(getNodeText(first));
    body = children.slice(1);
  } else {
    endChr = normalizeDelimiterChar(getNodeText(last));
    body = children.slice(0, -1);
  }

  // <m:dPr> 严格顺序: <m:begChr/>? <m:sepChr/>? <m:endChr/>? <m:grow/>? <m:shp/>? <m:ctrlPr/>?
  const dPrXml =
    `<m:dPr>` +
    `<m:begChr m:val="${xmlEsc(begChr)}"/>` +
    `<m:endChr m:val="${xmlEsc(endChr)}"/>` +
    `<m:grow m:val="1"/>` +
    `${ctx.ctrlPr}` +
    `</m:dPr>`;

  return `<m:d>${dPrXml}<m:e>${renderOmmlSlotContent(body, ctx)}</m:e></m:d>`;
}

function renderMfrac(node: MathMlNode, ctx: OmmlContext): string {
  const elems = node.children.filter((c) => c.tag !== '#text');
  const numNode = elems[0];
  const denNode = elems[1];
  const linethickness = (node.attrs.linethickness || '').trim();
  const isNoBar = linethickness === '0' || linethickness === '0px' || linethickness === '0em';

  // <m:fPr> 严格顺序: <m:type/>? <m:ctrlPr/>?
  const fPrXml = `<m:fPr>${isNoBar ? '<m:type m:val="noBar"/>' : ''}${ctx.ctrlPr}</m:fPr>`;
  const numXml = numNode ? renderOmmlSingleSlot(numNode, ctx) : buildOmmlEmptyRun(ctx);
  const denXml = denNode ? renderOmmlSingleSlot(denNode, ctx) : buildOmmlEmptyRun(ctx);
  return `<m:f>${fPrXml}<m:num>${numXml}</m:num><m:den>${denXml}</m:den></m:f>`;
}

function renderRadical(node: MathMlNode, ctx: OmmlContext, hasDegree: boolean): string {
  const elems = node.children.filter((c) => c.tag !== '#text');
  if (hasDegree) {
    const baseNode = elems[0];
    const degNode = elems[1];
    // <m:rad> 严格顺序: <m:radPr>? -> <m:deg> -> <m:e>
    const radPrXml = `<m:radPr>${ctx.ctrlPr}</m:radPr>`;
    const degXml = degNode ? renderOmmlSingleSlot(degNode, ctx) : buildOmmlEmptyRun(ctx);
    const eXml = baseNode ? renderOmmlSingleSlot(baseNode, ctx) : buildOmmlEmptyRun(ctx);
    return `<m:rad>${radPrXml}<m:deg>${degXml}</m:deg><m:e>${eXml}</m:e></m:rad>`;
  }

  // <msqrt> 允许包含多个隐含子节点
  const radPrXml = `<m:radPr><m:degHide m:val="1"/>${ctx.ctrlPr}</m:radPr>`;
  const eXml = renderOmmlSlotContent(elems, ctx);
  return `<m:rad>${radPrXml}<m:deg/>` + `<m:e>${eXml}</m:e></m:rad>`;
}

function renderNary(
  chr: string,
  limLoc: 'undOvr' | 'subSup',
  subNode: MathMlNode | null,
  supNode: MathMlNode | null,
  bodyNodes: MathMlNode[],
  ctx: OmmlContext
): string {
  // <m:naryPr> 严格顺序: <m:chr/>? <m:limLoc/>? <m:grow/>? <m:subHide/>? <m:supHide/>? <m:ctrlPr/>?
  const subHideXml = subNode ? '' : '<m:subHide m:val="1"/>';
  const supHideXml = supNode ? '' : '<m:supHide m:val="1"/>';
  const naryPrXml =
    `<m:naryPr>` +
    `<m:chr m:val="${xmlEsc(chr)}"/>` +
    `<m:limLoc m:val="${limLoc}"/>` +
    `<m:grow m:val="1"/>` +
    `${subHideXml}${supHideXml}` +
    `${ctx.ctrlPr}` +
    `</m:naryPr>`;

  const subXml = subNode ? `<m:sub>${renderOmmlSingleSlot(subNode, ctx)}</m:sub>` : '<m:sub/>';
  const supXml = supNode ? `<m:sup>${renderOmmlSingleSlot(supNode, ctx)}</m:sup>` : '<m:sup/>';
  const bodyXml = bodyNodes.length > 0 ? renderOmmlSlotContent(bodyNodes, ctx) : buildOmmlEmptyRun(ctx);

  // <m:nary> 严格顺序: <m:naryPr>? -> <m:sub> -> <m:sup> -> <m:e>
  return `<m:nary>${naryPrXml}${subXml}${supXml}<m:e>${bodyXml}</m:e></m:nary>`;
}

function renderScript(node: MathMlNode, ctx: OmmlContext, kind: 'sub' | 'sup' | 'subsup'): string {
  const elems = node.children.filter((c) => c.tag !== '#text');
  const baseNode = elems[0];
  const baseXml = baseNode ? renderOmmlSingleSlot(baseNode, ctx) : buildOmmlEmptyRun(ctx);

  if (kind === 'sub') {
    const subNode = elems[1];
    const subXml = subNode ? renderOmmlSingleSlot(subNode, ctx) : buildOmmlEmptyRun(ctx);
    return `<m:sSub><m:sSubPr>${ctx.ctrlPr}</m:sSubPr><m:e>${baseXml}</m:e><m:sub>${subXml}</m:sub></m:sSub>`;
  }
  if (kind === 'sup') {
    const supNode = elems[1];
    const supXml = supNode ? renderOmmlSingleSlot(supNode, ctx) : buildOmmlEmptyRun(ctx);
    return `<m:sSup><m:sSupPr>${ctx.ctrlPr}</m:sSupPr><m:e>${baseXml}</m:e><m:sup>${supXml}</m:sup></m:sSup>`;
  }
  const subNode = elems[1];
  const supNode = elems[2];
  const subXml = subNode ? renderOmmlSingleSlot(subNode, ctx) : buildOmmlEmptyRun(ctx);
  const supXml = supNode ? renderOmmlSingleSlot(supNode, ctx) : buildOmmlEmptyRun(ctx);
  // <m:sSubSup> 严格顺序: <m:sSubSupPr>? -> <m:e> -> <m:sub> -> <m:sup>
  return `<m:sSubSup><m:sSubSupPr>${ctx.ctrlPr}</m:sSubSupPr><m:e>${baseXml}</m:e><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`;
}

function renderOverUnder(node: MathMlNode, ctx: OmmlContext, kind: 'over' | 'under' | 'underover'): string {
  const elems = node.children.filter((c) => c.tag !== '#text');
  const baseNode = elems[0];
  const baseXml = baseNode ? renderOmmlSingleSlot(baseNode, ctx) : buildOmmlEmptyRun(ctx);

  if (kind === 'over') {
    const overNode = elems[1];
    const overSym = overNode ? extractPureSymbol(overNode) : null;
    if (overSym === '\u203E') {
      // \overline{...}
      return `<m:bar><m:barPr><m:pos m:val="top"/>${ctx.ctrlPr}</m:barPr><m:e>${baseXml}</m:e></m:bar>`;
    }
    if (overSym === '\u23DE') {
      // \overbrace{...}
      return `<m:groupChr><m:groupChrPr><m:chr m:val="\u23DE"/><m:pos m:val="top"/><m:vertJc m:val="bot"/>${ctx.ctrlPr}</m:groupChrPr><m:e>${baseXml}</m:e></m:groupChr>`;
    }
    if (overSym && (overSym === '\u2192' || overSym === '\u2190' || overSym === '\u2194')) {
      // \overrightarrow{AB} / \overleftarrow{AB}
      return `<m:groupChr><m:groupChrPr><m:chr m:val="${xmlEsc(overSym)}"/><m:pos m:val="top"/><m:vertJc m:val="bot"/>${ctx.ctrlPr}</m:groupChrPr><m:e>${baseXml}</m:e></m:groupChr>`;
    }
    if (overSym && ACCENT_COMBINING_MAP[overSym]) {
      const accChr = ACCENT_COMBINING_MAP[overSym];
      return `<m:acc><m:accPr><m:chr m:val="${xmlEsc(accChr)}"/>${ctx.ctrlPr}</m:accPr><m:e>${baseXml}</m:e></m:acc>`;
    }
    const limXml = overNode ? renderOmmlSingleSlot(overNode, ctx) : buildOmmlEmptyRun(ctx);
    return `<m:limUpp><m:limUppPr>${ctx.ctrlPr}</m:limUppPr><m:e>${baseXml}</m:e><m:lim>${limXml}</m:lim></m:limUpp>`;
  }

  if (kind === 'under') {
    const underNode = elems[1];
    const underSym = underNode ? extractPureSymbol(underNode) : null;
    if (underSym === '\u203E') {
      // \underline{...}
      return `<m:bar><m:barPr><m:pos m:val="bot"/>${ctx.ctrlPr}</m:barPr><m:e>${baseXml}</m:e></m:bar>`;
    }
    if (underSym === '\u23DF') {
      // \underbrace{...}
      return `<m:groupChr><m:groupChrPr><m:chr m:val="\u23DF"/><m:pos m:val="bot"/><m:vertJc m:val="top"/>${ctx.ctrlPr}</m:groupChrPr><m:e>${baseXml}</m:e></m:groupChr>`;
    }
    const limXml = underNode ? renderOmmlSingleSlot(underNode, ctx) : buildOmmlEmptyRun(ctx);
    return `<m:limLow><m:limLowPr>${ctx.ctrlPr}</m:limLowPr><m:e>${baseXml}</m:e><m:lim>${limXml}</m:lim></m:limLow>`;
  }

  // 非 N-ary 的 <munderover>（同时具备上下限）
  const underNode = elems[1];
  const overNode = elems[2];
  const underXml = underNode ? renderOmmlSingleSlot(underNode, ctx) : buildOmmlEmptyRun(ctx);
  const overXml = overNode ? renderOmmlSingleSlot(overNode, ctx) : buildOmmlEmptyRun(ctx);
  const lowWrapped = `<m:limLow><m:limLowPr>${ctx.ctrlPr}</m:limLowPr><m:e>${baseXml}</m:e><m:lim>${underXml}</m:lim></m:limLow>`;
  return `<m:limUpp><m:limUppPr>${ctx.ctrlPr}</m:limUppPr><m:e>${lowWrapped}</m:e><m:lim>${overXml}</m:lim></m:limUpp>`;
}

function renderMtable(node: MathMlNode, ctx: OmmlContext): string {
  const rows = node.children.filter((c) => c.tag === 'mtr' || c.tag === 'mlabeledtr');
  if (rows.length === 0) return buildOmmlEmptyRun(ctx);

  let maxCols = 0;
  const rowCells: MathMlNode[][] = rows.map((row) => {
    const cells = row.children.filter((c) => c.tag === 'mtd');
    if (cells.length > maxCols) maxCols = cells.length;
    return cells;
  });
  if (maxCols === 0) maxCols = 1;

  // 解析 KaTeX 的 columnalign 属性（如 "left left"、"right left"、"center"）
  const colAlignRaw = (node.attrs.columnalign || 'center').trim().split(/\s+/);
  const mcItems: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    const alignToken = colAlignRaw[c] || colAlignRaw[colAlignRaw.length - 1] || 'center';
    const mcJc = alignToken === 'left' || alignToken === 'right' ? alignToken : 'center';
    mcItems.push(`<m:mc><m:mcPr><m:count m:val="1"/><m:mcJc m:val="${mcJc}"/></m:mcPr></m:mc>`);
  }

  // <m:mPr> 严格顺序: <m:plcHide/>? ... <m:mcs>? <m:ctrlPr>?
  const mPrXml = `<m:mPr><m:plcHide m:val="1"/><m:mcs>${mcItems.join('')}</m:mcs>${ctx.ctrlPr}</m:mPr>`;

  const mrXmls = rowCells.map((cells) => {
    const cellXmls: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const cell = cells[c];
      const cellInner = cell ? renderOmmlSlotContent(cell.children, ctx) : buildOmmlEmptyRun(ctx);
      cellXmls.push(`<m:e>${cellInner}</m:e>`);
    }
    return `<m:mr>${cellXmls.join('')}</m:mr>`;
  });

  return `<m:m>${mPrXml}${mrXmls.join('')}</m:m>`;
}

function renderMenclose(node: MathMlNode, ctx: OmmlContext): string {
  const notation = (node.attrs.notation || 'box').toLowerCase();
  const tokens = new Set(notation.split(/\s+/).filter(Boolean));
  const innerXml = renderOmmlSlotContent(node.children, ctx);

  // <m:borderBoxPr> 严格顺序:
  // hideTop?, hideBot?, hideLeft?, hideRight?, strikeH?, strikeV?, strikeBLTR?, strikeTLBR?, ctrlPr?
  let prInner = '';
  if (!tokens.has('box') && !tokens.has('roundedbox')) {
    if (!tokens.has('top')) prInner += '<m:hideTop m:val="1"/>';
    if (!tokens.has('bottom')) prInner += '<m:hideBot m:val="1"/>';
    if (!tokens.has('left')) prInner += '<m:hideLeft m:val="1"/>';
    if (!tokens.has('right')) prInner += '<m:hideRight m:val="1"/>';
    if (tokens.has('horizontalstrike')) prInner += '<m:strikeH m:val="1"/>';
    if (tokens.has('verticalstrike')) prInner += '<m:strikeV m:val="1"/>';
    if (tokens.has('updiagonalstrike')) prInner += '<m:strikeBLTR m:val="1"/>';
    if (tokens.has('downdiagonalstrike')) prInner += '<m:strikeTLBR m:val="1"/>';
  }
  return `<m:borderBox><m:borderBoxPr>${prInner}${ctx.ctrlPr}</m:borderBoxPr><m:e>${innerXml}</m:e></m:borderBox>`;
}

function renderLeafIdentifierOrOp(node: MathMlNode, ctx: OmmlContext): string {
  // 若 <mi>/<mo>/<mn>/<mtext> 内部嵌套了元素（如 KaTeX 的 \overset / \underset）则递归透传
  if (node.children.some((c) => c.tag !== '#text')) {
    return renderSequenceToOmml(node.children, ctx);
  }

  const rawText = getNodeText(node);
  const cleaned = rawText.replace(INVISIBLE_MATH_CHARS_RE, '');
  if (!cleaned) return '';

  const variant = node.attrs.mathvariant || '';

  if (node.tag === 'mtext') {
    const isMono = variant === 'monospace';
    const isBold = variant === 'bold' || variant === 'bold-italic';
    return buildOmmlRun(cleaned, ctx, {
      nor: !isMono,
      scr: isMono ? 'monospace' : undefined,
      sty: isMono ? 'p' : undefined,
      bold: isBold,
    });
  }

  if (node.tag === 'mn') {
    if (variant === 'bold') return buildOmmlRun(cleaned, ctx, { sty: 'b' });
    return buildOmmlRun(cleaned, ctx);
  }

  if (node.tag === 'mo') {
    if (variant === 'bold') return buildOmmlRun(cleaned, ctx, { sty: 'b' });
    if (variant === 'normal') return buildOmmlRun(cleaned, ctx, { sty: 'p' });
    return buildOmmlRun(cleaned, ctx);
  }

  // <mi> 处理逻辑
  if (variant === 'normal') {
    return buildOmmlRun(cleaned, ctx, { sty: 'p' });
  }
  if (variant === 'bold') {
    return buildOmmlRun(cleaned, ctx, { sty: 'b' });
  }
  if (variant === 'bold-italic') {
    return buildOmmlRun(cleaned, ctx, { sty: 'bi' });
  }
  if (variant === 'italic') {
    return buildOmmlRun(cleaned, ctx);
  }
  if (variant === 'script' || variant === 'double-struck' || variant === 'fraktur') {
    const { mapped, allMapped } = mapMathVariantUnicode(cleaned, variant);
    if (allMapped) {
      return buildOmmlRun(mapped, ctx, { sty: 'p' });
    }
    return buildOmmlRun(cleaned, ctx, { scr: variant, sty: 'p' });
  }
  if (variant === 'sans-serif' || variant === 'monospace') {
    return buildOmmlRun(cleaned, ctx, { scr: variant, sty: 'p' });
  }

  // MathML 3.0 默认规则：无显式 mathvariant 时，单字母斜体（省略 rPr 默认即斜体），多字母正体（如 sin, cos, lim）
  const codePointLen = Array.from(cleaned).length;
  if (codePointLen > 1) {
    return buildOmmlRun(cleaned, ctx, { sty: 'p' });
  }
  return buildOmmlRun(cleaned, ctx);
}

interface NaryDescriptor {
  chr: string;
  limLoc: 'undOvr' | 'subSup';
  subNode: MathMlNode | null;
  supNode: MathMlNode | null;
}

function tryExtractNaryDescriptor(node: MathMlNode): NaryDescriptor | null {
  const sym = extractPureSymbol(node);
  if (sym && NARY_OPERATORS.has(sym)) {
    return { chr: sym, limLoc: 'undOvr', subNode: null, supNode: null };
  }

  const elems = node.children.filter((c) => c.tag !== '#text');
  if (elems.length < 2) return null;
  const baseSym = extractPureSymbol(elems[0]);
  if (!baseSym || !NARY_OPERATORS.has(baseSym)) return null;

  if (node.tag === 'munder') {
    return { chr: baseSym, limLoc: 'undOvr', subNode: elems[1], supNode: null };
  }
  if (node.tag === 'mover') {
    return { chr: baseSym, limLoc: 'undOvr', subNode: null, supNode: elems[1] };
  }
  if (node.tag === 'munderover') {
    return { chr: baseSym, limLoc: 'undOvr', subNode: elems[1], supNode: elems[2] ?? null };
  }
  if (node.tag === 'msub') {
    return { chr: baseSym, limLoc: 'subSup', subNode: elems[1], supNode: null };
  }
  if (node.tag === 'msup') {
    return { chr: baseSym, limLoc: 'subSup', subNode: null, supNode: elems[1] };
  }
  if (node.tag === 'msubsup') {
    return { chr: baseSym, limLoc: 'subSup', subNode: elems[1], supNode: elems[2] ?? null };
  }
  return null;
}

function isIgnorableGapNode(node: MathMlNode): boolean {
  if (node.tag === '#text') return !getNodeText(node).trim();
  if (node.tag === 'mspace') return true;
  if (isPureFunctionApplicationMo(node)) return true;
  return false;
}

function findNextSignificantNode(nodes: MathMlNode[], startIdx: number): MathMlNode | null {
  for (let j = startIdx; j < nodes.length; j++) {
    if (!isIgnorableGapNode(nodes[j])) return nodes[j];
  }
  return null;
}

function consumeNaryBody(nodes: MathMlNode[], startIndex: number): { body: MathMlNode[]; nextIndex: number } {
  const body: MathMlNode[] = [];
  let parenDepth = 0;
  let hasContent = false;
  let i = startIndex;

  while (i < nodes.length) {
    const n = nodes[i];
    const sym = extractPureSymbol(n);

    if (sym && LEFT_DELIM_SET.has(sym) && !RIGHT_DELIM_SET.has(sym)) {
      parenDepth++;
      hasContent = true;
      body.push(n);
      i++;
      continue;
    }

    if (sym && RIGHT_DELIM_SET.has(sym) && !LEFT_DELIM_SET.has(sym)) {
      if (parenDepth === 0) break;
      parenDepth--;
      body.push(n);
      i++;
      continue;
    }

    if (parenDepth === 0 && sym && BINARY_STOP_OPS.has(sym)) {
      // 允许被积分/求和表达式首项带有的一元正负号（如 \int -x dx）
      if (!hasContent && (sym === '+' || sym === '-' || sym === '\u2212' || sym === '\u00B1')) {
        body.push(n);
        i++;
        continue;
      }
      break;
    }

    if (!isIgnorableGapNode(n)) {
      hasContent = true;
    }
    body.push(n);
    i++;
  }

  // 若只吞了空间距而没有任何实际内容，放弃吸收以保持外层空格自然
  if (!hasContent) {
    return { body: [], nextIndex: startIndex };
  }

  return { body, nextIndex: i };
}

function renderSequenceToOmml(nodes: MathMlNode[], ctx: OmmlContext): string {
  const parts: string[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    if (node.tag === '#text') {
      const txt = (node.text ?? '').replace(INVISIBLE_MATH_CHARS_RE, '');
      if (txt.trim()) {
        parts.push(buildOmmlRun(txt, ctx, { nor: true }));
      }
      i++;
      continue;
    }

    // 处理 Function Application (U+2061)：当函数名（sin/cos/lim 等）紧接非括号实参时保留微距空格
    if (isPureFunctionApplicationMo(node)) {
      const nextSig = findNextSignificantNode(nodes, i + 1);
      const nextSym = nextSig ? extractPureSymbol(nextSig) : null;
      if (nextSig && nextSym !== '(' && nextSym !== '[' && nextSym !== '{' && nextSym !== ',' && nextSym !== ')') {
        parts.push(buildOmmlRun(' ', ctx, { nor: true }));
      }
      i++;
      continue;
    }

    // 处理大型 N-ary 算子及其后续被作用项
    const nary = tryExtractNaryDescriptor(node);
    if (nary) {
      const { body, nextIndex } = consumeNaryBody(nodes, i + 1);
      parts.push(renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, body, ctx));
      i = nextIndex;
      continue;
    }

    parts.push(renderNodeToOmml(node, ctx));
    i++;
  }

  return parts.join('');
}

function renderNodeToOmml(node: MathMlNode, ctx: OmmlContext): string {
  switch (node.tag) {
    case '#text': {
      const txt = (node.text ?? '').replace(INVISIBLE_MATH_CHARS_RE, '');
      return txt.trim() ? buildOmmlRun(txt, ctx, { nor: true }) : '';
    }
    case 'mrow': {
      const fenced = tryRenderFenceMrow(node, ctx);
      if (fenced) return fenced;
      return renderSequenceToOmml(node.children, ctx);
    }
    case 'mstyle': {
      const nextCtx = node.attrs.mathcolor ? withOmmlColor(ctx, node.attrs.mathcolor) : ctx;
      return renderSequenceToOmml(node.children, nextCtx);
    }
    case 'mpadded':
    case 'math':
    case 'semantics':
      return renderSequenceToOmml(node.children, ctx);
    case 'mi':
    case 'mn':
    case 'mo':
    case 'mtext':
      return renderLeafIdentifierOrOp(node, ctx);
    case 'mspace':
      return buildOmmlMspace(node.attrs.width, ctx);
    case 'mfrac':
      return renderMfrac(node, ctx);
    case 'msqrt':
      return renderRadical(node, ctx, false);
    case 'mroot':
      return renderRadical(node, ctx, true);
    case 'msub': {
      const nary = tryExtractNaryDescriptor(node);
      if (nary) return renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, [], ctx);
      return renderScript(node, ctx, 'sub');
    }
    case 'msup': {
      const nary = tryExtractNaryDescriptor(node);
      if (nary) return renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, [], ctx);
      return renderScript(node, ctx, 'sup');
    }
    case 'msubsup': {
      const nary = tryExtractNaryDescriptor(node);
      if (nary) return renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, [], ctx);
      return renderScript(node, ctx, 'subsup');
    }
    case 'mover': {
      const nary = tryExtractNaryDescriptor(node);
      if (nary) return renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, [], ctx);
      return renderOverUnder(node, ctx, 'over');
    }
    case 'munder': {
      const nary = tryExtractNaryDescriptor(node);
      if (nary) return renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, [], ctx);
      return renderOverUnder(node, ctx, 'under');
    }
    case 'munderover': {
      const nary = tryExtractNaryDescriptor(node);
      if (nary) return renderNary(nary.chr, nary.limLoc, nary.subNode, nary.supNode, [], ctx);
      return renderOverUnder(node, ctx, 'underover');
    }
    case 'mtable':
      return renderMtable(node, ctx);
    case 'menclose':
      return renderMenclose(node, ctx);
    case 'mphantom': {
      const innerXml = renderOmmlSlotContent(node.children, ctx);
      return `<m:phant><m:phantPr><m:show m:val="0"/>${ctx.ctrlPr}</m:phantPr><m:e>${innerXml}</m:e></m:phant>`;
    }
    case 'mfenced': {
      const beg = normalizeDelimiterChar(node.attrs.open ?? '(');
      const end = normalizeDelimiterChar(node.attrs.close ?? ')');
      const sep = node.attrs.separators ?? ',';
      const sepXml = sep ? `<m:sepChr m:val="${xmlEsc(sep[0])}"/>` : '';
      const dPrXml = `<m:dPr><m:begChr m:val="${xmlEsc(beg)}"/>${sepXml}<m:endChr m:val="${xmlEsc(end)}"/><m:grow m:val="1"/>${ctx.ctrlPr}</m:dPr>`;
      const elems = node.children.filter((c) => c.tag !== '#text');
      const es = elems.length > 0 ? elems.map((el) => `<m:e>${renderOmmlSingleSlot(el, ctx)}</m:e>`).join('') : `<m:e>${buildOmmlEmptyRun(ctx)}</m:e>`;
      return `<m:d>${dPrXml}${es}</m:d>`;
    }
    default:
      return renderSequenceToOmml(node.children, ctx);
  }
}

// ============================================================================
// 行内富文本 Runs 编译器（针对正文中嵌在普通句子里的 $...$）
// ============================================================================

function pushInlineRun(out: InlineMathRun[], text: string, ctx: InlineContext): void {
  if (!text) return;
  const options: Record<string, any> = {
    fontFace: 'Cambria Math',
    fontSize: ctx.fontSizePt,
    color: ctx.colorHex,
    bold: ctx.bold,
    italic: ctx.italic,
  };
  if (ctx.superscript) options.superscript = true;
  if (ctx.subscript) options.subscript = true;

  const prev = out[out.length - 1];
  if (
    prev &&
    prev.options.fontFace === options.fontFace &&
    prev.options.fontSize === options.fontSize &&
    prev.options.color === options.color &&
    Boolean(prev.options.bold) === Boolean(options.bold) &&
    Boolean(prev.options.italic) === Boolean(options.italic) &&
    Boolean(prev.options.superscript) === Boolean(options.superscript) &&
    Boolean(prev.options.subscript) === Boolean(options.subscript)
  ) {
    prev.text += text;
    return;
  }

  out.push({ text, options });
}

function pushCombiningAccentRun(out: InlineMathRun[], combiningChar: string, ctx: InlineContext): void {
  const prev = out[out.length - 1];
  if (prev) {
    prev.text += combiningChar;
    return;
  }
  pushInlineRun(out, combiningChar, { ...ctx, italic: false });
}

function getLastInlineTextChar(out: InlineMathRun[]): string {
  for (let i = out.length - 1; i >= 0; i--) {
    const t = out[i].text.trimEnd();
    if (t.length > 0) return t[t.length - 1];
  }
  return '';
}

function isUnaryPrefixContext(prevChar: string): boolean {
  if (!prevChar) return true;
  return (
    prevChar === '(' ||
    prevChar === '[' ||
    prevChar === '{' ||
    prevChar === '\u27E8' ||
    prevChar === '|' ||
    prevChar === '\u2223' ||
    prevChar === ',' ||
    prevChar === ';' ||
    prevChar === '=' ||
    prevChar === '+' ||
    prevChar === '-' ||
    prevChar === '\u2212' ||
    prevChar === '\u2264' ||
    prevChar === '\u2265' ||
    prevChar === '<' ||
    prevChar === '>' ||
    prevChar === '\u2208' ||
    prevChar === '\u2192' ||
    prevChar === '\u22C5' ||
    prevChar === '\u00D7'
  );
}

function hasTopLevelBinaryAddSub(node: MathMlNode): boolean {
  const curr = unwrapSinglePassThrough(node);
  if (curr.tag !== 'mrow') return false;
  let seen = false;
  let depth = 0;
  for (const child of curr.children) {
    const sym = extractPureSymbol(child);
    if (sym && LEFT_DELIM_SET.has(sym) && !RIGHT_DELIM_SET.has(sym)) {
      depth++;
      seen = true;
      continue;
    }
    if (sym && RIGHT_DELIM_SET.has(sym) && !LEFT_DELIM_SET.has(sym)) {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0 && seen && (sym === '+' || sym === '-' || sym === '\u2212')) {
      return true;
    }
    if (!isIgnorableGapNode(child)) seen = true;
  }
  return false;
}

function isSimpleInlineTerm(node: MathMlNode): boolean {
  const curr = unwrapSinglePassThrough(node);
  return curr.tag === 'mi' || curr.tag === 'mn';
}

function collectInlineSequence(nodes: MathMlNode[], ctx: InlineContext, out: InlineMathRun[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isPureFunctionApplicationMo(node)) {
      const nextSig = findNextSignificantNode(nodes, i + 1);
      const nextSym = nextSig ? extractPureSymbol(nextSig) : null;
      if (nextSig && nextSym !== '(' && nextSym !== '[' && nextSym !== '{' && nextSym !== ',' && nextSym !== ')') {
        pushInlineRun(out, ' ', { ...ctx, italic: false });
      }
      continue;
    }

    collectInlineNode(node, ctx, out);
  }
}

function collectInlineNode(node: MathMlNode, ctx: InlineContext, out: InlineMathRun[]): void {
  switch (node.tag) {
    case '#text': {
      const txt = (node.text ?? '').replace(INVISIBLE_MATH_CHARS_RE, '').replace(/\u00A0/g, ' ');
      if (txt) pushInlineRun(out, txt, { ...ctx, italic: false });
      return;
    }
    case 'mrow':
    case 'mpadded':
    case 'math':
    case 'semantics':
      collectInlineSequence(node.children, ctx, out);
      return;
    case 'mstyle': {
      const nextColor = node.attrs.mathcolor
        ? normalizeHexColor(node.attrs.mathcolor, ctx.colorHex)
        : ctx.colorHex;
      collectInlineSequence(node.children, { ...ctx, colorHex: nextColor }, out);
      return;
    }
    case 'mspace': {
      const w = (node.attrs.width || '').trim();
      const num = Number.parseFloat(w);
      if (Number.isFinite(num) && num >= 0.15) {
        pushInlineRun(out, ' ', { ...ctx, italic: false });
      }
      return;
    }
    case 'mtext': {
      if (node.children.some((c) => c.tag !== '#text')) {
        collectInlineSequence(node.children, ctx, out);
        return;
      }
      const txt = getNodeText(node).replace(INVISIBLE_MATH_CHARS_RE, '').replace(/\u00A0/g, ' ');
      if (txt) pushInlineRun(out, txt, { ...ctx, italic: false });
      return;
    }
    case 'mn': {
      if (node.children.some((c) => c.tag !== '#text')) {
        collectInlineSequence(node.children, ctx, out);
        return;
      }
      const txt = getNodeText(node).replace(INVISIBLE_MATH_CHARS_RE, '');
      const isBold = node.attrs.mathvariant === 'bold' ? true : ctx.bold;
      if (txt) pushInlineRun(out, txt, { ...ctx, bold: isBold, italic: false });
      return;
    }
    case 'mo': {
      if (node.children.some((c) => c.tag !== '#text')) {
        collectInlineSequence(node.children, ctx, out);
        return;
      }
      const raw = getNodeText(node).replace(INVISIBLE_MATH_CHARS_RE, '');
      if (!raw) return;
      const normalizedOp = raw === '\u2223' ? '|' : raw;

      if (ctx.scriptLevel === 0) {
        if (normalizedOp === ',' || normalizedOp === ';') {
          pushInlineRun(out, `${normalizedOp} `, { ...ctx, italic: false });
          return;
        }
        if (INLINE_SPACED_OPS.has(normalizedOp)) {
          const prevChar = getLastInlineTextChar(out);
          const isUnary =
            (normalizedOp === '+' || normalizedOp === '-' || normalizedOp === '\u2212' || normalizedOp === '\u00B1') &&
            isUnaryPrefixContext(prevChar);
          if (!isUnary) {
            const needLeadSpace = out.length > 0 && !/\s$/.test(out[out.length - 1].text);
            pushInlineRun(out, `${needLeadSpace ? ' ' : ''}${normalizedOp} `, { ...ctx, italic: false });
            return;
          }
        }
      }

      pushInlineRun(out, normalizedOp, { ...ctx, italic: false });
      return;
    }
    case 'mi': {
      if (node.children.some((c) => c.tag !== '#text')) {
        collectInlineSequence(node.children, ctx, out);
        return;
      }
      const cleaned = getNodeText(node).replace(INVISIBLE_MATH_CHARS_RE, '');
      if (!cleaned) return;
      const variant = node.attrs.mathvariant || '';

      if (variant === 'script' || variant === 'double-struck' || variant === 'fraktur') {
        const { mapped } = mapMathVariantUnicode(cleaned, variant);
        pushInlineRun(out, mapped, { ...ctx, italic: false });
        return;
      }
      if (variant === 'bold') {
        pushInlineRun(out, cleaned, { ...ctx, bold: true, italic: false });
        return;
      }
      if (variant === 'bold-italic') {
        pushInlineRun(out, cleaned, { ...ctx, bold: true, italic: true });
        return;
      }
      if (variant === 'normal' || variant === 'sans-serif' || variant === 'monospace') {
        pushInlineRun(out, cleaned, { ...ctx, italic: false });
        return;
      }
      if (variant === 'italic') {
        pushInlineRun(out, cleaned, { ...ctx, italic: true });
        return;
      }

      const codePointLen = Array.from(cleaned).length;
      const isNamedOp = NAMED_FUNCTION_OPS.has(cleaned);
      const shouldItalic = codePointLen === 1 && !isNamedOp && /[a-zA-Z\u0391-\u03C9]/.test(cleaned);
      pushInlineRun(out, cleaned, { ...ctx, italic: shouldItalic });
      return;
    }
    case 'msub': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      if (elems[0]) collectInlineNode(elems[0], ctx, out);
      if (elems[1]) {
        collectInlineNode(elems[1], {
          ...ctx,
          subscript: true,
          superscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      return;
    }
    case 'msup': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      if (elems[0]) collectInlineNode(elems[0], ctx, out);
      if (elems[1]) {
        collectInlineNode(elems[1], {
          ...ctx,
          superscript: true,
          subscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      return;
    }
    case 'msubsup': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      if (elems[0]) collectInlineNode(elems[0], ctx, out);
      if (elems[1]) {
        collectInlineNode(elems[1], {
          ...ctx,
          subscript: true,
          superscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      if (elems[2]) {
        collectInlineNode(elems[2], {
          ...ctx,
          superscript: true,
          subscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      return;
    }
    case 'mfrac': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      const numNode = elems[0];
      const denNode = elems[1];
      const linethickness = (node.attrs.linethickness || '').trim();
      const isNoBar = linethickness === '0' || linethickness === '0px' || linethickness === '0em';

      if (isNoBar) {
        if (numNode) collectInlineNode(numNode, ctx, out);
        pushInlineRun(out, ', ', { ...ctx, italic: false });
        if (denNode) collectInlineNode(denNode, ctx, out);
        return;
      }

      const wrapNum = numNode ? hasTopLevelBinaryAddSub(numNode) : false;
      const wrapDen = denNode ? hasTopLevelBinaryAddSub(denNode) : false;
      if (wrapNum) pushInlineRun(out, '(', { ...ctx, italic: false });
      if (numNode) collectInlineNode(numNode, ctx, out);
      if (wrapNum) pushInlineRun(out, ')', { ...ctx, italic: false });

      pushInlineRun(out, '/', { ...ctx, italic: false });

      if (wrapDen) pushInlineRun(out, '(', { ...ctx, italic: false });
      if (denNode) collectInlineNode(denNode, ctx, out);
      if (wrapDen) pushInlineRun(out, ')', { ...ctx, italic: false });
      return;
    }
    case 'msqrt': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      pushInlineRun(out, '\u221A', { ...ctx, italic: false });
      const needParens = elems.length > 1 || (elems[0] && !isSimpleInlineTerm(elems[0]));
      if (needParens) pushInlineRun(out, '(', { ...ctx, italic: false });
      collectInlineSequence(elems, ctx, out);
      if (needParens) pushInlineRun(out, ')', { ...ctx, italic: false });
      return;
    }
    case 'mroot': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      const baseNode = elems[0];
      const degNode = elems[1];
      if (degNode) {
        collectInlineNode(degNode, {
          ...ctx,
          superscript: true,
          subscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      pushInlineRun(out, '\u221A', { ...ctx, italic: false });
      const needParens = baseNode ? !isSimpleInlineTerm(baseNode) : false;
      if (needParens) pushInlineRun(out, '(', { ...ctx, italic: false });
      if (baseNode) collectInlineNode(baseNode, ctx, out);
      if (needParens) pushInlineRun(out, ')', { ...ctx, italic: false });
      return;
    }
    case 'mover': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      const baseNode = elems[0];
      const overNode = elems[1];
      const overSym = overNode ? extractPureSymbol(overNode) : null;
      const baseText = baseNode ? getNodeText(baseNode).replace(INVISIBLE_MATH_CHARS_RE, '') : '';

      if (overSym && ACCENT_COMBINING_MAP[overSym] && Array.from(baseText).length === 1) {
        if (baseNode) collectInlineNode(baseNode, ctx, out);
        pushCombiningAccentRun(out, ACCENT_COMBINING_MAP[overSym], ctx);
        return;
      }
      if (overSym === '\u203E' && Array.from(baseText).length === 1) {
        if (baseNode) collectInlineNode(baseNode, ctx, out);
        pushCombiningAccentRun(out, '\u0305', ctx);
        return;
      }
      if (baseNode) collectInlineNode(baseNode, ctx, out);
      if (overNode && overSym !== '\u23DE') {
        collectInlineNode(overNode, {
          ...ctx,
          superscript: true,
          subscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      return;
    }
    case 'munder': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      const baseNode = elems[0];
      const underNode = elems[1];
      const underSym = underNode ? extractPureSymbol(underNode) : null;
      const baseText = baseNode ? getNodeText(baseNode).replace(INVISIBLE_MATH_CHARS_RE, '') : '';

      if (underSym === '\u203E' && Array.from(baseText).length === 1) {
        if (baseNode) collectInlineNode(baseNode, ctx, out);
        pushCombiningAccentRun(out, '\u0332', ctx);
        return;
      }
      if (baseNode) collectInlineNode(baseNode, ctx, out);
      if (underNode && underSym !== '\u23DF') {
        collectInlineNode(underNode, {
          ...ctx,
          subscript: true,
          superscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      return;
    }
    case 'munderover': {
      const elems = node.children.filter((c) => c.tag !== '#text');
      if (elems[0]) collectInlineNode(elems[0], ctx, out);
      if (elems[1]) {
        collectInlineNode(elems[1], {
          ...ctx,
          subscript: true,
          superscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      if (elems[2]) {
        collectInlineNode(elems[2], {
          ...ctx,
          superscript: true,
          subscript: false,
          scriptLevel: ctx.scriptLevel + 1,
        }, out);
      }
      return;
    }
    case 'mtable': {
      const rows = node.children.filter((c) => c.tag === 'mtr' || c.tag === 'mlabeledtr');
      for (let r = 0; r < rows.length; r++) {
        if (r > 0) pushInlineRun(out, '; ', { ...ctx, italic: false });
        const cells = rows[r].children.filter((c) => c.tag === 'mtd');
        for (let c = 0; c < cells.length; c++) {
          if (c > 0) pushInlineRun(out, ', ', { ...ctx, italic: false });
          collectInlineSequence(cells[c].children, ctx, out);
        }
      }
      return;
    }
    case 'mphantom':
      return;
    default:
      collectInlineSequence(node.children, ctx, out);
  }
}

// ============================================================================
// 公开导出 API
// ============================================================================

/**
 * 将 LaTeX 公式经 KaTeX MathML AST 转换为可直接放入 <a14:m> 内的 <m:oMathPara> XML。
 * 若 LaTeX 语法错误或空公式，返回 null 以安全降级到图片 fallback。
 */
export function latexToOmmlXml(latex: string, opts: OmmlCompileOptions): string | null {
  const rootNode = parseKatexMathMl(latex, opts.displayMode);
  if (!rootNode) return null;

  try {
    const ctx = buildOmmlContext(opts.fontSizePt, opts.colorHex);
    const oMathBody = renderNodeToOmml(rootNode, ctx).trim();
    if (!oMathBody) return null;

    const jc = opts.align ?? (opts.displayMode ? 'center' : 'left');
    return (
      `<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">` +
      `<m:oMathParaPr><m:jc m:val="${jc}"/></m:oMathParaPr>` +
      `<m:oMath>${oMathBody}</m:oMath>` +
      `</m:oMathPara>`
    );
  } catch {
    return null;
  }
}

/**
 * 生成直接承载 PowerPoint / WPS 原生可编辑 OMML 公式 (<a14:m><m:oMathPara>) 的纯净 <p:sp> 形状 XML。
 * 不使用外层 <mc:AlternateContent> + <mc:Fallback> 位图双叠结构，彻底杜绝 WPS Presentation 同时渲染 Choice 与 Fallback 导致的重影。
 */
export function buildNativeOmmlShapeXml(params: NativeOmmlShapeParams): string {
  const id = Math.max(1, Math.round(params.shapeId));
  const safeName = xmlEsc(params.name);
  const x = Math.round(params.xEmu);
  const y = Math.round(params.yEmu);
  const cx = Math.max(1, Math.round(params.cxEmu));
  const cy = Math.max(1, Math.round(params.cyEmu));

  return (
    `<p:sp>` +
    `<p:nvSpPr>` +
    `<p:cNvPr id="${id}" name="${safeName}"/>` +
    `<p:cNvSpPr txBox="1"/>` +
    `<p:nvPr/>` +
    `</p:nvSpPr>` +
    `<p:spPr>` +
    `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `<a:noFill/>` +
    `<a:ln><a:noFill/></a:ln>` +
    `</p:spPr>` +
    `<p:txBody>` +
    `<a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/>` +
    `<a:lstStyle/>` +
    `<a:p>` +
    `<a:pPr algn="${params.align}"/>` +
    `<a14:m xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${params.ommlParaXml}</a14:m>` +
    `</a:p>` +
    `</p:txBody>` +
    `</p:sp>`
  );
}

/**
 * 兼容旧签名保留的双轨封装辅助函数（内部复用 buildNativeOmmlShapeXml）。
 */
export function buildOmmlAlternateContentXml(params: OmmlAlternateContentParams): string {
  return (
    `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">` +
    `<mc:Choice xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" Requires="a14">` +
    buildNativeOmmlShapeXml(params) +
    `</mc:Choice>` +
    `<mc:Fallback>${params.fallbackPicXml}</mc:Fallback>` +
    `</mc:AlternateContent>`
  );
}

/**
 * 将正文中嵌于普通句子的行内公式 ($...$) 转为单行平铺的 PptxGenJS 富文本 Runs。
 * 确保上下标与正斜体在一行内完美对齐、绝不撕裂成多行。
 */
export function latexToStyledInlineRuns(latex: string, baseStyle: InlineMathBaseStyle): InlineMathRun[] {
  const rootNode = parseKatexMathMl(latex, false);
  const colorHex = normalizeHexColor(baseStyle.colorHex);
  const baseCtx: InlineContext = {
    colorHex,
    fontSizePt: baseStyle.fontSizePt,
    bold: Boolean(baseStyle.bold),
    italic: false,
    superscript: false,
    subscript: false,
    scriptLevel: 0,
  };

  if (!rootNode) {
    const clean = (latex || '').trim();
    return clean
      ? [{ text: clean, options: { fontFace: 'Cambria Math', fontSize: baseStyle.fontSizePt, color: colorHex, bold: Boolean(baseStyle.bold) } }]
      : [];
  }

  const runs: InlineMathRun[] = [];
  collectInlineNode(rootNode, baseCtx, runs);
  return runs;
}
