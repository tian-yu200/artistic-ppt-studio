/**
 * Artistic-PPT v3.0 — 24 套大师精修版式原型引擎
 * 审美质检全面升级：
 * 1. 按 StylePack.decor 精准克制驱动装饰原语（移除默认 "26" 巨字、高管/科研风零花哨符号、纯西文侧舷边注）；
 * 2. 跨界标题升级为“建筑切口衬板 (Architectural Cutout Cartouche)”，双端恒定 15:1 对比度，零劈字零撞色；
 * 3. 东方水墨风实装正统书卷竖排大标题 + 朱砂篆意方印；
 * 4. 所有建筑标尺分割线标记 data-pptx-rule="1"，导出 PPTX 时生成原生可移动形状。
 */
import type {
  CameraFrameMode,
  DeckMetadata,
  MediaAsset,
  OverlapNoteSpec,
  SlideItem,
  SlideSpec,
  StylePack,
} from '../types/ir.js';
import { resolveArtAssetDataUri } from '../art-direction/prompt-engine.js';
import {
  computeAdaptiveTitlePx,
  escapeHtml,
  renderLatexToHtml,
  renderRichHtml,
} from '../utils/typography.js';
import { renderArtisticIllustration, renderSlideAtmosphere } from './backgrounds.js';
import { renderChartSvg, renderDiagramSvg, renderQuadrantSvg } from './charts.js';
import { renderIconSvg } from './icons.js';

export interface RenderSlideContext {
  meta: DeckMetadata;
  style: StylePack;
  slide: SlideSpec;
  index: number;
  total: number;
}

function morphAttr(id?: string, isMorphBox = false): string {
  if (!id) return '';
  const safe = escapeHtml(id);
  return ` data-morph-id="${safe}"${isMorphBox ? ' data-pptx-morph-box="1"' : ''}`;
}

const DATA_DENSE_ARCHETYPES = new Set([
  'chart-spotlight',
  'quadrant-matrix',
  'three-line-table',
  'roadmap-milestones',
  'architecture-flow',
  'academic-paper-2col',
  'code-architecture',
]);

function sanitizeAsciiSideNote(raw: string | undefined, styleName: string, idx: number, total: number): string {
  const pageTag = `${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  if (!raw) return `${styleName.toUpperCase()} — ${pageTag}`;
  // 剥离非 ASCII 字符，防止中英混排竖排边注出现“汉字直立+英文躺倒”视觉灾难
  const asciiOnly = raw.replace(/[^\x20-\x7E]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (asciiOnly.length < 4) return `${styleName.toUpperCase()} — ${pageTag}`;
  if (asciiOnly.length <= 46) return asciiOnly;
  const cut = asciiOnly.slice(0, 46);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace >= 20 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * 动态推导东方朱砂印章篆字（严禁硬编码“雲林”私章张冠李戴！）
 * 优先取 slide.seal_text；否则自动从 brand_mark / title / author 提取前 2 个汉字或大写首字母
 */
function deriveOrientalSealText(slide: SlideSpec, meta: DeckMetadata): string {
  if (slide.seal_text && slide.seal_text.trim()) {
    return slide.seal_text.trim().slice(0, 4);
  }
  const sources = [meta.brand_mark, meta.title, slide.title, meta.author];
  for (const src of sources) {
    if (!src) continue;
    const cjkChars = (src.match(/[\u4e00-\u9fff]/g) || []).join('');
    if (cjkChars.length >= 2) return cjkChars.slice(0, 2);
  }
  const alpha = (meta.title || 'SEAL').replace(/[^A-Za-z]/g, '').toUpperCase();
  return alpha.slice(0, 2) || '雅集';
}

function renderArtPortal(
  media: MediaAsset | undefined,
  style: StylePack,
  seed: number,
  mode: CameraFrameMode = 'full-bleed-right-subject',
  extraClass = ''
): string {
  const artUri = resolveArtAssetDataUri(media?.src, style.id);
  const morphId = media?.morph_id || 'cinema-bg';
  const innerVisual = artUri
    ? `<img src="${artUri}" alt="${escapeHtml(media?.caption || '')}" class="portal-img mode-${mode}"/>`
    : renderArtisticIllustration(media?.motif, style, seed);

  const scrimHtml =
    mode === 'full-bleed-right-subject'
      ? `<div class="portal-scrim-gradient"></div>`
      : mode === 'pan-zoom-detail'
      ? `<div class="portal-zoom-scrim"></div>`
      : '';

  return `<div class="art-portal portal-${mode} ${extraClass}" data-pptx-dynamic-img="1" data-morph-id="${escapeHtml(
    morphId
  )}" data-parallax="bg">
    ${innerVisual}
    ${scrimHtml}
  </div>`;
}

function renderOverlapNote(note?: OverlapNoteSpec): string {
  if (!note) return '';
  const pos = note.position || 'bottom-right';
  const mId = note.morph_id || 'overlap-tag';
  return `<aside class="overlap-paper-note pos-${pos}" data-morph-id="${escapeHtml(
    mId
  )}" data-pptx-morph-box="1" data-box-kind="overlap" data-parallax="fg">
    <strong class="overlap-note-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
      note.title
    )}</strong>
    <span class="overlap-note-body" data-pptx-text="1" data-pptx-role="caption">${renderRichHtml(
      note.body
    )}</span>
  </aside>`;
}

function renderAvantGardeDecor(ctx: RenderSlideContext): string {
  const { style, slide, index, total } = ctx;
  const decor = style.decor || {};

  // 1. 切边巨字：严禁默认强塞 "26"；高密数据/图表页自动隐藏，统一置于左下低干扰位避免撞右上角页码与数字
  const showBleed =
    decor.allow_bleed_mark !== false &&
    Boolean(slide.bleed_mark) &&
    !DATA_DENSE_ARCHETYPES.has(slide.archetype);

  // 2. 90° 侧舷铭牌：仅限开启风格，且强制纯西文短铭牌
  const showSide = Boolean(decor.show_side_note);
  const sideText = showSide
    ? sanitizeAsciiSideNote(slide.side_note, style.name, index, total)
    : '';

  // 3. 四角印刷裁切十字：仅限瑞士网格/包豪斯/极客等几何流派
  const showCross = Boolean(decor.show_crosshairs);

  return `
    ${
      showBleed
        ? `<div class="bleed-giant-mark bleed-bottom-left" data-parallax="mid" aria-hidden="true">${escapeHtml(
            slide.bleed_mark!
          )}</div>`
        : ''
    }
    ${
      showSide
        ? `<div class="editorial-side-note" aria-hidden="true">${escapeHtml(sideText)}</div>`
        : ''
    }
    ${
      showCross
        ? `<span class="print-crosshair ch-tl" aria-hidden="true">+</span>
           <span class="print-crosshair ch-tr" aria-hidden="true">+</span>
           <span class="print-crosshair ch-bl" aria-hidden="true">+</span>
           <span class="print-crosshair ch-br" aria-hidden="true">+</span>`
        : ''
    }
  `;
}

function renderTopHeaderBar(ctx: RenderSlideContext): string {
  const { meta, slide, index, total } = ctx;
  if (slide.archetype.startsWith('cover-') || slide.archetype === 'closing-beacon') {
    return '';
  }
  const pageStr =
    meta.show_slide_numbers !== false
      ? `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
      : '';
  return `<header class="slide-chrome-top" data-pptx-border-host="1">
    <div class="chrome-brand" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
      meta.brand_mark || meta.title
    )}</div>
    ${
      pageStr
        ? `<div class="chrome-index" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
            pageStr
          )}</div>`
        : ''
    }
  </header>`;
}

