---
title: Setting up Blog
date: 2024-09-02
category: "Notes"
tags: [tech]
excerpt: Setting up blog with Hexo and GitHub Pages.
author: "Xiaoyun"
lang: en
---

## Update Aug. 6 2025

Now I have switched to Hexo for it's scalebility, and partially bcz of end of Github's students pro. Hexo allows to compile static website locally before publish. The old posts migerated to a new Cloundflare page clones my github repo.

+ using theme hexo-theme-next (a modern theme with math support)
+ config hexo-git for only once
+ inject webpage with css styling, AI tools and more!
+ bye bye mathjax tags

known issue:
1. full url required for pictures
2. inject head `<meta name="referrer" content="no-referrer" />` to fix 403
3. need hexo-renderer-pandoc to fix inline formula incompatible issue

TODO:
add AI apps (sum & translate)

---

## Setting up https://synxn1o.github.io

using starter pack from [cotes2020/jekyll-theme-chirpy: A minimal, responsive, and feature-rich Jekyll theme for technical writing. (github.com)](https://github.com/cotes2020/jekyll-theme-chirpy), you can easily build a static blog site by following the instruction.
It converts .md (hugo) to html website with many features including global searching, multi-device rendering, and so on.
To post blogs I have to
1. export markdown file to hugo markdown file using plugins in Obsidian
2. git fetch my repo
3. move .md to ./\_posts/
4. move all attached files to ./assets/, and redirect the files in .md
5. git add . && git commit -m ".."
6. git push -u origin main
7. wait for github to compile it

## Setting up https://liuxy.space
I bought this domain on Aliyun, 188yuan for 10 years. I am now able to CNAME this site to the previous GitHub site. (Using Cloudflare, see below)

## Deposit to Cloudflare
(updated 2024-09-14)
I have deposited the domain to Cloudflare, and now I can use the SSL certificate provided by Cloudflare (valid for 15 years). The CDN (see below), DNS are managed by Cloudflare. Thanks to free cache and SSL services, the site is now faster and more secure. (also compiles faster on GitHub)
Dashboard: [https://dash.cloudflare.com/](https://dash.cloudflare.com/)

## Setting up CDN
Using Cloudflare R2 stroge services (free plan), I can now store the images and other files in the CDN, which is faster and more reliable than GitHub Pages (though the origin server is still GitHub).
The blog image bucket is now at [https://blogimg.liuxy.space](https://blogimg.liuxy.space).

## Notes

1.  After 3 month, I can update the new SSL certificate signed by Cloudflare. (√)
2.  I can host the site to Cloudflare after 60 days (2mo). (x, it takes money)
3.  I need to find a way to automate the process of uploading files to the CDN. 