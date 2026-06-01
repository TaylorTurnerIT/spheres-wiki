const fs = require('fs');
const path = require('path');
const file = 'scripts/parse-wiki.mjs';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add missing tags to PAREN_TAG_MAP
const parenMapMatch = content.match(/const PAREN_TAG_MAP = \{[^}]+\};/);
if (parenMapMatch) {
  content = content.replace(parenMapMatch[0], `const PAREN_TAG_MAP = {
  body: "body",
  transformation: "transformation",
  utility: "utility",
  instill: "instill",
  mass: "mass",
  range: "range",
  strike: "strike",
  quicken: "quicken",
  still: "still",
  "blood art": "blood-art",
  form: "form",
  type: "type",
  companion: "companion",
  consecration: "consecration",
  "ghost strike": "ghost-strike",
  word: "word",
  curse: "curse",
  shape: "shape",
  motif: "motif",
  arcana: "arcana",
  geomancing: "geomancing",
  spirit: "spirit",
  totem: "totem",
  mandate: "mandate",
  rally: "rally",
  sense: "sense",
  divine: "divine",
  trick: "trick",
  lens: "lens",
  charm: "charm",
  manipulation: "manipulation",
  ward: "ward",
  boon: "boon",
  bane: "bane",
  dominion: "dominion",
  air: "air",
  water: "water",
  earth: "earth",
  fire: "fire",
  metal: "metal",
  plant: "plant",
  weather: "weather",
  wind: "wind"
};`);
}

// 2. Add missing tags to ORG_TAGS
const orgTagsMatch = content.match(/const ORG_TAGS = new Set\(\[[^\]]+\]\);/);
if (orgTagsMatch) {
  content = content.replace(orgTagsMatch[0], `const ORG_TAGS = new Set([
    "body", "transformation", "blood-art", "consecration", "ghost-strike", "word",
    "curse", "quicken", "still", "form", "type", "companion", "shape", "motif",
    "arcana", "geomancing", "spirit", "totem", "mandate", "rally", "sense",
    "divine", "trick", "lens", "charm", "manipulation", "ward", "boon", "bane", "dominion"
  ]);`);
}

// 3. Modify generateSpherePage to preserve existing formatting
content = content.replace(/function generateSpherePage\(text, config\) \{/, 'function generateSpherePage(text, config, existingContent) {');

const renderYamlBlock = `  // 6. Render to YAML frontmatter
  const lines = ["---"];
  lines.push(\`id: \${config.sphere}\`);
  lines.push(\`name: "\${capitalize(config.sphere)}"\`);
  lines.push(\`system: \${config.system}\`);
  lines.push("type: sphere");
  lines.push(\`icon: \${config.sphere}\`);
  lines.push("tags: []");
  lines.push("sectionDefinitions:");
  for (const section of sectionDefinitions) {
    lines.push(\`  - label: "\${section.label}"\`);
    lines.push("    categories:");
    for (const cat of section.categories) {
      lines.push(\`      - label: "\${cat.label}"\`);
      lines.push(\`        tiers: \${JSON.stringify(cat.tiers)}\`);
      if (cat.tags) lines.push(\`        tags: \${JSON.stringify(cat.tags)}\`);
      if (cat.excludeTags)
        lines.push(\`        excludeTags: \${JSON.stringify(cat.excludeTags)}\`);
    }
  }
  lines.push("---");`;

const newRenderBlock = `  // 6. Render to YAML frontmatter
  let newSectionDefs = "sectionDefinitions:\\n";
  for (const section of sectionDefinitions) {
    newSectionDefs += \`  - label: "\${section.label}"\\n\`;
    newSectionDefs += "    categories:\\n";
    for (const cat of section.categories) {
      newSectionDefs += \`      - label: "\${cat.label}"\\n\`;
      newSectionDefs += \`        tiers: \${JSON.stringify(cat.tiers)}\\n\`;
      if (cat.tags) newSectionDefs += \`        tags: \${JSON.stringify(cat.tags)}\\n\`;
      if (cat.excludeTags)
        newSectionDefs += \`        excludeTags: \${JSON.stringify(cat.excludeTags)}\\n\`;
    }
  }

  if (existingContent) {
    // Preserve existing description and other frontmatter, replace sectionDefinitions
    let frontmatter = existingContent.split('---')[1];
    let body = existingContent.split('---').slice(2).join('---');
    
    // remove existing sectionDefinitions and any lines following until ---
    frontmatter = frontmatter.replace(/sectionDefinitions:[\\s\\S]*?(?=(?:\\n\\n|\\n---|$))/g, newSectionDefs.trim());
    if (!frontmatter.includes("sectionDefinitions:")) {
        frontmatter += "\\n" + newSectionDefs.trim() + "\\n";
    }
    
    return \`---\${frontmatter}---\${body}\`;
  }

  const lines = ["---"];
  lines.push(\`id: \${config.sphere}\`);
  lines.push(\`name: "\${capitalize(config.sphere)}"\`);
  lines.push(\`system: \${config.system}\`);
  lines.push("type: sphere");
  lines.push(\`description: ""\`);
  lines.push(\`icon: \${config.sphere}\`);
  lines.push("tags: []");
  lines.push(newSectionDefs.trim());
  lines.push("---");
  return \`\${lines.join("\\n")}\\n\\n\${intro.trim()}\\n\`;`;

content = content.replace(renderYamlBlock, newRenderBlock);
content = content.replace(/return \`\$\{lines.join\("\\\\n"\)\}\\\\n\\\\n\$\{intro.trim\(\)\}\\\\n\`;/, '');

// Modify main function to pass existingContent
content = content.replace(/const sphereContent = generateSpherePage\(rawText, config\);/, 
\`let existingContent = null;
  const sphereDir2 = join(ROOT, "src", "content", config.primaryBook, "spheres");
  const spherePath2 = join(sphereDir2, \`\${config.sphere}.md\`);
  if (existsSync(spherePath2)) {
    existingContent = readFileSync(spherePath2, "utf-8");
  }
  const sphereContent = generateSpherePage(rawText, config, existingContent);\`);

fs.writeFileSync(file, content);
