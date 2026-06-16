import fs from "node:fs";
import path from "node:path";

const newTags = [
  "consecration",
  "ghost strike",
  "word",
  "curse",
  "shape",
  "motif",
  "arcana",
  "geomancing",
  "spirit",
  "totem",
  "mandate",
  "rally",
  "sense",
  "divine",
  "trick",
  "lens",
  "charm",
  "manipulation",
  "ward",
  "boon",
  "bane",
  "dominion",
  "air",
  "water",
  "earth",
  "fire",
  "metal",
  "plant",
  "weather",
  "wind",
];

for (const tag of newTags) {
  const id = tag.replace(/\s+/g, "-");
  const name = tag
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const filePath = path.join(
    "src",
    "content",
    "ultimate-spheres-of-power",
    "tags",
    `${id}.md`,
  );

  if (!fs.existsSync(filePath)) {
    const content = `---
type: tag
id: ${id}
label: "${name}"
priority: 5
description: "Provides abilities related to the ${name} tag."
---
`;
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Created ${filePath}`);
  }
}
