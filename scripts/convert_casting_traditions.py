import os
import re

archive_dir = "/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheresofpower-wikidot-archive/pages"

def convert_wikidot_to_md(text):
    # Remove CSS modules
    text = re.sub(r'\[\[module CSS\]\].*?\[\[/module\]\]', '', text, flags=re.DOTALL)

    # Remove TOC
    text = re.sub(r'\[\[toc\]\]', '', text)

    # Remove tabview and tab markers
    text = re.sub(r'\[\[tabview\]\]', '', text)
    text = re.sub(r'\[\[tab Ultimate\]\]', '', text)
    text = re.sub(r'\[\[/tab\]\]', '', text)
    text = re.sub(r'\[\[/tabview\]\]', '', text)

    # Remove div markers
    text = re.sub(r'\[\[div.*?\]\]', '', text)
    text = re.sub(r'\[\[/div\]\]', '', text)

    # Remove alignment markers
    text = re.sub(r'\[\[=\]\]', '', text)
    text = re.sub(r'\[\[/=\]\]', '', text)

    # Remove images
    text = re.sub(r'\[\[image.*?\]\]', '', text)

    # Headings
    # Note: Using high levels to avoid clashing with frontmatter name
    text = re.sub(r'^\+ (.*)$', r'## \1', text, flags=re.MULTILINE)
    text = re.sub(r'^\+\+ (.*)$', r'### \1', text, flags=re.MULTILINE)
    text = re.sub(r'^\+\+\+ (.*)$', r'#### \1', text, flags=re.MULTILINE)
    text = re.sub(r'^\+\+\+\+ (.*)$', r'##### \1', text, flags=re.MULTILINE)
    text = re.sub(r'^\+\+\+\+\+ (.*)$', r'###### \1', text, flags=re.MULTILINE)

    # Links [[[target|text]]] or [[[target]]]
    def link_replacer(match):
        target = match.group(1).strip()
        text = match.group(3).strip() if match.group(3) else target

        # Determine type based on common names
        type_prefix = "article"
        lower_target = target.lower()
        if any(s in lower_target for s in ["sphere", "talent", "feat", "class"]):
            # This is naive but better than nothing
            if "sphere" in lower_target: type_prefix = "sphere"
            elif "talent" in lower_target: type_prefix = "talent"
            elif "feat" in lower_target: type_prefix = "feat"
            elif "class" in lower_target: type_prefix = "class"

        # Specific known spheres/classes
        spheres = ["alteration", "blood", "conjuration", "creation", "dark", "death", "destruction", "divination", "enhancement", "fallen-fey", "fate", "illusion", "life", "light", "mana", "mind", "nature", "protection", "telekinesis", "time", "war", "warp", "weather"]
        classes = ["armorist", "mageknight", "elementalist", "eliciter", "hedgewitch", "shifter", "symbiat", "wraith", "incanter", "soul-weaver", "thaumaturge"]

        target_slug = lower_target.replace(" ", "-").replace("'", "")
        if target_slug in spheres: type_prefix = "sphere"
        elif target_slug in classes: type_prefix = "class"

        return f"[{text}](@{type_prefix}:{target_slug})"

    text = re.sub(r'\[\[\[(.*?)((\|)(.*?))?\]\]\]', link_replacer, text)

    # External links [url text]
    text = re.sub(r'\[(http.*?) (.*?)\]', r'[\2](\1)', text)

    # Collapsibles
    text = re.sub(r'\[\[collapsible.*?\]\]', '<details><summary>More Information</summary>\n', text)
    text = re.sub(r'\[\[/collapsible\]\]', '\n</details>', text)

    # Source tags ^^**Source:** ...^^
    text = re.sub(r'\^\^\*\*Source:\*\* (.*?)\^\^', r'<div class="source-tag">Source: \1</div>', text)

    # Horizontal rules ----
    text = re.sub(r'^-{4,}$', '---', text, flags=re.MULTILINE)

    # Wiki Notes ^^...^^
    text = re.sub(r'\^\^(.*?)\^\^', r'<div class="wiki-note">\1</div>', text, flags=re.DOTALL)

    # Bold/Italic
    # Wikidot uses //italic// and **bold** (same as md)
    text = re.sub(r'//(.*?)//', r'*\1*', text)

    # Remove title: line
    text = re.sub(r'^title:.*$', '', text, flags=re.MULTILINE)

    return text.strip()

# Read files
with open(os.path.join(archive_dir, "casting-traditions.txt"), 'r') as f:
    main_text = f.read()

with open(os.path.join(archive_dir, "casting-traditions-2.txt"), 'r') as f:
    sub_text = f.read()

# Merge
combined_text = main_text.replace("[[include casting-traditions-2]]", sub_text)

# Convert
converted_md = convert_wikidot_to_md(combined_text)

# Add frontmatter
frontmatter = """---
id: casting-traditions
name: "Casting Traditions"
type: article
system: power
tags: []
---

"""

final_content = frontmatter + converted_md

# Save to content
output_path = "src/content/ultimate-spheres-of-power/articles/casting-traditions.md"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w') as f:
    f.write(final_content)

print(f"Successfully converted and saved to {output_path}")
