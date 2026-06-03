import os
import shutil

WIKI_DIR = "/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/src/content"
ULTIMATE = os.path.join(WIKI_DIR, "ultimate-spheres-of-power")
MIGHT = os.path.join(WIKI_DIR, "spheres-of-might")
BARONS = os.path.join(WIKI_DIR, "barons-secluded-library")
STUDIOM = os.path.join(WIKI_DIR, "studio-m-compendium")

def ensure_dir(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)

# 1. Create Studio M- compendium
os.makedirs(STUDIOM, exist_ok=True)
with open(os.path.join(STUDIOM, "_book.yaml"), "w") as f:
    f.write('title: "Studio M- Compendium"\npublisher: "Studio M-"\nsystem: "power"\n')

# 2. Move Masterwork Chronicler to Baron's
mc_src = os.path.join(ULTIMATE, "classes/skald/archetypes/masterwork-chronicler")
mc_dest = os.path.join(BARONS, "classes/skald/archetypes/masterwork-chronicler")
if os.path.exists(mc_src):
    ensure_dir(mc_dest)
    shutil.move(mc_src, mc_dest)

# 3. Clean Masterwork Chronicler files of [SM-]
for root, dirs, files in os.walk(mc_dest):
    for name in files:
        if name.endswith(".md"):
            path = os.path.join(root, name)
            with open(path, "r") as f:
                content = f.read()
            content = content.replace(" [SM—]", "").replace("[SM—]", "").replace(": SM—", "")
            with open(path, "w") as f:
                f.write(content)
            if "-sm.md" in name:
                new_path = os.path.join(root, name.replace("-sm", ""))
                os.rename(path, new_path)

# 4. Move standalone Conduit traits
conduit_src_dir = os.path.join(MIGHT, "classes/conduit")
conduit_dest_dir = os.path.join(STUDIOM, "classes/conduit")
conduit_files = [
    "class-features/imbuement-sm.md",
    "class-traits/conduit-crafted-with-care.md",
    "class-traits/conduit-gearhead.md",
    "class-traits/conduit-mechanical-investiture.md",
    "class-traits/conduit-tinkerer.md"
]
for rel_path in conduit_files:
    src = os.path.join(conduit_src_dir, rel_path)
    if os.path.exists(src):
        dest = os.path.join(conduit_dest_dir, rel_path.replace("-sm", ""))
        ensure_dir(dest)
        shutil.move(src, dest)
        with open(dest, "r") as f:
            content = f.read()
        content = content.replace(" [SM—]", "").replace("[SM—]", "").replace("*Source: SM—*", "")
        with open(dest, "w") as f:
            f.write(content)

# 5. Move standalone Avowed features
avowed_src_dir = os.path.join(ULTIMATE, "classes/paladin/antipaladin/archetypes/avowed/archetype-features")
avowed_dest_dir = os.path.join(STUDIOM, "classes/paladin/antipaladin/archetypes/avowed/archetype-features")
avowed_standalone = [
    "boon-of-purpose-purpose-sm.md",
    "chansons-tales-sm.md",
    "elemental-surge-neutrality-sm.md",
    "invoke-elements-neutrality-sm.md",
    "outrageous-fortune-tales-sm.md",
    "shout-of-triumph-destruction-sm.md",
    "wrathful-focus-destruction-sm.md"
]
for rel_path in avowed_standalone:
    src = os.path.join(avowed_src_dir, rel_path)
    if os.path.exists(src):
        dest = os.path.join(avowed_dest_dir, rel_path.replace("-sm", ""))
        ensure_dir(dest)
        shutil.move(src, dest)
        with open(dest, "r") as f:
            content = f.read()
        content = content.replace(" [SM—]", "").replace("[SM—]", "")
        with open(dest, "w") as f:
            f.write(content)

# 6. Clean Alchemist inline tags
alchemist_dir = os.path.join(ULTIMATE, "classes/alchemist/archetypes")
for arch in ["combat-engineer", "essentialist", "hemetic-philosopher"]:
    path = os.path.join(alchemist_dir, arch, f"{arch}.md")
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
        content = content.replace("[SM—] champion alchemist", "champion alchemist (Studio M—)")
        with open(path, "w") as f:
            f.write(content)

