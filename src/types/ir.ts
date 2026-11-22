/**
 * Artistic-PPT v2.0 — 先锋错版与电影视差语义中间表示 (SlideDeck IR v2)
 * 新增去圆角盒化平面构成原语：出画切边巨字 (bleed_mark)、竖排杂志侧舷铭牌 (side_note)、
 * 跨层叠压纸签 (overlap_note)、同源超画幅视差运镜模式 (camera_mode) 与 AI 负空间生图配方支持。
 */

export type StyleId =
  | 'apple-keynote-dark'
  | 'aurora-glass-light'
  | 'linear-precision'
  | 'editorial-vogue'
  | 'swiss-grid-modern'
  | 'oriental-ink-zen'
  | 'config-neo-brutal'
  | 'executive-consulting'
  | 'nature-academic'
  | 'stage-cyber-spotlight'
  | 'warm-humanist'
  | 'bauhaus-industrial';

export type PlaybookId =
  | 'keynote-launch'
  | 'vc-pitch-deck'
  | 'executive-strategy'
  | 'tech-architecture'
  | 'academic-defense'
  | 'brand-manifesto'
  | 'masterclass-workshop'
  | 'career-promotion';

export type ArchetypeId =
  | 'cover-cinematic'
  | 'cover-editorial-split'
  | 'cover-swiss-grid'
  | 'section-chapter'
  | 'statement-impact'
  | 'hero-metric'
  | 'bento-asymmetric-4'
  | 'bento-showcase-5'
  | 'split-media-50'
  | 'split-golden-ratio'
  | 'editorial-magazine'
  | 'cards-3-staggered'
  | 'focus-zoom-detail'
  | 'process-timeline'
  | 'architecture-flow'
  | 'quadrant-matrix'
  | 'comparison-versus'
  | 'chart-spotlight'
  | 'academic-paper-2col'
  | 'three-line-table'
  | 'quote-manifesto'
  | 'code-architecture'
  | 'roadmap-milestones'
  | 'closing-beacon';

export type TransitionType = 'morph' | 'parallax' | 'portal' | 'fade' | 'zoom' | 'push';

export type BackgroundVariant =
  | 'default'
  | 'spotlight'
  | 'aurora'
  | 'minimal'
  | 'accent-wash'
  | 'inverted';

export type ArtMotifType =
  | 'auto'
  | 'silicon-wafer'
  | 'prism-refraction'
  | 'editorial-sculpture'
  | 'oriental-landscape'
  | 'swiss-construct'
  | 'neural-topology'
  | 'orbital-rings'
  | 'topographic-waves'
  | 'bauhaus-blocks';

export type CameraFrameMode =
  | 'full-bleed-right-subject'
  | 'pan-zoom-detail'
  | 'portal-left'
  | 'portal-right'
  | 'vertical-slit'
  | 'horizon-band';

export interface OverlapNoteSpec {
  title: string;
  body: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
  morph_id?: string;
}

export interface MediaAsset {
  src?: string;
  art_prompt_subject?: string;
  motif?: ArtMotifType;
  camera_mode?: CameraFrameMode;
  caption?: string;
  aspect?: '16:9' | '4:3' | '3:4' | '1:1' | 'auto';
  morph_id?: string;
}

export interface HeroMetric {
  value: string;
  unit?: string;
  label: string;
  delta?: string;
  description?: string;
  morph_id?: string;
}

export interface SlideItem {
  title: string;
  tag?: string;
  body?: string;
  metric?: string;
  metric_label?: string;
  icon?: string;
  span?: '1x1' | '2x1' | '1x2' | '2x2';
  accent?: boolean;
  morph_id?: string;
  formula?: string;
  media?: MediaAsset;
}

export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ChartSpec {
  type: 'bar' | 'grouped-bar' | 'area' | 'line' | 'donut' | 'horizontal-bar';
  title?: string;
  subtitle?: string;
  unit?: string;
  categories: string[];
  series: ChartSeries[];
  highlight_index?: number;
  callout?: string;
}

export interface QuadrantPoint {
  label: string;
  x: number;
  y: number;
  size?: number;
  highlight?: boolean;
  category?: string;
}

export interface QuadrantSpec {
  x_label_left: string;
  x_label_right: string;
  y_label_bottom: string;
  y_label_top: string;
  quadrant_labels?: [string, string, string, string];
  points: QuadrantPoint[];
}

export interface TableSpec {
  caption?: string;
  headers: string[];
  rows: string[][];
  highlight_rows?: number[];
  align?: Array<'left' | 'center' | 'right'>;
  footnote?: string;
}

