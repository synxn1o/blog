import { SITE, allCategories, sortedPosts } from "../lib/blog-data.js";

export const prerender = true;

const BASE_URL = SITE.url || "";

export async function GET() {
  const posts = await sortedPosts();
  const categories = await allCategories();
  const entries = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/blog", changefreq: "daily", priority: "0.9" },
    { path: "/about", changefreq: "monthly", priority: "0.6" },
    { path: "/links", changefreq: "monthly", priority: "0.5" },
    { path: "/photowall", changefreq: "monthly", priority: "0.6" },
    ...posts.map((post) => ({
      path: `/blog/${post.slug}`,
      lastmod: post.updated || post.date,
      changefreq: "monthly",
      priority: "0.8",
    })),
    ...categories.map((category) => ({
      path: `/categories/${category.slug}`,
      changefreq: "weekly",
      priority: "0.6",
    })),

  ];

  const urls = entries.map((entry) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${entry.path}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
