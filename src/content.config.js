import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/blog",
    generateId: ({ entry }) =>
      entry
        .replace(/[\\/]index\.(?:mdx?)$/, "")
        .replace(/\.(?:mdx?)$/, "")
        .replace(/\\/g, "/"),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      excerpt: z.string(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      canonical: z.string().url().optional(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      readingTime: z.number().int().positive().optional(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      author: z.string(),
      thumbnail: image().optional(),
      thumbnailAlt: z.string().default(""),
      imageCredit: z
        .object({
          caption: z.string().optional(),
          author: z.string(),
          authorUrl: z.string().url(),
          source: z.string().default("Unsplash"),
          sourceUrl: z.string().url(),
        })
        .optional(),
      heavy_images: z.boolean().default(false),
      math: z.boolean().default(false),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      lang: z.enum(["en", "zh"]).default("zh"),
    }),
});

const photowall = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/photowall",
    generateId: ({ entry }) => entry.replace(/\.md$/, "").replace(/\\/g, "/"),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, photowall };
