# Cavekit: Bun Migration (Step 2)

## §G Goal
Replace `npm` and `node` scripts with `bun` for package management, script execution, and testing to significantly improve local execution speed.

## §T Tasks

### T1: Lockfile & Node_Modules Swap
- Delete `package-lock.json` and `node_modules/`.
- Run `bun install` to generate `bun.lock`.

### T2: Update package.json Scripts
- Ensure the `test` script runs `bun test` or `vitest run`.
- Replace `npm run` with `bun run` in compound scripts (e.g., `bun run validate`).
- Update execution scripts (e.g., replace `node scripts/validate.mjs` with `bun scripts/validate.mjs`).

### T3: Update CI Workflows
- In `.github/workflows/test.yml` and `.github/workflows/deploy.yml`:
  - Replace `actions/setup-node` with `oven-sh/setup-bun`.
  - Replace `npm ci` with `bun install`.
  - Replace all `npm run` commands with `bun run`.

### T4: Documentation Update
- Edit `AGENTS.md` and `README.md`.
  - Replace references of `npm install` with `bun install`.
  - Replace `npm run dev` with `bun run dev`.
  - Replace `npm run build` with `bun run build`.

### T5: Verification
- Run `bun run build` locally.
- Run `bun test`.
