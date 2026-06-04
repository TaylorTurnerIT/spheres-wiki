import os
import glob
import re
import urllib.request
import urllib.parse

content_dir = "src/content"
assets_dir = "src/assets/covers"

os.makedirs(assets_dir, exist_ok=True)

book_files = glob.glob(f"{content_dir}/*/_book.yaml")

for file_path in book_files:
    slug = os.path.basename(os.path.dirname(file_path))
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find coverImage
    match = re.search(r'^coverImage:\s*["\']?(http[^"\']+)["\']?', content, re.MULTILINE)
    if match:
        url = match.group(1)
        # Parse extension or default to .webp
        parsed_url = urllib.parse.urlparse(url)
        ext = os.path.splitext(parsed_url.path)[1]
        if not ext:
            ext = ".webp"
        
        filename = f"{slug}{ext}"
        save_path = os.path.join(assets_dir, filename)
        
        print(f"Downloading {url} to {save_path}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(save_path, 'wb') as out_file:
                out_file.write(response.read())
            
            # Replace the coverImage line
            new_line = f'coverImage: "{filename}"'
            new_content = content[:match.start()] + new_line + content[match.end():]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            print(f"Updated {file_path}")
            
        except Exception as e:
            print(f"Failed to download {url}: {e}")
    else:
        # Check if already local
        local_match = re.search(r'^coverImage:\s*["\']?([^"\'h][^"\']+)["\']?', content, re.MULTILINE)
        if local_match:
            print(f"Skipping {file_path}, already local: {local_match.group(1)}")
        else:
            print(f"No coverImage found in {file_path}")
