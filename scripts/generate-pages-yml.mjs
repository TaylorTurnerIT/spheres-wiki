#!/usr/bin/env node
// Regenerate .pages.yml from discovered book slugs.
// Run after adding a new book, then commit the result.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(REPO_ROOT, "src", "content");
const OUT_FILE = join(REPO_ROOT, ".pages.yml");

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseYamlTitle(text) {
  const m = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return m ? m[1] : null;
}

function slugToLabel(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Discover books ────────────────────────────────────────────────────────────

const books = readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("__"))
  .map((d) => {
    const bookFile = join(CONTENT_DIR, d.name, "_book.yaml");
    let title = null;
    try {
      title = parseYamlTitle(readFileSync(bookFile, "utf8"));
    } catch {
      // No _book.yaml — skip
      return null;
    }
    return { slug: d.name, title: title ?? slugToLabel(d.name) };
  })
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title));

console.log(`Found ${books.length} books.`);

// ── YAML builders ─────────────────────────────────────────────────────────────

const BOOKS_COLLECTION = `\
  # ── Books ──────────────────────────────────────────────────────────────────
  # format: yaml picks up *.yaml files only → every _book.yaml found
  # automatically. New book folder = appears here. No slug list.
  - name: books
    label: Books
    type: collection
    path: src/content
    subfolders: true
    format: yaml
    filename: _book.yaml
    exclude:
      - __built-in__
    view:
      layout: tree
      primary: title
      fields: [title, publisher, price]
      search: [title, publisher]
      node:
        filename: _book.yaml
        hideDirs: others
      default:
        sort: title
        order: asc
    fields:
      - name: title
        type: string
        label: Title
        required: true
      - name: publisher
        type: string
        label: Publisher
        required: true
      - name: publishedDate
        type: date
        label: Published Date
        required: true
      - name: price
        type: string
        label: Price
        required: true
      - name: buyUrl
        type: string
        label: Buy URL
        required: true
      - name: coverImage
        type: image
        label: Cover Image
        required: true`;

function bookCollection({ slug, title }) {
  return `\
  # ── ${title} ────────────────────────────────────────────────────────────────
  - name: ${slug}
    label: "${title}"
    type: collection
    path: src/content/${slug}
    subfolders: true
    format: yaml-frontmatter
    filename: "*.md"
    view:
      layout: tree
      primary: name
      default:
        sort: name
        order: asc
    fields:
      # ── Core ──────────────────────────────────────────────────────────────
      - name: name
        type: string
        label: Name
        required: true
      - name: tags
        type: string
        label: Tags
        list: true
      - name: body
        type: rich-text
        label: Body
      # ── Talent / Feat ──────────────────────────────────────────────────────
      - name: tier
        type: select
        label: Tier
        options:
          values:
            - {name: base, label: Base}
            - {name: basic, label: Basic}
            - {name: advanced, label: Advanced}
      - name: dualSphere
        type: string
        label: Dual Sphere
      - name: modifies
        type: string
        label: Modifies
      # ── Sphere ────────────────────────────────────────────────────────────
      - name: icon
        type: string
        label: Icon
      # ── Class ─────────────────────────────────────────────────────────────
      - name: hitDie
        type: number
        label: Hit Die
      - name: alignment
        type: string
        label: Alignment
      - name: startingWealth
        type: string
        label: Starting Wealth
      - name: skillRanks
        type: number
        label: Skill Ranks
      - name: classSkills
        type: string
        label: Class Skills
        list: true
      - name: babProgression
        type: select
        label: BAB Progression
        options:
          values:
            - {name: full, label: Full}
            - {name: "3/4", label: "3/4"}
            - {name: half, label: Half}
      - name: fortSaveProgression
        type: select
        label: Fort Save
        options:
          values:
            - {name: good, label: Good}
            - {name: poor, label: Poor}
      - name: refSaveProgression
        type: select
        label: Ref Save
        options:
          values:
            - {name: good, label: Good}
            - {name: poor, label: Poor}
      - name: willSaveProgression
        type: select
        label: Will Save
        options:
          values:
            - {name: good, label: Good}
            - {name: poor, label: Poor}
      - name: casterTier
        type: select
        label: Caster Tier
        options:
          values:
            - {name: high, label: High}
            - {name: mid, label: Mid}
            - {name: low, label: Low}
            - {name: none, label: None}
      - name: spheres
        type: string
        label: Spheres
        list: true
      # ── Archetype-feature ─────────────────────────────────────────────────
      - name: level
        type: number
        label: Level
      - name: replaces
        type: string
        label: Replaces
        list: true
      - name: alters
        type: string
        label: Alters
        list: true
      - name: mutuallyExclusive
        type: boolean
        label: Mutually Exclusive
      # ── Class-feature / Class-trait ───────────────────────────────────────
      - name: isTraitContainer
        type: boolean
        label: Is Trait Container
      - name: requires
        type: string
        label: Requires
      - name: isAlternateClassFeature
        type: boolean
        label: Is Alternate Class Feature`;
}

// ── Assemble output ───────────────────────────────────────────────────────────

const header = `\
# .pages.yml — generated by scripts/generate-pages-yml.mjs
# Do not hand-edit. Run the script and commit the result.

media:
  input: src/assets/covers
  output: /assets/covers

content:
`;

const sections = [BOOKS_COLLECTION, ...books.map(bookCollection)];
const output = header + sections.join("\n\n") + "\n";

writeFileSync(OUT_FILE, output, "utf8");
console.log(`Wrote ${OUT_FILE} (${books.length} book collections + books collection).`);