function renderOpenHeader(
  slide: SlideSpec,
  role: 'standard' | 'section' | 'statement' = 'standard'
): string {
  const titlePx = slide.title ? computeAdaptiveTitlePx(slide.title, role) : 46;
  const eyebrowHtml = slide.eyebrow
    ? `<div class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
        slide.eyebrow_morph_id
      )} data-parallax="fg">${escapeHtml(slide.eyebrow)}</div>`
    : '';
  const titleHtml = slide.title
    ? `<h2 class="slide-title" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(slide.title)}</h2>`
    : '';
  const subHtml = slide.subtitle
    ? `<p class="slide-subtitle" data-pptx-text="1" data-pptx-role="subtitle"${morphAttr(
        slide.subtitle_morph_id
      )}>${renderRichHtml(slide.subtitle)}</p>`
    : '';

  return `<div class="header-block">
    ${eyebrowHtml}
    ${titleHtml}
    ${subHtml}
  </div>`;
}

function renderFramelessPlinth(
  item: SlideItem,
  idx: number,
  style: StylePack,
  romanOrNum?: string
): string {
  const accentClass = item.accent ? 'plinth-accent' : '';
  const idxLabel = romanOrNum || item.tag || `0${idx + 1}`;
  const iconHtml = item.icon
    ? `<span class="plinth-icon">${renderIconSvg(item.icon, 22, style.palette.accent)}</span>`
    : '';
  const metricHtml = item.metric
    ? `<div class="plinth-metric" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
        item.metric
      )}${
        item.metric_label
          ? `<small class="plinth-metric-unit">  ${escapeHtml(item.metric_label)}</small>`
          : ''
      }</div>`
    : '';
  const formulaHtml = item.formula
    ? `<div class="card-formula" data-pptx-formula-box="1" data-latex="${escapeHtml(
        item.formula
      )}" data-display="0">${renderLatexToHtml(item.formula, false)}</div>`
    : '';

  return `<article class="open-plinth ${accentClass}"${morphAttr(
    item.morph_id,
    false
  )} data-stagger="${Math.min(idx + 2, 6)}">
    <div class="plinth-rule-top" data-pptx-rule="1"></div>
    <div class="plinth-meta-row">
      <span class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
        idxLabel
      )}</span>
      ${iconHtml}
    </div>
    ${metricHtml}
    <h3 class="plinth-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
      item.title
    )}</h3>
    ${
      item.body
        ? `<p class="plinth-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
            item.body
          )}</p>`
        : ''
    }
    ${formulaHtml}
  </article>`;
}

