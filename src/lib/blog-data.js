import { getCollection } from "astro:content";
export { SITE, authors } from "../config/theme.config.ts";
import { authors } from "../config/theme.config.ts";

const isoDate = (date) => date?.toISOString().slice(0, 10);
const wordsPerMinute = 220;
const charsPerMinute = 350;

const stripMarkup = (text = "") =>
  text.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>/g, " ").trim();

const estimateReadingTime = (text = "", lang = "zh") => {
  const clean = stripMarkup(text);
  if (lang === "en") {
    const words = clean.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }
  // Chinese: count non-whitespace characters
  const chars = clean.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / charsPerMinute));
};

export const imageSrc = (image) => (typeof image === "string" ? image : image?.src);

export const normalizePost = (entry) => ({
  slug: entry.id,
  ...entry.data,
  date: isoDate(entry.data.date),
  updated: isoDate(entry.data.updated),
  readingTime: entry.data.readingTime ?? estimateReadingTime(entry.body, entry.data.lang),
});

export const posts = async () =>
  (await getCollection("blog", ({ data }) => !data.draft)).map(normalizePost);

const toSlug = (name) => name.toLowerCase().replace(/\s+/g, "-");

export const allCategories = async () => {
  const all = await posts();
  const seen = new Map();
  for (const post of all) {
    if (post.category && !seen.has(toSlug(post.category))) {
      seen.set(toSlug(post.category), { slug: toSlug(post.category), name: post.category });
    }
  }
  return [...seen.values()];
};

export const allTags = async () => {
  const all = await posts();
  const seen = new Map();
  for (const post of all) {
    for (const tag of post.tags || []) {
      const slug = toSlug(tag);
      if (!seen.has(slug)) {
        seen.set(slug, { slug, name: tag });
      }
    }
  }
  return [...seen.values()];
};

export const getPost = async (slug) => (await posts()).find((post) => post.slug === slug);
export const getAuthor = (slug) => {
  const found = authors.find((a) => a.slug === slug);
  if (found) return { ...found, display: found.display ?? true };
  return { slug, name: slug, url: null, bio: "", avatar: "", display: false };
};
export const getCategory = async (slug) => (await allCategories()).find((c) => c.slug === slug);
export const getTag = async (slug) => (await allTags()).find((t) => t.slug === slug);
export const postsByCategory = async (slug) =>
  (await sortedPosts()).filter((post) => post.category === slug);
export const postsByTag = async (slug) =>
  (await sortedPosts()).filter((post) => (post.tags ?? []).includes(slug));
export const sortedPosts = async () =>
  [...(await posts())].sort((a, b) => (a.date < b.date ? 1 : -1));
export const featuredPost = async () => {
  const sorted = await sortedPosts();
  return sorted.find((post) => post.featured) ?? sorted[0];
};
export const popularPosts = async () => (await sortedPosts()).slice(0, 4);
export const relatedPosts = async (post, n = 3) =>
  (await sortedPosts())
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((a, b) => {
      const score = (candidate) =>
        (candidate.category === post.category ? 2 : 0) +
        (candidate.tags ?? []).filter((tag) => (post.tags ?? []).includes(tag)).length;
      return score(b) - score(a);
    })
    .slice(0, n);

export const adjacentPosts = async (post) => {
  const sorted = await sortedPosts();
  const index = sorted.findIndex((candidate) => candidate.slug === post.slug);
  return { prev: sorted[index + 1], next: sorted[index - 1] };
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
