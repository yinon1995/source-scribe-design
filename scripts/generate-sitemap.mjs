// scripts/generate-sitemap.mjs
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();

// Markdown posts (legacy)
const CONTENT_MD_DIR = path.join(ROOT, "content", "posts");

// JSON articles (current CMS)
const CONTENT_JSON_DIR = path.join(ROOT, "content", "articles");

const PUBLIC_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(PUBLIC_DIR, "sitemap.xml");

// ✅ Your real site URL
const SITE = "https://a-la-brestoise.vercel.app";

async function readMarkdownPosts() {
  try {
    const files = await fs.readdir(CONTENT_MD_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    const posts = [];

    for (const file of mdFiles) {
      const full = path.join(CONTENT_MD_DIR, file);
      const src = await fs.readFile(full, "utf8");
      const { data } = matter(src);

      const slug = (data.slug || file.replace(/\.md$/, "")).toString();
      const date = (data.date || new Date().toISOString().slice(0, 10)).toString();

      posts.push({ slug, date });
    }

    return posts;
  } catch {
    // Directory may not exist yet — that's fine
    return [];
  }
}

async function readJsonArticles() {
  try {
    const files = await fs.readdir(CONTENT_JSON_DIR);
    const jsonFiles = files.filter(
      (f) => f.endsWith(".json") && f !== "index.json"
    );
    const posts = [];

    for (const file of jsonFiles) {
      const full = path.join(CONTENT_JSON_DIR, file);
      const src = await fs.readFile(full, "utf8");
      const data = JSON.parse(src);

      const slug = (data.slug || file.replace(/\.json$/, "")).toString();
      const date = (data.date || new Date().toISOString().slice(0, 10)).toString();

      posts.push({ slug, date });
    }

    return posts;
  } catch {
    // Directory may not exist yet — that's fine
    return [];
  }
}

function makeUrl(loc, lastmod) {
  return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const mdPosts = await readMarkdownPosts();
  const jsonPosts = await readJsonArticles();
  const allPosts = [...mdPosts, ...jsonPosts];

  const urls = [];

  // Home + articles index
  urls.push(makeUrl(`${SITE}/`, today));
  urls.push(makeUrl(`${SITE}/articles`, today));

  // Individual article pages
  for (const p of allPosts) {
    urls.push(makeUrl(`${SITE}/articles/${p.slug}`, p.date || today));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}
</urlset>
`;

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, xml, "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `Generated sitemap with ${urls.length} urls at public/sitemap.xml`
  );
}

main();
