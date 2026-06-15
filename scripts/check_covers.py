#!/usr/bin/env python3
"""Check which books have missing cover images."""

import os
import re

covers_dir = "src/assets/covers"
existing = set()
if os.path.exists(covers_dir):
    for f in os.listdir(covers_dir):
        existing.add(f)

content_dir = "src/content"
missing = []
for d in sorted(os.listdir(content_dir)):
    book_yaml = os.path.join(content_dir, d, "_book.yaml")
    if not os.path.exists(book_yaml):
        continue
    with open(book_yaml) as fh:
        content = fh.read()
    match = re.search(r'coverImage:\s*["\x27]?([^"\x27\n]+)', content)
    if match:
        img = match.group(1).strip()
        if img and img != "undefined":
            if img not in existing:
                missing.append((d, img))
    else:
        if d != "__built-in__":
            missing.append((d, "NO coverImage FIELD"))

print("Books with missing cover images:")
for book, img in missing:
    print(f"  {book}: {img}")
print(f"\nTotal: {len(missing)} books with missing covers")
