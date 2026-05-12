import type { TalentEntry, FeatEntry, SphereEntry, TalentCategory } from './types';

export type CategoryResult = {
  label: string;
  id: string;
  entries: Array<{ id: string; type: 'talent' | 'feat' }>;
};

export function buildCategories(
  sphere: SphereEntry,
  talents: TalentEntry[],
  feats: FeatEntry[]
): CategoryResult[] {
  const categories: CategoryResult[] = [];
  const usedIds = new Set<string>();

  if (sphere.categoryDefinitions && sphere.categoryDefinitions.length > 0) {
    for (const def of sphere.categoryDefinitions) {
      const categoryEntries: Array<{ id: string; type: 'talent' | 'feat' }> = [];

      // Filter talents
      for (const t of talents) {
        if (usedIds.has(t.id)) continue;
        const tierMatch = !def.tiers || def.tiers.includes(t.tier as any);
        const tagMatch = !def.tags || def.tags.some(tag => t.tags.includes(tag));
        const excludeMatch = !def.excludeTags || !def.excludeTags.some(tag => t.tags.includes(tag));

        if (tierMatch && tagMatch && excludeMatch) {
          categoryEntries.push({ id: t.id, type: 'talent' });
          usedIds.add(t.id);
        }
      }

      // Filter feats
      for (const f of feats) {
        if (usedIds.has(f.id)) continue;
        const tierMatch = !def.tiers || def.tiers.includes('feat');
        const tagMatch = !def.tags || def.tags.some(tag => f.tags.includes(tag));
        const excludeMatch = !def.excludeTags || !def.excludeTags.some(tag => f.tags.includes(tag));

        if (tierMatch && tagMatch && excludeMatch) {
          categoryEntries.push({ id: f.id, type: 'feat' });
          usedIds.add(f.id);
        }
      }

      if (categoryEntries.length > 0) {
        categories.push({
          label: def.label,
          id: def.label.toLowerCase().replace(/\s+/g, '-'),
          entries: categoryEntries,
        });
      }
    }

    // Add remaining talents/feats that weren't categorized
    const remaining: Array<{ id: string; type: 'talent' | 'feat' }> = [];
    for (const t of talents) {
      if (!usedIds.has(t.id)) remaining.push({ id: t.id, type: 'talent' });
    }
    for (const f of feats) {
      if (!usedIds.has(f.id)) remaining.push({ id: f.id, type: 'feat' });
    }

    if (remaining.length > 0) {
      categories.push({ label: 'Other Talents', id: 'other-talents', entries: remaining });
    }
  } else {
    // Default fallback if no categoryDefinitions
    const basic = talents.filter(t => t.tier === 'basic');
    const advanced = talents.filter(t => t.tier === 'advanced');

    if (basic.length > 0) {
      categories.push({
        label: 'Basic Talents',
        id: 'basic-talents',
        entries: basic.map(t => ({ id: t.id, type: 'talent' })),
      });
    }
    if (advanced.length > 0) {
      categories.push({
        label: 'Advanced Talents',
        id: 'advanced-talents',
        entries: advanced.map(t => ({ id: t.id, type: 'talent' })),
      });
    }
    if (feats.length > 0) {
      categories.push({
        label: 'Feats',
        id: 'feats',
        entries: feats.map(f => ({ id: f.id, type: 'feat' })),
      });
    }
  }

  return categories;
}
