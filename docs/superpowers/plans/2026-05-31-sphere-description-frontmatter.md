# Sphere Description Frontmatter + Body Rules Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move sphere opening-description blurbs into a `description` frontmatter field, populate sphere `.md` bodies with `[BaseAbilityName]` markers + rules content from the archive, and render the description as a distinct lead-in paragraph on the sphere page.

**Architecture:** Schema change + component update first (pilot on Alteration), then migrate all 23 spheres by reading raw archive `.txt` files and converting their pre-talent content. Three missing base-ability talent files must be created before Life and Death spheres can be migrated.

**Tech Stack:** Astro 5, Zod schema (`src/content.config.ts`), TypeScript, GFM markdown (body content), raw wikidot archive at `spheresofpower-wikidot-archive/pages/`

---

## Archive Location

All raw source files are at:
```
/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheresofpower-wikidot-archive/pages/<slug>.txt
```

## Wikidot → Markdown Conversion Reference

When extracting body content from archive files:

| Wikidot | Markdown |
|---------|----------|
| `++ Heading` | `## Heading` |
| `+++ Heading` | `### Heading` |
| `++++ Heading` | `#### Heading` |
| `+++++ Heading` | `##### Heading` |
| `//italic//` | `*italic*` |
| `**bold**` | `**bold**` (no change) |
| `||~ H1 \|\|~ H2 \|\|` | `\| H1 \| H2 \|` then `\| --- \| --- \|` |
| `\|\| c1 \|\| c2 \|\|` | `\| c1 \| c2 \|` |
| `[[div style="..."]]...[[/div]]` | blockquote `> **Title**\n> content` or just strip div tags |
| `* item` | `- item` (or keep `*`) |

## Known Sphere Patterns (from archive analysis)

**Pattern A — Single base ability, simple rules block:**
Alteration, Destruction, Enhancement, Conjuration
- 1 `[BaseAbility]` marker
- Rules text may include notes, tables, talent type explanations

**Pattern B — Multiple base abilities:**
- Life: `[Cure]`, `[Invigorate]`, `[Restore]` (3 base abilities)
- Death: `[Ghost Strike]`, `[Reanimate]` (2 base abilities)

**Pattern C — Wiki editorial note (not rules):**
- Life has a `**Important Note From The Wiki:**` block before the description. This stays in the body ABOVE the `[BaseAbility]` markers, not in `description`.

