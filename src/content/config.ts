// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// Shared fields present on every entry type
const baseFields = {
  name: z.string(),
  namespace: z.string(),
  sourceBook: z.string(),
  tags: z.array(z.string()).default([]),
  modifies: z.string().optional(),
};

const entrySchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('sphere'),
      ...baseFields,
      icon: z.string(),
    }),
    z.object({
      type: z.literal('talent'),
      ...baseFields,
      sphere: z.string(),
      tier: z.enum(['basic', 'advanced', 'legendary']),
    }),
    z.object({
      type: z.literal('class'),
      ...baseFields,
    }),
    z.object({
      type: z.literal('article'),
      ...baseFields,
      title: z.string(), // articles use title instead of name for display
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.type === 'talent' && !data.sphere) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'talent entries must specify "sphere" (the sphere ID this talent belongs to)',
        path: ['sphere'],
      });
    }
    if (data.type === 'sphere' && !data.icon) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sphere entries must specify "icon" (matching SVG symbol ID in SVGSprite.astro)',
        path: ['icon'],
      });
    }
  });

// One collection per source book — all share the same schema.
// Add a new entry here when a new book directory is created under src/content/.
export const BOOK_COLLECTIONS = [
  'spheres-of-power-core',
  'spheres-of-might-core',
  'spheres-of-guile-core',
  'champions-of-the-spheres',
  'ultimate-spheres-of-power',
] as const;

export type BookCollectionSlug = (typeof BOOK_COLLECTIONS)[number];

const bookCollection = defineCollection({ type: 'content', schema: entrySchema });

export const collections = Object.fromEntries(
  BOOK_COLLECTIONS.map((slug) => [slug, bookCollection])
) as Record<BookCollectionSlug, typeof bookCollection>;