export function renderSlideHtml(ctx: RenderSlideContext): string {
  const { meta, style, slide, index, total } = ctx;
  const variant = slide.background_variant || 'default';
  const atmosphereSvg = renderSlideAtmosphere(style, variant, index);
  const avantDecor = renderAvantGardeDecor(ctx);
  const chromeTop = renderTopHeaderBar(ctx);
  const overlapNoteHtml = renderOverlapNote(slide.overlap_note);
  const footnoteHtml = slide.footnote
    ? `<footer class="slide-footnote" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
        slide.footnote
      )}</footer>`
    : '';

  let portalUnderlay = '';
  let bodyHtml = '';

  switch (slide.archetype) {
    // 1. 全出血负空间光影封面（支持正统东方竖排书卷模式 + 朱砂闲章）
    case 'cover-cinematic': {
      portalUnderlay = renderArtPortal(
        slide.media,
        style,
        index + 1,
        slide.media?.camera_mode || 'full-bleed-right-subject'
      );
      const isVert = Boolean(slide.vertical_title);
      const titlePx = isVert
        ? 64
        : computeAdaptiveTitlePx(slide.title || meta.title, 'cover');
      const kicker = slide.eyebrow || meta.date || 'PROLOGUE';
      const metaLine = [meta.author, meta.date].filter(Boolean).join('  ·  ');
      const vfCaption =
        slide.media?.caption ||
        `01 / ${String(total).padStart(2, '0')}`;
      const sealStr = deriveOrientalSealText(slide, meta);
      const sealHtml =
        style.decor?.show_oriental_seal || Boolean(slide.seal_text)
          ? `<div class="oriental-seal-stamp" data-morph-id="seal-${index}" data-pptx-morph-box="1" data-box-kind="seal"><span data-pptx-text="1" data-pptx-role="seal">${escapeHtml(
              sealStr
            )}</span></div>`
          : '';

      if (isVert) {
        bodyHtml = `
          <div class="layout-cover-vertical-scroll">
            <div class="vscroll-left-prose" data-pptx-border-host="1">
              <div class="cover-v2-kicker" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
                slide.eyebrow_morph_id
              )}>${escapeHtml(kicker)}</div>
              ${
                slide.subtitle || meta.subtitle
                  ? `<p class="vscroll-sub" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                      slide.subtitle || meta.subtitle || ''
                    )}</p>`
                  : ''
              }
              ${
                metaLine
                  ? `<div class="cover-v2-meta" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                      metaLine
                    )}</div>`
                  : ''
              }
            </div>
            <div class="vscroll-title-col">
              <h1 class="vscroll-main-title" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
          slide.title_morph_id
        )}>${renderRichHtml(slide.title || meta.title, false)}</h1>
              ${sealHtml}
            </div>
            <div class="cover-viewfinder" data-pptx-morph-box="1" data-box-kind="viewfinder"><span data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
              vfCaption
            )}</span></div>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="layout-cover-v2">
            <div class="cover-v2-harbor">
              <div class="cover-v2-kicker" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
                slide.eyebrow_morph_id
              )} data-parallax="fg">${escapeHtml(kicker)}</div>
              <h1 class="cover-v2-title" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
          slide.title_morph_id
        )} data-parallax="fg">${renderRichHtml(slide.title || meta.title)}</h1>
              <div class="cover-v2-offgrid-line" data-pptx-rule="1"></div>
              ${
                slide.subtitle || meta.subtitle
                  ? `<p class="cover-v2-sub" data-pptx-text="1" data-pptx-role="subtitle"${morphAttr(
                      slide.subtitle_morph_id
                    )}>${renderRichHtml(slide.subtitle || meta.subtitle || '')}</p>`
                  : ''
              }
              ${
                metaLine
                  ? `<div class="cover-v2-meta" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                      metaLine
                    )}</div>`
                  : ''
              }
            </div>
            <div class="cover-viewfinder" data-pptx-morph-box="1" data-box-kind="viewfinder"><span data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
              vfCaption
            )}</span></div>
          </div>
        `;
      }
      break;
    }

    // 2. 高定画册右出血封面
    case 'cover-editorial-split': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 1, 'portal-right');
      const titlePx = computeAdaptiveTitlePx(slide.title || meta.title, 'cover');
      const metaLine = [meta.author, meta.date].filter(Boolean).join('  —  ');
      bodyHtml = `
        <div class="layout-cover-editorial-v2">
          <div class="editorial-cover-left">
            ${
              slide.eyebrow
                ? `<div class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
                    slide.eyebrow_morph_id
                  )}>${escapeHtml(slide.eyebrow)}</div>`
                : ''
            }
            <h1 class="editorial-bleed-title" style="font-size:${Math.min(
              74,
              titlePx
            )}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(slide.title || meta.title)}</h1>
            <div class="cover-v2-offgrid-line" data-pptx-rule="1"></div>
            ${
              slide.subtitle || meta.subtitle
                ? `<p class="cover-editorial-sub" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                    slide.subtitle || meta.subtitle || ''
                  )}</p>`
                : ''
            }
            ${
              metaLine
                ? `<div class="cover-editorial-meta" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                    metaLine
                  )}</div>`
                : ''
            }
          </div>
          ${
            slide.media?.caption
              ? `<div class="portal-right-caption" data-pptx-morph-box="1" data-box-kind="caption-pill"><span data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                  slide.media.caption
                )}</span></div>`
              : ''
          }
        </div>
      `;
      break;
    }

    // 3. 瑞士国际主义精密网格封面
    case 'cover-swiss-grid': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 1, 'vertical-slit');
      const titlePx = computeAdaptiveTitlePx(slide.title || meta.title, 'cover');
      bodyHtml = `
        <div class="layout-cover-swiss-v2">
          <div class="swiss-top-bar" data-pptx-border-host="1">
            <span class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
              slide.eyebrow || '00 // ARCHITECTURAL INDEX'
            )}</span>
            <span class="swiss-date" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
              meta.date || '2026'
            )}</span>
          </div>
          <div class="swiss-main-zone">
            <h1 class="cover-v2-title" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(slide.title || meta.title)}</h1>
          </div>
          <div class="swiss-bottom-spec" data-pptx-border-host="1">
            <p class="slide-subtitle" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
              slide.subtitle || meta.subtitle || ''
            )}</p>
            <div class="swiss-author-tag" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
              meta.author || meta.brand_mark || ''
            )}</div>
          </div>
        </div>
      `;
      break;
    }

    // 4. 破格章节过渡页
    case 'section-chapter': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 2, 'vertical-slit');
      const chapNum = slide.eyebrow || String(index).padStart(2, '0');
      const titlePx = computeAdaptiveTitlePx(slide.title || '', 'section');
      bodyHtml = `
        <div class="layout-section-v2">
          <div class="section-v2-num" data-pptx-text="1" data-pptx-role="metric"${morphAttr(
            slide.eyebrow_morph_id
          )}>${escapeHtml(chapNum)}</div>
          <div class="section-v2-line" data-pptx-rule="1"></div>
          <h2 class="chapter-title" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(slide.title || '')}</h2>
          ${
            slide.subtitle
              ? `<p class="slide-subtitle" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                  slide.subtitle
                )}</p>`
              : ''
            }
        </div>
      `;
      break;
    }

    // 5. 高张力洞察宣言页
    case 'statement-impact': {
      const titlePx = computeAdaptiveTitlePx(slide.title || '', 'statement');
      const bottomItems = (slide.items || []).slice(0, 3);
      bodyHtml = `
        <div class="layout-statement-impact">
          ${
            slide.eyebrow
              ? `<div class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
                  slide.eyebrow_morph_id
                )}>${escapeHtml(slide.eyebrow)}</div>`
              : ''
          }
          <h2 class="statement-headline" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(slide.title || '')}</h2>
          ${
            slide.subtitle
              ? `<p class="statement-sub" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                  slide.subtitle
                )}</p>`
              : ''
          }
          ${
            bottomItems.length > 0
              ? `<div class="statement-pillars" data-pptx-border-host="1">
                  ${bottomItems
                    .map(
                      (it, idx) => `<div class="pillar-mini" data-stagger="${idx + 2}">
                        <div class="pillar-num" data-pptx-text="1" data-pptx-role="eyebrow">0${
                          idx + 1
                        }</div>
                        <div class="pillar-mini-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                          it.title
                        )}</div>
                        ${
                          it.body
                            ? `<div class="pillar-mini-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                                it.body
                              )}</div>`
                            : ''
                        }
                      </div>`
                    )
                    .join('')}
                </div>`
              : ''
          }
        </div>
      `;
      break;
    }

    // 6. 孤品留白巨型指标页 + 垂直光隙真图切片 + 贯通细轴线 + 色温自适应叠压纸签
    case 'hero-metric': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 3, 'vertical-slit');
      const hm = slide.hero_metric || {
        value: '10×',
        label: slide.title || 'Breakthrough',
      };
      const sideItems = (slide.items || []).slice(0, 2);
      const autoOverlap: OverlapNoteSpec | undefined =
        slide.overlap_note ||
        (sideItems[0]
          ? {
              title: `${sideItems[0].metric ? sideItems[0].metric + ' · ' : ''}${sideItems[0].title}`,
              body: sideItems[0].body || '',
              morph_id: sideItems[0].morph_id || 'hero-overlap-note',
            }
          : undefined);

      bodyHtml = `
        <div class="layout-hero-metric-v2">
          <div class="hm-top-zone">
            ${
              slide.eyebrow
                ? `<div class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                    slide.eyebrow
                  )}</div>`
                : ''
            }
            <div class="hm-giant-figure" data-pptx-text="1" data-pptx-role="metric"${morphAttr(
              hm.morph_id
            )} data-parallax="fg">${escapeHtml(hm.value)}${
        hm.unit ? `<em class="hm-unit">${escapeHtml(hm.unit)}</em>` : ''
      }</div>
            ${
              hm.delta
                ? `<div class="hm-delta-kicker" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                    hm.delta
                  )}</div>`
                : ''
            }
          </div>

          <div class="hm-贯通-axis" data-pptx-rule="1"></div>

          <div class="hm-bottom-grid">
            <div class="hm-main-desc">
              <h2 class="hm-statement-title" data-pptx-text="1" data-pptx-role="title">${renderRichHtml(
                slide.title || hm.label
              )}</h2>
              ${
                hm.description || slide.subtitle
                  ? `<p class="hm-body-copy" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                      hm.description || slide.subtitle || ''
                    )}</p>`
                  : ''
              }
            </div>
            ${
              sideItems[1]
                ? `<div class="hm-secondary-stat">
                    <div class="plinth-metric" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
                      sideItems[1].metric || ''
                    )}</div>
                    <div class="plinth-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                      sideItems[1].title
                    )}</div>
                    ${
                      sideItems[1].body
                        ? `<p class="plinth-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                            sideItems[1].body
                          )}</p>`
                        : ''
                    }
                  </div>`
                : ''
            }
          </div>
          ${!slide.overlap_note && autoOverlap ? renderOverlapNote(autoOverlap) : ''}
        </div>
      `;
      break;
    }

    // 7. 先锋建筑拼贴矩阵 4 模组
    case 'bento-asymmetric-4': {
      const items = (slide.items || []).slice(0, 4);
      const heroItem = items[0];
      const restItems = items.slice(1);
      const heroArtUri = resolveArtAssetDataUri(heroItem?.media?.src || slide.media?.src, style.id);

      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="avant-collage-4">
            ${
              heroItem
                ? `<article class="collage-hero-tile"${morphAttr(
                    heroItem.morph_id || 'cinema-bg',
                    false
                  )} data-pptx-dynamic-img="1" data-parallax="bg">
                    ${
                      heroArtUri
                        ? `<img src="${heroArtUri}" alt="" class="collage-hero-img"/>`
                        : ''
                    }
                    <div class="collage-hero-scrim"></div>
                    <div class="collage-hero-content">
                      ${
                        heroItem.tag
                          ? `<span class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                              heroItem.tag
                            )}</span>`
                          : ''
                      }
                      ${
                        heroItem.metric
                          ? `<div class="collage-hero-metric" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
                              heroItem.metric
                            )}</div>`
                          : ''
                      }
                      <h3 class="collage-hero-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                        heroItem.title
                      )}</h3>
                      ${
                        heroItem.body
                          ? `<p class="collage-hero-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                              heroItem.body
                            )}</p>`
                          : ''
                      }
                    </div>
                  </article>`
                : ''
            }
            <div class="collage-side-hairlines">
              ${restItems.map((it, idx) => renderFramelessPlinth(it, idx + 1, style)).join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 8. 开放式 5 维经纬标尺矩阵
    case 'bento-showcase-5': {
      const items = (slide.items || []).slice(0, 5);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="open-matrix-5">
            ${items.map((it, idx) => renderFramelessPlinth(it, idx, style)).join('')}
          </div>
        </div>
      `;
      break;
    }

    // 9. 50:50 无框出血画幅与开放式立柱叙事
    case 'split-media-50': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 4, 'portal-right');
      const items = (slide.items || []).slice(0, 3);
      bodyHtml = `
        <div class="layout-split-open-50">
          <div class="split-open-left">
            ${renderOpenHeader(slide)}
            <div class="open-vertical-list">
              ${items
                .map(
                  (it, i) => `<div class="open-list-row" data-pptx-border-host="1" data-stagger="${i + 2}">
                    <span class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">0${
                      i + 1
                    }</span>
                    <div>
                      <h3 class="plinth-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                        it.title
                      )}</h3>
                      ${
                        it.body
                          ? `<p class="plinth-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                              it.body
                            )}</p>`
                          : ''
                      }
                    </div>
                  </div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 10. 错版黄金分割页
    case 'split-golden-ratio': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 5, 'portal-left');
      const items = (slide.items || []).slice(0, 3);
      bodyHtml = `
        <div class="layout-golden-broken">
          <div class="golden-broken-right">
            ${renderOpenHeader(slide)}
            <div class="golden-open-stack">
              ${items.map((it, i) => renderFramelessPlinth(it, i, style)).join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 11. 建筑切口穿插画册页 (Architectural Cutout Cartouche — 100% 恒定高对比度、零劈字零隐没)
    case 'editorial-magazine': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 6, 'portal-left');
      const items = (slide.items || []).slice(0, 2);

      bodyHtml = `
        <div class="layout-editorial-interlock">
          <div class="interlock-cutout-cartouche" data-morph-id="cartouche-${index}" data-pptx-morph-box="1" data-box-kind="cartouche" data-parallax="fg">
            ${
              slide.eyebrow
                ? `<div class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
                    slide.eyebrow_morph_id
                  )}>${escapeHtml(slide.eyebrow)}</div>`
                : ''
            }
            <h2 class="interlock-headline" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )}>${renderRichHtml(slide.title || '')}</h2>
          </div>

          <div class="interlock-right-body">
            ${
              slide.subtitle
                ? `<p class="interlock-lead" data-pptx-border-host="1" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                    slide.subtitle
                  )}</p>`
                : ''
            }
            <div class="interlock-roman-cols">
              ${items
                .map((it, i) =>
                  renderFramelessPlinth(it, i, style, i === 0 ? 'I.' : 'II.')
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 12. 错落阶梯式开放三立柱
    case 'cards-3-staggered': {
      const items = (slide.items || []).slice(0, 3);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="open-staggered-3">
            ${items
              .map(
                (it, idx) => `<div class="stagger-col-offset offset-${idx}">
                  ${renderFramelessPlinth(it, idx, style)}
                </div>`
              )
              .join('')}
          </div>
        </div>
      `;
      break;
    }

    // 13. 超画幅推镜微距特写深潜页
    case 'focus-zoom-detail': {
      const zoomMedia: MediaAsset = {
        ...slide.media,
        morph_id: slide.container_morph_id || slide.media?.morph_id || 'cinema-bg',
      };
      portalUnderlay = renderArtPortal(zoomMedia, style, index + 7, 'pan-zoom-detail');
      const items = (slide.items || []).slice(0, 3);

      bodyHtml = `
        <div class="layout-zoom-anatomy">
          <div class="zoom-left-overlay">
            ${
              slide.eyebrow
                ? `<div class="eyebrow" style="color:#F8FAFC;opacity:0.9" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                    slide.eyebrow
                  )}</div>`
                : ''
            }
            <h2 class="zoom-overlay-title" data-pptx-text="1" data-pptx-role="title"${morphAttr(
              slide.title_morph_id
            )}>${renderRichHtml(slide.title || '')}</h2>
            ${
              slide.hero_metric
                ? `<div class="zoom-overlay-metric" data-pptx-border-host="1">
                    <div class="zoom-big-val" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
                      slide.hero_metric.value + (slide.hero_metric.unit || '')
                    )}</div>
                    <div class="zoom-val-label" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                      slide.hero_metric.label
                    )}</div>
                  </div>`
                : ''
            }
          </div>
          <div class="zoom-right-anatomy">
            ${
              slide.subtitle
                ? `<p class="zoom-lead-copy" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                    slide.subtitle
                  )}</p>`
                : ''
            }
            <div class="zoom-callouts-stack">
              ${items.map((it, i) => renderFramelessPlinth(it, i, style)).join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 14. 腕表刻度式时间轴
    case 'process-timeline': {
      const items = (slide.items || []).slice(0, 5);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="chronograph-timeline">
            <div class="chrono-axis" data-pptx-rule="1"${morphAttr(slide.container_morph_id)}></div>
            <div class="chrono-grid" style="grid-template-columns: repeat(${Math.max(
              items.length,
              1
            )}, 1fr)">
              ${items
                .map(
                  (it, i) => `<div class="chrono-step ${
                    it.accent ? 'chrono-active' : ''
                  }" data-stagger="${i + 2}">
                    <div class="chrono-tick-head">
                      <span class="chrono-dot" data-pptx-chrono-dot="1" data-active="${
                        it.accent ? '1' : '0'
                      }"></span>
                      <span class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                        it.tag || `0${i + 1}`
                      )}</span>
                    </div>
                    ${
                      it.metric
                        ? `<div class="plinth-metric" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
                            it.metric
                          )}</div>`
                        : ''
                    }
                    <h3 class="plinth-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                      it.title
                    )}</h3>
                    ${
                      it.body
                        ? `<p class="plinth-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                            it.body
                          )}</p>`
                        : ''
                    }
                  </div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 15. 工业精密拓扑架构全景页
    case 'architecture-flow': {
      const diagSvg = slide.diagram ? renderDiagramSvg(slide.diagram, style) : '';
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="open-diagram-canvas" data-pptx-diagram="1" data-stagger="2">
            ${diagSvg}
          </div>
        </div>
      `;
      break;
    }

    // 16. 战略二维象限页
    case 'quadrant-matrix': {
      const quadSvg = slide.quadrant ? renderQuadrantSvg(slide.quadrant, style) : '';
      const items = (slide.items || []).slice(0, 2);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="chart-open-grid">
            <div class="chart-open-insights">
              ${items.map((it, i) => renderFramelessPlinth(it, i, style)).join('')}
            </div>
            <div class="open-chart-canvas" data-pptx-border-host="1" data-pptx-quadrant-box="1" data-stagger="2">
              ${quadSvg}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 17. 明暗双极无框对撞场
    case 'comparison-versus': {
      const left = slide.items?.[0] || { title: '传统旧范式', body: '' };
      const right = slide.items?.[1] || { title: '新一代架构', body: '', accent: true };
      const extraLeft = (slide.items || []).filter((_, i) => i >= 2 && i % 2 === 0);
      const extraRight = (slide.items || []).filter((_, i) => i >= 2 && i % 2 === 1);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="chiaroscuro-versus" data-pptx-border-host="1">
            <div class="versus-pole pole-legacy" data-stagger="2">
              <div class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                left.tag || 'LEGACY PARADIGM'
              )}</div>
              ${
                left.metric
                  ? `<div class="versus-big-num muted-metric" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
                      left.metric
                    )}</div>`
                  : ''
              }
              <h3 class="versus-pole-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                left.title
              )}</h3>
              ${
                left.body
                  ? `<p class="plinth-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                      left.body
                    )}</p>`
                  : ''
              }
              ${extraLeft
                .map(
                  (it) => `<div class="versus-open-sub" data-pptx-border-host="1">
                    <strong data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                      it.title
                    )}</strong>
                    ${
                      it.body
                        ? `<p data-pptx-text="1" data-pptx-role="body">${renderRichHtml(it.body)}</p>`
                        : ''
                    }
                  </div>`
                )
                .join('')}
            </div>

            <div class="versus-divider-slash" data-pptx-rule="1"></div>

            <div class="versus-pole pole-modern"${morphAttr(
              right.morph_id,
              false
            )} data-stagger="3">
              <div class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                right.tag || 'BREAKTHROUGH ARCHITECTURE'
              )}</div>
              ${
                right.metric
                  ? `<div class="versus-big-num" data-pptx-text="1" data-pptx-role="metric">${escapeHtml(
                      right.metric
                    )}</div>`
                  : ''
              }
              <h3 class="versus-pole-title" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                right.title
              )}</h3>
              ${
                right.body
                  ? `<p class="plinth-body" data-pptx-text="1" data-pptx-role="body">${renderRichHtml(
                      right.body
                    )}</p>`
                  : ''
              }
              ${extraRight
                .map(
                  (it) => `<div class="versus-open-sub" data-pptx-border-host="1">
                    <strong data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                      it.title
                    )}</strong>
                    ${
                      it.body
                        ? `<p data-pptx-text="1" data-pptx-role="body">${renderRichHtml(it.body)}</p>`
                        : ''
                    }
                  </div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 18. 无框高信噪比统计图表聚光页（标记 data-pptx-chart-box="1" 供 PPTX 生成真原生可编辑 Excel 图表！）
    case 'chart-spotlight': {
      const chartSvg = slide.chart ? renderChartSvg(slide.chart, style, `s${index}`) : '';
      const sideItems = (slide.items || []).slice(0, 2);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="chart-open-grid ${sideItems.length === 0 ? 'chart-full-width' : ''}">
            ${
              sideItems.length > 0
                ? `<div class="chart-open-insights">
                    ${sideItems.map((it, i) => renderFramelessPlinth(it, i, style)).join('')}
                  </div>`
                : ''
            }
            <div class="open-chart-canvas" data-pptx-border-host="1" data-stagger="2">
              ${
                slide.chart?.callout
                  ? `<div class="chart-open-callout" data-pptx-border-host="1" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                      slide.chart.callout
                    )}</div>`
                  : ''
              }
              <div class="chart-canvas-holder" data-pptx-chart-box="1">${chartSvg}</div>
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 19. 顶刊双栏数学推导页（标记 data-pptx-formula-box="1" 作为独立可拖拽高清透明图层插入 PPTX！）
    case 'academic-paper-2col': {
      const fb = slide.formula_block;
      const items = (slide.items || []).slice(0, 2);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="academic-open-2col">
            <div class="academic-left-derivation" data-pptx-border-host="1" data-stagger="2">
              ${
                fb?.title
                  ? `<div class="academic-box-head">
                      <span class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                        fb.title
                      )}</span>
                      ${
                        fb.equation_number
                          ? `<span class="eq-num" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                              fb.equation_number
                            )}</span>`
                          : ''
                      }
                    </div>`
                  : ''
              }
              <div class="formula-display-box" data-pptx-formula-box="1" data-formula-frame="1" data-latex="${escapeHtml(
                fb?.latex || ''
              )}" data-display="1">
                ${fb ? renderLatexToHtml(fb.latex, true) : ''}
              </div>
              ${
                fb?.symbols && fb.symbols.length > 0
                  ? `<div class="symbol-legend-list">
                      ${fb.symbols
                        .map(
                          (s) => `<div class="symbol-row">
                            <span class="symbol-math" data-pptx-formula-box="1" data-latex="${escapeHtml(
                              s.symbol
                            )}" data-display="0">${renderLatexToHtml(
                            s.symbol,
                            false
                          )}</span>
                            <span class="symbol-desc" data-pptx-text="1" data-pptx-role="body">${escapeHtml(
                              s.meaning
                            )}</span>
                          </div>`
                        )
                        .join('')}
                    </div>`
                  : ''
              }
            </div>
            <div class="academic-right-theorems">
              ${items.map((it, i) => renderFramelessPlinth(it, i, style)).join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 20. 顶刊纯净三线表页
    case 'three-line-table': {
      const tb = slide.table || { headers: [], rows: [] };
      const hiSet = new Set(tb.highlight_rows || []);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="open-table-wrap" data-stagger="2">
            ${
              tb.caption
                ? `<div class="table-caption" data-pptx-text="1" data-pptx-role="subtitle">${escapeHtml(
                    tb.caption
                  )}</div>`
                : ''
            }
            <table class="three-line-table" data-pptx-table="1">
              <thead>
                <tr>
                  ${tb.headers
                    .map(
                      (h, ci) =>
                        `<th style="text-align:${tb.align?.[ci] || (ci === 0 ? 'left' : 'center')}">${escapeHtml(
                          h
                        )}</th>`
                    )
                    .join('')}
                </tr>
              </thead>
              <tbody>
                ${tb.rows
                  .map(
                    (row, ri) => `<tr class="${hiSet.has(ri) ? 'row-sota-highlight' : ''}">
                      ${row
                        .map(
                          (cell, ci) =>
                            `<td style="text-align:${
                              tb.align?.[ci] || (ci === 0 ? 'left' : 'center')
                            }">${renderRichHtml(cell)}</td>`
                        )
                        .join('')}
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
            ${
              tb.footnote
                ? `<div class="table-footnote" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                    tb.footnote
                  )}</div>`
                : ''
            }
          </div>
        </div>
      `;
      break;
    }

    // 21. 美术馆策展金句页
    case 'quote-manifesto': {
      portalUnderlay = renderArtPortal(slide.media, style, index + 8, 'vertical-slit');
      const q = slide.quote || {
        text: slide.title || '',
        author: slide.subtitle || '',
      };
      const quotePx = computeAdaptiveTitlePx(q.text, 'statement');
      bodyHtml = `
        <div class="layout-quote-v2">
          <div class="quote-mark-svg" data-pptx-decor-quote="1" aria-hidden="true">“</div>
          <blockquote class="manifesto-quote-text" style="font-size:${quotePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(q.text)}</blockquote>
          <div class="cover-v2-offgrid-line" data-pptx-rule="1"></div>
          <div class="quote-attribution" data-stagger="2">
            <span class="quote-author" data-pptx-text="1" data-pptx-role="subtitle">${escapeHtml(
              '— ' + q.author
            )}</span>
            ${
              q.role
                ? `<span class="quote-role" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                    q.role
                  )}</span>`
                : ''
            }
          </div>
        </div>
      `;
      break;
    }

    // 22. 极客无框分栏代码切片页
    case 'code-architecture': {
      const cb = slide.code_block || { language: 'ts', code: '' };
      const hiLines = new Set(cb.highlight_lines || []);
      const lines = cb.code.split('\n');
      const items = (slide.items || []).slice(0, 2);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="code-arch-grid">
            <div class="code-window" data-pptx-code-window="1" data-stagger="2">
              <div class="code-window-bar">
                <div class="code-dots"><span></span><span></span><span></span></div>
                <span class="code-lang-tag" data-pptx-text="1" data-pptx-role="caption">${escapeHtml(
                  cb.caption || cb.language.toUpperCase()
                )}</span>
              </div>
              <pre class="code-pre" data-pptx-text="1" data-pptx-role="code"><code>${lines
                .map(
                  (ln, li) =>
                    `<span class="code-line ${
                      hiLines.has(li + 1) ? 'line-hl' : ''
                    }" data-hl-line="${hiLines.has(li + 1) ? '1' : '0'}">${escapeHtml(
                      ln || ' '
                    )}</span>`
                )
                .join('\n')}</code></pre>
            </div>
            <div class="code-open-notes">
              ${items.map((it, i) => renderFramelessPlinth(it, i, style)).join('')}
            </div>
          </div>
        </div>
      `;
      break;
    }

    // 23. 开放式建筑经线四阶段路线图
    case 'roadmap-milestones': {
      const items = (slide.items || []).slice(0, 4);
      bodyHtml = `
        <div class="layout-standard">
          ${renderOpenHeader(slide)}
          <div class="open-roadmap-columns" style="grid-template-columns: repeat(${Math.max(
            items.length,
            1
          )}, 1fr)">
            ${items.map((it, idx) => renderFramelessPlinth(it, idx, style)).join('')}
          </div>
        </div>
      `;
      break;
    }

    // 24. 全出血光影余韵收尾页
    case 'closing-beacon':
    default: {
      portalUnderlay = renderArtPortal(
        slide.media,
        style,
        index + 9,
        'full-bleed-right-subject'
      );
      const titlePx = computeAdaptiveTitlePx(slide.title || 'Thank You.', 'cover');
      const items = (slide.items || []).slice(0, 3);
      bodyHtml = `
        <div class="layout-closing-v2">
          ${
            slide.eyebrow
              ? `<div class="eyebrow" data-pptx-text="1" data-pptx-role="eyebrow"${morphAttr(
                  slide.eyebrow_morph_id
                )}>${escapeHtml(slide.eyebrow)}</div>`
              : ''
          }
          <h2 class="closing-v2-title" style="font-size:${titlePx}px" data-pptx-text="1" data-pptx-role="title"${morphAttr(
        slide.title_morph_id
      )} data-parallax="fg">${renderRichHtml(slide.title || 'Thank You.')}</h2>
          <div class="cover-v2-offgrid-line" data-pptx-rule="1"></div>
          ${
            slide.subtitle
              ? `<p class="cover-v2-sub" data-pptx-text="1" data-pptx-role="subtitle">${renderRichHtml(
                  slide.subtitle
                )}</p>`
              : ''
          }
          ${
            items.length > 0
              ? `<div class="closing-open-meta" data-pptx-border-host="1" data-stagger="3">
                  ${items
                    .map(
                      (it) => `<div class="closing-meta-col">
                        <span class="plinth-num" data-pptx-text="1" data-pptx-role="eyebrow">${escapeHtml(
                          it.tag || it.title
                        )}</span>
                        ${
                          it.body
                            ? `<span class="closing-meta-val" data-pptx-text="1" data-pptx-role="body">${escapeHtml(
                                it.body
                              )}</span>`
                            : ''
                        }
                      </div>`
                    )
                    .join('')}
                </div>`
              : ''
          }
        </div>
      `;
      break;
    }
  }

  return `<section class="slide-frame variant-${variant}" id="slide-${index}" data-slide-index="${index}" data-slide-id="${escapeHtml(
    slide.id
  )}" data-archetype="${slide.archetype}" data-transition="${
    slide.transition || 'auto'
  }" data-notes="${escapeHtml(slide.notes || '')}">
    <div class="slide-atmosphere">${atmosphereSvg}</div>
    ${avantDecor}
    ${portalUnderlay}
    <div class="slide-inner">
      ${chromeTop}
      <div class="slide-body">${bodyHtml}</div>
      ${footnoteHtml}
    </div>
    ${overlapNoteHtml}
  </section>`;
}
