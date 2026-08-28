# Migration artifacts

The repository still contains working files from the Wikidot/content migration.
They are intentionally documented here rather than deleted during a routing or
identity change.

## Retained artifacts

- `src/content/batch1.json`, `src/content/batch1_lean.json`, and
  `src/content/current_batch.json` are migration batches. They contain source
  file references and are not imported by Astro or runtime code.
- `src/content/{count_missing,extract_batch,extract_feats,extract_feats_lean,inject_batch,process_feats,summarize,test_agent,test_agy,test_prompt,test_sdk}.py`
  are one-off extraction or validation helpers.
- `src/content/spheres-of-guile/process_summaries.py` is a Guile migration
  helper.
- `process_feats.py`, `split_and_run.sh`, `test_agy.py`, and
  `remaining_feats*.txt` at the repository root are the corresponding migration
  scratch files.

These files are not content collections because Astro discovery only loads
Markdown entries in book folders with `_book.yaml`; they are also excluded from
Biome's source scan. No runtime route or search manifest reads them.

## Reproducibility and removal rule

Before removing an artifact, identify its owner and replacement source, confirm
that no migration script or audit references it, and preserve any needed source
manifest in the sibling migration project. The identity report at
`docs/identity-collision-report.json` is the durable machine-readable record for
the duplicate-id decision; it contains no absolute filesystem paths.
