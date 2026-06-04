import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the h1 block containing data-pagefind-meta
    h1_pattern = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)
    
    def replacer(match):
        h1_block = match.group(1)
        # Extract all data-pagefind-meta attributes
        meta_pattern = re.compile(r'data-pagefind-meta=("[^"]*"|`[^`]*`)')
        metas = meta_pattern.findall(h1_block)
        
        if not metas:
            return h1_block
            
        # Remove them from h1
        cleaned_h1 = meta_pattern.sub('', h1_block)
        
        # Build hidden span block
        hidden_spans = "\n        ".join(f'<span data-pagefind-meta={m} hidden></span>' for m in metas)
        
        return f'{cleaned_h1}\n      {hidden_spans}'

    new_content = h1_pattern.sub(replacer, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.astro'):
            process_file(os.path.join(root, file))
