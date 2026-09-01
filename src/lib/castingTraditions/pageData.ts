import { render } from "astro:content";
import { contentEntryKey } from "@/lib/entryIdentity";
import { renderMarkdownFragment } from "@/lib/renderBody";
import { getCollEntriesMap, resolveEntries } from "@/lib/resolveEntries";
import type {
  BookMeta,
  BoonEntry,
  DrawbackEntry,
  ResolvedMaps,
  TagEntry,
  TraditionEntry,
} from "@/lib/types";
import type {
  BuilderStore,
  ClientBoon,
  ClientDrawback,
  ClientTradition,
} from "./builderHelpers";

type BuilderMaps = Pick<
  ResolvedMaps,
  "drawbackMap" | "boonMap" | "traditionMap" | "bookMetaMap"
>;

type RawCollectionEntry = { body?: string };

export type CastingTraditionCard = {
  id: string;
  name: string;
  sourceBookTitle: string;
  tagIds: string[];
  Content?: any;
  metadata?: Record<string, string>;
  entryLists?: { label: string; items: { name: string; href?: string }[] }[];
  builderActions?: {
    entryId: string;
    kind: "drawback" | "sphere-drawback" | "boon";
  }[];
};

export type CastingTraditionSection = {
  heading: string;
  items: CastingTraditionCard[];
};

export type CastingTraditionPageData = {
  book?: BookMeta;
  bookMetaMap: Map<string, BookMeta>;
  tagMap: Map<string, TagEntry>;
  allPowerDrawbacks: DrawbackEntry[];
  allPowerBoons: BoonEntry[];
  allPowerTraditions: TraditionEntry[];
  standardTraditionCards: CastingTraditionCard[];
  customTraditionCards: CastingTraditionCard[];
  generalDrawbackCards: CastingTraditionCard[];
  sphereDrawbackSections: CastingTraditionSection[];
  boonCards: CastingTraditionCard[];
};

function powerEntries<T extends { system: string }>(entries: Iterable<T>): T[] {
  return [...entries].filter((entry) => entry.system === "power");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function renderBodies(
  entries: Array<DrawbackEntry | BoonEntry>,
  type: "drawback" | "boon",
  collEntries: Map<string, RawCollectionEntry>,
): Promise<string[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const collEntry = collEntries.get(
        contentEntryKey(type, "power", entry.id),
      );
      return collEntry?.body ? renderMarkdownFragment(collEntry.body) : "";
    }),
  );
}

// fallow-ignore-next-line complexity
function serializeDrawback(
  entry: DrawbackEntry,
  bodyHtml: string,
  bookMetaMap: Map<string, BookMeta>,
): ClientDrawback {
  return {
    id: entry.id,
    name: entry.name,
    drawbackKind: entry.drawbackKind,
    drawbackValue: entry.drawbackValue,
    sphere: entry.sphere ?? null,
    spheres: entry.spheres ?? null,
    sourceBookTitle:
      bookMetaMap.get(entry.sourceBook)?.title ?? entry.sourceBook,
    tags: entry.tags ?? [],
    bodyHtml,
    bodyPlain: stripHtml(bodyHtml),
    choices: entry.choices ?? null,
    requires: entry.requires ?? null,
    incompatible: entry.incompatible ?? null,
    rules: entry.rules ?? null,
    buyoff: entry.buyoff ?? null,
  };
}

// fallow-ignore-next-line complexity
function serializeBoon(
  entry: BoonEntry,
  bodyHtml: string,
  bookMetaMap: Map<string, BookMeta>,
): ClientBoon {
  return {
    id: entry.id,
    name: entry.name,
    boonCost: entry.boonCost,
    sourceBookTitle:
      bookMetaMap.get(entry.sourceBook)?.title ?? entry.sourceBook,
    tags: entry.tags ?? [],
    bodyHtml,
    bodyPlain: stripHtml(bodyHtml),
    choices: entry.choices ?? null,
    requires: entry.requires ?? null,
    incompatible: entry.incompatible ?? null,
    rules: entry.rules ?? null,
  };
}

