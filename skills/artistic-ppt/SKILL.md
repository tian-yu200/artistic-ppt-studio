---
name: artistic-ppt
description: Universal v3.0 artistic presentation compiler skill (100% offline Web Cinema HTML + True Native-Editable 5-Layer Morph PPTX with native Excel charts, movable divider shapes, transparent LaTeX formula layers, CJK word-lock typography, BBox collision linter, 12 bespoke styles & 18 negative-space artworks).
---

# Artistic-PPT Portable Agent Skill (v3.0 Master Edition)

> `<repo>` = repo root (the dir with `bin/` and `package.json`); run `npm install` there once. Needs local Chrome/Edge (or set `CHROME_PATH`). The CLI tolerates ```json fences / surrounding prose and auto-fills missing `slides[].id`.

1. **Style Selection (`style_id`)**: Choose from 12 1-to-1 bespoke styles (`apple-keynote-dark`, `aurora-glass-light`, `linear-precision`, `editorial-vogue`, `swiss-grid-modern`, `oriental-ink-zen`, `config-neo-brutal`, `executive-consulting`, `nature-academic`, `stage-cyber-spotlight`, `warm-humanist`, `bauhaus-industrial`). Run `preview-styles --all` to render a visual comparison gallery.
2. **Typography & Restraint Rules**:
   - Do NOT insert ASCII spaces between Chinese characters and `**bold**` markers (write `重建**可触摸的骨相**`).
   - Alternate multiple `art://` visuals across slides within a deck; a single `media.src` MUST NOT be used 3+ times in one deck (enforced by linter `REPEATED_MEDIA_ASSET`).
   - In `chart-spotlight`, `chart.series` must plot every core metric series named in `title` / `callout` (e.g. PV, EV, AC must all be included; enforced by `CHART_SERIES_MISMATCH`), and engineering units/arithmetic must be self-consistent.
   - Use `vertical_title: true` on `oriental-ink-zen` covers for classical vertical scroll layout with vermilion seal.
3. **Compile & Visual QA**:
   - Author JSON conforming to `references/ir-quick-reference.md` and `schemas/slide-ir.schema.json`.
   - Run `node <repo>/bin/artistic-ppt.mjs compile <deck.ir.json> --out-dir <dir> --name <name>`.
   - Verify `collisionsRemaining: 0` & `overflowsRemaining: 0`, and inspect `<name>.contact-sheet.png` before delivering `.html` and `.pptx`.
