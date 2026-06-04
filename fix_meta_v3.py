import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We need to find the <h1 ...> ... </h1> block
    pattern = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)
    
    def replacer(match):
        h1_block = match.group(1)
        
        # In this h1_block, we have data-pagefind-meta="..." or ={`...`}
        # We also have data-pagefind-filter="..."
        # Let's extract all of them using a generous regex
        meta_pattern = re.compile(r'data-pagefind-(meta|filter)=([^\s>]+)')
        # Wait, the value might have spaces if it's "system:Spheres of Power"
        # Let's match the exact strings:
        # data-pagefind-meta="[^"]*"
        # data-pagefind-meta={`[^`]*`}
        # data-pagefind-meta={[^}]*}
        
        attr_regex = re.compile(r'data-pagefind-(meta|filter)=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})')
        attrs = attr_regex.findall(h1_block) 
        # findall only returns the capture group (meta or filter). We need the full match.
        full_attrs = [m.group(0) for m in re.finditer(r'data-pagefind-(meta|filter)=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})', h1_block)]
        
        if not full_attrs:
            return h1_block
            
        cleaned_h1 = re.sub(r'\s*data-pagefind-(meta|filter)=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})', '', h1_block)
        
        spans = []
        for attr in full_attrs:
            # e.g. attr is data-pagefind-meta={`title:${feat.name}`}
            # We convert it to <span data-pagefind-meta={`title:${feat.name}`} hidden></span>
            # BUT we also want tags to use the full array!
            # If attr contains tags:, we can just replace it.
            # Actually, just wrapping them in <span> works perfectly!
            spans.append(f'<span {attr} hidden></span>')
            
        spans_str = "\n      ".join(spans)
        
        return f'{cleaned_h1}\n      {spans_str}'

    new_content = pattern.sub(replacer, content)
    
    # Also remove any leftover <span data-pagefind-meta="system:Spheres of Power" hidden></span> from V1
    # Actually, the V1 script put them immediately after the </h1>!
    # Let's just remove the exact ones V1 inserted if they are redundant, OR just remove ALL <span data-pagefind... hidden></span> 
    # BEFORE we run the h1 replacement!
    
    # Let's do this:
    pass

def run():
    for root, _, files in os.walk('src/pages'):
        for file in files:
            if file.endswith('.astro'):
                filepath = os.path.join(root, file)
                
                with open(filepath, 'r') as f:
                    content = f.read()
                    
                # Clean V1 spans
                cleaned_content = re.sub(r'\s*<span data-pagefind-(meta|filter)=[^>]* hidden></span>', '', content)
                
                # Now run the replacer
                pattern = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)
                
                def replacer(match):
                    h1_block = match.group(1)
                    full_attrs = [m.group(0) for m in re.finditer(r'data-pagefind-(meta|filter)=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})', h1_block)]
                    if not full_attrs:
                        return h1_block
                    cleaned_h1 = re.sub(r'\s*data-pagefind-(meta|filter)=(?:"[^"]*"|`[^`]*`|\{[^\}]*\})', '', h1_block)
                    
                    spans = []
                    for attr in full_attrs:
                        spans.append(f'<span {attr} hidden></span>')
                    spans_str = "\n        ".join(spans)
                    
                    return f'{cleaned_h1}\n        <div class="pagefind-meta-hidden" data-pagefind-ignore="all">\n          {spans_str}\n        </div>'

                new_content = pattern.sub(replacer, cleaned_content)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Fixed {filepath}")

run()
