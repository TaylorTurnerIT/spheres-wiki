import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";

/** Measure the optimized raster URLs emitted by native images and inert templates, once each. */
export function measureSphereImages(html, distDir) {
  const window = new Window({
    settings: {
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  window.document.body.innerHTML = html;
  const document = window.document;
  if (document.querySelector("[data-sphere-sprite] image")) {
    window.close();
    throw new Error("Sphere sprite must not contain eager SVG raster images");
  }
  const templates = [
    ...document.querySelectorAll("template[data-sphere-icon-template]"),
  ];
  const icons = [
    ...document.querySelectorAll("img[data-sphere-image]"),
    ...templates.flatMap((template) => [
      ...template.content.querySelectorAll("img[data-sphere-image]"),
    ]),
  ];
  const sources = new Set();
  try {
    for (const icon of icons) {
      checkNativeImage(icon);
      sources.add(icon.getAttribute("src"));
    }
  } finally {
    window.close();
  }
  if (sources.size === 0) throw new Error("Sphere templates contain no images");

  const images = [...sources].map((source) => {
    if (!source?.startsWith("/spheres-wiki/_astro/")) {
      throw new Error(`Sphere image must use a local built asset: ${source}`);
    }
    const asset = path.resolve(distDir, source.slice("/spheres-wiki/".length));
    if (!asset.startsWith(`${path.resolve(distDir)}/`)) {
      throw new Error(`Sphere image escapes dist: ${source}`);
    }
    return { source, bytes: fs.statSync(asset).size };
  });
  return {
    images,
    count: images.length,
    bytes: images.reduce((total, image) => total + image.bytes, 0),
  };
}

function checkNativeImage(image) {
  const loading = image.getAttribute("loading");
  const eagerHeading = loading === "eager" && image.closest("h1");
  if (loading !== "lazy" && !eagerHeading) {
    throw new Error("Sphere images must be lazy except for the page heading");
  }
  if (
    !(
      Number(image.getAttribute("width")) > 0 &&
      Number(image.getAttribute("height")) > 0
    )
  ) {
    throw new Error("Sphere images must reserve their intrinsic dimensions");
  }
}
