import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import spriteSource from "../components/SVGSprite.astro?raw";

const originals = import.meta.glob<ImageMetadata>(
  "../assets/spheres-icons/*.{webp,png}",
  { eager: true, import: "default" },
);

// Per-asset framing from the previous SVG viewBoxes; these illustrations fill
// the frame while the other originals retain their one-unit inset.
const fullBleedArtwork = new Set([
  "artifice",
  "bluster",
  "body-control",
  "communication",
  "faction",
  "herbalism",
  "infiltration",
  "investigation",
  "navigation",
  "performance",
  "spellhacking",
  "study",
  "subterfuge",
  "survivalism",
  "vocation",
]);

export const vectorSphereIcons = Array.from(
  spriteSource.matchAll(/<symbol\s+id="si-([^"]+)"/g),
  (match) => match[1],
);

// The largest sphere badge is 90 CSS pixels. Resolve its 2x images once per
// build, rather than repeating every transform for every rendered page.
export const sphereIcons = Object.fromEntries(
  await Promise.all(
    Object.entries(originals).map(async ([path, src]) => {
      const image = await getImage({
        src,
        width: Math.min(180, src.width),
        format: "webp",
        quality: 80,
      });
      const name = path
        .slice(path.lastIndexOf("/") + 1)
        .replace(/\.[^.]+$/, "")
        .replaceAll("_", "-");
      return [
        name,
        {
          src: image.src,
          width: image.attributes.width,
          height: image.attributes.height,
          inset: !fullBleedArtwork.has(name),
        },
      ];
    }),
  ),
);
