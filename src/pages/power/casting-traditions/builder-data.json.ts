import { buildCastingTraditionBuilderStoreFromContent } from "@/lib/castingTraditions/pageData";

export const GET = async () => {
  const store = await buildCastingTraditionBuilderStoreFromContent();
  return new Response(JSON.stringify(store), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
