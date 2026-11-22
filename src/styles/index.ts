/**
 * 12 大殿堂级视觉风格包注册中心与智能情绪匹配器 (Style Registry & Mood Router)
 */
import type { StyleId, StylePack } from '../types/ir.js';
import { DARK_STYLE_PRESETS } from './presets-dark.js';
import { LIGHT_STYLE_PRESETS } from './presets-light.js';
import { ensureContrast, withAlpha } from '../utils/color.js';

export const ALL_STYLE_PACKS: StylePack[] = [
  ...DARK_STYLE_PRESETS,
  ...LIGHT_STYLE_PRESETS,
];

const STYLE_MAP = new Map<StyleId, StylePack>(
  ALL_STYLE_PACKS.map((s) => [s.id, s])
);

export function getStylePack(id: StyleId, accentOverride?: string): StylePack {
  const base = STYLE_MAP.get(id) || STYLE_MAP.get('apple-keynote-dark')!;
  if (!accentOverride) return base;

  const adjustedAccent = ensureContrast(accentOverride, base.palette.bg_primary, 3.2);
  return {
    ...base,
    palette: {
      ...base.palette,
      accent: adjustedAccent,
      surface_accent: withAlpha(adjustedAccent, 0.12),
      chart_palette: [adjustedAccent, ...base.palette.chart_palette.slice(1)],
    },
  };
}

/**
 * 根据用户输入关键词或场景智能推荐最匹配的 3 套差异化视觉风格（Show, Don't Tell 路由器）
 */
export function recommendStylesByQuery(query: string): StylePack[] {
  const q = query.toLowerCase();
  const scored = ALL_STYLE_PACKS.map((pack) => {
    let score = 0;
    for (const tag of pack.mood_tags) {
      if (q.includes(tag.toLowerCase())) score += 3;
    }
    if (q.includes(pack.id)) score += 10;
    if (q.includes(pack.name_zh)) score += 8;
    return { pack, score };
  }).sort((a, b) => b.score - a.score);

  if (scored[0].score === 0) {
    // 默认返回暗色科技、亮色极光、人文画册 3 种高反差代表风格供挑选
    return [
      getStylePack('apple-keynote-dark'),
      getStylePack('aurora-glass-light'),
      getStylePack('editorial-vogue'),
    ];
  }
  return scored.slice(0, 3).map((s) => s.pack);
}
