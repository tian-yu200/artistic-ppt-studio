/**
 * 轨道 A：Web Cinema HTML v2.0 编译器
 * 内置三大电影级转场通道：
 * 1. 共享 data-morph-id 元素跨页 FLIP 弹簧补间运镜（支持画窗穿梭变形）
 * 2. 艺术画窗 clip-path 画帘遮罩擦除 + 内部真图呼吸落位 (Curtain Portal Reveal)
 * 3. 前/中/后三层 Z 轴不同速率视差横摇 (3-Layer Parallax Pan)
 */
import type { SlideDeckIR } from '../types/ir.js';
import { ALL_STYLE_PACKS, getStylePack } from '../styles/index.js';
import { renderSlideHtml } from '../engine/archetypes.js';
import { escapeHtml, stripRichMarkers } from '../utils/typography.js';
import { buildMasterStylesheet } from './html-styles.js';

export interface HtmlCompileOptions {
  slideFontScales?: Record<number, number>;
}

export function compileDeckToHtml(
  deck: SlideDeckIR,
  options: HtmlCompileOptions = {}
): string {
  const activeStyle = getStylePack(deck.meta.style_id, deck.meta.accent_override);
  const hasMath = deck.slides.some(
    (s) =>
      Boolean(s.formula_block) ||
      s.items?.some(
        (it) =>
          Boolean(it.formula) ||
          Boolean(it.body && it.body.includes('$')) ||
          Boolean(it.title && it.title.includes('$'))
      ) ||
      (s.title && s.title.includes('$')) ||
      (s.subtitle && s.subtitle.includes('$'))
  );

  const cssText = buildMasterStylesheet(activeStyle, Boolean(hasMath));
  const total = deck.slides.length;

  const slidesMarkup = deck.slides
    .map((slide, index) => {
      const raw = renderSlideHtml({
        meta: deck.meta,
        style: activeStyle,
        slide,
        index,
        total,
      });
      const scale = options.slideFontScales?.[index];
      if (scale && scale !== 1) {
        return raw.replace(
          `id="slide-${index}"`,
          `id="slide-${index}" style="--slide-font-scale:${scale.toFixed(3)}"`
        );
      }
      return raw;
    })
    .join('\n');

  const overviewItemsMarkup = deck.slides
    .map(
      (s, i) => `<div class="overview-item" data-goto="${i}">
        <div style="font-family:var(--font-mono);font-size:12px;color:#94A3B8;margin-bottom:6px">SLIDE ${String(
          i + 1
        ).padStart(2, '0')} · ${escapeHtml(s.archetype)}</div>
        <div style="font-weight:700;font-size:16px;line-height:1.35">${escapeHtml(
          stripRichMarkers(s.title || s.quote?.text || deck.meta.title)
        )}</div>
      </div>`
    )
    .join('');

  const themeChipsMarkup = ALL_STYLE_PACKS.map(
    (sp) => `<div class="theme-chip ${
      sp.id === activeStyle.id ? 'active' : ''
    }" data-set-theme="${sp.id}" data-theme-cat="${sp.category}" style="background:${
      sp.palette.bg_primary
    };color:${sp.palette.text_primary}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:15px">${escapeHtml(sp.name_zh)}</strong>
        <span style="width:14px;height:14px;border-radius:50%;background:${sp.palette.accent}"></span>
      </div>
      <span style="font-size:12px;opacity:0.72">${escapeHtml(sp.name)}</span>
    </div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="${deck.meta.locale || 'zh-CN'}" data-theme="${activeStyle.id}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(stripRichMarkers(deck.meta.title))}</title>
  <style>${cssText}</style>
</head>
<body>
  <svg width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true">
    <defs>
      <filter id="global-film-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
  </svg>

  <main class="viewport-shell">
    <div class="deck-stage" id="deck-stage">
      ${slidesMarkup}
    </div>
  </main>

  <div class="deck-progress-bar" id="progress-bar"></div>

  <nav class="deck-hud" aria-label="Presentation Controls">
    <button class="hud-btn" id="btn-prev" title="上一页 (←)">◀</button>
    <span id="hud-counter">01 / ${String(total).padStart(2, '0')}</span>
    <button class="hud-btn" id="btn-next" title="下一页 (→)">▶</button>
    <span style="opacity:0.3">|</span>
    <button class="hud-btn" id="btn-overview" title="全局鸟瞰 (O)">Grid</button>
    <button class="hud-btn" id="btn-theme" title="实时切换艺术风格 (T)">Style</button>
    <button class="hud-btn" id="btn-notes" title="演讲者备注与计时器 (S)">Notes</button>
    <button class="hud-btn" id="btn-laser" title="激光笔 (L)">Laser</button>
    <button class="hud-btn" id="btn-fs" title="全屏 (F)">⛶</button>
  </nav>

  <aside class="overview-drawer" id="overview-drawer">
    <div class="drawer-header">
      <h2>全局分镜鸟瞰 (按 Esc 关闭)</h2>
      <button class="hud-btn" id="close-overview" style="font-size:16px">✕</button>
    </div>
    <div class="overview-grid">${overviewItemsMarkup}</div>
  </aside>

  <aside class="theme-drawer" id="theme-drawer">
    <div class="drawer-header">
      <h2>实时切换 12 大艺术风格包 (Show, Don't Tell)</h2>
      <button class="hud-btn" id="close-theme" style="font-size:16px">✕</button>
    </div>
    <div class="theme-grid">${themeChipsMarkup}</div>
  </aside>

  <aside class="speaker-panel" id="speaker-panel">
    <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:12px;color:#38BDF8;margin-bottom:8px">
      <span>SPEAKER TELEPROMPTER</span>
      <span id="speaker-timer">00:00</span>
    </div>
    <div id="speaker-notes-body" style="font-size:14.5px;line-height:1.6;color:#E2E8F0"></div>
  </aside>

  <div class="laser-dot" id="laser-dot"></div>

  <script>
  (function() {
    const params = new URLSearchParams(window.location.search);
    const isHeadless = params.get('headless') === '1';
    if (isHeadless) document.body.classList.add('headless-mode');

    const stage = document.getElementById('deck-stage');
    const slides = Array.from(document.querySelectorAll('.slide-frame'));
    const total = slides.length;
    let current = Math.max(0, Math.min(total - 1, Number(params.get('slide') || 0)));
    let currentScale = 1;

    function fitStage() {
      if (isHeadless) {
        currentScale = 1;
        document.documentElement.style.setProperty('--stage-scale', '1');
        return;
      }
      const sx = window.innerWidth / 1920;
      const sy = window.innerHeight / 1080;
      currentScale = Math.min(sx, sy);
      document.documentElement.style.setProperty('--stage-scale', String(currentScale));
    }
    window.addEventListener('resize', fitStage);
    fitStage();

    function captureMorphMap(slideEl) {
      const map = new Map();
      if (!slideEl) return map;
      const stageRect = stage.getBoundingClientRect();
      slideEl.querySelectorAll('[data-morph-id]').forEach((el) => {
        const id = el.getAttribute('data-morph-id');
        if (!id) return;
        const r = el.getBoundingClientRect();
        map.set(id, {
          x: (r.left - stageRect.left) / currentScale,
          y: (r.top - stageRect.top) / currentScale,
          w: r.width / currentScale,
          h: r.height / currentScale
        });
      });
      return map;
    }

    function updateChrome() {
      const pct = total <= 1 ? 100 : ((current + 1) / total) * 100;
      document.getElementById('progress-bar').style.width = pct + '%';
      document.getElementById('hud-counter').textContent =
        String(current + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
      const notes = slides[current].getAttribute('data-notes') || '（本页无额外备注）';
      document.getElementById('speaker-notes-body').textContent = notes;
      document.querySelectorAll('.overview-item').forEach((item, idx) => {
        item.classList.toggle('active', idx === current);
      });
    }

    function goToSlide(nextIdx, instant) {
      if (nextIdx < 0 || nextIdx >= total) return;
      const dir = nextIdx >= current ? 1 : -1;
      const prevSlide = slides[current];
      const nextSlide = slides[nextIdx];
      const firstBoxes = (!instant && !isHeadless && prevSlide !== nextSlide)
        ? captureMorphMap(prevSlide)
        : new Map();

      slides.forEach((s, idx) => s.classList.toggle('is-active', idx === nextIdx));
      current = nextIdx;
      updateChrome();

      if (instant || isHeadless || prevSlide === nextSlide) return;

      const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)';
      const dur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dur-ms')) || 960;

      // 通道 1：跨页共享元素 FLIP 空间穿梭 (画窗变形 & 标题焦点追踪)
      const lastBoxes = captureMorphMap(nextSlide);
      const morphedSet = new Set();

      lastBoxes.forEach((last, id) => {
        const first = firstBoxes.get(id);
        if (!first || last.w < 2 || last.h < 2) return;
        const targetEl = nextSlide.querySelector('[data-morph-id="' + CSS.escape(id) + '"]');
        if (!targetEl) return;
        morphedSet.add(targetEl);
        const dx = first.x - last.x;
        const dy = first.y - last.y;
        const sw = first.w / last.w;
        const sh = first.h / last.h;
        targetEl.style.transformOrigin = 'top left';
        targetEl.animate([
          { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + sw + ', ' + sh + ')' },
          { transform: 'translate(0, 0) scale(1, 1)' }
        ], { duration: dur, easing });
      });

      // 通道 2：未命中 Morph 的艺术画窗执行画帘遮罩擦除 + 内部图像微缩放呼吸
      nextSlide.querySelectorAll('.art-portal').forEach((portal) => {
        if (morphedSet.has(portal)) {
          const innerImg = portal.querySelector('.portal-img');
          if (innerImg) {
            innerImg.animate([
              { filter: 'brightness(0.88)' },
              { filter: 'brightness(1)' }
            ], { duration: dur, easing });
          }
          return;
        }
        portal.animate([
          { clipPath: dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
          { clipPath: 'inset(0 0% 0 0%)' }
        ], { duration: Math.round(dur * 1.05), easing });
        const img = portal.querySelector('.portal-img');
        if (img) {
          img.animate([
            { transform: 'scale(1.22)' },
            { transform: getComputedStyle(img).transform === 'none' ? 'scale(1)' : getComputedStyle(img).transform }
          ], { duration: Math.round(dur * 1.15), easing });
        }
      });

      // 通道 3：克制防眩晕视差呼吸（主静辅微动，杜绝大礼堂晕动症）
      nextSlide.querySelectorAll('[data-parallax]').forEach((el) => {
        if (morphedSet.has(el)) return;
        const layer = el.getAttribute('data-parallax');
        const shiftPx = layer === 'mid' ? 42 * dir : layer === 'fg' ? 26 * dir : 14 * dir;
        el.animate([
          { opacity: layer === 'mid' ? 0 : 0.25, transform: 'translateX(' + shiftPx + 'px)' },
          { opacity: layer === 'mid' ? 0.038 : 1, transform: 'translateX(0)' }
        ], { duration: Math.round(dur * 0.85), easing });
      });

      // 通道 4：开放式建筑立柱阶梯浮现
      nextSlide.querySelectorAll('[data-stagger]').forEach((el) => {
        if (morphedSet.has(el) || el.hasAttribute('data-parallax')) return;
        const step = Number(el.getAttribute('data-stagger') || 1);
        el.animate([
          { opacity: 0, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], {
          duration: Math.round(dur * 0.8),
          delay: step * 75,
          easing,
          fill: 'both'
        });
      });
    }

    window.__deckGoTo = function(idx) { goToSlide(idx, true); };
    goToSlide(current, true);

    const overviewDrawer = document.getElementById('overview-drawer');
    const themeDrawer = document.getElementById('theme-drawer');
    const speakerPanel = document.getElementById('speaker-panel');
    const laserDot = document.getElementById('laser-dot');
    let laserOn = false;

    document.getElementById('btn-prev').onclick = () => goToSlide(current - 1, false);
    document.getElementById('btn-next').onclick = () => goToSlide(current + 1, false);
    document.getElementById('btn-overview').onclick = () => overviewDrawer.classList.toggle('open');
    document.getElementById('close-overview').onclick = () => overviewDrawer.classList.remove('open');
    document.getElementById('btn-theme').onclick = () => themeDrawer.classList.toggle('open');
    document.getElementById('close-theme').onclick = () => themeDrawer.classList.remove('open');
    document.getElementById('btn-notes').onclick = () => speakerPanel.classList.toggle('open');
    document.getElementById('btn-laser').onclick = () => {
      laserOn = !laserOn;
      laserDot.classList.toggle('active', laserOn);
    };
    document.getElementById('btn-fs').onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    };

    document.querySelectorAll('[data-goto]').forEach((el) => {
      el.addEventListener('click', () => {
        overviewDrawer.classList.remove('open');
        goToSlide(Number(el.getAttribute('data-goto')), false);
      });
    });

    const initialDark = '${activeStyle.category}' === 'dark';
    document.querySelectorAll('[data-set-theme]').forEach((el) => {
      el.addEventListener('click', () => {
        const tid = el.getAttribute('data-set-theme');
        const targetDark = el.getAttribute('data-theme-cat') === 'dark';
        document.documentElement.setAttribute('data-theme', tid);
        document.querySelectorAll('.portal-img').forEach((img) => {
          img.style.filter = (initialDark !== targetDark)
            ? 'contrast(0.95) brightness(' + (targetDark ? '0.78' : '1.06') + ')'
            : 'none';
        });
        document.querySelectorAll('.theme-chip').forEach((c) =>
          c.classList.toggle('active', c.getAttribute('data-set-theme') === tid)
        );
        themeDrawer.classList.remove('open');
      });
    });

    // 触屏设备（手机 / iPad / 触控笔记本）左右滑动翻页支持
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      if (overviewDrawer.classList.contains('open') || themeDrawer.classList.contains('open')) return;
      if (e.target && e.target.closest && e.target.closest('.deck-hud, .speaker-panel')) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!touchStartX || !e.changedTouches || e.changedTouches.length !== 1) return;
      if (overviewDrawer.classList.contains('open') || themeDrawer.classList.contains('open')) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      touchStartX = 0;
      touchStartY = 0;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) goToSlide(current + 1, false);
        else goToSlide(current - 1, false);
      }
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (!laserOn) return;
      laserDot.style.left = e.clientX + 'px';
      laserDot.style.top = e.clientY + 'px';
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overviewDrawer.classList.remove('open');
        themeDrawer.classList.remove('open');
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToSlide(current + 1, false);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToSlide(current - 1, false);
      } else if (e.key === 'o' || e.key === 'O') {
        overviewDrawer.classList.toggle('open');
      } else if (e.key === 't' || e.key === 'T') {
        themeDrawer.classList.toggle('open');
      } else if (e.key === 's' || e.key === 'S') {
        speakerPanel.classList.toggle('open');
      } else if (e.key === 'l' || e.key === 'L') {
        laserOn = !laserOn;
        laserDot.classList.toggle('active', laserOn);
      } else if (e.key === 'f' || e.key === 'F') {
        document.getElementById('btn-fs').click();
      }
    });

    const startTs = Date.now();
    setInterval(() => {
      const sec = Math.floor((Date.now() - startTs) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      document.getElementById('speaker-timer').textContent = m + ':' + s;
    }, 1000);
  })();
  </script>
</body>
</html>`;
}
