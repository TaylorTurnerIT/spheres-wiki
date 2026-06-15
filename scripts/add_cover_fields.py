#!/usr/bin/env python3
"""Add coverImage field to _book.yaml files that have a matching .webp cover."""

import os

content_dir = "src/content"

for d in sorted(os.listdir(content_dir)):
    if d == "__built-in__":
        continue
    book_yaml = os.path.join(content_dir, d, "_book.yaml")
    if not os.path.exists(book_yaml):
        continue

    with open(book_yaml) as f:
        lines = f.readlines()

    has_cover = any("coverImage:" in line for line in lines)
    if has_cover:
        continue

    cover_path = f"src/assets/covers/{d}.webp"
    if not os.path.exists(cover_path):
        continue

    # Add coverImage line before the last line or at end
    # Insert after buyUrl line if exists, otherwise at end
    inserted = False
    new_lines = []
    for line in lines:
        new_lines.append(line)
        if not inserted and "buyUrl:" in line:
            new_lines.append(f'coverImage: "{d}.webp"\n')
            inserted = True

    if not inserted:
        # Add at end of file
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] += "\n"
        new_lines.append(f'coverImage: "{d}.webp"\n')

    with open(book_yaml, "w") as f:
        f.writelines(new_lines)

    print(f"✓ {d}: added coverImage")
