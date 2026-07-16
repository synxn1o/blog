const siteUrl = (
  import.meta.env.SITE_URL ||
  import.meta.env.PUBLIC_SITE_URL ||
  "https://liuxy.space"
).replace(/\/$/, "");

export const SITE = {
  name: "Xiaoyun's blog",
  description:
    "A personal travel blog sharing travel logs, photography, life hacks, and tech tips. Explore honest observations from my journeys and daily life.",
  url: siteUrl,
  locale: "en-US",
  language: "en",
  repositoryUrl: "https://github.com/synxn1o/blog",
};

export const NAVIGATION = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Writing" },
  { to: "/photowall", label: "Photowall" },
  { to: "/links", label: "Links" },
  { to: "/about", label: "About" },
];

export const CONTACT = {
  email: "hello@example.com",
  socialHandle: "@quietpages",
  socialUrl: "https://x.com/quietpages",
};

export const FORMS = {
  contact: {
    action: "",
    method: "post",
    enctype: "application/x-www-form-urlencoded",
  },
  newsletter: {
    action: "",
    method: "post",
    enctype: "application/x-www-form-urlencoded",
  },
};

export const SOCIAL_LINKS = [
  { href: "/rss.xml", label: "RSS feed", icon: "rss" },
  { href: CONTACT.socialUrl, label: `${SITE.name} on X`, icon: "twitter" },
  { href: SITE.repositoryUrl, label: `${SITE.name} on GitHub`, icon: "github" },
  { href: `mailto:${CONTACT.email}`, label: "Email", icon: "mail" },
];

export const authors = [
  {
    slug: "Xiaoyun",
    name: "Xiaoyun",
    url: "https://liuxy.space",
    bio: "Traveler, photographer, occasional writer.",
    avatar: "https://blogimg.liuxy.space/img/favicons/avatar.JPG",
    display: false, // blog owner — not shown in friend list
  },
  // Friends & contributors — displayed on About/Links when display !== false
  {
     slug: "zerong",
     name: "Zerong",
     url: "https://zerong-sun.github.io/",
     bio: "Stay Curious • Science • Discover World",
     avatar: "https://zerong-sun.github.io/images/icon.jpg",
  },
];

// Categories are dynamically derived from post frontmatter (see blog-data.js)
export const categories: { slug: string; name: string }[] = [];

// Tags are dynamically derived from post frontmatter (see blog-data.js)
export const tags: { slug: string; name: string }[] = [];
