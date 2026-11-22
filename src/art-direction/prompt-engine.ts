/**
 * 大师级负空间艺术指导与高定视觉资产管线 (Negative-Space Harbor Art Direction Engine)
 * 职责：
 * 1. 为全部 12 种视觉风格提供精确控制“镜头视角 + 戏剧布光 + 60%+ 负空间留白港湾 + 胶片肌理”的生图提示词构建器；
 * 2. 自动解析 "art://<asset-id>"、本地文件路径或当前风格默认绑定的高定真图为内联 Data URI，使任何模型开箱即享博物馆级真图质感。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SlideDeckIR, StyleId } from '../types/ir.js';

export interface ArtRecipe {
  styleId: StyleId;
  defaultAssetFile: string;
  cameraSpec: string;
  lightingSpec: string;
  materialPaletteSpec: string;
  negativeSpaceRule: string;
}

export const STYLE_ART_RECIPES: Record<StyleId, ArtRecipe> = {
  'apple-keynote-dark': {
    styleId: 'apple-keynote-dark',
    defaultAssetFile: 'silicon-photonic-macro.jpg',
    cameraSpec: 'Hasselblad H6D 100mm macro f/2.8, shallow depth of field, dramatic perspective',
    lightingSpec: 'Obsidian dark-room rim lighting with razor-thin sapphire-blue and warm amber internal optical refraction',
    materialPaletteSpec: 'Honed black crystalline silicon wafer, brushed dark titanium, pitch-black velvet void (#07080D)',
    negativeSpaceRule: 'Left 62% of the 16:9 frame MUST remain clean, smooth, uncluttered matte-black negative space for typography',
  },
  'linear-precision': {
    styleId: 'linear-precision',
    defaultAssetFile: 'monolith-chiaroscuro.jpg',
    cameraSpec: 'Medium format architectural 50mm f/4, crisp geometric perspective',
    lightingSpec: 'Single directional volumetric light beam piercing dark atmospheric mist with mirror reflection',
    materialPaletteSpec: 'Monolithic black basalt, anodized dark slate aluminum, subtle specular highlights (#090A0F)',
    negativeSpaceRule: 'Left 58% of the frame MUST remain deep, clean dark negative space free of high-frequency clutter',
  },
  'stage-cyber-spotlight': {
    styleId: 'stage-cyber-spotlight',
    defaultAssetFile: 'cyber-stage-laser.jpg',
    cameraSpec: 'Wide-angle 28mm low-angle stage perspective, Porsche/DJI flagship launch aesthetic',
    lightingSpec: 'Sharp diagonal cyan-ice and silver Tyndall volumetric spotlight beam cutting through dark theater haze',
    materialPaletteSpec: 'Brushed dark gunmetal horizon plane, optical mist, deep theater black (#05070E)',
    negativeSpaceRule: 'Left 65% of the frame MUST remain pitch-dark atmospheric negative space',
  },
  'config-neo-brutal': {
    styleId: 'config-neo-brutal',
    defaultAssetFile: 'neo-brutal-chrome.jpg',
    cameraSpec: 'Experimental design exhibition macro, 85mm lens, stark sculptural framing',
    lightingSpec: 'High-contrast studio rim light reflecting vivid acid-lime and vermilion streaks',
    materialPaletteSpec: 'Liquid-chrome sharp metallic polyhedron against matte dark charcoal void (#111113)',
    negativeSpaceRule: 'Left 62% of the frame MUST remain clean matte dark charcoal negative space',
  },
  'aurora-glass-light': {
    styleId: 'aurora-glass-light',
    defaultAssetFile: 'aurora-crystal-prism.jpg',
    cameraSpec: 'Clean studio optical macro 90mm f/3.2, luminous airy composition',
    lightingSpec: 'Soft diffused daylight refracting indigo, cyan, and subtle rose caustics through frosted quartz',
    materialPaletteSpec: 'Precision-cut frosted optical crystal polyhedron on a pure pearl-white surface (#F4F7FD)',
    negativeSpaceRule: 'Left 62% of the frame MUST remain pure, airy, uncluttered pearl-white negative space',
  },
  'editorial-vogue': {
    styleId: 'editorial-vogue',
    defaultAssetFile: 'travertine-linen-sculpture.jpg',
    cameraSpec: 'Vogue Italia medium-format analog film 65mm, Kodak Portra 400 fine grain',
    lightingSpec: 'Warm late-afternoon venetian-blind side light casting poetic chiaroscuro shadows',
    materialPaletteSpec: 'Raw porous cream Roman travertine stone arch and unbleached Belgian linen against warm lime plaster (#F5F0E6)',
    negativeSpaceRule: 'Left 60% of the frame MUST remain clean warm ivory plaster negative space',
  },
  'oriental-ink-zen': {
    styleId: 'oriental-ink-zen',
    defaultAssetFile: 'oriental-ink-cliff.jpg',
    cameraSpec: 'Song Dynasty Ma Yuan one-corner composition (马远一角构图), poetic museum fine art',
    lightingSpec: 'Diffused morning river mist and subtle ink-wash tonal gradations',
    materialPaletteSpec: 'Handmade Xuan paper fiber (#F6F4EE), layered pine-soot sumi ink cliff, distant indigo mountain mist, solitary vermilion leaf',
    negativeSpaceRule: 'Upper-left 65% of the frame MUST remain vast, serene, unpainted Xuan-paper ivory negative space',
  },
  'swiss-grid-modern': {
    styleId: 'swiss-grid-modern',
    defaultAssetFile: 'swiss-architectural-grid.jpg',
    cameraSpec: 'Orthographic Zurich modernist architectural photography, crisp daylight',
    lightingSpec: 'Clean museum daylight casting geometric structural shadows',
    materialPaletteSpec: 'Orthographic matte black steel I-beams intersecting a Swiss signal-red (#E62E25) plane against off-white wall (#F3F3F1)',
    negativeSpaceRule: 'Left 65% of the frame MUST remain pure smooth architectural off-white negative space',
  },
  'executive-consulting': {
    styleId: 'executive-consulting',
    defaultAssetFile: 'executive-cobalt-horizon.jpg',
    cameraSpec: 'Authoritative upward architectural angle, 50mm tilt-shift lens, razor-sharp lines',
    lightingSpec: 'Crisp high-altitude morning light glinting off deep navy glass facade',
    materialPaletteSpec: 'Midnight-cobalt curtain wall glass and brushed silver aluminum against pale slate sky (#F8FAFC)',
    negativeSpaceRule: 'Upper-left 65% of the frame MUST remain clean pale silver-white sky negative space',
  },
  'nature-academic': {
    styleId: 'nature-academic',
    defaultAssetFile: 'nature-pendulum-trace.jpg',
    cameraSpec: 'Rigorous Nature Physics stroboscopic phase-space trajectory photography',
    lightingSpec: 'Clean laboratory high-key illumination on pure ivory recording paper',
    materialPaletteSpec: 'Delicate Prussian-blue (#0072B2) and ochre (#D55E00) damped harmonic pendulum light-trace curves on ivory white (#FCFDFE)',
    negativeSpaceRule: 'Left 65% of the frame MUST remain pure uncluttered ivory-white negative space',
  },
  'warm-humanist': {
    styleId: 'warm-humanist',
    defaultAssetFile: 'warm-humanist-craft.jpg',
    cameraSpec: 'Kinfolk editorial still-life, 50mm f/2.8 natural light, tactile warmth',
    lightingSpec: 'Soft golden-hour window light across organic craft textures',
    materialPaletteSpec: 'Hand-thrown matte terracotta clay vessel and sage olive branch on warm oat handmade paper (#F3EDE2)',
    negativeSpaceRule: 'Left 62% of the frame MUST remain clean warm oat-paper negative space',
  },
  'bauhaus-industrial': {
    styleId: 'bauhaus-industrial',
    defaultAssetFile: 'brutalist-bauhaus-concrete.jpg',
    cameraSpec: 'Dieter Rams / Teenage Engineering product macro, precision orthographic angle',
    lightingSpec: 'Clean studio softbox highlighting chamfered metal edges',
    materialPaletteSpec: 'Bead-blasted warm grey anodized aluminum (#E8E6DF) with a matte signal-orange (#FF5500) dial accent',
    negativeSpaceRule: 'Left 62% of the frame MUST remain clean matte anodized-grey negative space',
  },
};

/**
 * 为指定风格与主题构建可直接喂给任何生图模型（Imagen / Flux / Midjourney / DALL-E）的大师级负空间提示词
 */
