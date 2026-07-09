import os, glob, json

base_dirs = [
    "barons-otherworldly-citadel",
    "barons-secluded-library",
    "barons-uncanny-gateway",
    "card-casting-2-counters-and-control",
    "card-casting-3-volatile-variance",
    "diabolists-handbook"
]
base_path = "/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content"

files = []
for d in base_dirs:
    pattern = os.path.join(base_path, d, "**", "feats", "**", "*.md")
    files.extend(glob.glob(pattern, recursive=True))

result = {}
count = 0
for f in sorted(files):
    with open(f, 'r') as fp:
        content = fp.read()
        if "summary: " not in content and "summary:" not in content:
            result[f] = content
            count += 1
            if count >= 35:
                break

with open("batch1.json", "w") as fp:
    json.dump(result, fp)
print(f"Extracted {len(result)} files to batch1.json")
