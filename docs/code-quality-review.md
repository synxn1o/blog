# Code Quality Review — QuietPages

**Date:** 2026-07-16
**Scope:** Full codebase review (Astro 7 static blog framework)
**Method:** 6 parallel review agents (correctness, performance, accessibility, architecture, SEO, security) with adversarial verification on each finding.

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 10 |
| 🟡 Medium | 29 |
| 🔵 Low | 27 |
| ⚪ Info | 8 |
| **Total confirmed** | **75** |

---

## 🔴 Critical

### 1. Wrong `<html lang>` on all Chinese blog posts

- **File:** `src/pages/blog/[slug].astro:76`
- **Dimension:** SEO / Correctness

Blog posts never pass `post.lang` to `BaseLayout`, which defaults to `lang="en"`. Since 8/9 posts have `lang: zh` (the schema default), all Chinese articles render `<html lang="en">`. Search engines rely on this attribute to determine content language; misidentifying Chinese as English hurts Chinese-language search rankings.

**Fix:** Add `lang={post.lang}` to the `<BaseLayout>` props in `blog/[slug].astro`.
**IMPORTANT NOTE**: Must force pagesearch use language en regardless of actual language, otherwise, search result will be poluted (known issue).

---

## 🟠 High

### 2. Redundant `getCollection` calls — no memoization

- **File:** `src/lib/blog-data.js:33`
- **Dimension:** Performance

`posts()` re-fetches and re-normalizes the entire collection on every invocation. Functions like `sortedPosts()`, `allCategories()`, `allTags()`, `relatedPosts()`, and `adjacentPosts()` each call `posts()` independently. A single blog post page triggers 4+ full collection scans plus `normalizePost` on every entry.

**Fix:** Memoize at module scope:
```js
let _posts;
export const posts = async () =>
  (_posts ??= (await getCollection("blog", ({ data }) => !data.draft)).map(normalizePost));
```

### 3. SKIPPED (Cloudflare will replace this google font automatically)

Google Fonts stylesheet is render-blocking

- **File:** `src/layouts/BaseLayout.astro:71`
- **Dimension:** Performance

The `<link rel="stylesheet">` for Noto Sans SC / Noto Serif SC is a synchronous, render-blocking CSS request to an external origin. The browser must download, parse, and apply this stylesheet before painting any content. Google services are slow or blocked in China — the primary audience. This undermines the local font preloading already done for Inter and Fraunces.

**Fix:** Self-host the CJK fonts (woff2 with unicode-range splits), consistent with the existing local font approach. Alternatively, use `<link rel="preload" as="style" onload="this.rel='stylesheet'">` with a `<noscript>` fallback.

### 4. Pagefind JS loaded eagerly on every `/blog` visit

- **File:** `src/pages/blog/index.astro:114`
- **Dimension:** Performance

`import('/pagefind/pagefind.js')` fires unconditionally on every page load of `/blog`, downloading ~20-40 KB even when the user never searches. The `await pagefindReady` on line 195 blocks the initial `render()` call until Pagefind finishes loading.

Note: The post cards are server-rendered by Astro and visible before the script runs, so the "delays display" framing is slightly overstated — the actual impact is a brief layout shift when pagination kicks in. The `render()` function already handles `pagefind === null` gracefully (line 153), so the await is unnecessary for non-search loads.

**Fix:** Load Pagefind on search input `focus`/`input` event. Remove the `await pagefindReady` before the first `render()`.

### 5. Active filter state not communicated to assistive technology (blog/index)

- **File:** `src/pages/blog/index.astro:49`
- **Dimension:** Accessibility

Category and tag filter buttons use only CSS classes to indicate the active state (`border-foreground`, `bg-foreground`, `text-background`). There is no `aria-pressed`, `aria-current`, or `aria-selected` attribute. Screen reader users have no way to determine which filter is currently applied. Violates WCAG 4.1.2 (Name, Role, Value).

**Fix:** Add `aria-pressed="true"/"false"` to category filter buttons, toggled in `applyLinkState`.

### 6. Home page category filter buttons lack `aria-pressed`

- **File:** `src/pages/index.astro:131`
- **Dimension:** Accessibility

Same issue as #5. The category filter buttons in the Latest section use CSS classes for active state but no ARIA attributes. The `setActive` function (lines 204-209) only toggles CSS classes.

**Fix:** Add `aria-pressed="true"/"false"` to each category filter button, toggled in `setActive`.

### 7. Mobile menu panel lacks focus trapping

- **File:** `src/components/Header.astro:97`
- **Dimension:** Accessibility

