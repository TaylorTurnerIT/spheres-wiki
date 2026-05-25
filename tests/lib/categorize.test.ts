import { describe, it, expect } from 'vitest';
import { buildSections } from '../../src/lib/categorize';
import type { SphereEntry, TalentEntry, FeatEntry } from '../../src/lib/types';

function makeSphere(overrides: Partial<SphereEntry> = {}): SphereEntry {
  return {
    type: 'sphere',
    id: 'test-sphere',
    system: 'power',
    name: 'Test Sphere',
    icon: 'test',
    sourceBook: 'core',
    tags: [],
    ...overrides,
  };
}

function makeTalent(id: string, tier: 'basic' | 'advanced', tags: string[] = []): TalentEntry {
  return {
    type: 'talent',
    id,
    sphere: 'test-sphere',
    system: 'power',
    tier,
    name: id,
    sourceBook: 'core',
    tags,
  };
}

function makeFeat(id: string, tags: string[] = []): FeatEntry {
  return {
    type: 'feat',
    id,
    sphere: 'test-sphere',
    system: 'power',
    name: id,
    sourceBook: 'core',
    tags,
  };
}

describe('buildSections', () => {
  it('no sectionDefinitions → single Other section with catch-all categories', () => {
    const sphere = makeSphere();
    const talents = [makeTalent('alpha', 'basic'), makeTalent('beta', 'advanced')];
    const feats = [makeFeat('gamma-feat')];
    const sections = buildSections(sphere, talents, feats);

    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('other');
    expect(sections[0].label).toBe('Other');
    expect(sections[0].categories).toHaveLength(3);
    expect(sections[0].categories[0].id).toBe('basic-talents');
    expect(sections[0].categories[1].id).toBe('advanced-talents');
    expect(sections[0].categories[2].id).toBe('general-feats');
  });

  it('no sectionDefinitions, no talents, no feats → no sections', () => {
    const sections = buildSections(makeSphere(), [], []);
    expect(sections).toHaveLength(0);
  });

  it('sectionDefinitions with categories → maps entries into categories', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [
            { label: 'Body Talents', tiers: ['basic'], tags: ['body'] },
            { label: 'Other Talents', tiers: ['basic'] },
          ],
        },
      ],
    });
    const talents = [
      makeTalent('arm', 'basic', ['body']),
      makeTalent('leg', 'basic', ['body']),
      makeTalent('zap', 'basic'),
    ];
    const sections = buildSections(sphere, talents, []);

    expect(sections).toHaveLength(1);
    const sec = sections[0];
    expect(sec.label).toBe('Talents');
    expect(sec.id).toBe('talents');
    expect(sec.categories).toHaveLength(2);

    const body = sec.categories[0];
    expect(body.label).toBe('Body Talents');
    expect(body.entries.map(e => e.id)).toEqual(['arm', 'leg']);

    const other = sec.categories[1];
    expect(other.entries.map(e => e.id)).toEqual(['zap']);
  });

  it('section with no categories field → section with empty categories array', () => {
    const sphere = makeSphere({
      sectionDefinitions: [{ label: 'Archetypes' }],
    });
    const sections = buildSections(sphere, [], []);
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe('Archetypes');
    expect(sections[0].categories).toEqual([]);
  });

  it('empty category → included with empty entries array', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [{ label: 'Body Talents', tiers: ['basic'], tags: ['body'] }],
        },
      ],
    });
    const sections = buildSections(sphere, [makeTalent('zap', 'basic')], []);
    expect(sections[0].categories[0].entries).toHaveLength(0);
  });

  it('unmatched entries land in Other catch-all appended after defined sections', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [{ label: 'Body Talents', tiers: ['basic'], tags: ['body'] }],
        },
      ],
    });
    const talents = [makeTalent('arm', 'basic', ['body']), makeTalent('zap', 'basic')];
    const sections = buildSections(sphere, talents, []);

    expect(sections).toHaveLength(2);
    const other = sections[1];
    expect(other.id).toBe('other');
    expect(other.categories[0].entries.map(e => e.id)).toEqual(['zap']);
  });

  it('entries sorted by id within each category', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [{ label: 'All', tiers: ['basic'] }],
        },
      ],
    });
    const talents = [makeTalent('zeta', 'basic'), makeTalent('alpha', 'basic'), makeTalent('mid', 'basic')];
    const sections = buildSections(sphere, talents, []);
    expect(sections[0].categories[0].entries.map(e => e.id)).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('each entry claimed by first matching category only', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Talents',
          categories: [
            { label: 'Body', tiers: ['basic'], tags: ['body'] },
            { label: 'All Basic', tiers: ['basic'] },
          ],
        },
      ],
    });
    const talents = [makeTalent('arm', 'basic', ['body'])];
    const sections = buildSections(sphere, talents, []);
    const cats = sections[0].categories;
    expect(cats[0].entries).toHaveLength(1);
    expect(cats[1].entries).toHaveLength(0);
  });

  it('entry matched in one section cannot appear in a later section', () => {
    const sphere = makeSphere({
      sectionDefinitions: [
        {
          label: 'Section A',
          categories: [{ label: 'All Basic', tiers: ['basic'] }],
        },
        {
          label: 'Section B',
          categories: [{ label: 'All Basic Again', tiers: ['basic'] }],
        },
      ],
    });
    const talents = [makeTalent('shared', 'basic')];
    const sections = buildSections(sphere, talents, []);

    expect(sections[0].categories[0].entries.map(e => e.id)).toEqual(['shared']);
    expect(sections[1].categories[0].entries).toHaveLength(0);
  });
});
