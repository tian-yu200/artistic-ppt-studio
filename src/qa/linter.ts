/**
 * Tier-1 静态 Anti-AI-Slop / Anti-Boxification 规则拦截 + 无头 DOM/SVG 真实包围盒防碰撞与防溢出自愈引擎 v3.0
 * 关键升级：
 * 1. 新增真实 SVG <text> 与 HTML [data-pptx-text="1"] 跨图层像素级包围盒碰撞检测 (TEXT_COLLISION)，彻底告别质检盲区；
 * 2. 新增真正的 ANTI_BOXIFICATION 密度审计，防止多格版式堆砌丧失先锋留白呼吸感；
 * 3. 自动剥离违禁 Emoji 并执行自适应字号阶梯自愈。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AjvPkg from 'ajv';
import type { SlideDeckIR } from '../types/ir.js';
import { getStylePack } from '../styles/index.js';
import { contrastRatio } from '../utils/color.js';
import { acquireBrowser, createFastHeadlessContext } from '../utils/browser.js';
import {
  containsBannedEmoji,
  sanitizeAntiSlopText,
} from '../utils/typography.js';
import { compileDeckToHtml } from '../compilers/html-compiler.js';
import { fillMissingSlideIds } from '../utils/ir-input.js';

const Ajv: any = (AjvPkg as any).default || AjvPkg;

export interface LintIssue {
  level: 'error' | 'warning' | 'healed';
  slideIndex?: number;
  code: string;
  message: string;
}

export interface LintAndHealResult {
  validSchema: boolean;
  healedDeck: SlideDeckIR;
  slideFontScales: Record<number, number>;
  issues: LintIssue[];
  overflowsRemaining: number;
  collisionsRemaining: number;
}

let cachedValidator: any = null;

function getSchemaValidator() {
  if (cachedValidator) return cachedValidator;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.resolve(__dirname, '../../schemas/slide-ir.schema.json');
  const schemaJson = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  cachedValidator = ajv.compile(schemaJson);
  return cachedValidator;
}

const SLOP_PLACEHOLDERS = /\b(lorem ipsum|option a|option b|template name|your title here)\b/i;

const MULTI_CELL_ARCHETYPES = new Set([
  'bento-asymmetric-4',
  'bento-showcase-5',
  'cards-3-staggered',
  'roadmap-milestones',
  'process-timeline',
]);

export async function lintAndAutoHealDeck(
  inputDeck: SlideDeckIR,
  runHeadlessGeometry = true
): Promise<LintAndHealResult> {
  const issues: LintIssue[] = [];
  const deck: SlideDeckIR = JSON.parse(JSON.stringify(inputDeck));

  // 0. 容错：模型常漏写 slides[].id，先补齐再校验
  for (const { index, id } of fillMissingSlideIds(deck)) {
    issues.push({
      level: 'healed',
      slideIndex: index,
      code: 'AUTO_FILL_ID',
      message: `第 ${index + 1} 页缺少 id，已自动补为 "${id}"`,
    });
  }

  // 1. JSON Schema 严格结构验证
  const validate = getSchemaValidator();
  const validSchema = Boolean(validate(deck));
  if (!validSchema && validate.errors) {
    for (const err of validate.errors) {
      const extraProp =
        err.keyword === 'additionalProperties' && err.params?.additionalProperty
          ? ` (未知多余字段: "${err.params.additionalProperty}")`
          : '';
      issues.push({
        level: 'error',
        code: 'SCHEMA_INVALID',
        message: `${err.instancePath || '/'}: ${err.message}${extraProp}`,
      });
    }
    return {
      validSchema: false,
      healedDeck: deck,
      slideFontScales: {},
      issues,
      overflowsRemaining: 0,
      collisionsRemaining: 0,
    };
  }

  // 2. 色彩可读性与对比度审计
  const style = getStylePack(deck.meta.style_id, deck.meta.accent_override);
  const bodyContrast = contrastRatio(style.palette.text_primary, style.palette.bg_primary);
  if (bodyContrast < 4.5) {
    issues.push({
      level: 'warning',
      code: 'LOW_CONTRAST',
      message: `风格 ${style.id} 主文字对比度为 ${bodyContrast}:1 (< 4.5:1)`,
    });
  }

  // 3. Anti-Boxification 密度审计 + Anti-AI-Slop 文本净化与节拍器审计
  let consecutiveSameArchetype = 1;
  let multiCellCount = 0;

  deck.slides.forEach((slide, idx) => {
    if (MULTI_CELL_ARCHETYPES.has(slide.archetype)) {
      multiCellCount++;
    }

    if (idx > 0 && slide.archetype === deck.slides[idx - 1].archetype) {
      consecutiveSameArchetype++;
      if (consecutiveSameArchetype >= 2) {
        issues.push({
          level: 'warning',
          slideIndex: idx,
          code: 'MONOTONOUS_PACING',
          message: `第 ${idx} 页与第 ${idx + 1} 页连续使用相同版式 "${slide.archetype}"，建议交替疏密版式提升叙事呼吸感。`,
        });
      }
    } else {
      consecutiveSameArchetype = 1;
    }

    const cleanField = (val?: string, label = 'text'): string | undefined => {
      if (!val) return val;
      if (SLOP_PLACEHOLDERS.test(val)) {
        issues.push({
          level: 'error',
          slideIndex: idx,
          code: 'SLOP_PLACEHOLDER',
          message: `第 ${idx + 1} 页 ${label} 包含未替换模板占位符文本。`,
        });
      }
      if (containsBannedEmoji(val)) {
        issues.push({
          level: 'healed',
          slideIndex: idx,
          code: 'EMOJI_STRIPPED',
          message: `第 ${idx + 1} 页 ${label} 检测到廉价 Emoji 符号，已自动净化剥离。`,
        });
        return sanitizeAntiSlopText(val);
      }
      return val;
    };

    slide.eyebrow = cleanField(slide.eyebrow, 'eyebrow');
    slide.title = cleanField(slide.title, 'title');
    slide.subtitle = cleanField(slide.subtitle, 'subtitle');
    if (slide.items) {
      slide.items.forEach((it, ii) => {
        it.title = cleanField(it.title, `items[${ii}].title`) || it.title;
        it.body = cleanField(it.body, `items[${ii}].body`);
        it.tag = cleanField(it.tag, `items[${ii}].tag`);
      });
    }
  });

  if (deck.slides.length >= 5 && multiCellCount / deck.slides.length > 0.45) {
    issues.push({
      level: 'warning',
      code: 'ANTI_BOXIFICATION',
      message: `多栏密集版式占比达 ${Math.round(
        (multiCellCount / deck.slides.length) * 100
      )}% (>45%)，建议穿插 hero-metric、editorial-magazine 或 quote-manifesto 等大留白呼吸页。`,
    });
  }

  const slideFontScales: Record<number, number> = {};
  let overflowsRemaining = 0;
  let collisionsRemaining = 0;

  if (!runHeadlessGeometry) {
    return {
      validSchema: true,
      healedDeck: deck,
      slideFontScales,
      issues,
      overflowsRemaining: 0,
      collisionsRemaining: 0,
    };
  }

  // 4. 无头 Chromium 1920x1080 真实盒模型溢出 + SVG/DOM 全节点文字碰撞检测 + 自动字号阶梯自愈
  const tmpHtml = path.join(
    os.tmpdir(),
    `artistic-ppt-lint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.html`
  );
  fs.writeFileSync(tmpHtml, compileDeckToHtml(deck), 'utf-8');

  const browser = await acquireBrowser();
  const context = await createFastHeadlessContext(browser, {
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`file:///${tmpHtml.replace(/\\/g, '/')}?headless=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(80);

    const scaleSteps = [1.0, 0.92, 0.85, 0.78, 0.72];

    for (let i = 0; i < deck.slides.length; i++) {
      await page.evaluate((idx) => (window as any).__deckGoTo(idx), i);

      let resolved = false;
      let lastCollisions: string[] = [];

      for (const scale of scaleSteps) {
        const check = await page.evaluate(
          ({ slideIdx, s }) => {
            const slideEl = document.getElementById(`slide-${slideIdx}`)!;
            slideEl.style.setProperty('--slide-font-scale', String(s));
            const stageRect = document.getElementById('deck-stage')!.getBoundingClientRect();
            const inner = slideEl.querySelector('.slide-inner') as HTMLElement;

            let overflowCount = 0;
            const reasons: string[] = [];

            if (inner && inner.scrollHeight > 1084) {
              overflowCount++;
              reasons.push(`slide-inner scrollHeight=${inner.scrollHeight}>1080`);
            }

            slideEl.querySelectorAll('.overlap-paper-note').forEach((card, ci) => {
              const c = card as HTMLElement;
              if (c.scrollHeight > c.clientHeight + 8) {
                overflowCount++;
                reasons.push(`overlap-note[${ci}] scrollHeight=${c.scrollHeight}>${c.clientHeight}`);
              }
            });

            slideEl.querySelectorAll('[data-pptx-text="1"]').forEach((txt) => {
              const r = txt.getBoundingClientRect();
              const relBottom = r.bottom - stageRect.top;
              const relRight = r.right - stageRect.left;
              if (relBottom > 1076 || relRight > 1916) {
                overflowCount++;
                reasons.push(`text out-of-stage (${Math.round(relRight)},${Math.round(relBottom)})`);
              }
            });

            // 收集所有可见的 HTML 语义文本节点与 SVG <text> 节点，两两检测几何碰撞
            const candidates: Array<{
              el: Element;
              label: string;
              left: number;
              top: number;
              right: number;
              bottom: number;
            }> = [];

            slideEl
              .querySelectorAll('[data-pptx-text="1"], svg text')
              .forEach((el) => {
                if (el.closest('[aria-hidden="true"]')) return;
                const cs = window.getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) {
                  return;
                }
                const r = el.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) return;
                const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
                if (!txt) return;
                candidates.push({
                  el,
                  label: txt.slice(0, 22),
                  left: r.left,
                  top: r.top,
                  right: r.right,
                  bottom: r.bottom,
                });
              });

            // 收集所有散点圆球等刚性图形障碍物 [data-collision-obstacle="1"]
            const obstacles: Array<{
              left: number;
              top: number;
              right: number;
              bottom: number;
            }> = [];
            slideEl.querySelectorAll('[data-collision-obstacle="1"]').forEach((ob) => {
              const r = ob.getBoundingClientRect();
              if (r.width < 2 || r.height < 2) return;
              // 圆形内接安全区（收缩 14% 四角空白）
              const shrinkX = r.width * 0.14;
              const shrinkY = r.height * 0.14;
              obstacles.push({
                left: r.left + shrinkX,
                top: r.top + shrinkY,
                right: r.right - shrinkX,
                bottom: r.bottom - shrinkY,
              });
            });

            const collisionPairs: string[] = [];
            for (let a = 0; a < candidates.length; a++) {
              const ca = candidates[a];
              for (let b = a + 1; b < candidates.length; b++) {
                const cb = candidates[b];
                if (ca.el.contains(cb.el) || cb.el.contains(ca.el)) continue;

                const overlapW = Math.min(ca.right, cb.right) - Math.max(ca.left, cb.left);
                const overlapH = Math.min(ca.bottom, cb.bottom) - Math.max(ca.top, cb.top);
                if (overlapW > 3.5 && overlapH > 3.5) {
                  collisionPairs.push(`"${ca.label}" <-> "${cb.label}"`);
                }
              }

              // 检测文字是否压在数据散点圆球上
              for (let k = 0; k < obstacles.length; k++) {
                const ob = obstacles[k];
                const ow = Math.min(ca.right, ob.right) - Math.max(ca.left, ob.left);
                const oh = Math.min(ca.bottom, ob.bottom) - Math.max(ca.top, ob.top);
                if (ow > 2.5 && oh > 2.5) {
                  collisionPairs.push(`"${ca.label}" <-> [DataPointCircle#${k + 1}]`);
                }
              }
            }

            return { overflowCount, reasons, collisionPairs };
          },
          { slideIdx: i, s: scale }
        );

        lastCollisions = check.collisionPairs;

        if (check.overflowCount === 0 && check.collisionPairs.length === 0) {
          if (scale < 1.0) {
            slideFontScales[i] = scale;
            issues.push({
              level: 'healed',
              slideIndex: i,
              code: 'OVERFLOW_AUTO_SCALED',
              message: `第 ${i + 1} 页内容较密，已自动将局部排印比例微调至 ${Math.round(
                scale * 100
              )}% 实现零溢出零碰撞完美贴合。`,
            });
          }
          resolved = true;
          break;
        }
      }

      if (!resolved) {
        if (lastCollisions.length > 0) {
          collisionsRemaining += lastCollisions.length;
          issues.push({
            level: 'error',
            slideIndex: i,
            code: 'TEXT_COLLISION',
            message: `第 ${i + 1} 页检测到 ${lastCollisions.length} 处文字包围盒碰撞: ${lastCollisions
              .slice(0, 3)
              .join('; ')}`,
          });
        } else {
          slideFontScales[i] = 0.72;
          overflowsRemaining++;
          issues.push({
            level: 'warning',
            slideIndex: i,
            code: 'DENSE_SLIDE_WARNING',
            message: `第 ${i + 1} 页在缩至 72% 字号后仍偏紧凑，建议精简文案字数或拆分为两页。`,
          });
        }
      }
    }
  } finally {
    await context.close().catch(() => {});
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }

  return {
    validSchema: true,
    healedDeck: deck,
    slideFontScales,
    issues,
    overflowsRemaining,
    collisionsRemaining,
  };
}