When the mobile menu is opened, focus can tab through the navigation links but can escape to elements behind the panel (main content, footer). The menu uses a simple `hidden` attribute toggle with no `inert`, no `aria-hidden`, no `role="dialog"`. The Escape key handler (lines 181-193) provides partial mitigation but doesn't prevent the initial focus escape.

**Fix:** Add `inert` to main/footer when menu is open, or implement a basic focus trap. Consider adding `role="dialog"` and `aria-modal="true"`.

### 8. BlogPosting JSON-LD missing `publisher` field

- **File:** `src/pages/blog/[slug].astro:63`
- **Dimension:** SEO

The JSON-LD structured data includes `author` but not `publisher`. Google's structured data documentation recommends including a publisher with both name and logo for BlogPosting schema. Missing publisher may prevent rich results from appearing in search.

**Fix:**
```js
publisher: {
  "@type": "Organization",
  name: SITE.name,
  logo: { "@type": "ImageObject", url: "<logo-url>" },
},
```

### 9. Missing article-specific Open Graph meta tags

- **File:** `src/pages/blog/[slug].astro:76`
- **Dimension:** SEO

When `ogType` is `"article"`, BaseLayout does not emit `article:published_time`, `article:modified_time`, or `article:author` Open Graph properties. The data is already available (`post.date`, `post.updated`, `author.name`) and used for JSON-LD, but never passed to BaseLayout or rendered as OG meta tags.

**Fix:** Extend BaseLayout to accept optional article metadata props and conditionally render them when `ogType === "article"`.

### 10. Sitemap missing `/photowall` page

- **File:** `src/pages/sitemap.xml.js:10`
- **Dimension:** SEO

The sitemap includes `/`, `/blog`, `/about`, `/links`, individual blog posts, and category pages, but omits `/photowall`. The photowall page is a top-level navigation item linked from the homepage.

**Fix:** Add `{ path: "/photowall", changefreq: "monthly", priority: "0.6" }` to the entries array.

### 11. XSS via unescaped image URL and alt text in remark plugin

- **File:** `src/lib/heavy-images-remark.mjs:11`
- **Dimension:** Security

The heavy-images remark plugin directly interpolates `node.url` and `node.alt` into raw HTML via a template literal without any escaping. A crafted markdown image like `![test](image.jpg" onerror="alert(1))` would break out of the attribute context and inject arbitrary HTML/script.

Practical exploitability is low since content is author-controlled and built at deploy time, not served from user input. Still worth fixing for defense-in-depth.

**Fix:**
```js
const escAttr = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
```

---

## 🟡 Medium

### 12. `postsByTag` compares raw tag strings against slugified value

- **File:** `src/lib/blog-data.js:74`
- **Dimension:** Correctness

`postsByTag` filters with `(post.tags ?? []).includes(slug)` where `slug` is the lowercased/hyphenated form (e.g. `xinjiang`), but `post.tags` contains the original frontmatter strings (e.g. `Xinjiang`). String `.includes()` is case-sensitive, so tags like `Xinjiang` and `Inner Mongolia` never match. The categories equivalent on line 72 correctly uses `toSlug(post.category) === slug`.

Currently dormant since `tags/[slug].astro` was deleted, but the function is exported and would silently return empty results if used.

**Fix:** `.filter((post) => (post.tags ?? []).some((t) => toSlug(t) === slug))`

### 13. `formatDate` shifts day in non-UTC build environments

- **File:** `src/lib/blog-data.js:99`
- **Dimension:** Correctness

`formatDate` calls `new Date(iso)` where `iso` is a `YYYY-MM-DD` string. The `Date` constructor parses this as midnight UTC, but `toLocaleDateString` formats in the runtime's local timezone. If the build machine is behind UTC (e.g. US timezones), the date shifts to the previous day.

Production builds on Cloudflare are unaffected (UTC), but any local build or CI in a negative-offset timezone will display incorrect dates.

**Fix:** `new Date(iso + "T00:00:00Z")` or split the string and use `new Date(Date.UTC(year, month, day))`.

### 14. Photowall images use raw `<img>` without srcsets or format optimization

- **File:** `src/pages/photowall.astro:31`
- **Dimension:** Performance

The photowall page renders images with plain `<img>` tags sourced from external URLs. No `srcset`, no `sizes`, no WebP/AVIF format negotiation. Every visitor downloads the same full-resolution image regardless of viewport size.

Note: The images are hosted on `cdn.liuxy.space` which may not support server-side resizing, limiting what's actionable from code. Lazy loading is already implemented.

**Fix:** If the CDN supports on-the-fly resizing, construct `srcset` URLs. Otherwise, add `width`/`height` attributes to prevent CLS and `decoding="async"`.

