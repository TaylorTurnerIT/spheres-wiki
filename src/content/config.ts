// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const baseFields = {
  name: z.string(),
  namespace: z.string(),
  sourceBook: z.string(),
  tags: z.array(z.string()).default([]),
  modifies: z.string().optional(),
};

const entrySchema = z.discriminatedUnion('type', [
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
  }),
]);

// description is the GFM markdown body — not a frontmatter field

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
