import { visit } from "unist-util-visit";

export default function heavyImagesRemark() {
  return (tree, file) => {
    const frontmatter = file.data?.astro?.frontmatter;
    if (!frontmatter?.heavy_images) return;

    visit(tree, "image", (node, index, parent) => {
      if (!parent || index == null) return;
      parent.children[index] = {
        type: "html",
        value: `<img src="${node.url}" alt="${node.alt || ""}" loading="lazy" />`,
      };
    });
  };
}
