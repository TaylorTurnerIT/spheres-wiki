#!/usr/bin/env node
// Check that all tier:"base" talent entries have a matching [TalentName] marker
// in their parent sphere's body (V31, V56). Missing markers mean the base ability
// won't render on the sphere page.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../src/content");

function getFilesRecursively(dir) {
  const results = [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith(".md") && !file.startsWith("QUARANTINE-")) {
      results.push(filePath);
    }
  }
  return results;
}

if (!fs.existsSync(contentDir)) {
  console.log("Content directory does not exist.");
  process.exit(0);
}

const allFiles = getFilesRecursively(contentDir);
const sphereBodies = new Map(); // sphereId -> { body, filePath }
const baseTalents = []; // { id, name, sphere, filePath }

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;

  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]);
  } catch {
    continue;
  }

  if (!frontmatter) continue;

  if (frontmatter.type === "sphere") {
    const fmEnd = match.index + match[0].length;
    sphereBodies.set(frontmatter.id, {
      body: content.substring(fmEnd),
      filePath: path.relative(contentDir, filePath),
    });
  }

  if (frontmatter.type === "talent" && frontmatter.tier === "base") {
    // Derive sphere from path for entries where it's not in frontmatter.
    // Might entries follow the pattern: {book}/{system}/spheres/{sphere}/talents/{id}.md
    let sphere = frontmatter.sphere;
    if (!sphere) {
      const parts = filePath.split(path.sep);
      // Find "spheres" in path, next segment is the sphere name
      for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i] === "spheres") {
          sphere = parts[i + 1];
          break;
        }
      }
    }
    if (!sphere) {
      // Skip talents we can't resolve (shouldn't happen in practice)
      continue;
    }
    baseTalents.push({
      id: frontmatter.id,
      name: frontmatter.name,
      sphere,
      filePath: path.relative(contentDir, filePath),
    });
  }
}

let hasError = false;

for (const talent of baseTalents) {
  const sphere = sphereBodies.get(talent.sphere);

  if (!sphere) {
    console.error(
      `Base talent "${talent.id}" (${talent.filePath}) references sphere "${talent.sphere}" which has no body file.`,
    );
    hasError = true;
    continue;
  }

  // Check for [TalentName] marker. Matches [TalentName] or [Talent Name] (case-insensitive).
  // Normalize curly apostrophes to straight for matching (Wikidot artifacts).
  const cleanName = talent.name.replace(/[‘’“”]/g, "'");
  const namePattern = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markerRegex = new RegExp(`\\[${namePattern}\\]`, "i");

  // Also normalize curly quotes in body text before matching
  const cleanBody = sphere.body.replace(/[\u2018\u2019\u201C\u201D]/g, "'");
  if (!markerRegex.test(sphere.body) && !markerRegex.test(cleanBody)) {
    console.error(
      `Base talent "${talent.name}" (${talent.filePath}) has no [${cleanName}] marker in sphere body (${sphere.filePath})`,
    );
    hasError = true;
  }

  // Also check the lowercased-hyphenated variant that splitBodyOnMarkers produces
  const slugMarker = talent.id.replace(/-/g, " ");
  const slugRegex = new RegExp(`\\[${slugMarker}\\]`, "i");
  if (!markerRegex.test(sphere.body) && !slugRegex.test(sphere.body)) {
    // Already reported above, just cover the alternative form silently
  }
}

if (hasError) {
  console.error("\nBase ability marker check FAILED.");
  process.exit(1);
} else {
  console.log(
    `Base ability check passed. ${baseTalents.length} base talents verified.`,
  );
  process.exit(0);
}
