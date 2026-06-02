import { inferFromPath } from './src/lib/inferFromPath.ts';

const paths = [
  'Classes/kineticist/Archetypes/true-psychic/Archetype Features/mindscape-traveler',
  'Classes/mageknight/Class Features/combat-feat',
  'Classes/kineticist/Archetypes/true-psychic/true-psychic',
  'Classes/paladin/antipaladin/Archetypes/shadow-templar/shadow-templar'
];

for (const p of paths) {
  console.log(p);
  console.log(inferFromPath(p));
  console.log('---');
}