### 15. Naive string-includes matching for asset reference detection

- **File:** `scripts/prune-unused-assets.mjs:33`
- **Dimension:** Correctness

The script reads all reference files into a single concatenated string and checks `references.includes(name)` where `name` is just the filename. A short or common filename could match as a substring of unrelated content.

In practice, Astro content-hashes all asset filenames (e.g. `hero.jpg` → `hero.Dh3a9k2f.jpg`), making coincidental substring matches astronomically unlikely. The code pattern is not best-practice but the practical risk is negligible.

**Fix:** Use proper URL/path regex extraction or check the full asset path rather than just the filename.

### 16. `sortedPosts()` sorts a fresh copy on every call

- **File:** `src/lib/blog-data.js:75`
- **Dimension:** Performance

`sortedPosts()` calls `[...posts()].sort(...)` every time, creating a new sorted array copy. Compounded by the lack of memoization on `posts()`.

**Fix:**
```js
let _sorted;
export const sortedPosts = async () =>
  (_sorted ??= [...(await posts())].sort((a, b) => (a.date < b.date ? 1 : -1)));
```

### 17. Each PostCard independently calls `getCategory()`

- **File:** `src/components/PostCard.astro:6`
- **Dimension:** Performance

Every PostCard instance calls `await getCategory(post.category)` which chains to `allCategories()` → `posts()` → `getCollection()`. On pages rendering 10+ PostCards, this triggers 10+ redundant collection scans.

**Fix:** Pass the resolved category object as a prop from the parent page, or pre-resolve categories on each post before passing to PostCard.

### 18. Reading progress bar not hidden from screen readers

- **File:** `src/pages/blog/[slug].astro:86`
- **Dimension:** Accessibility

The reading progress indicator is a purely visual element that shows scroll progress. It lacks `aria-hidden="true"` and has no role or label. Screen readers will encounter this empty div.

**Fix:** Add `aria-hidden="true"` to the progress bar container.

### 19. Footer section headings use `<div>` instead of heading elements

- **File:** `src/components/Footer.astro:28`
- **Dimension:** Accessibility

The "Sections" (line 28) and "The site" (line 42) labels are styled as `<div>` elements. They function as section headings but are not semantic headings. Screen readers cannot navigate to them by heading level.

**Fix:** Change to `<h2>` or `<h3>` elements and adjust styling, or add `role="heading"` and `aria-level="2"`.

### 20. Sidebar section headings use `<div>` instead of heading elements

- **File:** `src/components/Sidebar.astro:28`
- **Dimension:** Accessibility

The "Categories", "Popular", "Recent", and "Tags" labels are `<div>` elements. Same issue as #19.

**Fix:** Change to `<h2>` or `<h3>` elements, or add `role="heading"` and an appropriate `aria-level`.

### 21. Post navigation `<nav>` lacks `aria-label`

- **File:** `src/pages/blog/[slug].astro:229`
- **Dimension:** Accessibility

The previous/next post navigation is a `<nav>` element without an `aria-label`. When a page has multiple nav landmarks (header nav, breadcrumb nav, post nav), screen readers need labels to distinguish them.

**Fix:** Add `aria-label="Post navigation"` to the `<nav>` element.

### 22. Hero image cycling animation ignores `prefers-reduced-motion`

- **File:** `src/pages/index.astro:183`
- **Dimension:** Accessibility

The `setInterval`-based hero image rotation (lines 183-189) runs unconditionally. Users who have enabled `prefers-reduced-motion` will still see the images cycling every 9 seconds.

**Fix:** Check `window.matchMedia("(prefers-reduced-motion: reduce)")` before starting the interval.

### 23. Tag filter pills may have insufficient touch target size

- **File:** `src/pages/blog/index.astro:62`
- **Dimension:** Accessibility

Tag filter links use `px-2.5 py-0.5 text-xs`, resulting in elements approximately 20-22px tall. Below the WCAG 2.2 AA minimum target size of 24×24 CSS pixels.

**Fix:** Increase padding to at least `py-1.5` to reach 24px minimum height.

### 24. PostCard tag links have very small touch targets

- **File:** `src/components/PostCard.astro:56`
- **Dimension:** Accessibility

Tag links in PostCard use `px-2 py-0.5 text-xs`, resulting in elements approximately 18-20px tall. Below the 24×24px WCAG 2.2 AA minimum target size.

**Fix:** Increase padding to at least `py-1`.

### 25. Hero image alt text may be empty

- **File:** `src/pages/blog/[slug].astro:142`
- **Dimension:** Accessibility

