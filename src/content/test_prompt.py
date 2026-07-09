import os
import subprocess
import json

base_dir = "/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content"
test_file = os.path.join(base_dir, "barons-otherworldly-citadel/power/feats/combat/defending-presence.md")

with open(test_file, "r", encoding="utf-8") as f:
    content = f.read()

prompt = (
    "You are a feat summarizer. Analyze the following Spheres Wiki feat markdown files. "
    "Extract the mechanical essence of each feat and provide a concise 1-sentence summary, "
    "similar to the style found on Aonprd.com. Do not hallucinate mechanical benefits that are not explicitly stated. "
    "Respond ONLY with a valid JSON object mapping the absolute file path to the summary string. "
    "Do not include any markdown formatting (like ```json), just the raw JSON text. "
    "Ensure the JSON is strictly valid.\n\n"
)

prompt += f"File Path: {test_file}\nContent:\n{content}\n\n"

result = subprocess.run(["agy", "--print", prompt], capture_output=True, text=True, check=True)
print("RAW STDOUT:")
print(result.stdout)
