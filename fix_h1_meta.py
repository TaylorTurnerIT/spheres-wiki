import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    def replacer(match):
        h1_content = match.group(0)
        lines = h1_content.split('\n')
        new_h1_lines = []
        spans = []
        
        for line in lines:
            if 'data-pagefind-meta=' in line or 'data-pagefind-filter=' in line:
                stripped = line.strip()
                has_closing = False
                if stripped.endswith('>'):
                    stripped = stripped[:-1].strip()
                    has_closing = True
                    
                spans.append(f'      <span {stripped} hidden></span>')
                
                if has_closing:
                    new_h1_lines.append('      >')
            else:
                new_h1_lines.append(line)
                
        spans_str = '\n'.join(spans)
        new_h1 = '\n'.join(new_h1_lines)
        
        if spans:
            return f'{spans_str}\n{new_h1}'
        return new_h1

    new_content = re.sub(r'<h1[^>]*>', replacer, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.astro'):
            process_file(os.path.join(root, file))
