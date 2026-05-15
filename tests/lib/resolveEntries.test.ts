import { describe, it, expect } from 'vitest';
import { buildResolvedMaps, buildTagMap } from '../../src/lib/resolveEntries';
import type { AnyEntry } from '../../src/lib/types';

type BookInput = { slug: string; publishedDate: string; entries: AnyEntry[] };

const baseBook: BookInput = {
  slug: 'spheres-of-power-core',
  publishedDate: '2017-01-01',
  entries: [
    {
      type: 'sphere',
      id: 'alteration',
      system: 'power',
      name: 'Alteration',
      icon: 'alteration',
      sourceBook: 'spheres-of-power-core',
      tags: [],
    },
    {
      type: 'talent',
      id: 'alter-shape',
      sphere: 'alteration',
      system: 'power',
      tier: 'basic',
      name: 'Alter Shape',
      sourceBook: 'spheres-of-power-core',
      tags: [],
    },
    {
      type: 'class',
      id: 'shifter',
      system: 'power',
      name: 'Shifter',
      sourceBook: 'spheres-of-power-core',
      tags: [],
    },
  ],
};

const errataBook: BookInput = {
  slug: 'errata-2024-01',
  publishedDate: '2024-01-15',
  entries: [
    {
      type: 'talent',
      id: 'alter-shape',
      sphere: 'alteration',
      system: 'power',
      tier: 'basic',
      name: 'Alter Shape (Corrected)',
      sourceBook: 'errata-2024-01',
      tags: [],
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
    expect(maps.talentMap.get('talent:alter-shape')!.name).toBe('Alter Shape');
  });

  it('adds class entries under "class:id" key', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.classMap.has('class:shifter')).toBe(true);
    expect(maps.classMap.get('class:shifter')!.name).toBe('Shifter');
  });

  it('records the source book for each entry', () => {
    const maps = buildResolvedMaps([baseBook]);
    expect(maps.entrySourceBook.get('talent:alter-shape')).toBe('spheres-of-power-core');
  });

  it('applies errata patch: later book replaces name', () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    expect(maps.talentMap.get('talent:alter-shape')!.name).toBe('Alter Shape (Corrected)');
  });

  it('errata does not change the source book attribution', () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    expect(maps.entrySourceBook.get('talent:alter-shape')).toBe('spheres-of-power-core');
  });

  it('errata applied in publishedDate order regardless of array order', () => {
    const maps = buildResolvedMaps([errataBook, baseBook]);
    expect(maps.talentMap.get('talent:alter-shape')!.name).toBe('Alter Shape (Corrected)');
  });

  it('errata patch does not leak modifies field onto resolved entry', () => {
    const maps = buildResolvedMaps([baseBook, errataBook]);
    const resolved = maps.talentMap.get('talent:alter-shape')!;
    expect((resolved as Record<string, unknown>)['modifies']).toBeUndefined();
    expect(resolved.id).toBe('alter-shape');
  });

  it('silently skips errata patch when base entry does not exist', () => {
    const orphanErrata: BookInput = {
      slug: 'orphan-errata',
      publishedDate: '2024-06-01',
      entries: [
        {
          type: 'talent',
          id: 'nonexistent',
          sphere: 'alteration',
          system: 'power',
          tier: 'basic',
          name: 'Ghost Talent',
          sourceBook: 'orphan-errata',
          tags: [],
          modifies: 'nonexistent',
        },
      ],
    };
    expect(() => buildResolvedMaps([orphanErrata])).not.toThrow();
    const maps = buildResolvedMaps([orphanErrata]);
    expect(maps.talentMap.size).toBe(0);
  });

  it('does not cross-contaminate types: talent:alter-shape != sphere:alter-shape', () => {
    const bookWithCollision: BookInput = {
      ...baseBook,
      entries: [
        ...baseBook.entries,
        {
          type: 'sphere',
          id: 'alter-shape',
          system: 'power',
          name: 'Should Not Patch',
          icon: 'alteration',
          sourceBook: 'spheres-of-power-core',
          tags: [],
        },
      ],
    };
    const maps = buildResolvedMaps([bookWithCollision]);
    expect(maps.talentMap.get('talent:alter-shape')!.name).toBe('Alter Shape');
    expect(maps.sphereMap.get('sphere:alter-shape')!.name).toBe('Should Not Patch');
  });
});

describe('buildTagMap', () => {
  it('stores a tag by its id', () => {
    const result = buildTagMap([
      {
        slug: 'spheres-of-power-core',
        rawTagEntries: [
          { id: 'combat', label: 'Combat', color: '#8f2d00', priority: 1, description: 'Combat stuff.' },
        ],
      },
    ]);
    expect(result.has('combat')).toBe(true);
    expect(result.get('combat')!.label).toBe('Combat');
    expect(result.get('combat')!.priority).toBe(1);
  });

  it('injects sourceBook from book slug, overriding any value in the raw entry', () => {
    const result = buildTagMap([
      {
        slug: 'spheres-of-power-core',
        rawTagEntries: [
          { id: 'combat', label: 'Combat', priority: 1, description: 'Combat.' },
        ],
      },
    ]);
    expect(result.get('combat')!.sourceBook).toBe('spheres-of-power-core');
  });

  it('sets type to "tag" on the stored entry', () => {
    const result = buildTagMap([
      {
        slug: 'book-a',
        rawTagEntries: [{ id: 'utility', label: 'Utility', priority: 5, description: 'Utility.' }],
      },
    ]);
    expect(result.get('utility')!.type).toBe('tag');
  });

  it('throws on duplicate tag id across books', () => {
    expect(() =>
      buildTagMap([
        {
          slug: 'book-a',
          rawTagEntries: [{ id: 'combat', label: 'Combat', priority: 1, description: 'A.' }],
        },
        {
          slug: 'book-b',
          rawTagEntries: [{ id: 'combat', label: 'Combat', priority: 1, description: 'B.' }],
        },
      ])
    ).toThrow('Duplicate tag "combat"');
  });

  it('error message names both books', () => {
    expect(() =>
      buildTagMap([
        { slug: 'book-a', rawTagEntries: [{ id: 'x', label: 'X', priority: 1, description: 'X.' }] },
        { slug: 'book-b', rawTagEntries: [{ id: 'x', label: 'X', priority: 1, description: 'X.' }] },
      ])
    ).toThrow(/book-a.*book-b|book-b.*book-a/);
  });

  it('returns empty map when no tag entries', () => {
    const result = buildTagMap([{ slug: 'book-a', rawTagEntries: [] }]);
    expect(result.size).toBe(0);
  });

  it('collects tags from multiple books without conflict', () => {
    const result = buildTagMap([
      { slug: 'book-a', rawTagEntries: [{ id: 'combat', label: 'Combat', priority: 1, description: 'A.' }] },
      { slug: 'book-b', rawTagEntries: [{ id: 'utility', label: 'Utility', priority: 5, description: 'B.' }] },
    ]);
    expect(result.size).toBe(2);
    expect(result.get('utility')!.sourceBook).toBe('book-b');
  });
});
