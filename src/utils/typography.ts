/**
 * 排印与文本工程工具库 v3.0
 * 核心突破：基于 Intl.Segmenter 中文语义分词 + Unicode Word Joiner (\u2060) 防劈词、防行尾孤字引擎，
 * 彻底根治中文标题双音节词被拦腰折断（如“重/建”、“人/类”、“皮秒/级”）与半角空格撕裂问题。
 */
import katex from 'katex';

export interface RichTextRun {
  text: string;
  highlight: boolean;
}

const BANNED_EMOJI_REGEX =
  /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/gu;

export function containsBannedEmoji(text: string): boolean {
  if (!text) return false;
  BANNED_EMOJI_REGEX.lastIndex = 0;
  return BANNED_EMOJI_REGEX.test(text);
}

export function sanitizeAntiSlopText(text: string): string {
  if (!text) return '';
  return text.replace(BANNED_EMOJI_REGEX, '').replace(/[ \t]{2,}/g, ' ').trim();
}

export function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 清理中文字符之间、以及中文字符与 **强调标记** 两侧误加的多余西文半角空格，保留中英/中数合理间距
 */
export function normalizeCjkSpacing(input: string): string {
  if (!input) return '';
  let s = input;
  // 移除汉字与 ** 标记之间的半角空格（严禁吞掉显式换行符 \n！）
  s = s.replace(/([\u4e00-\u9fff，。：；！？、）》”])[ \t]+(\*\*)/g, '$1$2');
  s = s.replace(/(\*\*)[ \t]+([\u4e00-\u9fff，。：；！？、：《“])/g, '$1$2');
  // 移除纯汉字与汉字之间无意义的半角空格（保留换行符 \n）
  s = s.replace(/([\u4e00-\u9fff])[ \t]+([\u4e00-\u9fff])/g, '$1$2');
  return s;
}

const zhSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
    : null;

const CJK_CHAR_RE = /[\u4e00-\u9fff]/;
const CJK_SUFFIX_RE = /^[级率化性度器力型端侧层法学界感量体品]$/;
const CJK_PUNCT_RE = /^[，。：；！？、）》”’—…]$/;
const CJK_COMPOUND_LOCKS = [
  '伎俩',
  '丘壑',
  '榫卯',
  '骨相',
  '肌理',
  '留白',
  '泛化',
  '速朽',
  '算境',
  '皮秒级',
  '亚毫米',
];

/**
 * 在中文语义词组内部、单字词缀及句尾收官词之间注入零宽不断行连接符 U+2060 (Word Joiner)，
 * 使浏览器在任何宽度下都只能按完整语义词边界折行，绝不劈裂双音节词或留下句末单字孤儿。
 */
export function applyCjkNoBreakProtection(plainSegment: string): string {
  if (!plainSegment || !CJK_CHAR_RE.test(plainSegment) || !zhSegmenter) {
    return plainSegment;
  }

  // 按显式换行符分段处理
  return plainSegment
    .split('\n')
    .map((line) => {
      const rawTokens = Array.from(zhSegmenter.segment(line)).map((s) => s.segment);
      if (rawTokens.length === 0) return line;

      // 合并单字后缀（如 "皮秒" + "级" -> "皮秒级"）与紧随标点（如 "速朽" + "。" -> "速朽。"）
      const merged: string[] = [];
      for (const tok of rawTokens) {
        if (
          merged.length > 0 &&
          (CJK_SUFFIX_RE.test(tok) || CJK_PUNCT_RE.test(tok)) &&
          CJK_CHAR_RE.test(merged[merged.length - 1])
        ) {
          merged[merged.length - 1] += tok;
        } else {
          merged.push(tok);
        }
      }

      // 将句末最后两个短中文词合并为一个不可拆分的收尾语义团，彻底消灭行尾孤字 (Widow)
      if (merged.length >= 2) {
        const last = merged[merged.length - 1];
        const prev = merged[merged.length - 2];
        if (
          CJK_CHAR_RE.test(last) &&
          CJK_CHAR_RE.test(prev) &&
          prev.length + last.length <= 5
        ) {
          merged.splice(merged.length - 2, 2, prev + last);
        }
      }

      // 在每个中文词组内部的字符之间注入 U+2060 Word Joiner，并对连绵复合词做二次加固
      let joined = merged
        .map((word) => {
          if (word.length > 1 && CJK_CHAR_RE.test(word)) {
            return Array.from(word).join('\u2060');
          }
          return word;
        })
        .join('');

      for (const comp of CJK_COMPOUND_LOCKS) {
        const plainPattern = Array.from(comp).join('\\u2060?');
        const locked = Array.from(comp).join('\u2060');
        joined = joined.replace(new RegExp(plainPattern, 'g'), locked);
      }
      return joined;
    })
    .join('\n');
}

