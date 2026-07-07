# Model Orchestration Guide

Operational guidance for orchestrating multi-agent, multi-vendor work in this repo.
Derived from live experimentation during feats-browse build (2026-07-06).
Covers: which models for which work, how to deploy each CLI non-interactively,
and the cross-vendor validation policy.

## 1. Orchestration model

One orchestrator (Claude, main session) plans, decomposes, dispatches, merges.
Subagents do the work. Rules:

- **Worktree isolation ∀ builder agents.** Every agent that edits code runs in its
  own git worktree, commits to its own branch (`<feature>-p<phase><letter>`),
  orchestrator merges. Parallel builders must have disjoint file ownership.
- **Review agents read-only.** Never let a reviewer edit; findings go back to the
  orchestrator, which dispatches fixes to builders.
- **Every phase gate = full `bun run build` inside the agent's worktree** before
  commit (SPEC V34). Fresh worktrees need `bun install` first.
- **Untracked files invisible to worktrees.** Worktree = checkout of a commit.
  Commit plan docs before spawning agents that need them, or inline the content
  in the prompt.
- **Worktree base can lag.** Observed: agent worktrees created from an older
  commit than the current branch tip. Always merge via
  `git merge-base` diffs and merge commits; never assume the agent branched
  from tip.
- **Plan for builder death.** Observed: an Opus builder killed mid-fix by a
  session/usage limit. The worktree survives with partial uncommitted edits —
  inspect `git status`/`git diff` in the dead agent's worktree, keep clean
  self-contained partials, and hand the remaining work to another vendor's
  builder (e.g. Codex via `codex exec --sandbox workspace-write` run inside the
  worktree). Quota exhaustion on one vendor is a reason multi-vendor execution
  exists.

## 2. Model → work-type mapping

| Work type | Model | Why |
|---|---|---|
| Orchestration, decomposition, merge conflict resolution | Claude (main session) | Holds full plan context; only party with task-state overview |
| Mechanical/scoped edits: add a prop, schema field, test extension, doc edits | Claude Sonnet | Cheap, fast; scope fits in a tight brief; observed flawless on Phase 1a (prop + schema + tests, clean gate first try) |
| Refactors touching shared idioms / multiple call sites / build guards | Claude Opus | Needs judgment on parity, API design, guard allowlists; observed on Phase 1b (TomSelect helper extraction) incl. self-directed CRAP-threshold refactor and type-cast tradeoff |
| New multi-file features (components + client JS + page rebuild) | Claude Opus | Cross-file coherence, design-system adherence |
| Driving external CLIs (Codex, agy) for review | Claude Sonnet | Driver work is mechanical: build prompt, run CLI, verify findings against source |
| Independent review, vendor #2 | OpenAI Codex (`codex exec`) | Different training lineage; catches what same-vendor review anchors past |
| Independent review, vendor #3 | Antigravity default model (`agy --print`) | Third lineage (Google); inline-diff review only (see §4 limits) |

Rule of thumb: **complexity of judgment, not size of diff, picks the model.**
A 10-line change to a shared idiom is Opus work; a 300-line test file is Sonnet work.

## 3. Codex CLI (`codex exec`) — non-interactive deployment

Verified: codex-cli 0.142.5.

- Non-interactive subcommand: `codex exec [OPTIONS] [PROMPT]`.
- Prompt via arg; **piped stdin is auto-appended as a `<stdin>` block** — ideal
  for diffs: `cat review.diff | codex exec --sandbox read-only "<review instructions>"`
- Do NOT pass a trailing `-` alongside a prompt arg — codex 0.142.5 rejects it
  as an unexpected positional; stdin appending happens automatically.
- `codex exec review` exists (reviews current repo state) but branch-diff review
  via piped diff + explicit instructions gives tighter control.
- Sandbox: prefer read-only sandboxing for review work; never full-access for
  reviewers.
- `-m/--model` selects model; `-c key=value` overrides config.
- Budget up to 10 min per review run.

**Codex as builder** (verified: applied a 9-fix, 7-file task in one shot, ~6-7
min, ~185k tokens, self-verified with targeted vitest/biome/astro check and
respected "do not commit"):

- Write sandbox: `codex exec -s workspace-write "<prompt>"` (also accepts
  `read-only`, `danger-full-access` — never use the latter for orchestrated work).
- **stdin hang trap:** `codex exec` appends piped stdin to the prompt; in a
  backgrounded/detached shell it prints `Reading additional input from stdin...`
  and blocks forever doing zero work. Also, piping output through `tail` masks
  the timeout's 124 exit code. Run in the FOREGROUND and either pass the prompt
  via `codex exec -s workspace-write - < prompt.md` or redirect `< /dev/null`
  when the prompt is an argv arg.
