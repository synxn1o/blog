import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import heavyImagesRemark from "./src/lib/heavy-images-remark.mjs";

const site =
  process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://liuxy.space";

export default defineConfig({
  site,
  output: "server",
  adapter: cloudflare({ imageService: "compile" }),
  cache: {
    provider: cacheCloudflare(),
  },
  image: {
    remotePatterns: [{ protocol: "https", hostname: "blogimg.liuxy.space" }],
  },
  markdown: {
    remarkPlugins: [remarkMath, heavyImagesRemark],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
