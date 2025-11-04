import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content", "posts");
const PUBLIC_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(PUBLIC_DIR, "sitemap.xml");

const SITE = "https://YOUR-DOMAIN.example"; // replace in prod

async function readPosts() {
  try {
    const files = await fs.readdir(CONTENT_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    const posts = [];
    for (const file of mdFiles) {
      const full = path.join(CONTENT_DIR, file);
      const src = await fs.readFile(full, "utf8");
      const { data } = matter(src);
      const slug = (data.slug || file.replace(/\.md$/, "")).toString();
      const date = (data.date || new Date().toISOString().slice(0, 10)).toString();
      posts.push({ slug, date });
    }
    return posts;
  } catch {
    return [];
  }
}

function makeUrl(loc, lastmod) {
  return `\n  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
}

async function main() {
  const posts = await readPosts();
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  urls.push(makeUrl(`${SITE}/`, today));
  urls.push(makeUrl(`${SITE}/articles`, today));
  for (const p of posts) {
    urls.push(makeUrl(`${SITE}/articles/${p.slug}`, p.date));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}\n</urlset>\n`;
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, xml, "utf8");
  // eslint-disable-next-line no-console
  console.log(`Generated sitemap with ${urls.length} urls at public/sitemap.xml`);
}

main();


