#!/usr/bin/env python3
"""Fix all .md content files missing 'id:' in YAML frontmatter."""

import os
import re

content_dir = "src/content"
count = 0

for root, dirs, files in os.walk(content_dir):
    for f in files:
        if not f.endswith(".md"):
            continue
        path = os.path.join(root, f)
        with open(path, "r") as fh:
            content = fh.read()

        # Check if frontmatter exists and has id field
        fm_match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if not fm_match:
            continue  # no frontmatter at all, skip

        fm = fm_match.group(1)
        if re.search(r"^id:", fm, re.MULTILINE):
            continue  # already has id

        # Derive id from filename stem
        id_val = os.path.splitext(f)[0]

        # Insert id: line after the opening ---
        new_content = content.replace(
            fm_match.group(0), f'---\nid: "{id_val}"\n{fm}\n---', 1
        )

        with open(path, "w") as fh:
            fh.write(new_content)
        count += 1

print(f"Fixed {count} files (added missing 'id:' field)")
