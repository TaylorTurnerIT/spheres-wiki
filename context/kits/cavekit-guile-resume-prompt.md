# Resume Prompt — Spheres of Guile Migration

> Drop this into a new conversation with an AI agent to continue the Spheres of Guile Wikidot → Markdown migration.

## Current State

**Completed (2 of 7):**
- ✅ Navigation — 65 entries, 0 quarantine, 4 books
- ✅ Vocation — 135 entries, 0 quarantine, 4 books

**Remaining source files in archive (5 spheres):**
- `spheresofpower-wikidot-archive/pages/communication.txt`
- `spheresofpower-wikidot-archive/pages/infiltration.txt`
- `spheresofpower-wikidot-archive/pages/investigation.txt`
- `spheresofpower-wikidot-archive/pages/leadership.txt`
- `spheresofpower-wikidot-archive/pages/performance.txt`

**Note:** Only 7 Guile sphere source files exist in the archive. The sphere inventory table in the cavekit spec lists 20 spheres, but only these 7 have source files. The remaining 13 are either not yet published or not yet scraped. Update the inventory table as source files are discovered.

## Key File Locations

| Purpose | Path |
|---------|------|
| **Rust parser** | `ftml/examples/export_guile.rs` |
| **Lexicon** | `ftml/conf/guile-lexicon.toml` |
| **Parser docs** | `ftml/examples/CLAUDE.md` (Guile section at bottom) |
| **Content root** | `spheres-wiki/src/content/spheres-of-guile/` |
| **Migration spec** | `spheres-wiki/context/kits/cavekit-guile-conversion.md` |
| **Repo guide** | `spheres-wiki/AGENTS.md` (Guile section) |
| **Wikidot source** | `spheresofpower-wikidot-archive/pages/<sphere>.txt` |
| **Tags (Guile)** | `spheres-wiki/src/content/spheres-of-guile/guile/tags/` |
| **Tags (existing)** | `spheres-wiki/src/content/ultimate-spheres-of-power/tags/` (shared: utility, plan, curse, etc.) and `spheres-wiki/src/content/spheres-of-might/might/tags/` (shared: plan, approach, etc.) |
| **SVG icons** | `spheres-wiki/src/components/SVGSprite.astro` — search for `si-{name}` to check if icon exists |
| **Existing icons** | `navigation`, `vocation`, `communication`, `infiltration`, `investigation`, `leadership`, `performance` |

## Per-Sphere Conversion Process

### 1. Inventory the source
```bash
# Count headings
grep -c '^++++ ' spheresofpower-wikidot-archive/pages/<sphere>.txt
grep '^++ ' spheresofpower-wikidot-archive/pages/<sphere>.txt
grep '^\+\+\+\+ ' spheresofpower-wikidot-archive/pages/<sphere>.txt

# Find bracket keys and paren tags
grep -oh '\[[^]]*\]' spheresofpower-wikidot-archive/pages/<sphere>.txt | sort -u
grep -oh '([^)]*)' spheresofpower-wikidot-archive/pages/<sphere>.txt | sort -u
```

Categorize every H4 heading:
- **Sentinels** (descriptive headings, NOT talents) → mark in section_defs as `entry_type: "sentinel"`
- **Talents (basic)** → which category/tag?
- **Talents (advanced)** → any prerequisites?
- **Base abilities** (H2 headings describing core mechanics) → `tier: "base"`
- **Packages** (H4 children under a "Packages" H2) → `tier: "base"` with `section_tags: ["package"]`

### 2. Update the lexicon (`ftml/conf/guile-lexicon.toml`)
Add new entries to:
- `[citation_keys]` — bracket keys like `[DRS]`, `[LotS]`, `[LG]`
- `[apoc_body_sources]` — body `^^Source:` titles → book slugs
- `[paren_tags]` — parenthetical descriptors → canonical kebab-case tags
- `[bracket_ability_tags]` — bracket tags like `[approach]`, `[plan]`

**Critical:** Body sources found in the source must be mapped in `[apoc_body_sources]` to book slugs. Check if the book directory already exists in `spheres-wiki/src/content/`. If not, create `_book.yaml` with title, publisher, and `publishedDate: "1970-01-01"` (placeholder).

### 3. Add section_defs + sphere_entry to `export_guile.rs`

Add to the end of the file (before `fn main()`):

