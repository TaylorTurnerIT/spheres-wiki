// src/content/config.ts
import { defineCollection, z } from "astro:content";

const baseFields = {
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
  name: z.string(),
  system: z.string(),
  sourceBook: z.string(),
  tags: z.array(z.string()).default([]),
  modifies: z.string().optional(),
};

const entrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sphere"),
    ...baseFields,
    icon: z.string(),
    categoryDefinitions: z
      .array(
        z.object({
          label: z.string(),
          tiers: z
            .array(z.enum(["base", "basic", "advanced", "feat"]))
            .optional(),
          tags: z.array(z.string()).optional(),
          excludeTags: z.array(z.string()).optional(),
        }),
      )
      .optional(),
  }),
  z.object({
    type: z.literal("talent"),
    ...baseFields,
    sphere: z.string(),
    tier: z.enum(["base", "basic", "advanced"]),
  }),
  z.object({
    type: z.literal("class"),
    ...baseFields,
  }),
  z.object({
    type: z.literal("feat"),
    ...baseFields,
    sphere: z.string(),
  }),
  z.object({
    type: z.literal("article"),
    ...baseFields,
  }),
]);

// description is the GFM markdown body — not a frontmatter field

// Auto-discover every book that has a _book.yaml — no manual registration needed.
const bookYamls = import.meta.glob("./*/_book.yaml");
const discoveredSlugs = Object.keys(bookYamls).map((p) =>
  p.replace("./", "").replace("/_book.yaml", ""),
);

export const BOOK_COLLECTIONS: string[] = discoveredSlugs;
export type BookCollectionSlug = string;

const bookCollection = defineCollection({
  type: "content",
  schema: entrySchema,
});

export const collections = Object.fromEntries(
  discoveredSlugs.map((slug) => [slug, bookCollection]),
) as Record<string, typeof bookCollection>;
