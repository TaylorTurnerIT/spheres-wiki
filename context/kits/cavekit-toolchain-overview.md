# Cavekit: Toolchain Migration Overview

## §G Goal
Modernize the build toolchain by migrating to Bun, Lightningcss, and Biome, while eliminating legacy E2E testing overhead (Playwright).

## §I Invariants
- **V1**: The generated static site (`dist/`) must remain identical in structure and CSS correctness.
- **V2**: CI/CD workflows must pass cleanly after each step.
- **V3**: Documentation (`AGENTS.md`, `README.md`) must accurately reflect the new CLI commands (Bun).

## §O Order of Execution
1. **Step 1**: Execute `cavekit-toolchain-step1.md`
   - Purge Playwright completely.
   - Adopt Lightningcss for fast CSS compilation.
2. **Step 2**: Execute `cavekit-toolchain-step2.md`
   - Migrate from npm to Bun.
   - Update CI pipelines and repo docs.
3. **Step 3**: Execute `cavekit-toolchain-step3.md`
   - Initialize Biome for formatting/linting.
   - Format the codebase.
