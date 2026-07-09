import os
import subprocess
import time

def process():
    files = subprocess.check_output("find . -type f -name '[m-s]*.md' | sort", shell=True).decode().strip().split('\n')
    
    count = 0
    for f in files:
        if not f: continue
        with open(f, 'r') as file:
            content = file.read()
        
        parts = content.split('---\n', 2)
        if len(parts) != 3:
            print(f"Could not parse frontmatter for {f}")
            continue
            
        frontmatter = parts[1]
        if "summary:" in frontmatter:
            print(f"Skipping {f}, already has summary.")
            continue

        prompt = f"Extract the mechanical essence of this feat in 1 brief sentence. Output ONLY the sentence, no markdown, no surrounding quotes. Keep it brief. Example: 'You gain a tumor familiar.' Do not hallucinate details. Feat text:\n{content}"
        
        try:
            # We run agy --print. Note: inside this script, agy will wait for completion because it's just a subprocess.
            # Wait, does agy know it's in the agent environment?
            # It might. We should unset environment variables that make it think it's an agent tool,
            # so it runs synchronously.
            env = os.environ.copy()
            # If there's an env var making it async, maybe not? agy CLI is just a Go binary.
            # The async behavior is from `run_command` tool, not `agy` itself!
            # `run_command` wraps the bash command. So `subprocess.check_output` will block and get the stdout of agy!
            result = subprocess.check_output(["agy", "--print", prompt], env=env).decode().strip()
            summary = result.replace('"', "'") # avoid breaking yaml
            
            new_frontmatter = frontmatter + f'summary: "{summary}"\n'
            new_content = "---\n" + new_frontmatter + "---\n" + parts[2]
            with open(f, 'w') as file:
                file.write(new_content)
            print(f"Updated {f} with summary: {summary}")
            count += 1
        except Exception as e:
            print(f"Error on {f}: {e}")
            
    print(f"Finished processing {count} files.")

if __name__ == '__main__':
    process()
