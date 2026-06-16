# Cavekit: Fallow Codebase Remediation

This kit provides the strategy and patterns for resolving codebase health issues identified by the Fallow audit.

## §G Goal
Improve codebase maintainability by reducing complexity hotspots, eliminating dead code, and stabilizing the dependency tree.

## §I Invariants
- **V1**: ∀ refactor → `npm run test` ! pass.
- **V2**: ∀ refactor → `npm run fallow-audit` ! show improved (lower) CRAP/Cognitive scores.
- **V3**: ⊥ New unlisted dependencies.

## §T Tasks

### T1: Dependency Stabilization
- **Action**: Add unlisted packages used in the codebase to `package.json`.
- **Command**: `npm install zod unified remark-parse remark-rehype rehype-stringify remark-gfm unist-util-visit yaml`
- **Cleanup**: `npm uninstall uipro-cli serve`

### T2: Refactor `src/lib/tags.ts` (Priority: High)
- **Problem**: `buildOrderedTagIds` is a high-impact hotspot (Fan-in 9, Cognitive 30).
- **Strategy**: 
    1. Extract tag priority mapping to a static constant.
    2. Split logic into `getSystemAutoTags(entry)` and `sortTagsByPriority(tagIds)`.
    3. Ensure `TagBadge` component usage remains consistent.

### T3: Refactor `src/lib/inferFromPath.ts` (Priority: High)
- **Problem**: Monolithic `inferFromPath` (Cognitive 56) is a single point of failure for content routing.
- **Strategy**:
    1. Extract path-segment counters into a helper.
    2. Create sub-parsers: `resolveSphereEntry(segments)`, `resolveClassEntry(segments)`, `resolveArchetypeEntry(segments)`.
    3. Add unit tests for edge cases in `tests/lib/inferFromPath.test.ts`.

### T4: Logical Consolidation (Duplication)
- **Problem**: High duplication (55 clones) between classes and scripts.
- **Strategy**:
    1. Execute SPEC tasks **T61–T64** (extract shared Astro components).
    2. Create `scripts/lib/path-utils.mjs` to consolidate duplication between `check-dir-truth.mjs` and `strip-path-fields.mjs`.

### T5: Dead Code Purge
- **Problem**: 19.2% dead files.
- **Strategy**:
    1. Verify if `scripts/archetype-parser.mjs` and `scripts/class-parser.mjs` are still needed for ongoing imports. If not, delete.
    2. Remove unused exports flagged in `scripts/lib/render.mjs` and `scripts/lib/wikidot-markup.mjs`.

## §R Remediation Prompt (Next Agent)
> "Read `SPEC.md`, `AGENTS.md`, and `context/kits/cavekit-fallow-remediation.md`. Your goal is to execute the remediation tasks in the kit to clear the Fallow health flags. Start by stabilizing the dependencies (T1), then move to the high-impact refactors (T2, T3). After each refactor, run `npm run fallow-audit` and `npm test` to verify zero regressions and improved health metrics."