**Pattern D — Unknown (17 remaining spheres):**
blood, creation, dark, divination, fallen-fey, fate, illusion, light, mana, mind, nature, protection, telekinesis, time, war, warp, weather — must read archive before migrating.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/content.config.ts` — add `description` field to sphere schema |
| Modify | `src/pages/power/[sphere]/index.astro` — render `description` before body segments |
| Modify | `src/content/ultimate-spheres-of-power/spheres/alteration.md` — pilot |
| Create | `src/content/ultimate-spheres-of-power/talents/invigorate.md` |
| Create | `src/content/ultimate-spheres-of-power/talents/restore.md` |
| Create | `src/content/ultimate-spheres-of-power/talents/reanimate.md` |
| Modify | All 23 sphere `.md` files in `src/content/ultimate-spheres-of-power/spheres/` |

---

## Task 1: Schema — Add `description` to sphere type

**Files:**
- Modify: `src/content/ultimate-spheres-of-power/spheres/alteration.md` (just its body — after schema done)
- Modify: `src/content.config.ts:92-120` (the `z.object({ type: z.literal("sphere"), ... })` block)

- [ ] **Step 1: Add `description` field to sphere schema**

In `src/content.config.ts`, find the sphere type object (starts with `z.object({ type: z.literal("sphere"),`). Add `description: z.string().optional(),` after the `icon` field:

```typescript
z.object({
  type: z.literal("sphere"),
  ...baseFields,
  icon: z.string(),
  description: z.string().optional(),   // ← add this line
  categoryDefinitions: z
```

- [ ] **Step 2: Verify schema compiles**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npm run build 2>&1 | head -30
```

Expected: Build proceeds (may have other errors unrelated to this change; look specifically for no Zod schema errors).

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat(schema): add optional description field to sphere type"
```

---

## Task 2: Component — Render `description` frontmatter field

**Files:**
- Modify: `src/pages/power/[sphere]/index.astro`

The component already has `mainCollEntry: any` in props, which carries the raw Astro collection entry including `.data` (frontmatter). The description needs to render as a lead-in paragraph BEFORE the body segments.

- [ ] **Step 1: Add description rendering to sphere page**

In `src/pages/power/[sphere]/index.astro`, find the section after the `<hr class="page-title-rule" />` line and before the `{bodySegments.map(seg => {` block. Insert:

```astro
{mainCollEntry?.data?.description && (
  <p class="sphere-description">{mainCollEntry.data.description}</p>
)}
```

So it reads:
```astro
      <hr class="page-title-rule" />

      {mainCollEntry?.data?.description && (
        <p class="sphere-description">{mainCollEntry.data.description}</p>
      )}

      {bodySegments.map(seg => {
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors (mainCollEntry is typed `any` so this should pass cleanly).

- [ ] **Step 3: Commit**

```bash
git add src/pages/power/[sphere]/index.astro
git commit -m "feat(sphere-page): render description frontmatter as lead-in paragraph"
```

---

## Task 3: Pilot — Migrate Alteration sphere

**Files:**
- Modify: `src/content/ultimate-spheres-of-power/spheres/alteration.md`

This is the pilot sphere. Shapeshift base ability file already exists (`talents/shapeshift.md`). The archive file is at `spheresofpower-wikidot-archive/pages/alteration.txt`.

The target structure for `alteration.md`:

```
---
(existing frontmatter)
description: "You have the ability to change the physical makeup of creatures."
---

[Shapeshift]

##### Note: Legs

Creatures without legs are immune to being tripped. Creatures with 4 or more legs gain a +4 bonus to their CMD vs. trip for each pair of legs beyond the first, and are treated as quadrupeds for the purpose of their carrying capacity.

### Creature Types and Alteration Talents

While assuming a creature's form with the Alteration sphere generally does not cause the transformed creature to change their creature type or subtype, sometimes various abilities require correlating creature types and subtypes to their respective talents. The table below connects various creature types to the appropriate talent. In the case of the animal and magical beast types, general descriptions of their forms are used to better match the available talents. Note that there may be specific cases where an unusual creature fits poorly with the form granted by the talent corresponding to its type. In these cases it is up to the GM to discern the most suitable talent.

**Table: Creature Types**

| Creature Type | Alteration Sphere Talent(s) |
| --- | --- |
| Aberration | Aberrant Body, Tentacles |
| Animal or magical beast (aquatic) | Aquan Transformation |
| Animal or magical beast (avian) | Avian Transformation |
| Animal or magical beast (burrowing) | Subterranean Transformation |
| Animal or magical beast (quadrupeds) | Animalistic Transformation |
| Animal or magical beast (serpentine) | Serpentine Transformation |
| (Any) swarms | Swarm Shape |
| Construct | Object Transformation |
| Dragon | Dragon Transformation |
| Humanoids | Anthropomorphic Transformation |
| Fey | Fey Body |
| Outsider (chaotic, evil, good, or lawful) | Outsider Body |
| Outsider (elemental) | Elemental Transformation |
| Ooze | Ooze Transformation |
| Plant | Plant Transformation |
| Undead | Undead Body |
| Vermin or vermin-like magical beasts | Vermin Transformation |

### Alteration Talent Types

Some Alteration talents are marked (transformation). These talents grant additional transformations. Some Alteration talents are marked (body). These talents grant themed sets of traits that mimic specific creature types.
```

- [ ] **Step 1: Update alteration.md**

Replace the entire file with the above content, preserving the existing YAML frontmatter (id, name, system, type, icon, tags, sectionDefinitions) and adding `description:` to it.

The full file should be:

```markdown
---
id: alteration
name: "Alteration"
system: power
type: sphere
icon: alteration
description: "You have the ability to change the physical makeup of creatures."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Alteration Talents"
        tiers: ["basic"]
        excludeTags: ["body","transformation"]
      - label: "Body Talents"
        tiers: ["basic"]
        tags: ["body"]
      - label: "Transformation Talents"
        tiers: ["basic"]
        tags: ["transformation"]
      - label: "Advanced Alteration Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Alteration Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[Shapeshift]

##### Note: Legs

Creatures without legs are immune to being tripped. Creatures with 4 or more legs gain a +4 bonus to their CMD vs. trip for each pair of legs beyond the first, and are treated as quadrupeds for the purpose of their carrying capacity.

### Creature Types and Alteration Talents

While assuming a creature's form with the Alteration sphere generally does not cause the transformed creature to change their creature type or subtype, sometimes various abilities require correlating creature types and subtypes to their respective talents. The table below connects various creature types to the appropriate talent. In the case of the animal and magical beast types, general descriptions of their forms are used to better match the available talents. Note that there may be specific cases where an unusual creature fits poorly with the form granted by the talent corresponding to its type. In these cases it is up to the GM to discern the most suitable talent.

**Table: Creature Types**

| Creature Type | Alteration Sphere Talent(s) |
| --- | --- |
| Aberration | Aberrant Body, Tentacles |
| Animal or magical beast (aquatic) | Aquan Transformation |
| Animal or magical beast (avian) | Avian Transformation |
| Animal or magical beast (burrowing) | Subterranean Transformation |
| Animal or magical beast (quadrupeds) | Animalistic Transformation |
| Animal or magical beast (serpentine) | Serpentine Transformation |
| (Any) swarms | Swarm Shape |
| Construct | Object Transformation |
| Dragon | Dragon Transformation |
| Humanoids | Anthropomorphic Transformation |
| Fey | Fey Body |
| Outsider (chaotic, evil, good, or lawful) | Outsider Body |
| Outsider (elemental) | Elemental Transformation |
| Ooze | Ooze Transformation |
| Plant | Plant Transformation |
| Undead | Undead Body |
| Vermin or vermin-like magical beasts | Vermin Transformation |

### Alteration Talent Types

Some Alteration talents are marked (transformation). These talents grant additional transformations. Some Alteration talents are marked (body). These talents grant themed sets of traits that mimic specific creature types.
```

- [ ] **Step 2: Build and spot-check**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npm run build 2>&1 | tail -20
```

Expected: Build succeeds. No content collection errors for alteration.

- [ ] **Step 3: Dev server smoke test**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npm run dev &
```

Open http://localhost:4321/power/alteration/ and verify:
1. "You have the ability to change the physical makeup of creatures." appears as a lead-in paragraph above the Shapeshift block
2. The Shapeshift base ability block renders with its full rules text
3. The Creature Types table renders correctly
4. "Alteration Talent Types" note appears
5. Alteration Talents section still present below

- [ ] **Step 4: Commit**

```bash
git add src/content/ultimate-spheres-of-power/spheres/alteration.md
git commit -m "content(alteration): description to frontmatter, body with rules and [Shapeshift] marker"
```

---

## Task 4: Create Missing Base Ability Files

**Files:**
- Create: `src/content/ultimate-spheres-of-power/talents/invigorate.md`
- Create: `src/content/ultimate-spheres-of-power/talents/restore.md`
- Create: `src/content/ultimate-spheres-of-power/talents/reanimate.md`

These are needed for Life and Death sphere migration (Task 6). The body of each is taken from the archive. Only the frontmatter + body text for the base ability itself (not rules/notes that go in the sphere body).

- [ ] **Step 1: Read archive for Life and Death base ability text**

Read `spheresofpower-wikidot-archive/pages/life.txt` — extract text under `++ Invigorate` and `++ Restore` headings (stop before next `++` heading or `+++ Life Talent Types`).

Read `spheresofpower-wikidot-archive/pages/death.txt` — extract text under `++ Reanimate` heading (stop before `+++ Death Talent Types`).

- [ ] **Step 2: Create invigorate.md**

```markdown
---
id: invigorate
name: "Invigorate"
system: power
type: talent
sphere: life
tier: base
tags: []
---

As a standard action, you may invigorate a touched creature, granting them temporary hit points equal to your caster level (minimum 1). Unlike normal temporary hit points, this ability can only be used on an injured target and cannot raise a target's current hit points plus their temporary hit points to be higher than their total hit points. This benefit lasts for 1 hour (Will negates (harmless)).
```

- [ ] **Step 3: Create restore.md**

```markdown
---
id: restore
name: "Restore"
system: power
type: talent
sphere: life
tier: base
tags: []
---

As a standard action, you may touch a target and spend a spell point to restore their health (Will negates (harmless)). When using restore, you must choose to restore mind, body, or soul. If affecting multiple targets, this choice becomes the same for all targets.

If restoring mind, this accomplishes all of the following:
- Removes the dazzled condition.
- Removes the shaken condition or lessens frightened to shaken, or panicked to frightened.
- Removes the staggered condition.

If restoring body, this accomplishes all of the following:
- Removes the battered condition. (See Spheres of Might.)
- Removes the fatigued condition or lessens exhaustion to fatigued.
- Removes the sickened condition or lessens nauseated to sickened.

If restoring soul, this:
- Heals 1d4 points of ability damage to one ability score of your choice.

If the condition targeted is part of an on-going effect, restore instead suppresses the condition for a number of rounds equal to your caster level. This cannot be used to remove curses or instantaneous effects.
```

- [ ] **Step 4: Create reanimate.md**

```markdown
---
id: reanimate
name: "Reanimate"
system: power
type: talent
sphere: death
tier: base
tags: []
---

As a standard action, you may touch an intact dead body and spend a spell point to reanimate it as a zombie or skeleton (depending on the composition of the body in question) for 1 minute per caster level. This creature gains the zombie or skeleton template and obeys your commands, although only basic commands such as "go", "stay", "follow me", "attack", or "guard" are understandable. While specifics can be given ("guard this area against humans but let goblins pass"), undead are unintelligent and easily fooled.

A reanimated body cannot speak and has no knowledge or ability to think and so cannot answer questions or reveal anything it knew in life. When the duration expires, the body collapses until reanimated again. It does not regain hit points between reanimations. If reduced to 0 hit points, the body collapses and is destroyed; it cannot be reanimated again.

You may have a total number of reanimated creatures active at any one time whose combined Hit Dice does not exceed twice your caster level. If you attempt to reanimate a creature that would push your total beyond this limit, you must choose which creatures cease to be reanimated or are released from your control. You cannot reanimate a creature with more Hit Dice than twice your caster level. Temporary increases to caster level (such as from implements or the thaumaturge's forbidden lore class feature) do not increase the statistics, maximums, or number of undead the caster controls.

**Animate Dead:** Undead created through the Death sphere count against the total number of undead that can be controlled by the *animate dead* spell, if using both spells and spheres in the same game.
```

- [ ] **Step 5: Build and verify**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npm run build 2>&1 | grep -E "(error|Error|invigorate|restore|reanimate)" | head -20
```

Expected: No errors for these new files.

- [ ] **Step 6: Commit**

```bash
git add src/content/ultimate-spheres-of-power/talents/invigorate.md \
        src/content/ultimate-spheres-of-power/talents/restore.md \
        src/content/ultimate-spheres-of-power/talents/reanimate.md
git commit -m "content(life,death): add missing base ability talent files (invigorate, restore, reanimate)"
```

---

## Task 5: Survey Remaining 17 Spheres from Archive

**Files:**
- Read only (no writes): archive `.txt` files for all unknown spheres

Before migrating, read the pre-talent content of every remaining sphere's archive file to document: (a) the description blurb, (b) base ability name(s), (c) any special rules/notes/tables in the body.

- [ ] **Step 1: Read all 17 unknown sphere archives**

Read the top ~150 lines (before `++ X Talents`) of each of these archive files:

```
spheresofpower-wikidot-archive/pages/blood.txt
spheresofpower-wikidot-archive/pages/conjuration.txt  (partially known — has large companion table)
spheresofpower-wikidot-archive/pages/creation.txt
spheresofpower-wikidot-archive/pages/dark.txt
spheresofpower-wikidot-archive/pages/divination.txt
spheresofpower-wikidot-archive/pages/fallen-fey.txt
spheresofpower-wikidot-archive/pages/fate.txt
spheresofpower-wikidot-archive/pages/illusion.txt
spheresofpower-wikidot-archive/pages/light.txt
spheresofpower-wikidot-archive/pages/mana.txt
spheresofpower-wikidot-archive/pages/mind.txt
spheresofpower-wikidot-archive/pages/nature.txt
spheresofpower-wikidot-archive/pages/protection.txt
spheresofpower-wikidot-archive/pages/telekinesis.txt
spheresofpower-wikidot-archive/pages/time.txt
spheresofpower-wikidot-archive/pages/war.txt
spheresofpower-wikidot-archive/pages/warp.txt
spheresofpower-wikidot-archive/pages/weather.txt
```

For each, record in a working note:
- Description blurb (sentence(s) before first `++` heading)
- Base ability heading name(s) (the `++` level headings before the Talent Types section)
- Any notes/tables/special sections that belong in the sphere body (not the base ability body)

- [ ] **Step 2: Note any special cases**

Flag anything unexpected: spheres with 0 base abilities, spheres with wiki editorial notes, spheres with unusual pre-talent structure. These may need manual handling in Task 6.

---

## Task 6: Migrate All Remaining 22 Spheres

**Files:**
- Modify: all 22 remaining `.md` files in `src/content/ultimate-spheres-of-power/spheres/`

Work sphere by sphere. For each sphere:

1. Move current body text to `description:` in frontmatter (the rules blurb only — not wiki editorial notes)
2. Write new body: `[BaseAbilityId]` markers (one per base ability) + any rules/notes/tables that follow the base ability in the archive, converted to markdown
3. Wiki editorial notes (like Life's "Important Note From The Wiki") go in the body BEFORE the first `[BaseAbilityId]` marker

**Per-sphere structure template:**

```markdown
---
(existing frontmatter fields unchanged)
description: "<the rules blurb sentence(s)>"
---

[base-ability-id]

### Rules Section (if any)

Rules text here...

| Table Header | Header |
| --- | --- |
| row | row |

### Talent Types (if any)

Explanation of talent type tags...
```

**For multi-base-ability spheres** (Life, Death):

```markdown
---
description: "<rules blurb>"
---

**Important Note From The Wiki:** (Life only — keep if present)

[cure]

[invigorate]

[restore]

### Life Talent Types

...
```

Process spheres in this order (simple → complex):
1. destruction, enhancement — simple, already known
2. blood, creation, dark, illusion, light, mana, mind, protection, telekinesis, war, warp, weather — likely simple
3. divination, fallen-fey, fate, nature, time — verify structure first
4. conjuration — complex (large companion table in base ability; that stays in `summon.md` body, not sphere body)
5. life, death — multi-base-ability
6. blood, fallen-fey — check for special structure

- [ ] **Step 1: Migrate destruction.md**

Description: `"You can use destructive power."`
Base ability: `[destructive-blast]`
Rules: Destruction Talent Types (blast type groups table)

```markdown
---
id: destruction
name: "Destruction"
system: power
type: sphere
icon: destruction
description: "You can use destructive power."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Destruction Talents"
        tiers: ["basic"]
      - label: "Advanced Destruction Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Destruction Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[destructive-blast]

### Destruction Talent Types

When augmenting a destructive blast with Destruction talents, you may only apply 1 (blast type) talent and 1 (blast shape) talent to each individual destructive blast. If a blast type or blast shape grants a combat maneuver check, that maneuver ignores normal size limitations.

### Blast Type Groups

Each (blast type) talent belongs to a blast type group with others of similar theme. For all purposes, the basic, unmodified destructive blast counts as its own blast type group.

| Blast Type Group | Blast Types |
| --- | --- |
| Acid | Acid Blast, Adhesive Blast, Alkali Blast |
| Air | Air Blast, Gale Blast, Hurricane Blast, Vacuum Blast |
| Cold | Drowning Blast, Frost Blast, Numbing Blast |
| Crystal | Crystal Blast, Living Crystal Blast, Razor Blast |
| Electric | Attracting Blast, Alternating Current, Electric Blast, Shock Blast, Static Blast |
| Fire | Blistering Blast, Fire Blast, Searing Blast |
| Force | Force Blast, Invigorating Blast, Mana Siphon |
| Holy | Paradigm Blast, Smiting Blast |
| Light | Blinding Blast, Incandescent Blast, Radiant Blast |
| Negative | Gloom Blast, Gore Blast, Nether Blast, Tenebrous Blast |
| Sonic | Reverberating Blast, Shattering Blast, Thunder Blast |
| Stone | Battering Blast, Shrapnel Blast, Stone Blast |
```

- [ ] **Step 2: Migrate enhancement.md**

Description: `"You may place enhancements on creatures and objects, altering their properties."`
Base ability: `[enhance]`
Rules: Enhancement Talent Types

```markdown
---
id: enhancement
name: "Enhancement"
system: power
type: sphere
icon: enhancement
description: "You may place enhancements on creatures and objects, altering their properties."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Enhancement Talents"
        tiers: ["basic"]
      - label: "Advanced Enhancement Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Enhancement Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[enhance]

### Enhancement Talent Types

Some talents are marked (enhance). These talents grant you new enhancements you may bestow.
```

- [ ] **Step 3: Migrate life.md**

Description: `"You wield the powers of life. All Life sphere effects are subject to spell resistance."`
Base abilities: `[cure]`, `[invigorate]`, `[restore]`
Wiki note stays in body BEFORE markers.

```markdown
---
id: life
name: "Life"
system: power
type: sphere
icon: life
description: "You wield the powers of life. All Life sphere effects are subject to spell resistance."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Life Talents"
        tiers: ["basic"]
      - label: "Advanced Life Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Life Feats"
        tiers: ["feat"]
        excludeTags: ["dual-sphere"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

**Important Note From The Wiki:** While the Life sphere deals with recovery, some afflictions can only be cured with the Life sphere's Advanced Talents. Game Masters should carefully consider whether to make those available to players, available to NPCs, or absent from the game. If they're totally absent, be careful which monsters are used against the party because it may be impossible to remove some of the afflictions they can cause. This Wiki recommends allowing all Advanced Talents from the Life Sphere, limiting it to NPCs only if the GM wants to limit powerful effects like resurrection.

---

[cure]

[invigorate]

[restore]

### Life Talent Types

#### Cure

(Cure) talents increase the healing done by your cure ability, as well as other effects.

#### Vitality

(Vitality) talents are benefits a caster may grant to any ally at the same time they use any other Life sphere ability on them. (Vitality) talents always have a duration of up to 1 minute starting at the time the effect was used, or until the target takes damage from either failing a saving throw or being hit with an attack roll.

If a caster possesses multiple (vitality) talents, they may only grant one to the target of their Life sphere effect, but may choose to grant different benefits to each target of a particular Life sphere ability.

A creature can benefit from a (vitality) talent attached to a Life ability, even if they do not actually gain anything from the Life ability (such as using cure on a creature at full hit points).
```

- [ ] **Step 4: Migrate death.md**

Description: `"You may command the powers of unlife."`
Base abilities: `[ghost-strike]`, `[reanimate]`
Rules: Death Talent Types including Dominion editorial note

```markdown
---
id: death
name: "Death"
system: power
type: sphere
icon: death
description: "You may command the powers of unlife."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Death Talents"
        tiers: ["basic"]
      - label: "Advanced Death Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Death Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[ghost-strike]

[reanimate]

### Death Talent Types

Some Death talents are designated (ghost strike), which provide you with additional types of ghost strikes.

#### Dominion

New to The Gravecaller's Handbook is an update and errata to a number of talents that previously used or interacted with the Master's Presence talent, primarily to use its range if you possessed the talent, or a default range otherwise. This change standardizes the range of these talents to close range and taking the Ranged Death talent can increase this range, instead of needing to take Master's Presence additional times.

This handbook has added the (dominion) descriptor to the following talents and advanced talent in addition to other minor changes:
- Dark Sacrifice (Ultimate Spheres of Power pg. 269)
- Master's Presence (Ultimate Spheres of Power pg. 270)
- Reanimated Warriors (Ultimate Spheres of Power pg. 270)
- Shroud (Ultimate Spheres of Power pg. 270)
- Undead Whisperer (Ultimate Spheres of Power pg. 271)
- Corpse Forge (advanced talent) (Ultimate Spheres of Power pg. 393)

Some Death talents are designated (dominion), which grant you new ways to interact with your raised and controlled undead. (Dominion) talents have a range of close.
```

- [ ] **Step 5: Migrate conjuration.md**

Description: `"You have made contracts with outsiders, calling them to your side when you are in need."`
Base ability: `[summon]`
Rules: The Companion table and companion form stat blocks belong in `summon.md` body (they ARE the base ability text), NOT in the sphere body. The sphere body after `[summon]` should only contain any Conjuration Talent Types explanations.

Read the archive `conjuration.txt` — anything after the companion form stat blocks and before `++ Conjuration Talents` goes into the sphere body. Typically this is the Conjuration Talent Types section.

- [ ] **Step 6: Migrate remaining 17 spheres**

Using findings from Task 5, apply the same pattern to: blood, creation, dark, divination, fallen-fey, fate, illusion, light, mana, mind, nature, protection, telekinesis, time, war, warp, weather.

For each: (a) set `description:` in frontmatter, (b) write body with `[base-ability-id]` markers and any rules/notes/tables.

If a sphere's archive pre-talent content has NO extra rules beyond the base ability text, the sphere body is simply:
```
[base-ability-id]
```

- [ ] **Step 7: Build to check all 23 spheres**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npm run build 2>&1 | grep -i "error" | head -30
```

Expected: Clean build with no content collection errors.

- [ ] **Step 8: Commit all sphere migrations**

```bash
git add src/content/ultimate-spheres-of-power/spheres/
git commit -m "content(spheres): migrate all 23 spheres — description to frontmatter, body with base ability markers and rules"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Start dev server**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npm run dev
```

- [ ] **Step 2: Spot-check 5 representative spheres**

Visit each URL and verify:
1. http://localhost:4321/power/alteration/ — description shows, Shapeshift block renders, Creature Types table displays, Talent Types note present
2. http://localhost:4321/power/destruction/ — description shows, Destructive Blast block renders, Blast Type Groups table displays
3. http://localhost:4321/power/life/ — wiki note + description show, all 3 base abilities (Cure, Invigorate, Restore) render as distinct blocks
4. http://localhost:4321/power/death/ — description shows, Ghost Strike and Reanimate blocks render, Dominion section present
5. http://localhost:4321/power/conjuration/ — description shows, Summon block renders with companion table

- [ ] **Step 3: Run Playwright tests**

```bash
cd /var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki
npx playwright test 2>&1 | tail -30
```

Expected: All existing tests pass. No regressions.

- [ ] **Step 4: Final commit if any fixes made**

```bash
git add -p
git commit -m "fix(spheres): address post-migration verification issues"
```