The hero image uses `alt={post.thumbnailAlt || post.imageCredit?.caption || ""}`. If neither `thumbnailAlt` nor `imageCredit.caption` is set, the alt attribute will be empty on a meaningful content image.

**Fix:** Add a fallback: `alt={post.thumbnailAlt || post.imageCredit?.caption || \`Featured image for ${post.title}\`}`.

### 26. Duplicated slug generation logic — `toSlug` inlined 6 times

- **File:** `src/components/PostCard.astro:7`
- **Dimension:** Architecture

The tag/category slug generation pattern `toLowerCase().replace(/\s+/g, "-")` is inlined 6 times across PostCard.astro (lines 7, 17, 33, 55, 89, 129) while `blog-data.js` already has a private `toSlug` function.

**Fix:** Export `toSlug` from `blog-data.js` and import it in PostCard.astro.

### 27. Duplicated `parseImages` regex in index.astro and photowall.astro

- **File:** `src/pages/index.astro:22`
- **Dimension:** Architecture

The identical regex `/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g` is defined as a local `parseImages` function in `index.astro` (line 22-25) and inlined in `photowall.astro` (line 11).

**Fix:** Extract `parseImages` into a shared utility in `src/lib/`.

### 28. Circular re-export/import pattern for `authors`

- **File:** `src/lib/blog-data.js:2`
- **Dimension:** Architecture

Line 2 re-exports `authors` from `theme.config.ts` (`export { authors } from ...`), and line 3 immediately re-imports it (`import { authors } from ...`). This works because ES module live bindings allow reading your own re-exports, but it's confusing and fragile.

**Fix:** Pick one canonical export point — either always import from `theme.config.ts` directly, or always import from `blog-data.js`.

### 29. Untyped `Astro.props` with no defaults for required fields

- **File:** `src/components/PostCard.astro:5`
- **Dimension:** Architecture

PostCard destructures `Astro.props` with no TypeScript interface or JSDoc type annotation for the `post` shape. The component silently breaks if `post` is undefined or missing expected fields.

**Fix:** Define a TypeScript interface (e.g. `NormalizedPost`) and use it as the prop type.

### 30. `blog-data.js` mixes 5 concerns in one file

- **File:** `src/lib/blog-data.js:33`
- **Dimension:** Architecture

This single file handles: (1) post fetching/caching via `getCollection`, (2) post normalization (date formatting, reading time estimation), (3) slug generation, (4) category/tag aggregation, (5) post querying/filtering/sorting, (6) author lookup, (7) date formatting, (8) image URL extraction.

**Fix:** Split into focused modules: `posts.js` (fetching, normalization, querying), `authors.js` (author lookup), `utils.js` (toSlug, formatDate, imageSrc, estimateReadingTime). Re-export from an `index.js` if backward compatibility is needed.

### 31. Footer fetches `allCategories` at build time for every page

- **File:** `src/components/Footer.astro:7`
- **Dimension:** Performance

Footer is rendered on every page via BaseLayout. It calls `await allCategories()` internally, triggering a full collection scan on every page build.

**Fix:** Pass categories as a prop from BaseLayout, or restructure Footer to accept category links as a slot/prop.

### 32. Photowall uses raw `<img>` instead of Astro `<Image>` component

- **File:** `src/pages/photowall.astro:11`
- **Dimension:** Performance

The photowall page renders photos with plain `<img>` tags while `index.astro` uses Astro's `<Image>` component with responsive widths, sizes, and format optimization for similar photo content.

**Fix:** Use Astro's `<Image>` component with appropriate widths/sizes/format, or document why raw `<img>` is intentional (e.g. external CDN without resize support).

### 33. Missing `twitter:site` meta tag

- **File:** `src/layouts/BaseLayout.astro:48`
- **Dimension:** SEO

BaseLayout sets `twitter:card` to `summary_large_image` but does not include a `twitter:site` meta tag. The site's Twitter handle is `@quietpages`. Twitter uses this to attribute the card to the site's account.

**Fix:** Add `<meta name="twitter:site" content="@quietpages" />`.

### 34. RSS feed language tag hardcoded to `en-us` despite mostly Chinese content

- **File:** `src/pages/rss.xml.js:35`
- **Dimension:** SEO

The RSS feed always outputs `<language>en-us</language>` but 8/9 blog posts are in Chinese (`lang: zh`). RSS readers and aggregators use the language tag to categorize feeds.

**Fix:** Change to `<language>zh-cn</language>` (the majority language), or omit the per-feed language tag and note it's bilingual.

### 35. RSS feed missing `lastBuildDate` and `atom:link` self-reference

- **File:** `src/pages/rss.xml.js:28`
- **Dimension:** SEO

