---
name: tag-colors-removal
description: Remove the static color property from tags and transition them to dynamically inherit their colors from the object's system context (using contextual CSS), falling back to brand red.
metadata:
  type: project
  created: "2026-07-06"
  last_edited: "2026-07-06"
---

# Cavekit: Tag Colors Removal & Contextual CSS Inheritance

## Objective
Remove the static color definitions from all tag metadata and frontmatter. Replace it with a dynamic, contextual coloring system where tags inherit their color from the object/context in which they are rendered (based on `--clr-ns` CSS custom properties, falling back to brand red `--clr-brand` if no system is present).

---

## 1. Schema & Type Updates

### R1.1: Content Configuration Schema
**File:** `src/content.config.ts`
Remove the `color` property from the tag Zod schema.

```diff
   z.object({
     type: z.literal("tag"),
     id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
     label: z.string(),
-    color: z.string().optional(),
     priority: z.number().int(),
     description: z.string(),
     featCategory: z.boolean().optional(),
```

### R1.2: TypeScript Types
**File:** `src/lib/types.ts`
Remove the `color` property from the `TagEntry` type definition.

```diff
 export type TagEntry = {
   type: "tag";
   id: string;
   label: string;
-  color?: string;
   priority: number;
   description: string;
```

---

## 2. Rendering Layer Updates

### R2.1: Tag Badge Component
**File:** `src/components/TagBadge.astro`
Update the component to:
1. Stop resolving the static tag color property.
2. Remove `data-system={tag?.system}` from the `.tag-wrapper` container. This prevents the tag's own system from overriding the inherited system custom variables.
3. Remove the inline `--tag-clr` style binding from the tag element.

```diff
-const color = tag?.color ?? "var(--clr-brand)";
 const bookTitle =
   tag && tag.sourceBook !== "__built-in__"
     ? bookMetaMap.get(tag.sourceBook)?.title ?? tag.sourceBook
     : undefined;
 
 const TagElement = asSpan ? 'span' : 'a';
---
 
 <span
   class="tag-wrapper"
-  data-system={tag?.system}
   data-tt-name={tag?.label}
   data-tt-desc={ttDesc}
   data-tt-source={bookTitle}
 >
   <TagElement
     href={!asSpan ? url(`/tags/${tagId}/`) : undefined}
     class="talent-tag"
     data-tag={tagId}
-    style={tag ? `--tag-clr: ${color}` : undefined}
     data-astro-prefetch={!asSpan ? "hover" : undefined}
   >
```

### R2.2: Global CSS Styling
**File:** `src/styles/global.css`
1. Define the base `--tag-clr` on `.talent-tag` to use `--clr-ns` with a fallback to `--clr-brand`.
2. Remove the specific overrides that set `--tag-clr` for individual tags (like `talent` or `basic`).

```diff
 .talent-tag {
   font-family: var(--font-display);
   font-size: var(--fs-3xs);
   font-weight: 600;
   letter-spacing: 0.04em;
   padding: 1px 6px;
   border-radius: 3px;
+  --tag-clr: var(--clr-ns, var(--clr-brand));
   background: color-mix(
     in srgb,
-    var(--tag-clr, var(--clr-brand)) 12%,
+    var(--tag-clr) 12%,
     transparent
   );
-  color: var(--tag-clr, var(--clr-brand));
+  color: var(--tag-clr);
   border: 1px solid
-    color-mix(in srgb, var(--tag-clr, var(--clr-brand)) 40%, transparent);
+    color-mix(in srgb, var(--tag-clr) 40%, transparent);
   white-space: nowrap;
 }
 .talent-tag[data-tag="3pp"] {
   text-transform: uppercase;
   letter-spacing: 0.08em;
 }
-.talent-tag[data-tag="talent"],
-.talent-tag[data-tag="basic"] {
-  --tag-clr: var(--clr-ns);
-}
```

---

## 3. Search Page Updates

**File:** `src/pages/search/index.astro`
Update the search page's build-time and run-time logic to remove tag colors.

1. Do not extract `color` field from the tags map.
2. Remove `tagColorMap` logic and references from runtime scripts.
3. Update fallback tag rendering in search results to exclude `--tag-clr` style bindings.

