import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

def process_file(filepath):
    print(f"Processing {filepath}...")
    with open(filepath, 'r') as f:
        content = f.read()
    
    frontmatter = content.split("---")[1] if "---" in content else ""
    if "summary:" in frontmatter:
        print(f"Already has summary: {filepath}")
        return
        
    prompt = (
        "You are the Feat Summarizer subagent for the Spheres Wiki project. "
        "Read the following file and return ONLY a brief 1-sentence summary that captures the mechanical essence of the feat, similar to the style found on Aonprd.com. "
        "NEVER invent fake data. Keep it brief (typically 1 sentence). "
        "Do not include quotes or the word 'Summary' in your output, just the summary text itself. "
        f"File content:\n\n{content}"
    )
    
    result = subprocess.run(["agy", "-p", prompt], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error on {filepath}: {result.stderr}")
        return
        
    summary = result.stdout.strip().strip('"').strip("'")
    summary = summary.replace('"', '\\"')
    
    # insert summary into frontmatter
    lines = content.split('\n')
    if lines[0].strip() == '---':
        for i in range(1, len(lines)):
            if lines[i].strip() == '---':
                lines.insert(i, f'summary: "{summary}"')
                break
                
    new_content = '\n'.join(lines)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Done {filepath}")

if __name__ == '__main__':
    find_cmd = 'find /home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content/ultimate-spheres-of-power/power/feats/ -type f \( -name "[a-d]*.md" -o -name "[A-D]*.md" \)'
    files_str = subprocess.run(find_cmd, shell=True, capture_output=True, text=True).stdout.strip()
    files = [f for f in files_str.split('\n') if f]
    
    filtered_files = []
    for f in files:
        basename = os.path.basename(f)
        if basename[0].lower() in ['a', 'b', 'c', 'd']:
            filtered_files.append(f)
            
    print(f"Found {len(filtered_files)} files to process.")
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(process_file, filtered_files)
        
    print("All done!")
