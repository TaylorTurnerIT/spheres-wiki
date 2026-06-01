import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { inferFromPath } from './src/lib/inferFromPath.ts';
import { entrySchema } from './src/content.config.ts';

const filePath = 'src/content/ultimate-spheres-of-power/Classes/kineticist/Archetypes/true-psychic/true-psychic.md';
const content = fs.readFileSync(filePath, 'utf-8');
const match = content.match(/^---\n([\s\S]*?)\n---/);
const frontmatter = yaml.load(match[1]);

const fileId = 'Classes/kineticist/Archetypes/true-psychic/true-psychic.md';
const inferred = inferFromPath(fileId);

console.log("inferred:", inferred);
console.log("frontmatter:", frontmatter);

const merged = { ...inferred, ...frontmatter };
console.log("merged type:", merged.type);

const result = entrySchema.safeParse(merged);
if (!result.success) {
  console.log("Error:");
  console.log(result.error.issues);
} else {
  console.log("Success!");
}