export function buildNegativeSpaceArtPrompt(
  styleId: StyleId,
  customSubject?: string
): string {
  const recipe = STYLE_ART_RECIPES[styleId] || STYLE_ART_RECIPES['apple-keynote-dark'];
  const subj = customSubject
    ? `Primary Subject on the right/corner anchor: ${customSubject}.`
    : `Material & Subject Palette: ${recipe.materialPaletteSpec}.`;

  return [
    `Ultra-high-end 16:9 widescreen art-directed presentation visual.`,
    subj,
    `Composition Law: ${recipe.negativeSpaceRule}.`,
    `Lighting: ${recipe.lightingSpec}.`,
    `Camera & Texture: ${recipe.cameraSpec}.`,
    `Strict Constraints: ZERO text, ZERO letters, ZERO numbers, ZERO UI elements, ZERO watermarks.`,
  ].join(' ');
}

/**
 * 为整套 SlideDeck IR 导出分镜生图清单（供外部 Agent 或设计师批量生图）
 */
export function generateDeckArtPrompts(deck: SlideDeckIR): Array<{
  slideId: string;
  archetype: string;
  prompt: string;
}> {
  const results: Array<{ slideId: string; archetype: string; prompt: string }> = [];
  deck.slides.forEach((s) => {
    if (
      s.media ||
      s.archetype.startsWith('cover-') ||
      s.archetype === 'editorial-magazine' ||
      s.archetype === 'hero-metric' ||
      s.archetype === 'focus-zoom-detail'
    ) {
      results.push({
        slideId: s.id,
        archetype: s.archetype,
        prompt: buildNegativeSpaceArtPrompt(
          deck.meta.style_id,
          s.media?.art_prompt_subject || s.title
        ),
      });
    }
  });
  return results;
}