/**
 * 剥离供 HTML 排版防断词使用的零宽连接符（用于导出纯净 PPTX 原生文本）
 */
export function stripWordJoiners(text: string): string {
  return (text || '').replace(/\u2060/g, '');
}

export function parseRichRuns(text: string): RichTextRun[] {
  if (!text) return [];
  const normalized = normalizeCjkSpacing(text);
  const runs: RichTextRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: normalized.slice(lastIndex, match.index), highlight: false });
    }
    runs.push({ text: match[1], highlight: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < normalized.length) {
    runs.push({ text: normalized.slice(lastIndex), highlight: false });
  }
  return runs.length > 0 ? runs : [{ text: normalized, highlight: false }];
}

export function stripRichMarkers(text: string): string {
  return stripWordJoiners(normalizeCjkSpacing(text || '')).replace(/\*\*(.+?)\*\*/g, '$1');
}

/**
 * 将支持 **高亮**、显式 \n 换行与行内 $math$ 的文本渲染为具备 CJK 语义不断行保护的安全 HTML
 */
export function renderRichHtml(text: string, protectWords = true): string {
  if (!text) return '';
  const runs = parseRichRuns(text);
  return runs
    .map((r) => {
      const inner = renderInlineMathAndLineBreaks(r.text, protectWords);
      // 高亮短词本身不允许在短词内部劈裂（<= 7 个字时用 nowrap 保护，长高亮短语交由分词 \u2060 保护）
      const cleanLen = estimateCjkUnits(r.text);
      const noWrapStyle = r.highlight && cleanLen <= 6.5 ? ' style="white-space:nowrap"' : '';
      return r.highlight
        ? `<span class="hl-accent" data-hl="1"${noWrapStyle}>${inner}</span>`
        : inner;
    })
    .join('');
}

function isValidInlineLatexSpan(inner: string): boolean {
  if (!inner) return false;
  // 行内公式不能跨换行、首尾紧贴空格、或夹杂中文（防止 "$2,800 触觉模组 + $18k" 这类双货币符号被误判！）
  if (/^\s|\s$/.test(inner) || /[\r\n\u4e00-\u9fff]/.test(inner)) {
    return false;
  }
  // 排除纯金额或金额后缀表达（如 "2,800"、"18k"、"35M"）
  if (/^[\d,.]+(?:\s*[KMBTkmbt%])?$/.test(inner)) {
    return false;
  }
  return true;
}

function renderInlineMathAndLineBreaks(raw: string, protectWords: boolean): string {
  // 按潜在 $...$ 分割，但只对真正合法的数学表达式做 KaTeX 渲染
  const tokenRegex = /\$([^$\r\n]+?)\$(?!\d)/g;
  let out = '';
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRegex.exec(raw)) !== null) {
    const tex = m[1];
    if (!isValidInlineLatexSpan(tex)) {
      continue;
    }
    if (m.index > lastIdx) {
      const plain = raw.slice(lastIdx, m.index);
      const protectedStr = protectWords ? applyCjkNoBreakProtection(plain) : plain;
      out += escapeHtml(protectedStr).replace(/\n/g, '<br/>');
    }
    out += `<span class="inline-math" data-latex="${escapeHtml(tex)}">${renderLatexToHtml(
      tex,
      false
    )}</span>`;
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < raw.length) {
    const tail = raw.slice(lastIdx);
    const protectedStr = protectWords ? applyCjkNoBreakProtection(tail) : tail;
    out += escapeHtml(protectedStr).replace(/\n/g, '<br/>');
  }
  return out;
}

export function renderLatexToHtml(latex: string, displayMode = true): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch {
    return `<code class="math-fallback">${escapeHtml(latex)}</code>`;
  }
}

