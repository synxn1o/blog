# 博客个性化改造清单

> 基于 "Quiet Pages" 模板, 目标: 从编辑杂志风格 → 个人生活博客 (旅行 / 摄影 / 随笔)
>
> 最后更新: 2026-07-16

---

## 一、身份与品牌 ✅ 已完成

### 1.1 站点名称与描述
**文件**: `src/config/theme.config.ts`

- [x] `SITE.name` → `"Xiaoyun's blog"`
- [x] `SITE.description` → `"A personal travel blog sharing travel logs, photography, life hacks, and tech tips. Explore honest observations from my journeys and daily life."`
- [x] `SITE.locale` / `SITE.language` → 保持 `en-US` / `en`
- [x] `SITE.repositoryUrl` → `https://github.com/synxn1o/blog.git`

### 1.2 Favicon
- [x] 下载远程 favicon 到 `public/favicon-32x32.png`
- [x] `BaseLayout.astro` 引用更新为 `/favicon-32x32.png`

### 1.3 OG / SEO 默认文本
- [x] `BaseLayout.astro` `<title>` 默认值 → `"Xiaoyun's Blog -- ideas about my travels, photos, and life."`
- [x] `404.astro` → 去掉 "Quiet Pages"

### 1.4 模板文本清理
- [x] `index.astro` hero title → 站名 (slogan 保持不动)
- [x] `about.astro` heading → `"About me."`
- [x] `about.astro` body → 全部重写
- [x] `blog/index.astro` heading → `"The Archive"`, description 更新
- [x] `contact.astro` → **已删除**
- [x] `Footer.astro` → 移除 Contact 链接
- [x] `sitemap.xml.js` → 移除 `/contact` 条目

---

## 二、导航与分类体系 ✅ 已完成

### 2.1 导航菜单
**文件**: `src/config/theme.config.ts` → `NAVIGATION`

```
Home | Writing | Photowall | Links | About
```

### 2.2 分类 (Categories)
**文件**: `src/config/theme.config.ts` → `categories`

- [x] 删除旧静态模板 (`essays`, `design`, `engineering`, `field-notes`, `interviews`)
- [x] 改为空数组, 由 `blog-data.js` 的 `allCategories()` 从文章 frontmatter 动态生成

### 2.3 标签 (Tags)
**文件**: `src/config/theme.config.ts` → `tags`

- [x] 同上, 删除静态模板, 由 `allTags()` 动态生成

### 2.4 作者和友链 (Authors)
**文件**: `src/config/theme.config.ts` → `authors`

**设计**: `authors` 数组同时承担友链和文章作者功能。

```ts
// 每个 author 的结构:
{
  slug: string,          // 唯一标识, 与文章 frontmatter 的 author 字段匹配
  name: string,          // 显示名
  url: string | null,    // 个人主页 URL
  bio: string,           // 简介
  avatar: string,        // 头像 URL
  display?: boolean,     // 默认 true, 设 false 则不在友链页面显示
}
```

**展示逻辑**:
- `display !== false && url` → 出现在 About/Links 的 Friends 区块
- `display: false` → 不出现在友链, 但文章里 author banner 正常显示
- 未知作者 (不在 authors 里) → 显示名字为纯文本, 不可点击

- [x] Xiaoyun 作为博主, `display: false`, `url: null`
- [x] 友链示例已注释, 取消注释即可添加
- [x] 删除 `public/avatars/` 下模板示例头像
- [x] 删除 `authors/[slug].astro` 页面 (不再 filter by author)
- [x] `postsByAuthor` 函数已移除

**Content Schema 新增字段**: `src/content.config.js`
- [x] `original_link: z.string().url().optional()` — 转载文章的原文链接

**Author 链接优先级** (文章页 banner + PostCard):
```
post.original_link > author.url > 只显示名字 (不可点)
```

---

## 三、页面内容重写 ✅ 已完成

### 3.1 About 页面
**文件**: `src/pages/about.astro`

- [x] 全部重写: 个人介绍 + What you'll find + Find me (小红书/学术主页)
- [x] "Contributors" 板块 → Friends 板块 (从 `authors` 数组筛选 `display !== false && url`)
- [x] Friends 为空时自动隐藏整个板块

### 3.2 Contact 页面
- [x] 已删除 (`src/pages/contact.astro`)

### 3.3 Links 页面
**文件**: `src/pages/links.astro` + `src/data/links.json`

- [x] 顶部展示 Friends (和 About 页同步)
- [x] 下方按分类展示链接: `Blogs I Read`, `Photography`, `Travel`, `Other`
- [x] 空分类自动隐藏

### 3.4 Newsletter 组件
**文件**: `src/components/Newsletter.astro`

- [x] 改为 RSS 订阅引导
- [x] compact 模式: 简洁 RSS 链接 (Sidebar 使用)
- [x] 全宽模式: 居中 RSS 订阅区块 (首页底部)

### 3.5 PostCard 组件
**文件**: `src/components/PostCard.astro`

- [x] 三个 variant (compact / list / grid) 均移除 author 展示
- [x] 改为 tags + reading time
- [x] list variant: 显示前 3 个 tag + `min read`
- [x] grid variant: 显示前 3 个 tag + `min`
- [x] compact variant: 仅显示 date + min