The RSS 2.0 feed does not include `<lastBuildDate>` or `<atom:link rel="self">`. Both are recommended by the RSS 2.0 spec. Many feed validators flag their absence.

**Fix:**
```xml
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<atom:link rel="self" href="${BASE_URL}/rss.xml" xmlns:atom="http://www.w3.org/2005/Atom" type="application/rss+xml" />
```

### 36. Breadcrumbs lack JSON-LD `BreadcrumbList` structured data

- **File:** `src/components/Breadcrumbs.astro:1`
- **Dimension:** SEO

The Breadcrumbs component renders visual breadcrumb navigation with `aria-label` but does not emit any JSON-LD BreadcrumbList schema. Google uses BreadcrumbList structured data to display breadcrumb trails in search results.

**Fix:** Add a JSON-LD BreadcrumbList script mapping each item to a ListItem with position, name, and item URL.

### 37. OG image for `heavy_images` posts is raw remote URL without size guarantee

- **File:** `src/pages/blog/[slug].astro:50`
- **Dimension:** SEO

When a post has `heavy_images: true`, the `og:image` is set to the raw remote URL without any processing. Unlike non-heavy posts that get resized to 1200×630 via `getImage()`, heavy_images posts may serve an arbitrarily sized image, which social platforms may crop unpredictably.

**Fix:** Pre-generate a 1200×630 social image at the CDN level (e.g. with `?w=1200&h=630&fit=crop`), or maintain a separate small social image per post.

### 38. Homepage title is not descriptive for SEO

- **File:** `src/pages/index.astro:33`
- **Dimension:** SEO

The homepage title is just `{SITE.name}` which equals "Xiaoyun's blog". This lacks keywords that would help search engines understand the site's topic. The homepage title is the single most important on-page SEO element.

**Fix:** Use a more descriptive title: `Xiaoyun's blog — Travel, Photography & Life` or keep the BaseLayout default which already has a good format.

### 39. JSON-LD `</script>` injection risk

- **File:** `src/layouts/BaseLayout.astro:83`
- **Dimension:** Security

The JSON-LD block uses `set:html={JSON.stringify(jsonLd)}` to inject structured data into a `<script>` tag. `JSON.stringify` does not escape the HTML sequence `</script>`. If a post's title or excerpt contains `</script><script>alert(1)</script>`, it would break out of the script context.

Practical risk is low since content is author-controlled, but it's a defense-in-depth issue.

**Fix:** After `JSON.stringify`, replace `</script` sequences: `JSON.stringify(jsonLd).replace(/<\/script/gi, "<\\/script")`.

### 40. No Content Security Policy (CSP) configured

- **File:** `src/layouts/BaseLayout.astro:72`
- **Dimension:** Security