```diff
 const staticTags = [...tagMap.entries()]
   .filter(([id]) => !sphereNamesLower.has(id) && !systemKeys.has(id) && !typeKeys.has(id))
   .sort((a, b) => (a[1].priority ?? 999) - (b[1].priority ?? 999) || a[0].localeCompare(b[0]))
-  .map(([id, tag]) => ({ value: id, text: tag.label || id, color: tag.color }));
+  .map(([id, tag]) => ({ value: id, text: tag.label || id }));
```

```diff
-  const staticTags: { value: string; text: string; color?: string }[] = JSON.parse(dataEl?.dataset.tags      ?? '[]');
+  const staticTags: { value: string; text: string }[] = JSON.parse(dataEl?.dataset.tags      ?? '[]');
...
-  tagColorMap = {};
-  staticTags.forEach(t => {
-    if (t.color) {
-      tagColorMap[t.text] = t.color;
-      tagColorMap[t.value] = t.color;
-    }
-  });
```

```diff
     const tagHtml = tags.map(t => {
       const templateHtml = tagTemplates[t];
       if (templateHtml) return templateHtml;
       // Fallback for tags without a pre-rendered template
-      const style = tagColorMap[t] ? ` style="--tag-clr: ${tagColorMap[t]}"` : '';
       const displayMap: Record<string, string> = { 'extraordinary': 'Extraordinary', 'supernatural': 'Supernatural', 'spell-like': 'Spell-Like', 'base': 'Base Ability' };
       const display = displayMap[t.toLowerCase()] || t;
-      return `<span class="tag-wrapper"><span class="talent-tag" data-tag="${t}"${style}>${display}</span></span>`;
+      return `<span class="tag-wrapper"><span class="talent-tag" data-tag="${t}">${display}</span></span>`;
     }).join('');
```

---

## 4. Contextual CSS Wrapping & Propagation

### R4.1: Tags Index Page
**File:** `src/pages/tags/index.astro`
Add `data-system={group.sphereSystem}` to the group's section container so that tags under a specific system/sphere group receive the correct system theme colors.

```diff
       {sphereGroups.map(group => (
-        <div class="section-group" style="margin-top: 24px;">
+        <div class="section-group" data-system={group.sphereSystem} style="margin-top: 24px;">
           <SectionHeading
             label={group.sphereName}
```

### R4.2: Tag Detail Page
**File:** `src/pages/tags/[tag].astro`
Add `data-system={row.system}` to each entry row so that the tag badges rendered next to the entry name inherit the system color of the entry.

```diff
             {group.entries.map((row) => (
-              <div class="tag-entry-row">
+              <div class="tag-entry-row" data-system={row.system}>
                 {row.entryType === "talent" && (
```

---

## 5. Content Purge Script & Execution

Create a utility script to automate the removal of the `color` property from all tag markdown frontmatter files.

**File:** `scripts/purge-tag-colors.mjs`
```javascript
import fs from "node:fs";
import path from "node:path";
import { getMarkdownFilesRecursively } from "./lib/content-files.mjs";

const contentDir = path.resolve("src/content");
const files = getMarkdownFilesRecursively(contentDir);

let count = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  
  // Verify if it is a tag entry
  if (!content.includes("type: tag")) continue;
  
  // Matches "color: ..." lines (with optional quotes)
  const colorRegex = /^color:\s*.*$/m;
  
  if (colorRegex.test(content)) {
    // Remove the color line and clean up any double empty lines
    let newContent = content.replace(colorRegex, "");
    newContent = newContent.replace(/\n\n+/g, "\n");
    
    // Ensure frontmatter block spacing is kept neat
    newContent = newContent.replace(/---\n+type:/g, "---\ntype:");
    
    fs.writeFileSync(file, newContent, "utf8");
    count++;
  }
}

console.log(`Purged legacy color property from ${count} tag content files.`);
```

Run this script using `bun scripts/purge-tag-colors.mjs`.

---

## 6. Verification and Diagnostics
To ensure no regressions are introduced:
1. Run `bun run validate` to verify schema validation and file structure.
2. Run `bun run test` to execute Vitest unit tests.
3. Fix Vitest unit test mocks in `tests/lib/resolveEntries.test.ts` to remove the mock `color` keys.
4. Run `bun run build` to verify the production build succeeds without any Astro check diagnostics, Fallow audit findings, or idiom-guard violations.
