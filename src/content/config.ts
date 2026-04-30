// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const entryBase = {
  id: z.string(),
  modifies: z.string().optional(),
};

const SphereSchema = z.object({
  ...entryBase,
  type: z.literal('sphere'),
  namespace: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
});

const TalentSchema = z.object({
  ...entryBase,
  type: z.literal('talent'),
  sphere: z.string(),
  namespace: z.string(),
  tier: z.enum(['basic', 'advanced', 'legendary']),
  name: z.string(),
  description: z.string(),
});

const ClassSchema = z.object({
  ...entryBase,
  type: z.literal('class'),
  namespace: z.string(),
  name: z.string(),
  description: z.string(),
});

const ArticleSchema = z.object({
  ...entryBase,
  type: z.literal('article'),
  namespace: z.string(),
  title: z.string(),
  description: z.string(),
});

const EntrySchema = z.discriminatedUnion('type', [
  SphereSchema,
  TalentSchema,
  ClassSchema,
  ArticleSchema,
]);

const BookSchema = z.object({
  title: z.string(),
  publisher: z.string(),
  slug: z.string(),
  publishedDate: z.string(),
  price: z.string().optional(),
  buyUrl: z.string().url().optional(),
  coverImage: z.string().optional(),
  entries: z.array(EntrySchema),
});

export const collections = {
  books: defineCollection({
    type: 'data',
    schema: BookSchema,
  }),
};
