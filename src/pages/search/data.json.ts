import { buildSearchManifest } from "@/lib/searchManifest";

export const GET = async () => {
  const manifest = await buildSearchManifest();
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
