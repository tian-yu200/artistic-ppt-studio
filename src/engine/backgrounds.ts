/**
 * 程序化三维空间光场背景与博物馆级艺术插画引擎 v3.1 (CSS Variable Reactive Atmosphere)
 * 关键升级：全部 SVG 渐变停靠点、标尺线与聚光束均绑定 CSS 变量 (--accent, --accent-secondary, --border-color, --cyber-beam-opacity)，
 * 当用户在浏览器按下 T 键实时切换任意明暗主题时，背景光场 0ms 无感自适应重绘，彻底杜绝赛博霓虹串味！
 */
import type { ArtMotifType, BackgroundVariant, StylePack } from '../types/ir.js';
import { isDarkColor, mixColors, withAlpha } from '../utils/color.js';

export function renderSlideAtmosphere(
  style: StylePack,
  variant: BackgroundVariant = 'default',
  slideIndex = 0
): string {
  const p = style.palette;
  const uid = `atm-${style.id}-${slideIndex}`;
  const isInverted = variant === 'inverted';
  const baseBg = isInverted
    ? p.bg_inverted
    : variant === 'accent-wash'
    ? mixColors(p.bg_primary, p.accent, isDarkColor(p.bg_primary) ? 0.14 : 0.08)
    : p.bg_primary;

  const shiftX = ((slideIndex * 210) % 720) - 360;
  const shiftY = ((slideIndex * 130) % 360) - 180;

  let decorSvg = '';

  if (variant !== 'minimal') {
    switch (style.atmosphere.pattern) {
      case 'oled-radial-bloom': {
        const cx1 = 960 + shiftX * 0.8;
        const cy1 = 360 + shiftY * 0.6;
        const cx2 = 1480 - shiftX * 0.5;
        const cy2 = 840 - shiftY * 0.4;
        decorSvg = `
          <defs>
            <radialGradient id="${uid}-g1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="${
          variant === 'spotlight' ? '0.24' : '0.15'
        }"/>
              <stop offset="55%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.04"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="${uid}-g2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0.13"/>
              <stop offset="65%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0.02"/>
              <stop offset="100%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <ellipse cx="${cx1}" cy="${cy1}" rx="780" ry="520" fill="url(#${uid}-g1)"/>
          <ellipse cx="${cx2}" cy="${cy2}" rx="680" ry="460" fill="url(#${uid}-g2)"/>
          <path d="M -100 ${920 - (slideIndex % 3) * 40} Q 960 ${
          620 + (slideIndex % 2) * 80
        } 2020 880" fill="none" stroke="${withAlpha(p.text_primary, 0.05)}" style="stroke:var(--border-color)" stroke-width="1"/>
        `;
        break;
      }

      case 'aurora-mesh': {
        decorSvg = `
          <defs>
            <radialGradient id="${uid}-a1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.17"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="${uid}-a2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0.13"/>
              <stop offset="100%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="${uid}-a3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${p.accent_tertiary}" style="stop-color:var(--accent-tertiary)" stop-opacity="0.14"/>
              <stop offset="100%" stop-color="${p.accent_tertiary}" style="stop-color:var(--accent-tertiary)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="${380 + shiftX * 0.5}" cy="${240 + shiftY * 0.4}" r="620" fill="url(#${uid}-a1)"/>
          <circle cx="${1560 - shiftX * 0.4}" cy="${280 - shiftY * 0.3}" r="560" fill="url(#${uid}-a2)"/>
          <circle cx="${1180 + shiftX * 0.3}" cy="${900 + shiftY * 0.3}" r="640" fill="url(#${uid}-a3)"/>
        `;
        break;
      }

      case 'precision-grid': {
        decorSvg = `
          <defs>
            <pattern id="${uid}-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="${withAlpha(p.text_primary, 0.05)}" style="stroke:var(--border-color)" stroke-width="1"/>
            </pattern>
            <radialGradient id="${uid}-mask-grad" cx="50%" cy="42%" r="58%">
              <stop offset="0%" stop-color="white" stop-opacity="1"/>
              <stop offset="75%" stop-color="white" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="white" stop-opacity="0"/>
            </radialGradient>
            <mask id="${uid}-grid-mask">
              <rect width="1920" height="1080" fill="url(#${uid}-mask-grad)"/>
            </mask>
            <radialGradient id="${uid}-glow" cx="50%" cy="0%" r="60%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#${uid}-glow)"/>
          <rect width="1920" height="1080" fill="url(#${uid}-grid)" mask="url(#${uid}-grid-mask)"/>
        `;
        break;
      }

      case 'cyber-stage-beams': {
        decorSvg = `
          <defs>
            <linearGradient id="${uid}-beam1" x1="30%" y1="0%" x2="55%" y2="100%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.20"/>
              <stop offset="75%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.03"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${uid}-beam2" x1="75%" y1="0%" x2="45%" y2="100%">
              <stop offset="0%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0.14"/>
              <stop offset="80%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <g style="opacity:var(--cyber-beam-opacity)">
            <polygon points="420,0 820,0 1320,1080 120,1080" fill="url(#${uid}-beam1)"/>
            <polygon points="1180,0 1520,0 1820,1080 680,1080" fill="url(#${uid}-beam2)"/>
          </g>
          <line x1="0" y1="930" x2="1920" y2="930" stroke="${withAlpha(p.accent, 0.14)}" style="stroke:var(--border-color)" stroke-width="1"/>
          <line x1="0" y1="985" x2="1920" y2="985" stroke="${withAlpha(p.accent, 0.08)}" style="stroke:var(--border-color)" stroke-width="1"/>
        `;
        break;
      }

      case 'oriental-wash': {
        decorSvg = `
          <defs>
            <radialGradient id="${uid}-mist" cx="78%" cy="24%" r="52%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#${uid}-mist)"/>
          <path d="M 0 915 Q 380 810 820 880 T 1560 830 T 1920 885 L 1920 1080 L 0 1080 Z" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="${
          isInverted ? '0.15' : '0.055'
        }"/>
          <path d="M 0 960 Q 540 880 1040 940 T 1920 910 L 1920 1080 L 0 1080 Z" fill="${p.text_primary}" style="fill:var(--text-primary)" fill-opacity="${
          isInverted ? '0.11' : '0.035'
        }"/>
          <rect x="56" y="48" width="1808" height="984" fill="none" stroke="${withAlpha(p.text_primary, 0.075)}" style="stroke:var(--border-color)" stroke-width="1"/>
        `;
        break;
      }

      case 'editorial-paper': {
        decorSvg = `
          <defs>
            <radialGradient id="${uid}-warm" cx="82%" cy="18%" r="55%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.07"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#${uid}-warm)"/>
          <line x1="96" y1="84" x2="1824" y2="84" stroke="${withAlpha(p.text_primary, 0.09)}" style="stroke:var(--border-color)" stroke-width="1"/>
          <line x1="96" y1="996" x2="1824" y2="996" stroke="${withAlpha(p.text_primary, 0.09)}" style="stroke:var(--border-color)" stroke-width="1"/>
        `;
        break;
      }

      case 'swiss-crosshair': {
        let crosses = '';
        for (const x of [120, 680, 1240, 1800]) {
          for (const y of [96, 540, 984]) {
            crosses += `<path d="M ${x - 6} ${y} H ${x + 6} M ${x} ${y - 6} V ${y + 6}" stroke="${p.text_muted}" style="stroke:var(--text-muted)" stroke-opacity="0.32" stroke-width="1.2"/>`;
          }
        }
        decorSvg = `
          <line x1="680" y1="0" x2="680" y2="1080" stroke="${withAlpha(p.text_primary, 0.065)}" style="stroke:var(--border-color)" stroke-width="1"/>
          <line x1="1240" y1="0" x2="1240" y2="1080" stroke="${withAlpha(p.text_primary, 0.065)}" style="stroke:var(--border-color)" stroke-width="1"/>
          <line x1="0" y1="96" x2="1920" y2="96" stroke="${withAlpha(p.text_primary, 0.065)}" style="stroke:var(--border-color)" stroke-width="1"/>
          <line x1="0" y1="984" x2="1920" y2="984" stroke="${withAlpha(p.text_primary, 0.065)}" style="stroke:var(--border-color)" stroke-width="1"/>
          ${crosses}
        `;
        break;
      }

      case 'brutal-halftone': {
        decorSvg = `
          <defs>
            <pattern id="${uid}-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.4" fill="${p.text_muted}" style="fill:var(--text-muted)" fill-opacity="0.22"/>
            </pattern>
          </defs>
          <rect width="1920" height="1080" fill="url(#${uid}-dots)"/>
          <circle cx="1760" cy="140" r="220" fill="none" stroke="${p.accent}" style="stroke:var(--accent)" stroke-opacity="0.22" stroke-width="2" stroke-dasharray="8 8"/>
        `;
        break;
      }

      case 'executive-clean': {
        decorSvg = `
          <rect x="0" y="0" width="1920" height="6" fill="${p.accent}" style="fill:var(--accent)"/>
          <line x1="112" y1="992" x2="1808" y2="992" stroke="${withAlpha(p.text_primary, 0.09)}" style="stroke:var(--border-color)" stroke-width="1"/>
        `;
        break;
      }

      case 'academic-rule': {
        decorSvg = `
          <rect x="0" y="0" width="1920" height="5" fill="${p.accent}" style="fill:var(--accent)"/>
          <line x1="104" y1="1000" x2="1816" y2="1000" stroke="${withAlpha(p.text_primary, 0.12)}" style="stroke:var(--border-color)" stroke-width="1"/>
        `;
        break;
      }

      case 'bauhaus-blueprint': {
        decorSvg = `
          <rect x="48" y="44" width="1824" height="992" rx="8" fill="none" stroke="${withAlpha(p.text_primary, 0.14)}" style="stroke:var(--border-color)" stroke-width="1.5"/>
          <circle cx="80" cy="76" r="5" fill="${p.accent}" style="fill:var(--accent)"/>
          <circle cx="1840" cy="76" r="5" fill="none" stroke="${withAlpha(p.text_primary, 0.2)}" style="stroke:var(--border-color)" stroke-width="1.5"/>
          <circle cx="80" cy="1004" r="5" fill="none" stroke="${withAlpha(p.text_primary, 0.2)}" style="stroke:var(--border-color)" stroke-width="1.5"/>
          <circle cx="1840" cy="1004" r="5" fill="none" stroke="${withAlpha(p.text_primary, 0.2)}" style="stroke:var(--border-color)" stroke-width="1.5"/>
        `;
        break;
      }

      case 'warm-grain':
      default: {
        decorSvg = `
          <defs>
            <radialGradient id="${uid}-wg" cx="20%" cy="15%" r="65%">
              <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#${uid}-wg)"/>
        `;
        break;
      }
    }
  }

  const grainLayer =
    style.atmosphere.noise_opacity > 0.01
      ? `<rect width="1920" height="1080" filter="url(#global-film-grain)" opacity="${style.atmosphere.noise_opacity}"/>`
      : '';

  return `<svg class="slide-bg-svg" viewBox="0 0 1920 1080" width="1920" height="1080" preserveAspectRatio="none" aria-hidden="true">
    <rect width="1920" height="1080" fill="${baseBg}" style="${
    variant === 'default' ? 'fill:var(--bg-primary)' : isInverted ? 'fill:var(--bg-inverted)' : ''
  }"/>
    ${decorSvg}
    ${grainLayer}
  </svg>`;
}