// fallow-ignore-next-line complexity
function serializeTradition(entry: TraditionEntry): ClientTradition {
  return {
    id: entry.id,
    name: entry.name,
    traditionKind: entry.traditionKind,
    cam: entry.cam,
    drawbacks: entry.drawbacks ?? [],
    sphereDrawbacks: entry.sphereDrawbacks ?? [],
    boons: entry.boons ?? [],
    choices: entry.choices ?? null,
    choiceSelections: entry.choiceSelections ?? null,
  };
}

function resolveNames(
  ids: { id: string }[] | undefined,
  map: Map<string, string>,
): { name: string; href?: string }[] {
  return (
    ids?.map((ref) => ({
      name: map.get(ref.id) ?? ref.id,
      ...(map.has(ref.id) ? { href: `#${ref.id}` } : {}),
    })) ?? []
  );
}

function buildEntryLists(
  tradition: {
    drawbacks?: { id: string }[];
    sphereDrawbacks?: { id: string }[];
    boons?: { id: string }[];
  },
  drawbackNameMap: Map<string, string>,
  boonNameMap: Map<string, string>,
): { label: string; items: { name: string; href?: string }[] }[] {
  const lists: {
    label: string;
    items: { name: string; href?: string }[];
  }[] = [];
  const drawbacks = resolveNames(tradition.drawbacks, drawbackNameMap);
  if (drawbacks.length) lists.push({ label: "Drawbacks", items: drawbacks });
  const sphereDrawbacks = resolveNames(
    tradition.sphereDrawbacks,
    drawbackNameMap,
  );
  if (sphereDrawbacks.length) {
    lists.push({ label: "Sphere Drawbacks", items: sphereDrawbacks });
  }
  const boons = resolveNames(tradition.boons, boonNameMap);
  if (boons.length) lists.push({ label: "Boons", items: boons });
  return lists;
}

function buildIncompatibles(
  incompatible: string[] | undefined,
  drawbackNameMap: Map<string, string>,
) {
  return resolveNames(
    incompatible?.map((id) => ({ id })),
    drawbackNameMap,
  );
}

async function getRenderedContent(
  type: string,
  id: string,
  collEntries: Map<string, RawCollectionEntry>,
) {
  const collEntry = collEntries.get(contentEntryKey(type, "power", id));
  if (!collEntry) return null;
  const { Content } = await render(collEntry as any);
  return Content;
}

