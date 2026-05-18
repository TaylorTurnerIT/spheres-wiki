import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const baseFields = {
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
  name: z.string(),
  system: z.string(),
  sourceBook: z.string().optional(),
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
    sectionDefinitions: z
      .array(
        z.object({
          label: z.string(),
          categories: z
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
      )
      .optional(),
  }),
  z.object({
    type: z.literal("talent"),
    ...baseFields,
    sphere: z.string(),
    dualSphere: z.string().optional(),
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
    dualSphere: z.string().optional(),
  }),
  z.object({
    type: z.literal("article"),
    ...baseFields,
  }),
  z.object({
    type: z.literal("tag"),
    id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
    label: z.string(),
    color: z.string().optional(),
    priority: z.number().int().min(0),
    description: z.string(),
  }),
]);

// Auto-discover every book that has both a _book.yaml AND at least one .md entry.
const bookYamls = import.meta.glob("./content/*/_book.yaml");
const bookMarkdowns = import.meta.glob("./content/**/*.md");
const slugsWithContent = new Set(
  Object.keys(bookMarkdowns).map((p) => p.split("/")[2]),
);
const discoveredSlugs = Object.keys(bookYamls)
  .map((p) => p.replace("./content/", "").replace("/_book.yaml", ""))
  .filter((slug) => slugsWithContent.has(slug));

export const BOOK_COLLECTIONS: string[] = discoveredSlugs;
export type BookCollectionSlug = string;

export const collections = Object.fromEntries(
  discoveredSlugs.map((slug) => [
    slug,
    defineCollection({
      loader: glob({ pattern: "**/*.md", base: `./src/content/${slug}` }),
      schema: entrySchema,
    }),
  ]),
) as Record<string, ReturnType<typeof defineCollection>>;