const dataUriCache = new Map<string, string>();

function getArtLibraryDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../../assets/art-library');
}

/**
 * 解析内置 "art://xxx" 或本地文件路径为内联 Base64 Data URI
 */
export function resolveArtAssetDataUri(
  src: string | undefined,
  styleId: StyleId
): string | null {
  const libDir = getArtLibraryDir();
  let targetPath: string | null = null;

  if (!src) {
    const recipe = STYLE_ART_RECIPES[styleId];
    if (recipe) {
      const candidate = path.join(libDir, recipe.defaultAssetFile);
      if (fs.existsSync(candidate)) targetPath = candidate;
    }
  } else if (src.startsWith('data:image/')) {
    return src;
  } else if (src.startsWith('art://')) {
    const name = src.slice('art://'.length).trim();
    const candidates = [
      path.join(libDir, name),
      path.join(libDir, `${name}.jpg`),
      path.join(libDir, `${name}.png`),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        targetPath = c;
        break;
      }
    }
  } else if (fs.existsSync(path.resolve(src))) {
    targetPath = path.resolve(src);
  }

  // 回退至已归档的通用高定真图
  if (!targetPath) {
    const fallbackFile =
      styleId === 'oriental-ink-zen'
        ? path.join(libDir, 'oriental-ink-cliff.jpg')
        : path.join(libDir, 'monolith-chiaroscuro.jpg');
    if (fs.existsSync(fallbackFile)) targetPath = fallbackFile;
  }

  if (!targetPath || !fs.existsSync(targetPath)) return null;
  if (dataUriCache.has(targetPath)) return dataUriCache.get(targetPath)!;

  const ext = path.extname(targetPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const uri = `data:${mime};base64,${fs.readFileSync(targetPath).toString('base64')}`;
  dataUriCache.set(targetPath, uri);
  return uri;
}
