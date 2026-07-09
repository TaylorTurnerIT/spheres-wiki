#!/bin/bash
mapfile -t files < remaining_feats.txt
total=${#files[@]}
chunk_size=$((total / 3 + 1))

chunk1="${files[@]:0:$chunk_size}"
chunk2="${files[@]:$chunk_size:$chunk_size}"
chunk3="${files[@]:$((chunk_size * 2))}"

prompt_base="You are a Feat Summarizer. Read conversion_prompt.md for the rules: NEVER invent fake data, rely strictly on facts. Read each of the following files, generate a concise summary (max 1 sentence), and inject 'summary: \"your summary\"' into its YAML frontmatter before the closing '---'. Do not change anything else. Use a script or process them directly. Files:"

echo "Starting Codex..."
codex exec --dangerously-bypass-approvals-and-sandbox "$prompt_base $chunk1" > codex.log 2>&1 &

echo "Starting Antigravity..."
agy --dangerously-skip-permissions -p "$prompt_base $chunk2" > agy.log 2>&1 &

echo "Starting Claude Code..."
claude -p "$prompt_base $chunk3" > claude.log 2>&1 &

echo "All 3 CLIs launched in background."
