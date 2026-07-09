import subprocess
from concurrent.futures import ThreadPoolExecutor

def test_run(i):
    res = subprocess.run(["agy", "-p", f"Reply with the number {i}"], capture_output=True, text=True)
    return res.stdout.strip()

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(test_run, range(5)))
    
print(results)
