import os
import glob
import subprocess
import json
import re

directories = [
    "barons-otherworldly-citadel",
    "barons-secluded-library",
    "barons-uncanny-gateway",
    "card-casting-2-counters-and-control",
    "card-casting-3-volatile-variance",
    "diabolists-handbook"
]

base_dir = "/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content"
all_files = []

for d in directories:
    dir_path = os.path.join(base_dir, d)
    for root, _, files in os.walk(dir_path):
        for f in files:
            if f.endswith(".md"):
                all_files.append(os.path.join(root, f))

print(f"Found {len(all_files)} files.")

def process_batch(batch_files):
    prompt = (
        "You are a feat summarizer. Analyze the following Spheres Wiki feat markdown files. "
        "Extract the mechanical essence of each feat and provide a concise 1-sentence summary, "
        "similar to the style found on Aonprd.com. Do not hallucinate mechanical benefits that are not explicitly stated. "
        "Respond ONLY with a valid JSON object mapping the absolute file path to the summary string. "
        "Do not include any markdown formatting (like ```json), just the raw JSON text. "
        "Ensure the JSON is strictly valid.\n\n"
    )
    
    for fpath in batch_files:
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        prompt += f"File Path: {fpath}\nContent:\n{content}\n\n"
        
    try:
        result = subprocess.run(["agy", "--print", prompt], capture_output=True, text=True, check=True)
        response_text = result.stdout.strip()
        # Clean up any potential markdown formatting from the response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        summaries = json.loads(response_text)
        return summaries
    except Exception as e:
        print(f"Error processing batch: {e}")
        if 'result' in locals():
            print(f"Stdout: {result.stdout}")
            print(f"Stderr: {result.stderr}")
        return None

batch_size = 15
for i in range(0, len(all_files), batch_size):
    batch = all_files[i:i+batch_size]
    print(f"Processing batch {i//batch_size + 1}/{len(all_files)//batch_size + 1}...")
    
    summaries = process_batch(batch)
    if not summaries:
        print("Failed to get summaries for this batch, retrying once...")
        summaries = process_batch(batch)
        if not summaries:
            print("Failed again, skipping batch.")
            continue
            
    for fpath, summary in summaries.items():
        if fpath not in batch:
            # Fix if the LLM returned a relative path or something slightly wrong
            found = False
            for b in batch:
                if b.endswith(fpath) or fpath.endswith(b):
                    fpath = b
                    found = True
                    break
            if not found:
                print(f"Warning: path {fpath} not found in batch.")
                continue
                
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Inject summary before closing ---
            if "summary:" in content:
                print(f"Summary already exists in {fpath}, skipping.")
                continue
                
            # Find the closing --- of frontmatter
            parts = content.split("---", 2)
            if len(parts) >= 3 and parts[0].strip() == "":
                # It has frontmatter
                frontmatter = parts[1]
                # Escape quotes in summary
                safe_summary = summary.replace('"', '\\"')
                new_frontmatter = frontmatter.rstrip() + f'\nsummary: "{safe_summary}"\n'
                new_content = "---\n" + new_frontmatter.lstrip() + "---" + parts[2]
                
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {fpath}")
            else:
                print(f"Could not parse frontmatter in {fpath}")
        except Exception as e:
            print(f"Error updating {fpath}: {e}")
