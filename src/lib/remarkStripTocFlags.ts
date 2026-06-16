import { visit } from "unist-util-visit";
import { EXCLUDE_SENTINEL } from "./articleToc";

export default function remarkStripTocFlags() {
  return (tree: any) => {
    visit(tree, "heading", (node: any) => {
      visit(node, "text", (textNode: any) => {
        textNode.value = textNode.value.replace(
          /\{\.toc-exclude\}\s*/g,
          EXCLUDE_SENTINEL,
        );
      });
    });
  };
}
