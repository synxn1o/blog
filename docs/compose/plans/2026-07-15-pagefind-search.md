# Pagefind Full-Text Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current substring-match search (title + excerpt only) with Pagefind's full-text search, so users can find posts by content inside the article body.

**Architecture:** Pagefind indexes the built HTML in `dist/` at build time. The archive page loads Pagefind's headless API on demand (~39KB) and uses it for text search. Existing category/tag DOM filtering is preserved. The `data-search` attribute on PostCard is removed since Pagefind handles text search.

**Tech Stack:** Pagefind (dev dependency), existing Astro/Tailwind stack

## Global Constraints

- Cloudflare static output — no server-side search at runtime
- Build script: `astro build && node scripts/prune-unused-assets.mjs` — Pagefind runs after prune
- Existing UI (PostCard variants, category/tag pills, load-more pagination) stays as-is
- Header search bar already redirects to `/blog?q=...` — no changes needed there
- Pagefind index is generated from built HTML in `dist/`, so post content must have semantic structure (it does: `<article>`, `<h1>`, `.prose-article`)

---

### Task 1: Install Pagefind and add postbuild index step

**Covers:** Build pipeline setup

**Files:**
- Modify: `package.json` — add devDependency, update build script
- Create: `scripts/build-pagefind.mjs` — postbuild script that runs Pagefind CLI

- [ ] **Step 1: Install Pagefind**

```bash
npm install -D pagefind
```

- [ ] **Step 2: Create `scripts/build-pagefind.mjs`**

```js
import { execSync } from "node:child_process";

execSync("npx pagefind --site dist --glob \"**/*.html\"", {
  stdio: "inherit",
});
```

- [ ] **Step 3: Update build script in `package.json`**

Change:
```json
"build": "astro build && node scripts/prune-unused-assets.mjs"
```
To:
```json
"build": "astro build && node scripts/prune-unused-assets.mjs && node scripts/build-pagefind.mjs"
```

- [ ] **Step 4: Run build to verify index generation**

```bash
npm run build
```

Expected: Build succeeds, `dist/pagefind/` directory is created with index files.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/build-pagefind.mjs
git commit -m "feat: add Pagefind postbuild index generation"
```

---

### Task 2: Add Pagefind metadata to post pages

**Covers:** Full-text indexing of post content with category/tag metadata for filtering

**Files:**
- Modify: `src/pages/blog/[slug].astro` — add `data-pagefind-meta` attributes to `<article>`

Pagefind indexes all HTML in `dist/` by default. To enable category/tag filtering via Pagefind's filter API, we add metadata attributes to the `<article>` element on each post page.

- [ ] **Step 1: Add metadata attributes to the article element**

In `src/pages/blog/[slug].astro`, change line 89:

From:
```astro
<article class="mx-auto max-w-6xl px-5 py-10">
```
To:
```astro
<article class="mx-auto max-w-6xl px-5 py-10" data-pagefind-meta={`category:${post.category ?? ""}`} data-pagefind-filter={`tag:${post.tags.join(",")}`}>
```

- [ ] **Step 2: Run build to verify metadata is indexed**

```bash
npm run build
```

Expected: Build succeeds. Inspect `dist/pagefind/pagefind-entry-meta.json` (if present) or run `npx pagefind --site dist --search "test"` to confirm the index loads.

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/\[slug\].astro
git commit -m "feat: add Pagefind category/tag metadata to post pages"
```

---

### Task 3: Integrate Pagefind headless API into archive page

**Covers:** Full-text search in archive, preserving existing category/tag filters

**Files:**
- Modify: `src/pages/blog/index.astro` — replace `data-search` substring matching with Pagefind headless API

The archive page's `<script>` currently filters cards by `data-search` substring match. We replace that with Pagefind's `search()` API while keeping category/tag DOM filtering intact.

**Key behavior:**
- No search query → show all posts, filtered by category/tag DOM attributes (current behavior)
- Search query present → Pagefind returns matching post URLs; show only cards whose slug appears in Pagefind results, further filtered by category/tag
- `?q=` URL parameter triggers automatic Pagefind search on page load
- Pagination (load-more) works on the filtered result set

- [ ] **Step 1: Rewrite the archive `<script>` block**

Replace the entire `<script>` block (lines 92–210) in `src/pages/blog/index.astro` with:

