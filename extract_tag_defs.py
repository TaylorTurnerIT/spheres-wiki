import os
import sys
import glob
import re
import json

tags = [
    "acid", "admixture", "aegis", "air", "all", "alter", "amp", "apply", "arcana", "aridity", "auxiliary", "background", "blast-shape", "blast-type", "bleed", "blood-art", "blot", "boast", "body", "champion", "chance", "channeling", "charm", "classification", "cloud", "cognition", "cohort", "cold", "combat", "companion", "consecration", "control", "counterspell", "create", "crystal", "cure", "curse", "darkness", "defiler", "divine", "dominion", "drawback", "dual", "dual-sphere", "duration", "earth", "electric", "electricity", "enhance", "equipment", "ex", "exploit", "expunge", "exsu", "fey-blessing", "fire", "force", "form", "geomancing", "ghost", "ghost-strike", "glamer", "ground", "harvest", "heat", "holy", "instill", "item-creation", "ki", "ki-blaster", "leap", "legendary", "lens", "light", "luck", "magic", "manabond", "mandate", "manipulate", "manipulation", "mantle", "mass", "material", "meld", "metal", "metal-and-plant", "metamagic", "minor-artifact", "momentum", "motif", "mutation", "mythic", "necrosis", "negative", "nimbus", "origin", "plant", "potent", "precipitation", "program", "protokinesis", "proxy", "quicken", "racial", "radiation", "rally", "range", "ritual", "sense", "sensory", "shadow", "shroud", "slam", "sm", "snow", "sonic", "sound", "sp", "space", "spirit", "squadron", "stance", "still", "stone", "storm", "strike", "su", "succor", "suppression", "surreal", "taste-smell", "teamwork", "tension", "time", "totem", "touch", "trade", "transformation", "type", "utility", "vitality", "ward", "warden", "water", "wild-magic", "wind", "word"
]

search_dir = "/var/home/taylort3450/ComputerScience/SpheresRemaster3/spheresofpower-wikidot-archive/pages"
files = glob.glob(os.path.join(search_dir, "*.txt"))

results = {tag: [] for tag in tags}

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    for tag in tags:
        # Look for patterns like "[tag]", "[tag] tag", "[tag] talent"
        pattern1 = r"([^.]*\[" + re.escape(tag) + r"\][^.]*\.)"
        pattern2 = r"([^.]*with the " + re.escape(tag) + r" tag[^.]*\.)"
        pattern3 = r"([^.]*tag is " + re.escape(tag) + r"[^.]*\.)"
        pattern4 = r"([^.]*" + re.escape(tag) + r" tag[^.]*\.)"
        
        matches = re.findall(pattern1, content, re.IGNORECASE) + \
                  re.findall(pattern2, content, re.IGNORECASE) + \
                  re.findall(pattern3, content, re.IGNORECASE) + \
                  re.findall(pattern4, content, re.IGNORECASE)
                  
        if matches:
            unique_matches = list(set(matches))
            for match in unique_matches:
                # Remove newlines and condense spaces
                clean_match = " ".join(match.split())
                results[tag].append({"file": os.path.basename(file_path), "text": clean_match})

with open("tag_definitions.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("Finished extracting tag definitions.")
