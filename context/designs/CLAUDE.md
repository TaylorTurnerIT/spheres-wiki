# Design System

The project's visual design system in DESIGN.md format (9-section Google Stitch).

## Conventions
- DESIGN.md at project root is the canonical source
- All UI implementation must reference DESIGN.md tokens and patterns
- Updated via /ck:design or automatically during /ck:check and /ck:revise
- Agents read this before implementing any user-facing component

## Source of truth
- Tokens are extracted from `src/styles/global.css` — that CSS is the implementation
  ground truth. If DESIGN.md and `global.css` ever disagree, the CSS wins and DESIGN.md
  must be re-synced.
- Per-system color swap is the core mechanic: never hardcode a system hex; wire to
  `--clr-active` (page dominant) / `--clr-ns` (inline). See DESIGN.md §2.
- No dark mode exists (intentional).