### 3.6 文章页 Author Banner
**文件**: `src/pages/blog/[slug].astro`

- [x] Author banner 始终显示 (无论 display 值)
- [x] 有 authorUrl → 点击跳转 (新标签页)
- [x] 无 authorUrl → 纯文本显示
- [x] 优先级: `post.original_link` > `author.url`

### 3.7 Sidebar
**文件**: `src/components/Sidebar.astro`

- [x] 通过 slug `"Xiaoyun"` 匹配博主信息
- [x] Newsletter compact → RSS 订阅

### 3.8 Archive 分页
- [x] Archive 页面 (`blog/index.astro`) 默认显示 10 条
- [x] Index 首页 Latest 保持 5 条

---

## 四、样式与视觉 — 跳过

---

## 五、Reading Time 算法 ✅ 已完成

**文件**: `src/lib/blog-data.js`

- [x] 中文 (默认): 去掉空白后按字符数 ÷ 350 字/分
- [x] 英文 (`lang: "en"`): 按空格分词 ÷ 220 词/分
- [x] 手动设置 `readingTime` 字段可覆盖自动计算

---

## 六、Photowall 影集 ✦ 待处理

### 6.1 照片 alt text
**文件**: `src/content/photowall/photowall.md` + `heroimages.md`

- [ ] 为每张照片写描述性 alt text (有利于 SEO 和无障碍访问)
- [ ] 建议格式: `![阿尔泰山区的星空](url "阿尔泰山区的星空+拍摄地点和时间")`

### 6.2 影集分类 (可选增强)
- [ ] 当前所有照片在一个平铺列表里
- [ ] 未来可以考虑: 按旅行目的地 / 时间 / 主题分组
- [ ] 或者在 photowall 页面顶部加 filter 按钮

### 6.3 照片 remark 信息
- [ ] 部分照片的 `"alt text"` remark 应该替换为有意义的描述
- [ ] hover 时显示的文字 (拍摄地点、时间、故事)

---

## 七、文章内容清理 ✦ 待处理

### 7.1 Frontmatter 统一
- [ ] 所有文章的 `category` 需要与新的分类体系对齐
- [ ] 英文文章 (`Setting-up-Blog`) 属于技术内容, 考虑是否保留

### 7.2 技术文章处理
以下文章偏技术/学术, 与"生活博客"定位不太一致:
- `2025-09-11-使用VLM电子化笔记.md` — AI/技术
- `2024-09-02-Setting-up-Blog.md` — 建站教程
- `2025-08-26-大科学家摩尔根.md` — 学术科普

---

## 八、技术配置 ✦ 待处理

### 8.1 Site URL
- [ ] `astro.config.mjs` 和 `theme.config.ts` 的 URL 不一致 (详见 AGENTS.md)
- [ ] 确定最终域名后, 设置 `SITE_URL` 环境变量

### 8.2 部署目标
- [ ] 当前 adapter 是 `@astrojs/cloudflare` (Cloudflare Pages)
- [ ] 确认最终部署到哪里

### 8.3 远程图片域名
- [ ] 图片来自 `blogimg.liuxy.space`, 确认这个 CDN 长期可用
- [ ] `astro.config.mjs` 的 `remotePatterns` 已配置此域名

---

## 九、可选增强 ✦ 未来迭代

- [ ] **地图标记**: 在游记文章里嵌入地图, 标记去过的地点
- [ ] **时间线页**: 按时间展示旅行足迹
- [ ] **照片 EXIF 信息**: 在影集照片下方显示拍摄参数
- [ ] **阅读进度条**: 长篇游记的阅读体验优化
- [ ] **自定义 404 页面**: 当前 404.astro 可以加入个人风格

---

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/config/theme.config.ts` | SITE 信息、NAVIGATION、categories/tags 清空、authors 重构、FRIENDS 移除 |
| `src/content.config.js` | 新增 `original_link` 字段 |
| `src/lib/blog-data.js` | getAuthor fallback、reading time 双算法、删 postsByAuthor、null safety |
| `src/layouts/BaseLayout.astro` | OG title、favicon 引用 |
| `src/components/PostCard.astro` | 移除 author、改为 tags 展示 |
| `src/components/Newsletter.astro` | 改为 RSS 引导 |
| `src/components/Sidebar.astro` | owner 按 slug 匹配、RSS 订阅 |
| `src/components/Footer.astro` | 移除 Contact 链接 |
| `src/pages/index.astro` | hero title 清理 |
| `src/pages/about.astro` | 全部重写 + Friends 板块 |
| `src/pages/links.astro` | Friends + 分类链接 |
| `src/pages/blog/index.astro` | heading/description 更新、pageSize=10 |
| `src/pages/blog/[slug].astro` | author banner 外部链接 |
| `src/pages/404.astro` | 去掉 Quiet Pages |
| `src/pages/sitemap.xml.js` | 移除 authors/contact 条目 |
| `public/favicon-32x32.png` | 新增 (远程下载) |
| `src/pages/contact.astro` | **已删除** |
| `src/pages/authors/[slug].astro` | **已删除** |
| `public/avatars/*.svg` | **已删除** (3 个模板头像) |
