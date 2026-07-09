import os
import subprocess
import asyncio

dirs = [
    "expanded-spheres-barons-lost-apocrypha",
    "expanded-spheres-cardcasters-gamble",
    "expanded-spheres-weaves-of-war",
    "cataclysm-handbook",
    "catgirl-handbook",
    "crimson-dancers-handbook",
    "gravecallers-handbook",
    "high-magic-handbook"
]

base_dir = "/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content/"

async def process_file(sem, filepath):
    async with sem:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'summary: "' in content or "summary: '" in content:
            print(f"Skipped {filepath} (already summarized)")
            return

        parts = content.split('---', 2)
        if len(parts) < 3:
            print(f"Skipped {filepath} (no frontmatter found)")
            return
            
        frontmatter = parts[1]
        rest = parts[2]

        prompt = (
            "Read the following feat text and generate a concise 1-sentence summary of its mechanical benefits. "
            "Keep it very brief, similar to Aonprd.com feat summaries. "
            "Never invent any information. Do not hallucinate. Do not wrap the output in quotes. "
            "Output ONLY the summary text, nothing else.\n\n"
            f"Feat text:\n{rest}"
        )

        proc = await asyncio.create_subprocess_exec(
            "agy", "--print", prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            print(f"Error processing {filepath}: {stderr.decode('utf-8')}")
            return

        summary = stdout.decode('utf-8').strip()
        
        # Remove markdown code blocks if the model wrapped it
        if summary.startswith("```"):
            summary = summary.split("\n", 1)[-1]
            if summary.endswith("```"):
                summary = summary[:-3].strip()

        if summary.startswith('"') and summary.endswith('"'):
            summary = summary[1:-1]
        elif summary.startswith("'") and summary.endswith("'"):
            summary = summary[1:-1]

        escaped_summary = summary.replace('"', '\\"')

        new_frontmatter = frontmatter.rstrip() + f'\nsummary: "{escaped_summary}"\n'
        new_content = parts[0] + '---' + new_frontmatter + '---' + rest
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"Updated {filepath} with summary: {escaped_summary}")

async def main():
    find_cmd = ["find"] + [os.path.join(base_dir, d) for d in dirs] + ["-type", "f", "-path", "*/feats/*.md"]
    try:
        output = subprocess.check_output(find_cmd, universal_newlines=True)
        files_to_process = [line.strip() for line in output.split('\n') if line.strip()]
    except subprocess.CalledProcessError as e:
        print("Find command failed:", e)
        return

    print(f"Found {len(files_to_process)} files to process.")
    
    sem = asyncio.Semaphore(15) # bump concurrency slightly for speed
    tasks = [process_file(sem, fp) for fp in files_to_process]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
