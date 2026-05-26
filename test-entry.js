import fs from 'fs';
const content = fs.readFileSync('src/content/core/archetype/protean.md', 'utf-8');
console.log(content.substring(0, 300));
