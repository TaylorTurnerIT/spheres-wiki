# Issue #35 — Distinct same-name talent sources

Two pairs of same-name Power talents were collapsed into single entries via
false `dualSphere` declarations. Each pair is now two distinct entries with
correct mechanics, tags, and book attribution. Source checked 2026-10-03
against the live Wikidot pages.

## Fate Curse vs Death Curse

- Fate Curse (`curse`, Ultimate Spheres of Power):
  https://spheresofpower.wikidot.com/fate#toc65 — "Curse (word) [curse]".
  Immediate action, spend a spell point to force a reroll (take lower).
- Death Curse (`curse-death`, Ultimate Spheres of Power):
  https://spheresofpower.wikidot.com/death#toc35 — "Curse (ghost strike)
  [curse]". Spend 2 spell points for a permanent curse (Will negates) with
  three base options, non-stacking with itself, plus GM-invented examples.

The Fate entry keeps its existing mechanics verbatim. The `dualSphere: death`
link and `ghost-strike` marker came from the Death talent and are removed.
The `curse` and `word` tags remain, matching the source heading.

## Protection Bulwark vs Mana Bulwark

- Protection Bulwark (`bulwark`, Ultimate Spheres of Power):
  https://spheresofpower.wikidot.com/protection#toc68 — "Bulwark (succor)".
  Immediate action, dismiss an aegis on an ally for DR/- equal to caster
  level until the start of your next turn.
- Mana Bulwark (`bulwark-mana`, The Initiate's Handbook):
  https://spheresofpower.wikidot.com/mana#toc43 — "Bulwark
  (Manipulation)". Spend a spell point for a layered magical/physical
  barrier. The Mana page carries the errata notice "applied on 8/14/22",
  acknowledged here.

The Protection entry keeps its existing mechanics verbatim. The
`dualSphere: mana` link and `manipulation` marker came from the Mana talent
and are removed; `succor` is retained.

## Primary-book boundary for Death Curse

The Death excerpt at issue time includes material explicitly sourced to
later books alongside the primary-book rules:

- Two invented-curse examples tagged `[Gravecaller's HB]` (Black Mark,
  Phobia) are excluded from `curse-death.md`. The eight unmarked examples
  (Clumsy through Unfocused) are kept in full.
- The "Addendum: [SM—]" paragraph and its two options (Skill Blockage,
  Twisted Fortune), attributed to Baron's Secluded Library, are excluded.

These are accurate later-book additions with their own provenance and must
not be silently attributed to Ultimate Spheres of Power. They stay out until
mapped to their own books.

## URL compatibility

Old dual-sphere alias URLs (`/power/death/curse/`, `/power/mana/bulwark/`)
stay valid and point at the restored entries via Astro native redirects.
Fate and Protection retain their existing IDs and URLs. Sphere-qualified
prerequisites resolve by system, sphere, and display name, including the
nested qualifier in `Death sphere (Curse (ghost strike))`.
