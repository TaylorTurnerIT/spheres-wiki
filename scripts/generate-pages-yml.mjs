#!/usr/bin/env node
// Regenerate .pages.yml from discovered book slugs.
// Run after adding a new book, then commit the result.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(REPO_ROOT, "src", "content");
const OUT_FILE = join(REPO_ROOT, ".pages.yml");

const SYSTEMS = ["power", "might", "guile", "champions"];

const PUBLISHER_ORDER = [
  "Drop Dead Studios",
  "Diamond Recreational Studios",
  "Studio M—",
  "Lost Spheres Publishing",
  "Baron's Books",
  "Legendary Games",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseYamlField(text, field) {
  const m = text.match(new RegExp(`^${field}:\\s*["']?(.+?)["']?\\s*$`, "m"));
  return m ? m[1] : null;
}

function slugToLabel(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function shortenTitle(title) {
  return title.replace(/Spheres Apocrypha/g, "SA");
}

function dirs(path) {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function pad(n) {
  return " ".repeat(n);
}

// ── Field rendering ───────────────────────────────────────────────────────────

// Each field spec: [name, type, label, extras]
// extras: { required, list, options }
const ALL_FIELDS = {
  name: ["string", "Name", { required: true }],
  tags: ["string", "Tags", { list: true }],
  body: ["rich-text", "Body", {}],
  tier: ["select", "Tier", { options: ["base", "basic", "advanced"] }],
  dualSphere: ["string", "Dual Sphere", {}],
  modifies: ["string", "Modifies", {}],
  icon: ["string", "Icon", {}],
  hitDie: ["number", "Hit Die", {}],
  alignment: ["string", "Alignment", {}],
  startingWealth: ["string", "Starting Wealth", {}],
  skillRanks: ["number", "Skill Ranks", {}],
  classSkills: ["string", "Class Skills", { list: true }],
  babProgression: [
    "select",
    "BAB Progression",
    { options: ["full", "3/4", "half"] },
  ],
  fortSaveProgression: ["select", "Fort Save", { options: ["good", "poor"] }],
  refSaveProgression: ["select", "Ref Save", { options: ["good", "poor"] }],
  willSaveProgression: ["select", "Will Save", { options: ["good", "poor"] }],
  casterTier: [
    "select",
    "Caster Tier",
    { options: ["high", "mid", "low", "none"] },
  ],
  spheres: ["string", "Spheres", { list: true }],
  level: ["number", "Level", {}],
  replaces: ["string", "Replaces", { list: true }],
  alters: ["string", "Alters", { list: true }],
  mutuallyExclusive: ["boolean", "Mutually Exclusive", {}],
  isTraitContainer: ["boolean", "Is Trait Container", {}],
  requires: ["string", "Requires", {}],
  isAlternateClassFeature: ["boolean", "Is Alternate Class Feature", {}],
};

// Per type-dir field sets (narrow — only what that dir's content actually uses)
const DIR_FIELD_SETS = {
  spheres: ["name", "tags", "body", "icon", "tier", "dualSphere", "modifies"],
  talents: ["name", "tags", "body", "tier", "dualSphere", "modifies"],
  feats: ["name", "tags", "body", "dualSphere", "modifies"],
  classes: [
    "name",
    "tags",
    "body",
    "hitDie",
    "alignment",
    "startingWealth",
    "skillRanks",
    "classSkills",
    "babProgression",
    "fortSaveProgression",
    "refSaveProgression",
    "willSaveProgression",
    "casterTier",
    "spheres",
  ],
  "class-features": ["name", "tags", "body", "isTraitContainer"],
  "class-traits": ["name", "tags", "body", "requires"],
  archetypes: ["name", "tags", "body", "isAlternateClassFeature"],
  "archetype-features": [
    "name",
    "tags",
    "body",
    "level",
    "replaces",
    "alters",
    "mutuallyExclusive",
  ],
  articles: ["name", "body"],
  tags: ["name", "tags", "body"],
};

const DIR_LABELS = {
  spheres: "Spheres & Talents",
  talents: "Talents",
  feats: "Feats",
  classes: "Classes",
  "class-features": "Class Features",
  "class-traits": "Class Traits",
  archetypes: "Archetypes",
  "archetype-features": "Archetype Features",
  articles: "Articles",
  tags: "Tags",
};

const SYSTEM_LABELS = {
  power: "Power",
  might: "Might",
  guile: "Guile",
  champions: "Champions",
};

function renderFieldItem(fieldName, _i) {
  const [type, label, extras] = ALL_FIELDS[fieldName];
  const lines = [
    `- name: ${fieldName}`,
    `  type: ${type}`,
    `  label: ${label}`,
  ];
  if (extras.required) lines.push(`  required: true`);
  if (extras.list) lines.push(`  list: true`);
  if (extras.options) {
    lines.push(`  options:`);
    lines.push(`    values:`);
    for (const opt of extras.options) {
      lines.push(`      - {name: "${opt}", label: "${opt}"}`);
    }
  }
  return lines;
}

function renderFields(fieldNames, indent) {
  const p = pad(indent);
  const p2 = pad(indent + 2);
  const lines = [`${p}fields:`];
  for (const name of fieldNames) {
    const fieldLines = renderFieldItem(name);
    lines.push(`${p2}${fieldLines[0]}`);
    for (const l of fieldLines.slice(1)) {
      lines.push(`${p2}${l}`);
    }
  }
  return lines.join("\n");
}

// ── Collection rendering ──────────────────────────────────────────────────────

function renderCollection({ name, label, path, fieldNames }, indent) {
  const p = pad(indent);
  const p2 = pad(indent + 2);
  return [
    `${p}- name: ${name}`,
    `${p2}label: "${label}"`,
    `${p2}type: collection`,
    `${p2}path: ${path}`,
    `${p2}subfolders: true`,
    `${p2}format: yaml-frontmatter`,
    `${p2}filename: "*.md"`,
    `${p2}view:`,
    `${p2}  layout: tree`,
    `${p2}  primary: name`,
    `${p2}  default:`,
    `${p2}    sort: name`,
    `${p2}    order: asc`,
    renderFields(fieldNames, indent + 2),
  ].join("\n");
}

function renderGroup({ name, label, items }, indent) {
  const p = pad(indent);
  const p2 = pad(indent + 2);
  const renderedItems = items.join("\n\n");
  return [
    `${p}- name: ${name}`,
    `${p2}label: "${label}"`,
    `${p2}type: group`,
    `${p2}items:`,
    renderedItems,
  ].join("\n");
}

// ── Book discovery ────────────────────────────────────────────────────────────

function getBookTypeDirs(bookSlug) {
  const result = [];
  for (const system of SYSTEMS) {
    const systemPath = join(CONTENT_DIR, bookSlug, system);
    const typeDirs = dirs(systemPath).filter((d) => d in DIR_FIELD_SETS);
    for (const typeDir of typeDirs) {
      result.push({ system, typeDir });
    }
  }
  return result;
}

const books = readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("__"))
  .map((d) => {
    const bookFile = join(CONTENT_DIR, d.name, "_book.yaml");
    let raw;
    try {
      raw = readFileSync(bookFile, "utf8");
    } catch {
      return null;
    }
    const title = parseYamlField(raw, "title") ?? slugToLabel(d.name);
    const publisher = parseYamlField(raw, "publisher") ?? "Unknown";
    const typeDirs = getBookTypeDirs(d.name);
    if (typeDirs.length === 0) return null;
    return { slug: d.name, title, publisher, typeDirs };
  })
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title));