```rust
fn <sphere>_section_defs() -> Vec<SectionDef> {
    vec![
        SectionDef {
            heading: "##4B0092|<Section Title>##".to_string(),
            entry_type: "talent".to_string(),  // or "sentinel" or "base"
            tier: "basic".to_string(),         // or "base" or "advanced"
            section_tags: vec![],              // e.g. vec!["specialty".to_string()]
        },
        // ... more section defs
    ]
}

fn <sphere>_sphere_entry(primary_book: &str) -> GuileEntry {
    // Body text: copy from source, between [[/div]] close and first H2 heading.
    // Include [TalentName] markers for tier:base entries.
    let body = "...sphere description...\n\n[BaseAbility1]\n\n[BaseAbility2]";
    
    GuileEntry {
        id: "<sphere>".to_string(),
        name: "<Display Name>".to_string(),
        entry_type: "sphere".to_string(),
        tier: String::new(),
        sphere: None,
        source_book: primary_book.to_string(),
        tags: vec![],
        body_markdown: body.to_string(),
        icon: Some("<sphere>".to_string()),
        sections: {
            let mut sections: Vec<SphereSection> = Vec::new();
            for def in <sphere>_section_defs() {
                if def.entry_type != "talent" && def.entry_type != "feat" {
                    continue;
                }
                if def.tier == "base" {
                    continue; // V32
                }
                let label = def.heading
                    .replace("##4B0092|", "").replace("##", "").trim().to_string();
                // Use excludeTags to prevent tagged talents from appearing in
                // the untagged category (e.g. Navigation Talents excludes acclimation+pathing)
                let exclude_tags: Vec<String> = if label == "<Untagged Category>" {
                    vec!["<tag1>".to_string(), "<tag2>".to_string()]
                } else {
                    vec![]
                };
                sections.push(SphereSection {
                    label, tiers: vec![def.tier.clone()],
                    tags: def.section_tags.clone(), exclude_tags,
                });
            }
            sections
        },
    }
}
```

Wire in `main()`:
- Section defs chain: `} else if sphere_id == "<sphere>" { <sphere>_section_defs()`
- Sphere entry chain: `if sphere_id == "<sphere>" { Some(<sphere>_sphere_entry(&config.primary_book)) }`

### 4. Build and validate
```bash
cd ftml
LIBGIT2_NO_PKG_CONFIG=1 CARGO_FEATURE_NO_NETWORK=1 \
  RUSTFLAGS="-C link-arg=-Wl,--allow-shlib-undefined" \
  cargo build --example export_guile

./target/debug/examples/export_guile \
  ../spheresofpower-wikidot-archive/pages/<sphere>.txt \
  --sphere <id> --lexicon conf/guile-lexicon.toml \
  -o /tmp/guile-<sphere> --validate
```

### 5. Verify with count-match rule
```
H4 count in source:  grep -c '^++++ ' source.txt
Subtract sentinel H4: (descriptive headings under sentinel sections)
Expected talents:     = H4 count - sentinels
Parser output:        Parsed: N in audit
Must equal:           Expected talents + 1 (sphere entry)
```

### 6. Force-write and deploy
```bash
# Force-write to temp
./target/debug/examples/export_guile \
  ../spheresofpower-wikidot-archive/pages/<sphere>.txt \
  --sphere <id> --lexicon conf/guile-lexicon.toml \
  -o /tmp/guile-<sphere> --force

# Copy to content. Files end up at /tmp/<book-slug>/guile/spheres/<sphere>/...
# due to content_root = parent of -o dir. Copy to correct content paths:
find /tmp/spheres-of-guile/guile/spheres/<sphere> -name "*.md" | while read src; do
  rel=$(echo "$src" | sed 's|/tmp/||')
  mkdir -p "spheres-wiki/src/content/$(dirname "$rel")"
  cp "$src" "spheres-wiki/src/content/$rel"
done
# Also copy cross-book entries:
find /tmp/<book-slug> -name "*.md" | while read src; do
  rel=$(echo "$src" | sed 's|/tmp/||')
  mkdir -p "spheres-wiki/src/content/$(dirname "$rel")"
  cp "$src" "spheres-wiki/src/content/$rel"
done
```

### 7. Create tags (if needed)
Only create new tag `.md` files at `spheres-wiki/src/content/spheres-of-guile/guile/tags/<tag>.md` if the tag doesn't already exist in Power or Might. Check first:
```bash
grep -rl "id: <tag>" spheres-wiki/src/content/ --include="*.md"
```

### 8. Body-diff check
```bash
# Extract original sphere intro (lines between /div close and first H2)
# Compare against generated sphere body in the .md file
diff <(sed -n '/\[\/div\]/,/^++ /p' source.txt | tail -n +3 | head -n -1) \
     <(sed -n '/^---$/,//p' output.md | tail -n +2)
```
Must match verbatim (excluding Wikidot markup like `[[toc]]`, `[[tabview]]`, etc.).

