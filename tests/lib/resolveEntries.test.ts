import { describe, it, expect } from 'vitest';
import { buildResolvedMaps } from '../../src/lib/resolveEntries';
import type { BookData } from '../../src/lib/types';

const baseBook: BookData = {
  title: 'Spheres of Power',
  publisher: 'Drop Dead Studios',
  slug: 'spheres-of-power-core',
  publishedDate: '2017-01-01',
  entries: [
    {
      type: 'sphere',
      id: 'alteration',
      namespace: 'power',
      name: 'Alteration',
      icon: 'alteration',
      description: 'Original description.',
    },
    {
      type: 'talent',
      id: 'alter-shape',
      sphere: 'alteration',
      namespace: 'power',
      tier: 'basic',
      name: 'Alter Shape',
      description: 'Original talent text.',
    },
    {
      type: 'class',
      id: 'shifter',
      namespace: 'power',
      name: 'Shifter',
      description: 'Original class text.',
    },
  ],
};

const errataBook: BookData = {
  title: 'Errata 2024-01',
  publisher: 'Drop Dead Studios',
  slug: 'errata-2024-01',
  publishedDate: '2024-01-15',
  entries: [
    {
      type: 'talent',
      id: 'alter-shape',
      sphere: 'alteration',
      namespace: 'power',
      tier: 'basic',
      name: 'Alter Shape',
      description: 'Corrected talent text.',
      modifies: 'alter-shape',
    },
  ],
};

describe('buildResolvedMaps', () => {
  it('adds sphere entries under "sphere:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.sphereMap.has('sphere:alteration')).toBe(true);
    expect(maps.sphereMap.get('sphere:alteration')!.name).toBe('Alteration');
  });

  it('adds talent entries under "talent:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.talentMap.has('talent:alter-shape')).toBe(true);
    expect(maps.talentMap.get('talent:alter-shape')!.description).toBe('Original talent text.');
  });

  it('adds class entries under "class:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.classMap.has('class:shifter')).toBe(true);
  });

  it('records the source book for each entry', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.entrySourceBook.get('talent:alter-shape')).toBe('spheres-of-power-core');
  });

  it('applies errata patch: later book replaces description', () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    expect(maps.talentMap.get('talent:alter-shape')!.description).toBe('Corrected talent text.');
  });

  it('errata does not change the source book attribution', () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    expect(maps.entrySourceBook.get('talent:alter-shape')).toBe('spheres-of-power-core');
  });

  it('errata applied in publishedDate order regardless of array order', () => {
    const maps = buildResolvedMaps([errataBook, baseBook]);
    expect(maps.talentMap.get('talent:alter-shape')!.description).toBe('Corrected talent text.');
  });

  it('does not cross-contaminate types: talent:alter-shape != sphere:alter-shape', () => {
    const bookWithCollision: BookData = {
      ...baseBook,
      entries: [
        ...baseBook.entries,
        {
          type: 'sphere',
          id: 'alter-shape',
          namespace: 'power',
          name: 'Should Not Patch',
          icon: 'alteration',
          description: 'Sphere with same id as a talent.',
        },
      ],
    };
    const maps = buildResolvedMaps([bookWithCollision]);
    expect(maps.talentMap.get('talent:alter-shape')!.description).toBe('Original talent text.');
    expect(maps.sphereMap.get('sphere:alter-shape')!.name).toBe('Should Not Patch');
  });
});
