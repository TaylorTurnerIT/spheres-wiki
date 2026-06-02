import { inferFromPath } from './src/lib/inferFromPath.ts';

const paths = [
  'Classes/scholar/scholar',
  'Classes/scholar/Class Features/danger-sense-ex',
  'Classes/striker/Class Features/ac-bonus-ex',
  'Classes/swashbuckler/Archetypes/dancing-blade/dancing-blade',
  'Classes/sentinel/Class Features/guard-wall-ex'
];

for (const p of paths) {
  console.log(p);
  console.log(inferFromPath(p));
  console.log('---');
}