### 9. Build site
```bash
cd spheres-wiki
npm run validate   # must pass
npm run build      # must pass with 0 errors
```

## Critical Rules and Gotchas

### Section def heading matching
`parse_heading_line()` in the parser strips parenthetical text like `(Ex)` from heading names. **Section def headings must match the stripped version.** Example:
- Source line: `++ ##4B0092|Acclimate (Ex)##`
- Parsed name: `##4B0092|Acclimate ##` (brackets stripped, parens stripped)
- Section def heading: `"##4B0092|Acclimate ##"` ✓
- Section def heading: `"##4B0092|Acclimate (Ex)##"` ✗ — won't match!

### `exclude_base` guard
Sentinel H2 sections (like "Sphere Packages", "Talent Types", "Drawbacks") have `tier: "base"` in their section_def so H4 children inherit base context. But the H2 heading itself must NOT produce a base entry. The parser's `convert_sphere()` function has an `exclude_base` match guard:
```rust
let exclude_base = matches!(
    heading_lower.as_str(),
    "##4b0092|<sentinel heading>##" | "##4b0092|<another>##"
);
```
Add new sentinel headings here as needed.

### Body source extraction window
`extract_body_source_title()` searches 10 lines after heading (not just 1). Some entries have prereq/benefit text before the `^^Source:` line. This fix is already applied — no action needed.

### Tags across systems
Tags existing in Power (`ultimate-spheres-of-power/tags/`) or Might (`spheres-of-might/might/tags/`) **must NOT be redefined** in Guile. If a tag needs a better definition, update the existing one. The build will fail with "Duplicate tag" if you create a duplicate.

### Quarantine files block builds
`QUARANTINE-*.md` files anywhere in `src/content/` will cause the Astro build to fail. Delete them after resolving the quarantine entries.

### 3PP entries
`[3PP]` in citation keys now resolves via `__DEFERRED__` (body source lookup). Entries without body `Source:` lines will quarantine. For quarantined 3PP entries, search `https://metzo.miraheze.org/wiki/{Talent_Name}` to find the source book, then create the entry manually or add the body source to the source file.

### Nested path quirk
The parser writes cross-book entries to `{content_root}/{source_book}/guile/...` where `content_root` = parent of `-o` directory. This puts files at `/tmp/<book-slug>/...` (correct) but sometimes also creates nested directories under the primary book. Delete any nested book directories under `spheres-of-guile/guile/spheres/` after copying.

### Sphere .md entry
The force-write sometimes misses the sphere `.md` entry. Verify it was copied after force-write. If missing, copy from `/tmp/spheres-of-guile/guile/spheres/<sphere>.md`.

## Build Commands Reference

```bash
cd ftml
# Build parser
LIBGIT2_NO_PKG_CONFIG=1 CARGO_FEATURE_NO_NETWORK=1 \
  RUSTFLAGS="-C link-arg=-Wl,--allow-shlib-undefined" \
  cargo build --example export_guile

# Validate (dry-run)
./target/debug/examples/export_guile \
  ../spheresofpower-wikidot-archive/pages/<sphere>.txt \
  --sphere <id> --lexicon conf/guile-lexicon.toml \
  -o /tmp/guile-<sphere> --validate

# Force-write
./target/debug/examples/export_guile \
  ../spheresofpower-wikidot-archive/pages/<sphere>.txt \
  --sphere <id> --lexicon conf/guile-lexicon.toml \
  -o /tmp/guile-<sphere> --force

cd ../spheres-wiki
npm run validate
npm run build
```

## Existing Icons in SVGSprite.astro

Already present: `si-navigation`, `si-vocation`, `si-communication`, `si-infiltration`, `si-investigation`, `si-leadership`, `si-performance`

If a sphere icon is missing, add a `<symbol id="si-{name}">` to `spheres-wiki/src/components/SVGSprite.astro`. The `si-fallback` exists as a safety net but should not be relied upon (V19).

## Existing Tags (shared across systems — DO NOT redefine)

**From Power/Might (already available):** `utility`, `plan`, `curse`, `champion`, `supernatural`, `trade`

**Guile-specific (already created):** `acclimation`, `pathing`, `approach`, `specialty`, `package`

## After Each Sphere

1. Update the status table in `spheres-wiki/context/kits/cavekit-guile-conversion.md`
2. Update `ftml/examples/CLAUDE.md` Guile sphere status table
3. Commit both repos (`ftml` and `spheres-wiki`) separately
4. Push