The site has no `Content-Security-Policy` header or meta tag. Without a CSP, the site has no browser-enforced restrictions on script sources, inline scripts, or resource loading. If an XSS vulnerability exists (see #11, #39), CSP would limit its impact.

**Fix:** Add a CSP via a `_headers` file for Cloudflare Pages. Start restrictive and allowlist only required external origins.

---

## 🔵 Low

### 41. Image URL and alt text injected into HTML without escaping

- **File:** `src/lib/heavy-images-remark.mjs:11`
- **Dimension:** Security

Same root cause as #11 but noted separately for completeness. The remark plugin builds raw HTML with unescaped attribute values.

**Fix:** Escape quotes in `node.url` and `node.alt` before interpolation.

### 42. Duplicate site URL resolution with inconsistent trailing-slash stripping

- **File:** `src/config/theme.config.ts:1`
- **Dimension:** Architecture

Both `astro.config.mjs` (line 11) and `theme.config.ts` (lines 1-5) independently resolve the site URL from the same env vars. `theme.config.ts` strips a trailing slash with `.replace(/\/$/, "")` but `astro.config.mjs` does not.

**Fix:** Resolve the URL in one place and import it in the other.

### 43. `getAuthor` fallback produces empty avatar `<img src="">`

- **File:** `src/lib/blog-data.js:67`
- **Dimension:** Correctness

When an author slug is not found, `getAuthor` returns `{ avatar: "" }`. Every template unconditionally renders `<img src={author.avatar}>`, producing a broken image icon.

**Fix:** Return `null` for unknown authors so the `author &&` guard works, or check `author.avatar` before rendering.

### 44. Prune script only targets `.jpg/.jpeg/.png`, misses `.webp`

- **File:** `scripts/prune-unused-assets.mjs:15`
- **Dimension:** Correctness

`removableExtensions` is limited to `{ '.jpg', '.jpeg', '.png' }`. Since components use `format="webp"` for all images, Astro outputs `.webp` files into `_astro/`. Unused `.webp` files are never cleaned up.

**Fix:** Add `.webp`, `.avif`, and `.gif` to `removableExtensions`.

### 45. Scroll listener registered on all pages even when not on homepage

- **File:** `src/components/Header.astro:173`
- **Dimension:** Performance

The Header script registers `window.addEventListener("scroll", setHeaderScrolled, { passive: true })` on every page. The function early-returns if `homeHeader` is null, but the listener itself is still registered.

**Fix:** Guard the `addEventListener` call: `if (homeHeader) window.addEventListener(...)`.

### 46. Hero carousel images rendered at `quality=95` — excessive

- **File:** `src/pages/index.astro:49`
- **Dimension:** Performance

The hero section images use `quality={95}`, producing very large WebP files. These are background/hero images overlaid with text and gradient layers where high-frequency detail is largely invisible.

**Fix:** Reduce to 78-82. The gradient overlays and text already obscure fine detail, so bandwidth savings (potentially 50-70% smaller files) far outweigh imperceptible quality loss.

### 47. KaTeX CSS loaded from external CDN when math is enabled

- **File:** `src/layouts/BaseLayout.astro:76`
- **Dimension:** Performance

When `math` is true, a `<link rel="stylesheet">` to the jsdelivr CDN for KaTeX is added. This is a render-blocking external stylesheet request.

**Fix:** Self-host the KaTeX CSS file (download to `public/` or bundle it) to eliminate the external DNS lookup + connection setup.

### 48. TOC heading "On this page" is a `<div>`, not a semantic heading

- **File:** `src/components/TableOfContents.astro:8`
- **Dimension:** Accessibility

The "On this page" label is a `<div>` element. It should be a heading so screen reader users can navigate to the TOC section.

**Fix:** Change to `<h2>` or `<h3>`, or add `role="heading"` `aria-level="2"`.

### 49. Breadcrumbs do not use ordered list semantics

- **File:** `src/components/Breadcrumbs.astro:7`
- **Dimension:** Accessibility

The breadcrumb trail uses `<nav>` with nested `<span>` elements instead of the recommended `<ol>/<li>` structure. WAI-ARIA Authoring Practices recommend breadcrumbs as an ordered list within a nav landmark.

**Fix:** Restructure to use `<ol>` with `<li>` elements.

### 50. Share button touch targets are below 44×44px

- **File:** `src/pages/blog/[slug].astro:202`
- **Dimension:** Accessibility

The Twitter and LinkedIn share buttons use `h-8 w-8` (32×32 CSS pixels). WCAG 2.5.5 (AAA) recommends 44×44px. They pass WCAG 2.2 AA (24px minimum) but may be difficult to use on touch devices.

**Fix:** Increase to at least `h-10 w-10` (40px) or `h-11 w-11` (44px).

### 51. Middledot separators announced by screen readers

- **File:** `src/components/PostCard.astro:43`
- **Dimension:** Accessibility

The `&middot;` characters used between category, date, and reading time are announced by screen readers as "middle dot". This adds unnecessary verbosity.

**Fix:** Wrap in `<span aria-hidden="true">` or replace with `<span role="separator">`.

### 52. TOC `<aside>` lacks accessible label

- **File:** `src/pages/blog/[slug].astro:260`
- **Dimension:** Accessibility

The `<aside>` element wrapping the table of contents has no `aria-label`. With multiple landmarks on the page, a label helps screen reader users distinguish the TOC aside.

**Fix:** Add `aria-label="Table of contents"`.

### 53. FORMS config is imported but never used

- **File:** `src/config/theme.config.ts:31`
- **Dimension:** Architecture

The `FORMS` constant defines contact/newsletter form actions with empty `action` strings. It is imported in `Newsletter.astro` but never referenced — the component just renders RSS links.

**Fix:** Remove the `FORMS` export and its import.

### 54. BaseLayout props are untyped

- **File:** `src/layouts/BaseLayout.astro:7`
- **Dimension:** Architecture

BaseLayout destructures 8 props with no type annotations. The default title uses a hardcoded template string, and `ogType` accepts any string.

**Fix:** Define a `Props` interface. Use a union type for `ogType`.

### 55. Empty `categories` and `tags` arrays exported but never consumed

- **File:** `src/config/theme.config.ts:71`
- **Dimension:** Architecture

Lines 71-74 export empty `categories` and `tags` arrays with comments saying they're "dynamically derived from post frontmatter". No file imports these — all consumers call `allCategories()`/`allTags()` from `blog-data.js`.

**Fix:** Remove the empty exports.

### 56. `styles.css` mixes base resets, component styles, and utility definitions

- **File:** `src/styles.css:157`
- **Dimension:** Architecture

The file contains `@layer base` (global resets, accessibility), `@layer components` (skip-link, home-header state machine), and `@utility` definitions (font-serif, prose-article, callout) all in one 450-line file.

**Fix:** Consider splitting into `base.css`, `components/`, and `utilities.css`.

### 57. Newsletter imports FORMS config but never uses it

- **File:** `src/components/Newsletter.astro:2`
- **Dimension:** Architecture

Line 2 imports `FORMS` from `theme.config.ts`, but the component template only renders RSS subscription links. Stale import from a removed or never-implemented feature.

**Fix:** Remove the unused import.

### 58. Site URL normalization duplicated

- **File:** `src/config/theme.config.ts:1`
- **Dimension:** Architecture

`theme.config.ts` normalizes the site URL by stripping trailing slashes. `astro.config.mjs` reads the same env var independently without normalization. If the env var has a trailing slash, the two will produce different URLs.

**Fix:** Centralize the site URL resolution in one place.

### 59. PostCard renders three variants via ternary chain

- **File:** `src/components/PostCard.astro:11`
- **Dimension:** Architecture

PostCard uses a three-level ternary (`compact ? ... : list ? ... : default`) to render completely different DOM structures. Each variant has its own HTML, class names, and data attributes.

**Fix:** Consider splitting into `PostCardCompact`, `PostCardList`, `PostCardDefault` or using named slots.

### 60. Content schema lacks validation for `author` against known authors

- **File:** `src/content.config.js:15`
- **Dimension:** Architecture

The Zod schema validates `author` as `z.string()` but doesn't cross-reference it against the authors list in `theme.config.ts`. A typo silently produces a fallback author with empty avatar.

**Fix:** Add a custom Zod refinement, or handle the mismatch more visibly in `getAuthor()` with a console warning.

### 61. 404 page does not include `noindex` meta tag

- **File:** `src/pages/404.astro:7`
- **Dimension:** SEO

The 404 page renders with standard meta tags but does not include `<meta name="robots" content="noindex">`. While Cloudflare Pages serves the 404.html with a proper 404 status code (which prevents indexing), adding `noindex` is defense-in-depth.

**Fix:** Add `<meta name="robots" content="noindex" />`.

### 62. BlogPosting JSON-LD missing `articleSection` and `wordCount`

- **File:** `src/pages/blog/[slug].astro:71`
- **Dimension:** SEO

The BlogPosting structured data does not include `articleSection` (the post category) or `wordCount`. Not strictly required but helps search engines categorize content.

**Fix:** Add `articleSection: post.category` and compute `wordCount` from the post body.

### 63. BaseLayout default `lang` is hardcoded to `en`

- **File:** `src/layouts/BaseLayout.astro:12`
- **Dimension:** SEO

The BaseLayout defaults `lang` to `"en"`, but no page other than blog posts (which don't pass it at all) overrides this. About, links, photowall, blog index, and category pages all render with `lang="en"` regardless of content language.

**Fix:** Change default to `"zh"` (matching the content schema default), or pass the appropriate lang from each page component.

### 64. Content schema `lang` field defaults to `zh` but SITE config says `en`

- **File:** `src/content.config.js:44`
- **Dimension:** Architecture

The blog schema defaults `lang` to `z.enum(["en", "zh"]).default("zh")`, but `theme.config.ts` sets `SITE.locale: "en-US"` and `SITE.language: "en"`. This inconsistency means the site-level metadata contradicts the content-level metadata.

**Fix:** Align the SITE config with reality. If the site is truly bilingual, consider removing the single-value `SITE.language` field.

### 65. Missing `rel="noopener"` on `target="_blank"` links

- **File:** `src/pages/blog/[slug].astro:202`
- **Dimension:** Security

The share buttons and image credit links use `target="_blank"` with only `rel="noreferrer"`, omitting `rel="noopener"`. While modern browsers default to `noopener` behavior for `target="_blank"` links, older browsers may not.

**Fix:** Add `noopener` to all `rel` attributes on `target="_blank"` links.

### 66. Google Fonts loads external resources, leaking user IP to Google

- **File:** `src/layouts/BaseLayout.astro:72`
- **Dimension:** Security / Privacy

The site self-hosts Inter, Fraunces, and JetBrains Mono but still loads Noto Sans SC and Noto Serif SC from Google Fonts. Each page load sends the user's IP address and user-agent to Google.

**Fix:** Self-host CJK fonts (same as #3). This eliminates both the performance and privacy issues.

### 67. Sitemap XML does not XML-escape interpolated values

- **File:** `src/pages/sitemap.xml.js:32`
- **Dimension:** Security

The sitemap generation interpolates `BASE_URL`, `entry.path`, `entry.lastmod`, `entry.changefreq`, and `entry.priority` directly into XML without escaping. While these values come from developer-controlled sources, it's defense-in-depth.

**Fix:** Add an XML escape helper (similar to the RSS `esc()` function) and apply it to all interpolated values.

---

## ⚪ Info

### 68. Dead export: `getPost`

- **File:** `src/lib/blog-data.js:63`

The `getPost` function is exported but no page or component imports it. Likely used by the now-deleted `authors/[slug].astro` page.

**Fix:** Remove, or document as public API if intended for future use.

### 69. Dead export: `postsByTag`

- **File:** `src/lib/blog-data.js:73`

The `postsByTag` function is exported but no page or component imports it. Used by the now-deleted `tags/[slug].astro` page. Also contains the slug comparison bug described in #12.

**Fix:** Remove, or fix the comparison bug and document if intended for future use.

### 70. Duplicate named export/import of `SITE` and `authors`

- **File:** `src/lib/blog-data.js:2`

Line 2 has `export { SITE, authors } from '../config/theme.config.ts'` (re-export) and line 3 has `import { authors } from '../config/theme.config.ts'` (local import). The `authors` symbol is both re-exported and locally imported from the same source.

**Fix:** Consolidate — either use the re-export pattern for both and import locally what's needed, or import everything locally and export at the bottom.

### 71. Header icon buttons are 36×36px

- **File:** `src/components/Header.astro:71`

The header action buttons (search, RSS, theme toggle, menu) use `h-9 w-9` (36×36 CSS pixels). Meets WCAG 2.2 AA (24px minimum) but falls below WCAG 2.5.5 AAA recommendation of 44×44px.

**Fix:** Consider increasing to `h-10 w-10` (40px) or `h-11 w-11` (44px) for better touch usability.

### 72. Hero section contains hardcoded Chinese text without i18n support

- **File:** `src/pages/index.astro:73`

The hero section has a hardcoded Chinese subtitle alongside English text. The content schema has a `lang` field suggesting bilingual content, but there's no mechanism to switch the UI language.

**Fix:** Acceptable for a personal blog. If i18n is ever needed, move UI strings to a locale file.

### 73. FORMS config has empty action URLs

- **File:** `src/config/theme.config.ts:33`

The `FORMS` configuration has empty `action: ""` strings for both contact and newsletter forms. The Newsletter component has been replaced with an RSS link. Neither form endpoint is used.

**Fix:** Remove the FORMS config entirely (same as #53).

### 74. Pagefind search query reflected safely via `textContent`

- **File:** `src/pages/blog/index.astro:181`

The archive search input value from the URL is rendered into the DOM using `textContent`. This is the correct and safe approach — `textContent` never parses HTML, preventing DOM-based XSS.

**Fix:** No action needed. Continue this pattern.

### 75. Remote image pattern limited to single domain (good)

- **File:** `astro.config.mjs:21`

The `image.remotePatterns` configuration restricts Astro's image optimization to only `cdn.liuxy.space` over HTTPS. This is good security practice that prevents SSRF-like image optimization requests to arbitrary hosts.

**Fix:** No action needed. Add future external image sources explicitly to `remotePatterns`.

---

## Recommended Priority Order

### Fix immediately (1-2 hours)

1. Pass `lang={post.lang}` to BaseLayout (#1) — one-line fix
2. Memoize `posts()` and `sortedPosts()` (#2, #16) — two-line fix
3. Add `/photowall` to sitemap (#10) — one-line fix
4. Escape HTML in heavy-images remark plugin (#11) — three-line fix
5. Fix `postsByTag` slug comparison (#12) — one-line fix
6. Remove dead exports and FORMS config (#53, #68, #69, #73) — cleanup

### Fix this week (2-4 hours)

7. Self-host CJK fonts (#3, #66) — eliminates render-blocking + privacy leak
8. Lazy-load Pagefind (#4) — improves /blog page load
9. Add `aria-pressed` to filter buttons (#5, #6)
10. Add `aria-hidden` to decorative elements (#18, #51)
11. Add JSON-LD publisher + article OG tags (#8, #9)
12. Fix `formatDate` timezone issue (#13)

### Fix when convenient

13. Focus trap for mobile menu (#7)
14. Extract shared utilities — `toSlug`, `parseImages` (#26, #27)
15. Split `blog-data.js` into focused modules (#30)
16. Add CSP header (#40)
17. Add BreadcrumbList JSON-LD (#36)
18. Self-host KaTeX CSS (#47)
