import json

with open("batch1.json", "r") as fp:
    data = json.load(fp)

lean_data = {}
for path, content in data.items():
    parts = content.split('---', 2)
    if len(parts) >= 3:
        lean_data[path] = parts[2].strip()

print(json.dumps(lean_data, indent=2))