- **Git LFS vs sandbox in worktrees:** worktrees share the parent `.git`; the
  workspace-write sandbox can't write `.git/lfs/tmp`, so LFS smudge during
  in-sandbox builds fails. Let the driver run the real verification outside the
  sandbox — codex's in-sandbox build result is advisory only.
- Codex applies incidental lint-driven reformatting to touched blocks —
  cosmetic, acceptable; watch for it in diff review.
- Codex respects repo quality gates when told about them: given the Fallow
  CRAP-30 gate in a follow-up round, it extracted named helpers per
  FALLOW_GUIDE patterns unprompted-in-detail. It also invents workarounds for
  sandbox friction (observed: overriding `HOME`/`XDG_CONFIG_HOME` to skip the
  global git-LFS filter for its self-check) — harmless in-sandbox, but reinforces
  that the driver's out-of-sandbox verification is the only result that counts.
- Two-round pattern is normal: round 1 implements, round 2 fixes what the
  repo's strict gates surface. Budget for it.

## 4. Antigravity CLI (`agy`) — non-interactive deployment

Verified: agy 1.0.16. Print mode is fragile; findings from live probes:

**The ONLY reliable pattern:**

```bash
timeout 300 agy --print "<full prompt with all content inlined>"
```

Plain `--print`, default model, everything the model needs pasted into the
prompt string (diff, file contents, instructions).

**Verified failure modes (do NOT do these):**

| Flag/approach | Observed behavior |
|---|---|
| `--print --model "<name>"` | Attaches to a stale unrelated conversation (answered about a different project entirely), then times out. Reproduced twice; flag-induced, retry does not fix |
| `--print --new-project` | Hijacks any prompt into project-scaffolding chat; created files in `~/.gemini/antigravity-cli/scratch/` despite explicit "do not create files" instruction |
| Any prompt requiring file reads / tool use | Print mode hangs on the tool-permission prompt until `--print-timeout` (default 5m) expires |
| `--dangerously-skip-permissions` | Would unblock tool use but auto-approves **everything** including shell; policy-blocked for orchestrated use. Do not reach for it |

**Consequences:**

- agy reviews are **inline-content reviews only**: pipe nothing, mount nothing,
  paste the diff into the prompt. Split diffs >~100KB across calls.
- Model selection is effectively unavailable in print mode; you get the default
  (a Gemini model). Treat agy as "the Google vendor slot", not a specific model.
- **Stale-conversation pollution detector:** if the response references an
  unrelated project or work you didn't ask about, discard it and retry once with
  the plain pattern; if it persists, skip agy for that review and note the gap.
- Always wrap in `timeout` — but budget generously: observed agy spontaneously
  running long repo commands (astro sync/check, validate) during a "review this
  diff" prompt, blowing past 300s. Two mitigations: instruct it explicitly
  **not to run build/test/validate commands** in the prompt, and allow up to
  ~560s wall time. (Tool-use behavior in print mode is inconsistent: file reads
  hung on permissions in one probe, shell commands ran freely in another —
  treat any tool use by agy as unpredictable and forbid it in the prompt.)

## 5. Cross-vendor validation policy

**All merged work must be reviewed by ≥1 non-Anthropic model.** Claude builds,
other vendors check — same-vendor review shares blind spots with the builder.

Per phase:

1. Builder (Claude Sonnet/Opus, worktree) commits to phase branch; full build
   gate clean.
2. Review driver (Claude Sonnet) generates the merge-base diff and runs it
   through **both** Codex (§3 pattern) and agy (§4 pattern) with a
   focus-area prompt: behavior parity, null/undefined hazards, Astro pitfalls
   (View Transitions rebinding, scoped-CSS on JS-injected DOM), repo conventions
   (url() links, `--clr-ns` theming, one-idiom-one-home).
3. Driver **verifies every finding against actual source** (`git show
   <branch>:<path>`) and classifies CONFIRMED / PLAUSIBLE / FALSE POSITIVE.
   External reviewers hallucinate line numbers and pre-existing-issue blame;
   never forward raw findings to a fix agent unverified.
4. Orchestrator triages: CONFIRMED → fix before merge; PLAUSIBLE → judgment
   call, document; FALSE POSITIVE / pre-existing → note, non-blocking.
5. Merge to feature branch only after triage; fixes loop back to step 1 scope.

Reviewer prompts must state the repo's conventions explicitly — external models
don't read CLAUDE.md and will otherwise flag idiomatic code as defects.

## 6. Dispatch checklist (orchestrator)

- [ ] Work package has disjoint file ownership vs other in-flight agents
- [ ] Prompt names exact files, spec sections, and conventions that apply
- [ ] Prompt states verification commands verbatim (`bun install`, `bun run
      test`, `bun run build`, fallow gate) and requires verbatim result reporting
- [ ] Branch name assigned; commit trailer specified
- [ ] Model chosen per §2; worktree isolation on for builders
- [ ] Review scheduled with both external vendors before merge
