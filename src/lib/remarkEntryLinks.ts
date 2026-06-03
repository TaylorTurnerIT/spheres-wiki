import { visit } from 'unist-util-visit';
import { getEntryUrl } from './entryDatabase.js';

interface Options {
  base?: string;
}

export default function remarkEntryLinks(options: Options = {}) {
  const base = options.base || '/';
  
  return (tree: any) => {
    visit(tree, 'link', (node: any) => {
      if (node.url && node.url.startsWith('@')) {
        const match = node.url.match(/^@(talent|feat|sphere|class|ability):(.+)$/);
        if (match) {
          // treat @ability as an alias for @talent, since base abilities are technically talents
          const type = match[1] === 'ability' ? 'talent' : match[1];
          const id = match[2];
          const url = getEntryUrl(type, id, base);
          if (url) {
            node.url = url;
          } else {
            console.warn(`[remarkEntryLinks] Unresolved entry link: ${node.url}`);
            node.url = '#'; // Fallback so it doesn't break
          }
        }
      }
    });
  };
}
