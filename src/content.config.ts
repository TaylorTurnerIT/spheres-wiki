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

const abilityScoreSchema = z.enum(["str", "dex", "con", "int", "wis", "cha"]);

const entryRefSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
  label: z.string().optional(),
  kind: z
    .enum(["drawback", "sphere-drawback", "boon", "feat", "talent"])
    .optional(),
  count: z.number().int().positive().optional(),
  option: z.string().optional(),
  sphere: z.string().optional(),
  sourceBook: z.string().optional(),
});

const predicateSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({ drawback: z.string() }),
    z.object({ boon: z.string() }),
    z.object({ choice: z.string() }),
    z.object({ not: predicateSchema }),
    z.object({ all: z.array(predicateSchema) }),
    z.object({ any: z.array(predicateSchema) }),
  ]),
);

const ruleSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("allow-cam"),
    ability: abilityScoreSchema,
    mode: z.enum(["always", "if-higher-than-base"]),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("set-cam"),
    abilities: z.array(abilityScoreSchema).min(1),
    mode: z.enum(["fixed", "choose-one", "highest"]),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("add-drawback-value"),
    value: z.number(),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("add-bonus-spell-points"),
    formula: z.string(),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("grant-talent"),
    sphere: z.string().optional(),
    talent: z.string().optional(),
    selector: z.string().optional(),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("grant-feat"),
    feat: z.string().optional(),
    selector: z.string().optional(),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("require-choice"),
    choice: z.string(),
    when: predicateSchema.optional(),
  }),
  z.object({
    op: z.literal("export-note"),
    text: z.string(),
    when: predicateSchema.optional(),
  }),
]);

const choiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  selector: z
    .enum(["drawback", "sphere-drawback", "boon", "feat", "talent"])
    .optional(),
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        grants: z.array(entryRefSchema).optional(),
        addsDrawbackValue: z.number().optional(),
        requires: predicateSchema.optional(),
      }),
    )
    .default([]),
});

const repeatSchema = z.object({
  min: z.number().int().min(0).optional(),
  max: z.number().int().positive().optional(),
  valueMode: z.enum(["flat", "per-selection", "scaling"]).optional(),
});

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
  z.object({
    type: z.literal("drawback"),
    ...baseFields,
    drawbackKind: z.enum(["general", "sphere", "dual-sphere"]),
    drawbackValue: z.number().default(1),
    sphere: z.string().optional(),
    spheres: z.array(z.string()).optional(),
    grants: z.array(entryRefSchema).optional(),
    buyoff: z.enum(["talent", "feat", "none", "custom"]).optional(),
    repeat: repeatSchema.optional(),
    choices: z.array(choiceSchema).optional(),
    requires: predicateSchema.optional(),
    incompatible: z.array(z.string()).optional(),
    rules: z.array(ruleSchema).optional(),
  }),
  z.object({
    type: z.literal("boon"),
    ...baseFields,
    boonCost: z.number().default(1),
    repeat: repeatSchema.optional(),
    choices: z.array(choiceSchema).optional(),
    requires: predicateSchema.optional(),
    incompatible: z.array(z.string()).optional(),
    rules: z.array(ruleSchema).optional(),
  }),
  z.object({
    type: z.literal("tradition"),
    ...baseFields,
    traditionKind: z.enum(["standard", "custom", "card", "variant"]),
    magicType: z
      .enum(["arcane", "divine", "psychic", "other", "none", "custom"])
      .optional(),
    cam: z.object({
      mode: z.enum(["fixed", "choose-one", "highest"]),
      abilities: z.array(abilityScoreSchema).min(1),
    }),
    drawbacks: z.array(entryRefSchema).default([]),
    sphereDrawbacks: z.array(entryRefSchema).optional(),
    boons: z.array(entryRefSchema).default([]),
    choices: z.array(choiceSchema).optional(),
    choiceSelections: z.record(z.string(), z.array(z.string())).optional(),
    classes: z.array(z.string()).optional(),
    parentTradition: z.string().optional(),
    notes: z.array(z.string()).optional(),
    rules: z.array(ruleSchema).optional(),
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