// fallow-ignore-next-line complexity
export async function getCastingTraditionPageData(): Promise<CastingTraditionPageData> {
  const maps = await resolveEntries();
  const collEntries = await getCollEntriesMap();
  const { drawbackMap, boonMap, traditionMap, sphereMap, bookMetaMap, tagMap } =
    maps;
  const byName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name);

  const generalDrawbacks = [...drawbackMap.values()]
    .filter(
      (entry) => entry.drawbackKind === "general" && entry.system === "power",
    )
    .sort(byName);
  const sphereDrawbacks = [...drawbackMap.values()]
    .filter(
      (entry) => entry.drawbackKind === "sphere" && entry.system === "power",
    )
    .sort(byName);
  const dualDrawbacks = [...drawbackMap.values()]
    .filter(
      (entry) =>
        entry.drawbackKind === "dual-sphere" && entry.system === "power",
    )
    .sort(byName);
  const boons = [...boonMap.values()]
    .filter((entry) => entry.system === "power")
    .sort(byName);
  const standardTraditions = [...traditionMap.values()]
    .filter(
      (entry) => entry.system === "power" && entry.traditionKind === "standard",
    )
    .sort(byName);
  const customTraditions = [...traditionMap.values()]
    .filter(
      (entry) => entry.system === "power" && entry.traditionKind !== "standard",
    )
    .sort(byName);
  const allPowerTraditions = [...traditionMap.values()]
    .filter((entry) => entry.system === "power")
    .sort(byName);
  const allPowerDrawbacks = [...drawbackMap.values()].filter(
    (entry) => entry.system === "power",
  );
  const allPowerBoons = [...boonMap.values()].filter(
    (entry) => entry.system === "power",
  );
  const drawbackNameMap = new Map(
    allPowerDrawbacks.map((entry) => [entry.id, entry.name]),
  );
  const boonNameMap = new Map(
    allPowerBoons.map((entry) => [entry.id, entry.name]),
  );
  const sphereNameMap = new Map(
    [...sphereMap.values()]
      .filter((entry) => entry.system === "power")
      .map((entry) => [entry.id, entry.name]),
  );
  // fallow-ignore-next-line complexity
  const sphereDrawbackGroups = (() => {
    const groups = new Map<string, typeof sphereDrawbacks>();
    for (const entry of sphereDrawbacks) {
      const key =
        sphereNameMap.get(entry.sphere ?? "") ?? entry.sphere ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      const group = groups.get(key);
      if (group) group.push(entry);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  })();

  const allDrawbacksForRender = [
    ...generalDrawbacks,
    ...sphereDrawbacks,
    ...dualDrawbacks,
  ];
  const traditionsForRender = [...standardTraditions, ...customTraditions];
  const [drawbackContents, boonContents, traditionContents] = await Promise.all(
    [
      Promise.all(
        allDrawbacksForRender.map((entry) =>
          getRenderedContent("drawback", entry.id, collEntries),
        ),
      ),
      Promise.all(
        boons.map((entry) => getRenderedContent("boon", entry.id, collEntries)),
      ),
      Promise.all(
        traditionsForRender.map((entry) =>
          getRenderedContent("tradition", entry.id, collEntries),
        ),
      ),
    ],
  );
  const drawbackContentMap = new Map(
    allDrawbacksForRender.map((entry, index) => [
      entry.id,
      drawbackContents[index],
    ]),
  );
  const boonContentMap = new Map(
    boons.map((entry, index) => [entry.id, boonContents[index]]),
  );
  const traditionContentMap = new Map(
    traditionsForRender.map((entry, index) => [
      entry.id,
      traditionContents[index],
    ]),
  );
  const sourceTitle = (sourceBook: string) =>
    bookMetaMap.get(sourceBook)?.title ?? sourceBook;

  const traditionCardMeta = (
    tradition: TraditionEntry,
    includeMagicType = false,
  ): Record<string, string> => ({
    ...(includeMagicType && tradition.magicType
      ? { "Magic Type": tradition.magicType }
      : {}),
    "Casting Ability Modifier":
      tradition.cam.mode === "fixed"
        ? tradition.cam.abilities
            .map((ability) => ability.toUpperCase())
            .join("/")
        : `Choose: ${tradition.cam.abilities.map((ability) => ability.toUpperCase()).join("/")}`,
  });
  const standardTraditionCards = standardTraditions.map((tradition) => ({
    id: tradition.id,
    name: tradition.name,
    sourceBookTitle: sourceTitle(tradition.sourceBook),
    tagIds: tradition.tags ?? [],
    Content: traditionContentMap.get(tradition.id),
    metadata: traditionCardMeta(tradition, true),
    entryLists: buildEntryLists(tradition, drawbackNameMap, boonNameMap),
  }));
  const customTraditionCards = customTraditions.map((tradition) => ({
    id: tradition.id,
    name: tradition.name,
    sourceBookTitle: sourceTitle(tradition.sourceBook),
    tagIds: tradition.tags ?? [],
    Content: traditionContentMap.get(tradition.id),
    metadata: traditionCardMeta(tradition),
    entryLists: buildEntryLists(tradition, drawbackNameMap, boonNameMap),
  }));
  const drawbackCard = (
    entry: DrawbackEntry,
    kind: "drawback" | "sphere-drawback",
    metadata: Record<string, string> = {},
  ): CastingTraditionCard => ({
    id: entry.id,
    name: entry.name,
    sourceBookTitle: sourceTitle(entry.sourceBook),
    tagIds: entry.tags ?? [],
    Content: drawbackContentMap.get(entry.id),
    metadata,
    entryLists: entry.incompatible?.length
      ? [
          {
            label: "Incompatible",
            items: buildIncompatibles(entry.incompatible, drawbackNameMap),
          },
        ]
      : [],
    builderActions: [{ entryId: entry.id, kind }],
  });
  // fallow-ignore-next-line complexity
  const generalDrawbackCards = generalDrawbacks.map((entry) =>
    drawbackCard(entry, "drawback", {
      ...(entry.buyoff ? { Buyoff: entry.buyoff } : {}),
      ...(entry.repeat?.max && entry.repeat.max > 1
        ? { "Max Repeat": String(entry.repeat.max) }
        : {}),
    }),
  );
  const sphereDrawbackSections: CastingTraditionSection[] = [
    ...sphereDrawbackGroups.map(([sphereName, items]) => ({
      heading: sphereName,
      items: items.map((entry) =>
        drawbackCard(entry, "sphere-drawback", {
          ...(entry.buyoff ? { Buyoff: entry.buyoff } : {}),
        }),
      ),
    })),
    ...(dualDrawbacks.length > 0
      ? [
          {
            heading: "Dual-Sphere Drawbacks",
            items: dualDrawbacks.map((entry) =>
              drawbackCard(entry, "sphere-drawback", {
                Spheres: (entry.spheres ?? [])
                  .map((id) => sphereNameMap.get(id) ?? id)
                  .join(", "),
              }),
            ),
          },
        ]
      : []),
  ];
  const boonCards = boons.map((entry) => ({
    id: entry.id,
    name: entry.name,
    sourceBookTitle: sourceTitle(entry.sourceBook),
    tagIds: entry.tags ?? [],
    Content: boonContentMap.get(entry.id),
    metadata: {
      "Boon Cost": `${entry.boonCost} slot${entry.boonCost !== 1 ? "s" : ""}`,
    },
    builderActions: [{ entryId: entry.id, kind: "boon" as const }],
  }));

  return {
    book: bookMetaMap.get("ultimate-spheres-of-power"),
    bookMetaMap,
    tagMap,
    allPowerDrawbacks,
    allPowerBoons,
    allPowerTraditions,
    standardTraditionCards,
    customTraditionCards,
    generalDrawbackCards,
    sphereDrawbackSections,
    boonCards,
  };
}

