// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