export function renderArtisticIllustration(
  motif: ArtMotifType | undefined,
  style: StylePack,
  seed = 1
): string {
  const chosen = !motif || motif === 'auto' ? style.atmosphere.default_motif : motif;
  const p = style.palette;
  const uid = `art-${chosen}-${seed}`;
  const dark = isDarkColor(p.bg_primary);
  const canvasBg = dark
    ? mixColors(p.bg_secondary, p.accent, 0.08)
    : mixColors(p.bg_secondary, p.accent, 0.06);
  const strokeMain = withAlpha(p.text_primary, dark ? 0.25 : 0.18);

  let body = '';

  switch (chosen) {
    case 'silicon-wafer':
      body = `
        <defs>
          <radialGradient id="${uid}-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0.55"/>
            <stop offset="50%" stop-color="${p.accent_secondary}" style="stop-color:var(--accent-secondary)" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="${p.accent}" style="stop-color:var(--accent)" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="400" cy="300" r="240" fill="url(#${uid}-core)"/>
        <circle cx="400" cy="300" r="210" fill="none" stroke="${strokeMain}" style="stroke:var(--border-color)" stroke-width="1"/>
        <circle cx="400" cy="300" r="155" fill="none" stroke="${p.accent}" style="stroke:var(--accent)" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="6 6"/>
        <rect x="290" y="190" width="220" height="220" rx="28" fill="${p.bg_primary}" style="fill:var(--bg-primary)" fill-opacity="0.78" stroke="${p.accent}" style="stroke:var(--accent)" stroke-width="2"/>
        <circle cx="400" cy="300" r="26" fill="${p.accent}" style="fill:var(--accent)"/>
      `;
      break;

    case 'editorial-sculpture':
      body = `
        <rect x="150" y="70" width="320" height="460" rx="160" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="0.16" stroke="${p.accent}" stroke-width="1.5"/>
        <circle cx="490" cy="210" r="115" fill="${p.accent}" style="fill:var(--accent)"/>
        <path d="M 230 530 C 230 340, 570 340, 570 530 Z" fill="${p.text_primary}" style="fill:var(--text-primary)" fill-opacity="0.86"/>
      `;
      break;

    case 'oriental-landscape':
      body = `
        <path d="M 40 430 Q 210 250 380 370 T 760 310 L 760 560 L 40 560 Z" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="0.28"/>
        <path d="M 40 485 Q 290 355 510 445 T 760 400 L 760 560 L 40 560 Z" fill="${p.accent}" style="fill:var(--accent)" fill-opacity="0.52"/>
        <path d="M 40 525 Q 360 445 760 510 L 760 560 L 40 560 Z" fill="${p.text_primary}" style="fill:var(--text-primary)" fill-opacity="0.72"/>
      `;
      break;

    case 'swiss-construct':
      body = `
        <rect x="110" y="80" width="260" height="260" fill="${p.accent}" style="fill:var(--accent)"/>
        <circle cx="510" cy="340" r="160" fill="${p.text_primary}" style="fill:var(--text-primary)"/>
        <circle cx="510" cy="340" r="85" fill="${canvasBg}" style="fill:var(--bg-secondary)"/>
        <line x1="110" y1="480" x2="690" y2="120" stroke="${p.accent}" style="stroke:var(--accent)" stroke-width="4"/>
      `;
      break;

    case 'bauhaus-blocks':
      body = `
        <rect x="120" y="90" width="240" height="420" rx="12" fill="${p.text_primary}" style="fill:var(--text-primary)"/>
        <circle cx="240" cy="210" r="76" fill="${p.accent}" style="fill:var(--accent)"/>
        <rect x="390" y="90" width="290" height="200" rx="12" fill="${p.accent}" style="fill:var(--accent)"/>
        <circle cx="535" cy="410" r="56" fill="${p.accent_secondary}" style="fill:var(--accent-secondary)"/>
      `;
      break;

    case 'orbital-rings':
      body = `
        <ellipse cx="400" cy="300" rx="290" ry="110" transform="rotate(-18 400 300)" fill="none" stroke="${p.accent}" style="stroke:var(--accent)" stroke-width="2"/>
        <ellipse cx="400" cy="300" rx="290" ry="110" transform="rotate(24 400 300)" fill="none" stroke="${p.accent_secondary}" style="stroke:var(--accent-secondary)" stroke-width="1.5" stroke-dasharray="8 6"/>
        <circle cx="400" cy="300" r="38" fill="${p.accent}" style="fill:var(--accent)"/>
      `;
      break;

    case 'topographic-waves':
    case 'prism-refraction':
    case 'neural-topology':
    default: {
      body = [0, 1, 2, 3, 4, 5, 6]
        .map((i) => {
          const y = 130 + i * 56;
          const isAcc = i === 3;
          return `<path d="M 60 ${y} C 240 ${y - 65 + i * 8}, 380 ${y + 70}, 540 ${y - 30} S 680 ${y + 40}, 740 ${y - 10}" fill="none" stroke="${
            isAcc ? p.accent : strokeMain
          }" style="stroke:${isAcc ? 'var(--accent)' : 'var(--border-color)'}" stroke-width="${
            isAcc ? 2.6 : 1.3
          }"/>`;
        })
        .join('');
      break;
    }
  }

  return `<svg class="art-motif-svg" viewBox="0 0 800 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    <rect width="800" height="600" fill="${canvasBg}" style="fill:var(--bg-secondary)"/>
    ${body}
  </svg>`;
}
