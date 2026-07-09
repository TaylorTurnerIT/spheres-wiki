import json, os

with open("batch1.json", "r") as fp:
    data = json.load(fp)

paths = sorted(data.keys())

batch_data = {}
for path in paths[:20]:
    content = data[path]
    parts = content.split('---', 2)
    if len(parts) >= 3:
        batch_data[path] = parts[2].strip()

with open("current_batch.json", "w") as fp:
    json.dump(batch_data, fp, indent=2)

for path in paths[:20]:
    del data[path]

with open("batch1.json", "w") as fp:
    json.dump(data, fp)

print("Extracted 20 files. Remaining in batch1.json: ", len(data))
