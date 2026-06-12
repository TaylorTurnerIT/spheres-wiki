---
created: "2026-06-11"
last_edited: "2026-06-11"
---
# Implementation Tracking: Courser

Build site: context/plans/build-site.md

| Task | Status | Notes |
|------|--------|-------|
| T-001 | DONE | courser.md class entry; commit ef4da9f4 |
| T-002 | DONE | 4 level-1 class features; merged into T-002–T-005 batch commit a7de6f02 |
| T-003 | DONE | 5 level-2–4 class features (incl. courser-ventures with isTraitContainer); batch commit a7de6f02 |
| T-004 | DONE | 6 level-5–9 class features; batch commit a7de6f02 |
| T-005 | DONE | 6 level-13–20 class features; batch commit a7de6f02 |
| T-006 | DONE | 10 base-level core ventures; merged into T-006–T-009 batch commit 67ac433f |
| T-007 | DONE | 6 4th-level core ventures; batch commit 67ac433f |
| T-008 | DONE | 5 6th-level core ventures; batch commit 67ac433f |
| T-009 | DONE | 4 8th+12th-level core ventures; batch commit 67ac433f |
| T-010 | DONE | 5 DRS ventures (H&B); commit 51cd153b |
| T-011 | DONE | Cook ACF (I&I); commit 51cd153b |
| T-012 | DONE | Build validation clean; 53 files total (kit over-counted core ventures by 1 — source has 25, not 26) |

## Notes
- class-features require {system}/class-features/{className}/{id}.md path (3-segment after system strip) — inferFromPath needs className in path
- class-traits require {system}/class-traits/{className}/{id}.md
- archetype-features require {system}/archetype-features/{archetypeId}/{id}.md (archetypeId in frontmatter overrides path-inferred value)
- T-002–T-005 agents used worktree isolation — T-003 agent committed but branch was auto-cleaned without merge; all class features re-implemented directly in main branch