export interface FormulaBlockSpec {
  latex: string;
  equation_number?: string;
  title?: string;
  symbols?: Array<{ symbol: string; meaning: string }>;
}

export interface CodeBlockSpec {
  language: string;
  code: string;
  caption?: string;
  highlight_lines?: number[];
}

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  layer?: number;
  accent?: boolean;
  icon?: string;
  morph_id?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface DiagramSpec {
  layout: 'layered' | 'pipeline' | 'hub-spoke';
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
}

export interface QuoteSpec {
  text: string;
  author: string;
  role?: string;
  source?: string;
}

export interface SlideSpec {
  id: string;
  archetype: ArchetypeId;
  transition?: TransitionType;
  background_variant?: BackgroundVariant;
  bleed_mark?: string;
  side_note?: string;
  overlap_note?: OverlapNoteSpec;
  vertical_title?: boolean;
  seal_text?: string;
  eyebrow?: string;
  eyebrow_morph_id?: string;
  title?: string;
  title_morph_id?: string;
  subtitle?: string;
  subtitle_morph_id?: string;
  container_morph_id?: string;
  hero_metric?: HeroMetric;
  items?: SlideItem[];
  media?: MediaAsset;
  chart?: ChartSpec;
  quadrant?: QuadrantSpec;
  table?: TableSpec;
  formula_block?: FormulaBlockSpec;
  code_block?: CodeBlockSpec;
  diagram?: DiagramSpec;
  quote?: QuoteSpec;
  footnote?: string;
  custom_svg?: string;
  notes?: string;
}

export interface DeckMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  brand_mark?: string;
  style_id: StyleId;
  playbook_id?: PlaybookId;
  locale?: 'zh-CN' | 'en-US';
  accent_override?: string;
  show_slide_numbers?: boolean;
}

export interface SlideDeckIR {
  version: '1.0' | '2.0' | '3.0';
  meta: DeckMetadata;
  slides: SlideSpec[];
}

export interface StylePack {
  id: StyleId;
  name: string;
  name_zh: string;
  category: 'dark' | 'light' | 'editorial' | 'specialized';
  mood_tags: string[];
  description: string;
  default_art_asset?: string;
  palette: {
    bg_primary: string;
    bg_secondary: string;
    bg_inverted: string;
    surface: string;
    surface_accent: string;
    surface_solid: string;
    text_primary: string;
    text_secondary: string;
    text_muted: string;
    text_on_inverted: string;
    accent: string;
    accent_secondary: string;
    accent_tertiary: string;
    border: string;
    border_solid: string;
    chart_palette: string[];
  };
  typography: {
    font_display: string;
    font_body: string;
    font_mono: string;
    pptx_font_title: string;
    pptx_font_body: string;
    pptx_font_mono: string;
    google_fonts_url?: string;
    display_weight: number;
    display_tracking: string;
    body_line_height: number;
  };
  surface_style: {
    radius_px: number;
    pptx_radius_ratio: number;
    blur_px: number;
    border_width_px: number;
    specular_rim: boolean;
    shadow_css: string;
    hard_offset_shadow?: string;
  };
  atmosphere: {
    pattern:
      | 'oled-radial-bloom'
      | 'aurora-mesh'
      | 'precision-grid'
      | 'editorial-paper'
      | 'swiss-crosshair'
      | 'oriental-wash'
      | 'brutal-halftone'
      | 'executive-clean'
      | 'academic-rule'
      | 'cyber-stage-beams'
      | 'warm-grain'
      | 'bauhaus-blueprint';
    noise_opacity: number;
    default_motif: ArtMotifType;
  };
  motion: {
    easing: string;
    duration_ms: number;
  };
  decor?: {
    show_crosshairs?: boolean;
    show_side_note?: boolean;
    allow_bleed_mark?: boolean;
    show_oriental_seal?: boolean;
  };
}

export interface PlaybookStep {
  step: number;
  phase_name: string;
  narrative_goal: string;
  energy_level: 'low-breath' | 'medium-build' | 'high-dense' | 'peak-anchor';
  recommended_archetypes: ArchetypeId[];
  morph_tip?: string;
}

export interface ThemePlaybook {
  id: PlaybookId;
  name: string;
  name_zh: string;
  scenario: string;
  recommended_styles: StyleId[];
  ideal_slide_count: [number, number];
  story_arc_summary: string;
  steps: PlaybookStep[];
}
