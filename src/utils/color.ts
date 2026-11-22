/**
 * 色彩科学工具库 — WCAG 2.1 对比度校验、RGBA 合成与 PptxGenJS 无井号颜色转换
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export function parseColor(input: string): RGB {
  const s = (input || '').trim();
  if (!s || s.toLowerCase() === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
  }
  // 兼容传统逗号写法 rgba(r, g, b, a) 与现代空格斜杠写法 rgb(r g b / a)
  const rgbaCommaMatch = s.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+%?))?\s*\)/i
  );
  if (rgbaCommaMatch) {
    const alphaRaw = rgbaCommaMatch[4];
    const alpha =
      alphaRaw === undefined
        ? 1
        : alphaRaw.endsWith('%')
        ? parseFloat(alphaRaw) / 100
        : Number(alphaRaw);
    return {
      r: Number(rgbaCommaMatch[1]),
      g: Number(rgbaCommaMatch[2]),
      b: Number(rgbaCommaMatch[3]),
      a: alpha,
    };
  }
  const rgbaSpaceMatch = s.match(
    /rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i
  );
  if (rgbaSpaceMatch) {
    const alphaRaw = rgbaSpaceMatch[4];
    const alpha =
      alphaRaw === undefined
        ? 1
        : alphaRaw.endsWith('%')
        ? parseFloat(alphaRaw) / 100
        : Number(alphaRaw);
    return {
      r: Number(rgbaSpaceMatch[1]),
      g: Number(rgbaSpaceMatch[2]),
      b: Number(rgbaSpaceMatch[3]),
      a: alpha,
    };
  }
  // 兼容 Chromium 对 CSS color-mix(in srgb, ...) 返回的 color(srgb r g b / a)
  const srgbMatch = s.match(
    /color\(\s*srgb\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i
  );
  if (srgbMatch) {
    const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
    const alphaRaw = srgbMatch[4];
    const alpha =
      alphaRaw === undefined
        ? 1
        : alphaRaw.endsWith('%')
        ? parseFloat(alphaRaw) / 100
        : Number(alphaRaw);
    return {
      r: clampByte(Number(srgbMatch[1])),
      g: clampByte(Number(srgbMatch[2])),
      b: clampByte(Number(srgbMatch[3])),
      a: alpha,
    };
  }
  return { r: 128, g: 128, b: 128, a: 1 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * 转换为 PptxGenJS 要求的 6 位无 '#' 十六进制颜色字符串
 */
export function toPptxHex(colorStr: string, fallback = '111827'): string {
  if (!colorStr || colorStr.trim().toLowerCase() === 'transparent') return fallback;
  const rgb = parseColor(colorStr);
  if (rgb.a !== undefined && rgb.a <= 0.01) return fallback;
  return rgbToHex(rgb).slice(1);
}

/**
 * 将 CSS 颜色（含 rgba / color(srgb ... / alpha)）精确转换为 PptxGenJS 填充配置（含透明度），完全透明则返回 null
 */
export function toPptxFill(
  colorStr: string,
  fallbackHex = '111827'
): { color: string; transparency?: number } | null {
  if (!colorStr) return null;
  const rgb = parseColor(colorStr);
  const alpha = rgb.a ?? 1;
  if (alpha <= 0.01) return null;
  const hex = rgbToHex(rgb).slice(1) || fallbackHex;
  if (alpha < 0.995) {
    return {
      color: hex,
      transparency: Math.max(1, Math.min(99, Math.round((1 - alpha) * 100))),
    };
  }
  return { color: hex };
}

export function withAlpha(hexOrRgb: string, alpha: number): string {
  const { r, g, b } = parseColor(hexOrRgb);
  const a = Math.max(0, Math.min(1, Number(alpha.toFixed(3))));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function mixColors(colorA: string, colorB: string, weightB = 0.5): string {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex({
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w,
  });
}

export function relativeLuminance(color: string): number {
  const { r, g, b } = parseColor(color);
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function isDarkColor(color: string): boolean {
  return relativeLuminance(color) < 0.28;
}

/**
 * 自动校准前景色以满足最低 WCAG 对比度阈值
 */
export function ensureContrast(foreground: string, background: string, minRatio = 4.5): string {
  if (contrastRatio(foreground, background) >= minRatio) {
    return rgbToHex(parseColor(foreground));
  }
  const bgDark = isDarkColor(background);
  const targetPole = bgDark ? '#F8FAFC' : '#090D16';
  for (let step = 0.1; step <= 1.0; step += 0.1) {
    const candidate = mixColors(foreground, targetPole, step);
    if (contrastRatio(candidate, background) >= minRatio) {
      return candidate;
    }
  }
  return targetPole;
}