export function estimateCjkUnits(text: string): number {
  const clean = stripRichMarkers(text || '');
  let total = 0;
  for (const ch of clean) {
    const code = ch.charCodeAt(0);
    if (code > 0x2e80) {
      total += 1.0;
    } else if (ch >= 'A' && ch <= 'Z') {
      total += 0.65;
    } else if (ch === ' ') {
      total += 0.28;
    } else {
      total += 0.52;
    }
  }
  return total;
}

export function computeAdaptiveTitlePx(
  text: string,
  role: 'cover' | 'section' | 'statement' | 'standard'
): number {
  const units = estimateCjkUnits(text);
  if (role === 'cover') {
    if (units <= 10) return 88;
    if (units <= 16) return 72;
    if (units <= 24) return 60;
    return 50;
  }
  if (role === 'section') {
    if (units <= 10) return 82;
    if (units <= 18) return 66;
    return 54;
  }
  if (role === 'statement') {
    if (units <= 14) return 70;
    if (units <= 24) return 56;
    if (units <= 36) return 46;
    return 38;
  }
  if (units <= 12) return 50;
  if (units <= 20) return 44;
  if (units <= 28) return 38;
  return 34;
}

/**
 * 国际金融与工程量纲规范格式化（自动处理货币前缀，彻底杜绝 "18.5$M"、"115$/kWh" 格式错误）
 * 例：(18.5, "$M") -> "$18.5M"；(18.5, "M$") -> "$18.5M"；(115, "$/kWh") -> "$115/kWh"；(118, " tok/s") -> "118 tok/s"
 */
export function formatMetricWithUnit(val: number | string, rawUnit?: string): string {
  const strVal = String(val);
  if (!rawUnit) return strVal;
  const trimmed = rawUnit.trim();
  if (!trimmed) return strVal;

  const isNeg = strVal.startsWith('-');
  const absStr = isNeg ? strVal.slice(1) : strVal;
  const sign = isNeg ? '-' : '';

  // 1. 以货币符号开头："$M"、"$B"、"¥亿"、"€/MWh"、"$/kWh"
  const prefixMatch = trimmed.match(/^([\$¥€£₩])\s*(.*)$/);
  if (prefixMatch) {
    const [, sym, rest] = prefixMatch;
    return `${sign}${sym}${absStr}${rest}`;
  }

  // 2. 反向误写的货币量纲："M$"、"B$"、"K$"
  const revCurrMatch = trimmed.match(/^([KMBTkmbt])\s*([\$¥€£])$/);
  if (revCurrMatch) {
    const [, mag, sym] = revCurrMatch;
    return `${sign}${sym}${absStr}${mag.toUpperCase()}`;
  }

  // 3. 常规后缀单位（保留原始前导空格，如 " tok/s"、"%"、" 分"）
  return `${strVal}${rawUnit}`;
}

/**
 * 为 PowerPoint OpenXML 原生图表生成带量纲的 Excel NumberFormat 掩码
 * @param forAxis 坐标轴刻度默认使用整数 `0`，仅极小量级(<2)才保留 1 位小数，彻底杜绝 `0.##` 在整数后残留小数点（如 `48.`、`0.`）
 */
export function buildExcelNumFmt(
  rawUnit?: string,
  hasDecimals = false,
  forAxis = false,
  decimalPlaces = 1
): string {
  const numPart = forAxis
    ? hasDecimals
      ? '0.0'
      : '0'
    : hasDecimals
    ? decimalPlaces >= 2
      ? '0.00'
      : '0.0'
    : '0';
  if (!rawUnit || !rawUnit.trim()) return numPart;
  const trimmed = rawUnit.trim();

  const esc = (s: string) => s.replace(/"/g, '');
  const prefixMatch = trimmed.match(/^([\$¥€£₩])\s*(.*)$/);
  if (prefixMatch) {
    const [, sym, rest] = prefixMatch;
    const suffix = rest ? `"${esc(rest)}"` : '';
    return `"${sym}"${numPart}${suffix}`;
  }

  const revCurrMatch = trimmed.match(/^([KMBTkmbt])\s*([\$¥€£])$/);
  if (revCurrMatch) {
    const [, mag, sym] = revCurrMatch;
    return `"${sym}"${numPart}"${mag.toUpperCase()}"`;
  }

  if (trimmed === '%') {
    return `${numPart}"%"`;
  }
  return `${numPart}"${esc(rawUnit)}"`;
}
