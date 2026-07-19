# QuietPages — Agent Guide

Astro 7 magazine theme. Single-package, no monorepo.

**MUST READ** before developing themes: `docs/astro-theme-guide.md`

## Commands

```bash
npm run dev        # astro dev server
npm run build      # astro build + post-build (scripts/post-build.mjs)
npm run preview    # serve production build
npm run format     # prettier --write .
```

No test runner, linter, or typecheck configured. `npm run build` is the only verification step.

Both `package-lock.json` and `bun.lock` exist. The project uses npm for scripts.

## Architecture

- **Framework**: Astro 7 + Tailwind CSS 4 (Vite plugin, NOT `@astrojs/tailwind`) + MDX
- **Adapter**: `@astrojs/cloudflare` — builds for Cloudflare Pages, not Node.js. `imageService: "compile"` bakes images at build time.
- **Content**: Two collections in `src/content.config.js`:
  - `blog` — `src/content/blog/`. Posts are either `<slug>/index.mdx` with local images beside it, or flat `<slug>.md` files.
  - `photowall` — `src/content/photowall/`. Simple image gallery pages.
- **Config**: `src/config/theme.config.ts` — site metadata, navigation, authors, categories, tags, social links, form endpoints. This is the only config file to edit.
- **Query helpers**: `src/lib/blog-data.js` — all post filtering, sorting, related-posts logic. Re-exports from theme.config.ts.
- **Layouts**: single `src/layouts/BaseLayout.astro`
- **Styles**: `src/styles.css` — Tailwind v4 import, `@font-face` declarations, CSS custom properties (oklch), custom `@utility` blocks (`prose-article`, `callout`), dark mode variant.
- **SEO files**: `src/pages/sitemap.xml.js`, `src/pages/robots.txt.js`, `src/pages/rss.xml.js`
- **Post-build scripts**: `scripts/post-build.mjs` is the single entry point, importing and running: `fix-wrangler-config.mjs` (strips `legacy_env`, adds `assets.not_found_handling: "404-page"` so Cloudflare serves `404.html` for missing routes), `prune-unused-assets.mjs` (removes unreferenced `.jpg/.png` from `dist/_astro/`), and `build-pagefind.mjs` (builds the Pagefind search index from `dist/client/`).
- **Search**: Pagefind (post-build full-text indexing). Headless API in archive page (`src/pages/blog/index.astro`). Scoped to `data-pagefind-body` on `<article>` to exclude nav/footer. CJK character-level indexing is automatic. Single `en` language index used so all posts are searchable from any page — per-post `lang` field exists in schema but is not wired to `<html lang>` to avoid splitting the index.
- **Remote images**: Only allowed from `blogimg.liuxy.space` (configured in `astro.config.mjs` `image.remotePatterns`).

## Tailwind CSS 4 — gotchas

Tailwind v4 has NO `tailwind.config.js`. All config is CSS-based:

- Import: `@import "tailwindcss" source(none);` + `@source "../src";`
- Theme tokens: `@theme inline { ... }` block in `styles.css`
- Dark mode: `@custom-variant dark (&:is(.dark *));` — class-based, toggled via `.dark` on `<html>`
- Custom utilities: `@utility name { ... }` (not `@layer utilities`)
- Color tokens use oklch, defined as CSS custom properties on `:root` and `.dark`

## Content collections

Schema in `src/content.config.js`. ID generation strips `/index.mdx` from the path:

```js
generateId: ({ entry }) => entry.replace(/[\\/]index\.(?:mdx?)$/, "").replace(/\.(?:mdx?)$/, "").replace(/\\/g, "/")
```

Required frontmatter: `title`, `excerpt`, `date`, `category`, `tags`, `author`.

Optional: `thumbnail` (image), `thumbnailAlt` (defaults to `""`), `seoTitle`, `seoDescription`, `canonical`, `updated`, `readingTime`, `featured`, `draft`, `heavy_images`, `math`, `imageCredit`, `lang` (defaults to `"zh"`).

`readingTime` is auto-estimated from body if omitted (220 wpm, code blocks stripped).

Authors, categories, and tags must match slugs defined in `theme.config.ts`.

`math: true` enables KaTeX rendering via remark-math + rehype-katex.

## Heavy images mode

For posts with many large remote images (e.g. photo-heavy travelogues), set `heavy_images: true` in frontmatter. This bypasses Astro's image optimization for inline markdown images, avoiding slow builds caused by downloading and processing dozens of remote files.

```yaml
heavy_images: true
```

| Element | `heavy_images: false` (default) | `heavy_images: true` |
|---------|--------------------------------|---------------------|
| Hero thumbnail (`<Image>`) | Astro `<Image>` with srcsets | Astro `<Image>` with srcsets |
| Inline `![]()` in markdown | Astro image pipeline (download + optimize) | Plain `<img>` with direct CDN URL |
| PostCard thumbnails | Astro `<Image>` | Astro `<Image>` |
| OG/social image | `getImage()` optimized | Raw thumbnail URL |

A remark plugin (`src/lib/heavy-images-remark.mjs`) intercepts markdown image nodes and converts them to raw HTML `<img>` tags before Astro's image pipeline runs. These are wrapped in `<div class="bg-muted">` containers so they get the shimmer loading placeholder.

## Image loading placeholders

All images use a shimmer animation while loading to prevent content shift and indicate loading state:

- **Photowall images**: Inline `style="aspect-ratio:3/2"` on `<img>`, cleared via `onload` to render at natural ratio.
- **Blog post thumbnail**: `style="aspect-ratio:16/10"` on `<Image>`, cleared via `onload`.
- **Heavy content images**: Wrapped in `bg-muted` container by remark plugin, with `aspect-ratio:3/2` cleared on load.
- **PostCard thumbnails / Photowall on index**: Already have fixed `aspect-*` containers — no extra placeholder needed.
- **Rolling hero**: Absolutely positioned, no layout shift.

Global shimmer CSS in `styles.css`: `.bg-muted:has(img:not([complete]))` applies a gradient shimmer to any `bg-muted` container with a loading image.

## Markdown processing (Astro 7)

Astro 7 deprecated `markdown.remarkPlugins` / `markdown.rehypePlugins` in `astro.config.mjs`. Use `markdown.processor` with `unified()` from `@astrojs/markdown-remark` instead:

```js
import { unified } from "@astrojs/markdown-remark";

export default defineConfig({
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, heavyImagesRemark],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
```

## Site URL

Controlled by env vars: `SITE_URL` or `PUBLIC_SITE_URL`. Note: `astro.config.mjs` defaults to `https://liuxy.space` while `theme.config.ts` defaults to `https://quietpages-eta.vercel.app` — set the env var explicitly to avoid mismatch. Must be set before build for correct canonical URLs, sitemap, RSS, and OG tags.

## Formatting

Prettier: 100 char width, semicolons, double quotes, trailing commas. Run `npm run format` before committing.

## Fonts

Self-hosted woff2 in `public/fonts/`. `@font-face` in `src/styles.css`. Three families: Inter (sans), Fraunces (serif), JetBrains Mono (mono). To replace, update both the font files and the `@font-face` blocks.
