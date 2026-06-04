import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the h1 block containing data-pagefind
    # Matches from <h1 to >
    h1_pattern = re.compile(r'(<h1[^>]*>)', re.DOTALL)
    
    def replacer(match):
        h1_block = match.group(1)
        
        # Extract all data-pagefind-meta attributes (including JSX `{...}`)
        meta_pattern = re.compile(r'data-pagefind-meta=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})')
        metas = meta_pattern.findall(h1_block)
        
        # Extract all data-pagefind-filter attributes
        filter_pattern = re.compile(r'data-pagefind-filter=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})')
        filters = filter_pattern.findall(h1_block)
        
        if not metas and not filters:
            return h1_block
            
        # Clean the h1 block
        cleaned_h1 = meta_pattern.sub('', h1_block)
        cleaned_h1 = filter_pattern.sub('', cleaned_h1)
        
        # Build hidden span block
        hidden_spans = []
        for m in metas:
            hidden_spans.append(f'<span data-pagefind-meta={m.split("=", 1)[1]} hidden></span>')
        for f_attr in filters:
            hidden_spans.append(f'<span data-pagefind-filter={f_attr.split("=", 1)[1]} hidden></span>')
            
        spans_str = "\n        ".join(hidden_spans)
        
        # If we previously inserted spans incorrectly outside the h1, we'll try to clean them up later.
        # But for now, just append them inside the h1 or immediately after it.
        # We'll append immediately after the h1.
        return f'{cleaned_h1}'

    # Wait, if we replace <h1 ...>, we need to put the spans AFTER the </h1>
    # It's better to match the full <h1 ...> ... </h1>
    pass

def process_file_full(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
        
    full_h1_pattern = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)
    
    def replacer(match):
        h1_block = match.group(1)
        
        meta_pattern = re.compile(r'data-pagefind-meta=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})')
        metas = meta_pattern.findall(h1_block)
        
        filter_pattern = re.compile(r'data-pagefind-filter=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})')
        filters = filter_pattern.findall(h1_block)
        
        if not metas and not filters:
            return h1_block
            
        cleaned_h1 = meta_pattern.sub('', h1_block)
        cleaned_h1 = filter_pattern.sub('', cleaned_h1)
        
        hidden_spans = []
        for m in metas:
            hidden_spans.append(f'<span data-pagefind-meta={m.split("=", 1)[1]} hidden></span>')
        for f_attr in filters:
            hidden_spans.append(f'<span data-pagefind-filter={f_attr.split("=", 1)[1]} hidden></span>')
            
        spans_str = "\n        ".join(hidden_spans)
        
        return f'{cleaned_h1}\n      {spans_str}'

    new_content = full_h1_pattern.sub(replacer, content)
    
    # Also clean up the garbage from fix_meta.py V1
    # <span data-pagefind-meta="system:Spheres of Power" hidden></span>
    bad_spans = re.compile(r'<span data-pagefind-meta="[^"]*" hidden></span>\s*')
    # BUT wait! If I just inserted them, they are valid! I shouldn't delete them unless I delete all of them.
    # Actually, I'll delete ALL <span data-pagefind-meta... hidden></span> and <span data-pagefind-filter... hidden></span> 
    # FIRST, then run the full h1 replacer!
    # Wait, if I delete them first, where do I get the metas from? 
    # V1 only extracted double-quoted ones. So the JSX ones are STILL in the h1.
    pass

