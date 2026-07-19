import { visit } from "unist-util-visit";

const escAttr = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function heavyImagesRemark() {
  return (tree, file) => {
    const frontmatter = file.data?.astro?.frontmatter;
    if (!frontmatter?.heavy_images) return;

    visit(tree, "image", (node, index, parent) => {
      if (!parent || index == null) return;
      parent.children[index] = {
        type: "html",
        value: `<img src="${escAttr(node.url)}" alt="${escAttr(node.alt || "")}" loading="lazy" decoding="async" />`,
      };
    });
  };
}