async function buildCastingTraditionBuilderStore(
  maps: BuilderMaps,
  collEntries: Map<string, RawCollectionEntry>,
): Promise<BuilderStore> {
  const drawbacks = powerEntries(maps.drawbackMap.values());
  const boons = powerEntries(maps.boonMap.values());
  const traditions = powerEntries(maps.traditionMap.values());
  const allDrawbacks = drawbacks.filter(
    (entry) =>
      entry.drawbackKind === "general" ||
      entry.drawbackKind === "sphere" ||
      entry.drawbackKind === "dual-sphere",
  );
  const [drawbackBodies, boonBodies] = await Promise.all([
    renderBodies(allDrawbacks, "drawback", collEntries),
    renderBodies(boons, "boon", collEntries),
  ]);

  return {
    drawbacks: allDrawbacks.map((entry, index) =>
      serializeDrawback(entry, drawbackBodies[index] ?? "", maps.bookMetaMap),
    ),
    boons: boons.map((entry, index) =>
      serializeBoon(entry, boonBodies[index] ?? "", maps.bookMetaMap),
    ),
    traditions: traditions.map(serializeTradition),
  };
}

export async function buildCastingTraditionBuilderStoreFromContent(): Promise<BuilderStore> {
  const maps = await resolveEntries();
  const collEntries = await getCollEntriesMap();
  return buildCastingTraditionBuilderStore(maps, collEntries);
}
