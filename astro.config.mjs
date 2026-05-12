// astro.config.mjs
import { defineConfig } from "astro/config";
import { parse as parseYaml } from "yaml";

/** Vite plugin: transform *.yaml / *.yml imports into ES modules */
const yamlPlugin = {
  name: "vite-yaml",
  transform(src, id) {
    if (!id.endsWith(".yaml") && !id.endsWith(".yml")) return null;
    const parsed = parseYaml(src);
    return {
      code: `export default ${JSON.stringify(parsed)};`,
      map: null,
    };
  },
};

export default defineConfig({
  site: "https://taylorturnerit.github.io",
  base: "/spheres-wiki/",
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  vite: {
    plugins: [yamlPlugin],
  },
});