# 7. Clean Champion Medium
medium_path = os.path.join(ULTIMATE, "classes/medium/archetypes/champion-medium/champion-medium.md")
if os.path.exists(medium_path):
    with open(medium_path, "r") as f:
        content = f.read()
    content = content.replace("## Trade Tradition [SM—]", "## Trade Tradition (Studio M—)")
    with open(medium_path, "w") as f:
        f.write(content)

# 8. Clean Explorer
explorer_path = os.path.join(ULTIMATE, "classes/ranger/archetypes/explorer/explorer.md")
if os.path.exists(explorer_path):
    with open(explorer_path, "r") as f:
        content = f.read()
    content = content.replace("### Academic [SM—]", "### Academic (Studio M—)")
    with open(explorer_path, "w") as f:
        f.write(content)

# 9. Clean Hedgewitch
hedgewitch_path = os.path.join(ULTIMATE, "classes/hedgewitch/class-features/list-of-paths.md")
if os.path.exists(hedgewitch_path):
    with open(hedgewitch_path, "r") as f:
        content = f.read()
    content = content.replace("### Fortune [SM—]", "### Fortune (Studio M—)")
    with open(hedgewitch_path, "w") as f:
        f.write(content)

# 10. Split mixed Avowed files
mixed_avowed = {
    "flexible-champion.md": ("### Pledge of Agency [SM—]", "pledge-of-agency.md", "Pledge of Agency"),
    "holy-champion.md": ("### Pledge of Legend [SM—]", "pledge-of-legend.md", "Pledge of Legend"),
    "manavoid-champion.md": ("### Pledge of Condemnation [SM—]", "pledge-of-condemnation.md", "Pledge of Condemnation"),
    "until-it-is-done.md": ("### Pledge of Continuity [SM—]", "pledge-of-continuity.md", "Pledge of Continuity"),
    "pure-champion.md": ("## Avowed and Oathbound Paladin/Antipaladin [SM—]", "avowed-and-oathbound.md", "Avowed and Oathbound Paladin/Antipaladin")
}
for fname, (split_token, out_name, new_title) in mixed_avowed.items():
    path = os.path.join(avowed_src_dir, fname)
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()
        if split_token in content:
            parts = content.split(split_token)
            base_content = parts[0].strip()
            # If there was a preceding HR '---', remove it from base_content
            if base_content.endswith("---"):
                base_content = base_content[:-3].strip()
            
            extracted_content = parts[1].strip()
            
            # Write back cleaned base
            with open(path, "w") as f:
                f.write(base_content + "\n")
            
            # Write new extracted file
            dest_path = os.path.join(avowed_dest_dir, out_name)
            ensure_dir(dest_path)
            with open(dest_path, "w") as f:
                f.write(f"---\nid: {out_name.replace('.md', '')}\nname: \"{new_title}\"\ntags: []\n---\n\n{extracted_content}\n")

# 11. Split Fey Adept
fey_path = os.path.join(ULTIMATE, "classes/fey-adept/class-features/permanent-illusion.md")
fey_dest_dir = os.path.join(STUDIOM, "classes/fey-adept/class-features")
if os.path.exists(fey_path):
    with open(fey_path, "r") as f:
        content = f.read()
    if "# Mimeses [SM—]" in content:
        parts = content.split("# Mimeses [SM—]")
        base_content = parts[0].strip()
        if base_content.endswith("---"):
            base_content = base_content[:-3].strip()
        extracted_content = parts[1].strip()
        
        with open(fey_path, "w") as f:
            f.write(base_content + "\n")
        
        dest_path = os.path.join(fey_dest_dir, "mimeses.md")
        ensure_dir(dest_path)
        with open(dest_path, "w") as f:
            f.write(f"---\nid: mimeses\nname: \"Mimeses\"\ntags: []\n---\n\n{extracted_content}\n")

print("Done")