const byPublisher = new Map();
for (const book of books) {
  if (!byPublisher.has(book.publisher)) byPublisher.set(book.publisher, []);
  byPublisher.get(book.publisher).push(book);
}

const sortedPublishers = [...byPublisher.keys()].sort((a, b) => {
  const ia = PUBLISHER_ORDER.indexOf(a);
  const ib = PUBLISHER_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
});

console.log(
  `Found ${books.length} books across ${sortedPublishers.length} publishers.`,
);

// ── YAML assembly ─────────────────────────────────────────────────────────────

const SOURCEBOOKS_COLLECTION = `  - name: books
    label: Configure Sourcebooks
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

function renderBookGroup(book, indent) {
  const bookLabel = shortenTitle(book.title);
  const typeCollections = book.typeDirs.map(({ system, typeDir }) => {
    const collectionName = `${book.slug}-${system}-${typeDir}`;
    const sysLabel = SYSTEM_LABELS[system] ?? system;
    const typeLabel = DIR_LABELS[typeDir] ?? typeDir;
    const label =
      book.typeDirs.filter((d) => d.typeDir === typeDir).length > 1 || true
        ? `${sysLabel}: ${typeLabel}`
        : typeLabel;
    return renderCollection(
      {
        name: collectionName,
        label,
        path: `src/content/${book.slug}/${system}/${typeDir}`,
        fieldNames: DIR_FIELD_SETS[typeDir],
      },
      indent + 2,
    );
  });

  return renderGroup(
    {
      name: `${book.slug}-content`,
      label: bookLabel,
      items: typeCollections,
    },
    indent,
  );
}

function renderPublisherGroup(publisher, publisherBooks) {
  const pubSlug = publisher
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");
  const bookGroups = publisherBooks.map((book) => renderBookGroup(book, 6));
  return renderGroup(
    {
      name: `${pubSlug}-books`,
      label: `Books by ${publisher}`,
      items: bookGroups,
    },
    2,
  );
}

const sections = [
  SOURCEBOOKS_COLLECTION,
  ...sortedPublishers.map((pub) =>
    renderPublisherGroup(pub, byPublisher.get(pub)),
  ),
];

const output = [
  "# .pages.yml — generated by scripts/generate-pages-yml.mjs",
  "# Do not hand-edit. Run the script and commit the result.",
  "",
  "media:",
  "  input: src/assets/covers",
  "  output: /assets/covers",
  "",
  "content:",
  sections.join("\n\n"),
  "",
].join("\n");

writeFileSync(OUT_FILE, output, "utf8");
console.log(
  `Wrote .pages.yml — ${books.length} books, ${sortedPublishers.length} publishers.`,
);
