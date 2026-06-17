import { defineCollection } from "astro:content";
import { z } from "zod";
import { EventEmitter } from "node:events";
import { glob } from "astro/loaders";
import { inferFromPath } from "./lib/inferFromPath";

// Increase listener limit because Astro creates a watcher per book collection
EventEmitter.defaultMaxListeners = 150;

function spheresLoader(options: Parameters<typeof glob>[0] & { base: string }) {
  const baseLoader = glob(options);
  return {
    ...baseLoader,
    name: "spheres-loader",
    load: async (context: any) => {
      const originalParseData = context.parseData;
      context.parseData = async (args: any) => {
        // options.base is like "./src/content/spheres-of-might"
        const slug = options.base.split("/").pop() || "";
        const pathPrefix = `/src/content/${slug}/`;
        const idx = args.filePath.indexOf(pathPrefix);

        if (idx !== -1) {
          const relativePath = args.filePath.substring(idx + pathPrefix.length);
          const inferred = inferFromPath(relativePath);
          args.data = { ...args.data, ...inferred };
        } else {
          // Fallback if somehow pathPrefix isn't found
          const inferred = inferFromPath(args.id);
          args.data = { ...args.data, ...inferred };
        }

        return originalParseData(args);
      };
      return baseLoader.load(context);
    },
  };
}

const baseFields = {
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
  name: z.string(),
  system: z.string().optional(),
  sourceBook: z.string().optional(),
  tags: z.array(z.string()).default([]),
  modifies: z.string().optional(),
};

export const entrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sphere"),
    ...baseFields,
    icon: z.string(),
    description: z.string().optional(),
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
    hitDie: z.number().int(),
    alignment: z.string(),
    startingWealth: z.string(),
    skillRanks: z.number().int(),
    classSkills: z.array(z.string()),
    babProgression: z.enum(["full", "3/4", "half"]),
    fortSaveProgression: z.enum(["good", "poor"]),
    refSaveProgression: z.enum(["good", "poor"]),
    willSaveProgression: z.enum(["good", "poor"]),
    classTable: z.string().optional(),
    casterTier: z.enum(["high", "mid", "low", "none"]).optional(),
  }),
  z.object({
    type: z.literal("class-feature"),
    ...baseFields,
    className: z.string(),
    level: z.union([z.number().int(), z.array(z.number().int())]),
    isTraitContainer: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("class-trait"),
    ...baseFields,
    className: z.string(),
    featureId: z.string(),
    requires: z.string().optional(),
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
    type: z.literal("archetype"),
    ...baseFields,
    className: z.string(),
    spheres: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("archetype-feature"),
    ...baseFields,
    archetypeId: z.string(),
    level: z.union([z.number().int(), z.array(z.number().int())]),
    replaces: z.array(z.string()).optional(),
    alters: z.array(z.string()).optional(),
    mutuallyExclusive: z.boolean().default(true),
    classOverrides: z.record(z.string(), z.string()).optional(),
    isAlternateClassFeature: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("tag"),
    id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
    label: z.string(),
    color: z.string().optional(),
    priority: z.number().int(),
    description: z.string(),
    sphere: z.string().optional(),
    hidden: z.boolean().optional(),
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
      loader: spheresLoader({
        pattern: "**/*.md",
        base: `./src/content/${slug}`,
      }),
      schema: entrySchema,
    }),
  ]),
) as Record<string, ReturnType<typeof defineCollection>>;
