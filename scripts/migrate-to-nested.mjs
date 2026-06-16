import fs from "node:fs/promises";
import path from "node:path";

/**
 * Migration Script for Spheres Wiki
 * Translates flat content directories into the nested structure.
 * Run this from the `spheres-wiki` root directory.
 */

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

// Helper to parse frontmatter from markdown
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content, rawFrontmatter: "" };

  const rawFrontmatter = match[1];
  const lines = rawFrontmatter.split("\n");
  const frontmatter = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    frontmatter[key] = value;
  }

  const body = content.slice(match[0].length);
  return { frontmatter, body, rawFrontmatter: match[0] };
}

// Helper to rebuild frontmatter string without excluded keys
function rebuildFrontmatter(rawFrontmatterStr, excludedKeys) {
  const lines = rawFrontmatterStr.split("\n");
  const newLines = [];

  for (const line of lines) {
    if (line.trim() === "---") {
      newLines.push(line);
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      if (excludedKeys.includes(key)) {
        continue; // Skip this key
      }
    }
    newLines.push(line);
  }

  return newLines.join("\n");
}

async function migrateBook(bookSlug) {
  const bookDir = path.join(CONTENT_DIR, bookSlug);
  const classesDir = path.join(bookDir, "classes");
  const newClassesDir = path.join(bookDir, "Classes"); // Pascal case for the new structure

  console.log(`Migrating book: ${bookSlug}`);

  try {
    await fs.access(classesDir);
  } catch {
    console.log(`No flat 'classes' directory found in ${bookSlug}. Skipping.`);
    return;
  }

  await fs.mkdir(newClassesDir, { recursive: true });

  // 1. Process Classes
  const classFiles = await fs.readdir(classesDir);
  const classIds = [];
  for (const file of classFiles) {
    if (!file.endsWith(".md")) continue;

    const content = await fs.readFile(path.join(classesDir, file), "utf8");
    const { frontmatter, body, rawFrontmatter } = parseFrontmatter(content);

    // We expect id or use filename
    const id = frontmatter.id || file.replace(".md", "");
    const className = frontmatter.name || id; // Display name
    classIds.push({ id, name: className, originalFile: file });

    // Create new nested class directory
    // Using ID for folder name (kebab case usually)
    const classTargetDir = path.join(newClassesDir, id);
    await fs.mkdir(classTargetDir, { recursive: true });

    // Remove 'type' and 'system'
    const newFrontmatterStr = rebuildFrontmatter(rawFrontmatter, [
      "type",
      "system",
    ]);
    const newContent = `${newFrontmatterStr}${body}`;

    await fs.writeFile(path.join(classTargetDir, file), newContent);
    console.log(`  Moved Class: ${id}`);
  }

  // 2. Process Class Features
  const classFeaturesDir = path.join(bookDir, "class-features");
  try {
    const featureFiles = await fs.readdir(classFeaturesDir);
    for (const file of featureFiles) {
      if (!file.endsWith(".md")) continue;

      const content = await fs.readFile(
        path.join(classFeaturesDir, file),
        "utf8",
      );
      const { frontmatter, body, rawFrontmatter } = parseFrontmatter(content);

      const parentClassId = (frontmatter.className || "")
        .toLowerCase()
        .replace(/[\s_]+/g, "-");

      if (!parentClassId) {
        console.warn(
          `  Warning: Class Feature ${file} has no className. Leaving in flat dir.`,
        );
        continue;
      }

      const targetFeatureDir = path.join(
        newClassesDir,
        parentClassId,
        "Class Features",
      );
      await fs.mkdir(targetFeatureDir, { recursive: true });

      // Remove type, system, className
      const newFrontmatterStr = rebuildFrontmatter(rawFrontmatter, [
        "type",
        "system",
        "className",
      ]);
      const newContent = `${newFrontmatterStr}${body}`;

      await fs.writeFile(path.join(targetFeatureDir, file), newContent);
    }
    console.log(`  Moved Class Features`);
  } catch (_e) {
    // Directory might not exist, ignore
  }

  // 3. Process Archetypes
  const archetypesDir = path.join(bookDir, "archetypes");
  const archetypeToClassMap = {}; // Map archetype ID to class ID for features
  try {
    const archetypes = await fs.readdir(archetypesDir);
    for (const file of archetypes) {
      if (!file.endsWith(".md")) continue;

      const content = await fs.readFile(path.join(archetypesDir, file), "utf8");
      const { frontmatter, body, rawFrontmatter } = parseFrontmatter(content);

      const parentClassId = (frontmatter.className || "")
        .toLowerCase()
        .replace(/[\s_]+/g, "-");
      const archetypeId = frontmatter.id || file.replace(".md", "");

      if (!parentClassId) {
        console.warn(
          `  Warning: Archetype ${file} has no className. Leaving in flat dir.`,
        );
        continue;
      }

      archetypeToClassMap[archetypeId.toLowerCase().replace(/[\s_]+/g, "-")] =
        parentClassId;

      const targetArchDir = path.join(
        newClassesDir,
        parentClassId,
        "Archetypes",
        archetypeId,
      );
      await fs.mkdir(targetArchDir, { recursive: true });

      // Remove type, system, className
      const newFrontmatterStr = rebuildFrontmatter(rawFrontmatter, [
        "type",
        "system",
        "className",
      ]);
      const newContent = `${newFrontmatterStr}${body}`;

      await fs.writeFile(path.join(targetArchDir, file), newContent);
    }
    console.log(`  Moved Archetypes`);
  } catch (_e) {}

  // 4. Process Archetype Features
  const archetypeFeaturesDir = path.join(bookDir, "archetype-features");
  try {
    const archFeatureFiles = await fs.readdir(archetypeFeaturesDir);
    for (const file of archFeatureFiles) {
      if (!file.endsWith(".md")) continue;

      const content = await fs.readFile(
        path.join(archetypeFeaturesDir, file),
        "utf8",
      );
      const { frontmatter, body, rawFrontmatter } = parseFrontmatter(content);

      const parentArchetypeId = (
        frontmatter.archetype ||
        frontmatter.archetypeId ||
        ""
      )
        .toLowerCase()
        .replace(/[\s_]+/g, "-");
      const parentClassId = (
        frontmatter.className ||
        archetypeToClassMap[parentArchetypeId] ||
        ""
      )
        .toLowerCase()
        .replace(/[\s_]+/g, "-");

      if (!parentClassId || !parentArchetypeId) {
        console.warn(
          `  Warning: Archetype Feature ${file} missing className or archetype. Leaving in flat dir.`,
        );
        continue;
      }

      const targetArchFeatureDir = path.join(
        newClassesDir,
        parentClassId,
        "Archetypes",
        parentArchetypeId,
        "Archetype Features",
      );
      await fs.mkdir(targetArchFeatureDir, { recursive: true });

      // Remove type, system, className, archetype, archetypeId
      const newFrontmatterStr = rebuildFrontmatter(rawFrontmatter, [
        "type",
        "system",
        "className",
        "archetype",
        "archetypeId",
      ]);
      const newContent = `${newFrontmatterStr}${body}`;

      await fs.writeFile(path.join(targetArchFeatureDir, file), newContent);
    }
    console.log(`  Moved Archetype Features`);
  } catch (_e) {}

  console.log(`Finished migrating ${bookSlug}!`);
  // Note: Old flat directories are not deleted automatically by this script
  // so you can verify the results before removing them.
}

async function main() {
  const items = await fs.readdir(CONTENT_DIR);
  for (const item of items) {
    const stat = await fs.stat(path.join(CONTENT_DIR, item));
    if (stat.isDirectory()) {
      await migrateBook(item);
    }
  }
}

main().catch(console.error);
