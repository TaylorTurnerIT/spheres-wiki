import os, glob

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

missing = 0
for f in sorted(files):
    with open(f, 'r') as fp:
        content = fp.read()
        if "summary: " not in content and "summary:" not in content:
            missing += 1
print(f"Missing summaries: {missing}")
