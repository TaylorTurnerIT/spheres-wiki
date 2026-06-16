# Cavekit: Biome Adoption (Step 3)

## §G Goal
Replace missing or implicit formatters/linters with Biome for ultra-fast, Rust-based codebase standardization.

## §T Tasks

### T1: Initialization
- Run `bun add -D @biomejs/biome`.
- Run `bunx @biomejs/biome init` to generate `biome.json`.

### T2: Configuration
- Configure `biome.json` to format and lint `.ts`, `.js`, `.mjs`, and `.json`.
- Ignore `.astro` files if native Biome Astro support causes parsing errors (`"ignore": ["**/*.astro"]`).

### T3: Update Scripts
- Add to `package.json` scripts:
  - `"format": "biome format --write ."`
  - `"lint": "biome check ."`

### T4: Execution
- Run `bun run format` to apply formatting across the repo. (Note: Creates a large diff).
- Run `bun run lint` and safely fix or suppress violations.

### T5: CI Integration
- Add a lint step to `.github/workflows/test.yml` using `bun run lint`.

### T6: Verification
- Verify `bun run build` and `bun test` still pass.