```js
  const archive = document.querySelector("[data-archive]");
  if (archive) {
    const pageSize = 5;
    const input = archive.querySelector("[data-archive-query]");
    const clear = archive.querySelector("[data-archive-clear]");
    const form = archive.querySelector("[data-archive-search]");
    const count = archive.querySelector("[data-archive-count]");
    const empty = archive.querySelector("[data-archive-empty]");
    const cards = [...archive.querySelectorAll("[data-post-card]")];
    const moreWrap = archive.querySelector("[data-archive-more-wrap]");
    const more = archive.querySelector("[data-archive-more]");
    const pageText = archive.querySelector("[data-archive-page]");
    const categoryLinks = [...archive.querySelectorAll("[data-category-filter]")];
    const tagLinks = [...archive.querySelectorAll("[data-tag-filter]")];
    const activeCategory = ["border-foreground", "bg-foreground", "text-background"];
    const inactiveCategory = ["border-border", "text-muted-foreground", "hover:text-foreground"];
    const activeTag = ["border-primary", "text-primary"];
    const inactiveTag = ["border-border", "text-muted-foreground", "hover:text-foreground"];

    let pagefind = null;
    const pagefindReady = import("/pagefind/pagefind.js").then((mod) => {
      pagefind = mod;
    });

    const stateFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      return {
        q: params.get("q") || "",
        cat: params.get("cat") || "",
        tag: params.get("tag") || "",
        page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
      };
    };

    const writeUrl = (state) => {
      const params = new URLSearchParams();
      if (state.q) params.set("q", state.q);
      if (state.cat) params.set("cat", state.cat);
      if (state.tag) params.set("tag", state.tag);
      if (state.page > 1) params.set("page", String(state.page));
      const query = params.toString();
      history.pushState(state, "", query ? `/blog?${query}` : "/blog");
    };

    const applyLinkState = (links, activeValue, active, inactive, attr) => {
      links.forEach((link) => {
        const isActive = (link.getAttribute(attr) || "") === activeValue;
        active.forEach((className) => link.classList.toggle(className, isActive));
        inactive.forEach((className) => link.classList.toggle(className, !isActive));
      });
    };

    const render = async (state, updateInput = true) => {
      if (updateInput) input.value = state.q;
      clear.hidden = !state.q;

      let matchingCards = cards;

      if (state.q && pagefind) {
        const results = await pagefind.search(state.q);
        const matchedUrls = new Set(
          results.results.map((r) => new URL(r.url, window.location.origin).pathname),
        );
        matchingCards = cards.filter((card) => {
          const href = card.querySelector("a")?.getAttribute("href") || "";
          return matchedUrls.has(href);
        });
      }

      matchingCards = matchingCards.filter((card) => {
        if (state.cat && card.dataset.category !== state.cat) return false;
        if (state.tag && !(card.dataset.tags || "").split(" ").includes(state.tag)) return false;
        return true;
      });

      const visibleCount = Math.min(matchingCards.length, state.page * pageSize);
      cards.forEach((card) => (card.hidden = true));
      matchingCards.slice(0, visibleCount).forEach((card) => (card.hidden = false));

      count.textContent = `${matchingCards.length} ${matchingCards.length === 1 ? "result" : "results"}${state.q ? ` for "${state.q}"` : ""}`;
      empty.hidden = matchingCards.length > 0;

      const totalPages = Math.max(1, Math.ceil(matchingCards.length / pageSize));
      moreWrap.hidden = visibleCount >= matchingCards.length;
      more.textContent = `Load more (${matchingCards.length - visibleCount} remaining)`;
      pageText.textContent = `Page ${state.page} of ${totalPages}`;

      applyLinkState(categoryLinks, state.cat, activeCategory, inactiveCategory, "data-category-filter");
      applyLinkState(tagLinks, state.tag, activeTag, inactiveTag, "data-tag-filter");
    };

    let state = stateFromUrl();

    await pagefindReady;
    render(state);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      state = { ...state, q: input.value.trim(), page: 1 };
      writeUrl(state);
      render(state, false);
    });

    clear.addEventListener("click", () => {
      state = { ...state, q: "", page: 1 };
      writeUrl(state);
      render(state);
    });

    [...categoryLinks, ...tagLinks].forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const cat = link.getAttribute("data-category-filter");
        const tag = link.getAttribute("data-tag-filter");
        state = {
          ...state,
          cat: cat === null ? state.cat : cat,
          tag: tag === null ? state.tag : state.tag === tag ? "" : tag,
          page: 1,
        };
        writeUrl(state);
        render(state);
      });
    });

    more.addEventListener("click", () => {
      state = { ...state, page: state.page + 1 };
      writeUrl(state);
      render(state, false);
    });

    window.addEventListener("popstate", () => {
      state = stateFromUrl();
      render(state);
    });
  }
```

- [ ] **Step 2: Run build and test locally**

```bash
npm run build && npm run preview
```

Expected: Visit `/blog`, type a search term that appears in post body content (not just title), confirm results appear. Test category/tag filters still work. Test `?q=` URL param auto-triggers search.

- [ ] **Step 3: Commit**

```bash
git add src/pages/blog/index.astro
git commit -m "feat: integrate Pagefind headless API for full-text search"
```

---

### Task 4: Remove legacy `data-search` attributes

**Covers:** Cleanup — `data-search` is no longer used since Pagefind handles text search

**Files:**
- Modify: `src/components/PostCard.astro` — remove `searchable` variable and `data-search` attributes

- [ ] **Step 1: Remove `searchable` variable and `data-search` attributes**

In `src/components/PostCard.astro`:

Remove line 9:
```js
const searchable = `${post.title} ${post.excerpt}`.toLowerCase();
```

Remove all three `data-search={searchable}` attributes (lines 20, 37, 91).

- [ ] **Step 2: Run build to verify no breakage**

```bash
npm run build
```

Expected: Build succeeds. Archive search still works via Pagefind.

- [ ] **Step 3: Commit**

```bash
git add src/components/PostCard.astro
git commit -m "chore: remove unused data-search attributes from PostCard"
```
