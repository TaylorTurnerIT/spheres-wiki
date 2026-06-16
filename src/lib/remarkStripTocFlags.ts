import { visit } from 'unist-util-visit';

export default function remarkStripTocFlags() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      visit(node, 'text', (textNode) => {
        textNode.value = textNode.value
          .replace(/\{.toc-include\}/g, '')
          .replace(/\{.toc-exclude\}/g, '')
          .trim();
      });
    });
  };
}
