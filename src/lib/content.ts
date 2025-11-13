// Lightweight Markdown content loader using import.meta.glob and simple frontmatter parsing

export type PostFrontmatter = {
  title: string;
  slug: string;
  date: string; // ISO string YYYY-MM-DD
  summary: string;
  tags?: string[];
  heroImage?: string;
  category?: string;
  readingMinutes?: number;
};

export type Post = PostFrontmatter & {
  body: string;
  sources?: string[];
};

type RawPost = {
  path: string;
  source: string;
};

const rawModules = import.meta.glob("/content/posts/*.md", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

const rawPosts: RawPost[] = Object.entries(rawModules).map(([path, source]) => ({ path, source }));

function parseFrontmatter(source: string): { data: Record<string, unknown>; content: string } {
  // Expect YAML frontmatter delimited by ---
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(source);
  if (!match) {
    return { data: {}, content: source };
  }
  const yaml = match[1];
  const content = match[2] || "";
  const data: Record<string, unknown> = {};

  // Minimal YAML parsing for simple key/values (string, array of strings)
  // This is intentionally tiny to avoid adding a parser at runtime; the sitemap script uses gray-matter.
  const lines = yaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let arrayMode = false;
  const arrayValues: string[] = [];
  for (const line of lines) {
    if (/^\s*-\s+/.test(line) && currentKey) {
      arrayMode = true;
      const val = line.replace(/^\s*-\s+/, "").trim();
      arrayValues.push(stripQuotes(val));
      continue;
    }
    if (arrayMode && /^\s{2,}-\s+/.test(line)) {
      const val = line.replace(/^\s*-\s+/, "").trim();
      arrayValues.push(stripQuotes(val));
      continue;
    }
    if (arrayMode) {
      // flush array
      if (currentKey) data[currentKey] = [...arrayValues];
      arrayValues.length = 0;
      arrayMode = false;
      currentKey = null;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      const raw = kv[2]?.trim() ?? "";
      if (raw.startsWith("[")) {
        // simple inline array: ["a", "b"]
        const arr = raw
          .replace(/^\[/, "")
          .replace(/\]$/, "")
          .split(",")
          .map((s) => stripQuotes(s.trim()))
          .filter(Boolean);
        data[currentKey] = arr;
        currentKey = null;
      } else if (raw.length > 0) {
        data[currentKey] = stripQuotes(raw);
        currentKey = null;
      } else {
        // could be multi-line array next
      }
    }
  }
  if (arrayMode && currentKey) {
    data[currentKey] = [...arrayValues];
  }
  return { data, content };
}

function stripQuotes(s: string): string {
  return s.replace(/^"/, "").replace(/"$/, "").replace(/^'/, "").replace(/'$/, "");
}

// Simple reading time estimator (French ~200 wpm)
export function estimateMinutes(text: string, wpm = 200) {
  const words = text
    .replace(/[`*_#>!\[\]\(\)`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}

function coerceFrontmatter(data: Record<string, unknown>, fallbackSlug: string): PostFrontmatter {
  const fm: PostFrontmatter = {
    title: String(data.title ?? ""),
    slug: String(data.slug ?? fallbackSlug),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    summary: String(data.summary ?? ""),
    tags: Array.isArray(data.tags) ? (data.tags as unknown[]).map(String) : undefined,
    heroImage: data.heroImage ? String(data.heroImage) : undefined,
  };
  return fm;
}

const posts: Post[] = rawPosts.map((rp) => {
  const { data, content } = parseFrontmatter(rp.source);
  const fallbackSlug = rp.path.split("/").pop()!.replace(/\.md$/, "");
  const fm = coerceFrontmatter(data, fallbackSlug);
  const readingMinutes = estimateMinutes(`${fm.summary}\n\n${content}`);
  return { ...fm, body: content, readingMinutes };
});

// New JSON-based articles (published via /api/publish)
export type JsonArticle = {
  title: string;
  slug: string;
  category: "Commerces & lieux" | "Expérience" | "Beauté";
  tags: string[];
  cover: string;
  excerpt: string;
  body: string; // markdown
  author: string;
  date: string; // ISO
  readingMinutes?: number;
  sources?: string[];
};

// Load any JSON articles if present. When none exist, the globs will be empty.
const jsonArticleModules = import.meta.glob("/content/articles/*.json", { eager: true }) as Record<string, any>;

const jsonArticles: JsonArticle[] = Object.values(jsonArticleModules)
  .map((mod: any) => (mod && typeof mod === "object" && "default" in mod ? (mod as any).default : mod))
  .filter(Boolean) as JsonArticle[];

const jsonArticlesIndex: PostFrontmatter[] = jsonArticles.map((a) => ({
  title: a.title,
  slug: a.slug,
  date: a.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  summary: a.excerpt,
  tags: a.tags,
  heroImage: a.cover || undefined,
  category: a.category,
  readingMinutes: a.readingMinutes && a.readingMinutes > 0 ? a.readingMinutes : estimateMinutes(`${a.excerpt}\n\n${a.body}`),
}));

export const postsIndex: PostFrontmatter[] = [...posts.map(({ body, ...fm }) => fm), ...jsonArticlesIndex]
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getPostBySlug(slug: string): Post | undefined {
  const md = posts.find((p) => p.slug === slug);
  if (md) return md;
  const ja = jsonArticles.find((a) => a.slug === slug);
  if (!ja) return undefined;
  const mapped: Post = {
    title: ja.title,
    slug: ja.slug,
    date: ja.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    summary: ja.excerpt,
    tags: ja.tags,
    heroImage: ja.cover || undefined,
    category: ja.category,
    readingMinutes: ja.readingMinutes && ja.readingMinutes > 0 ? ja.readingMinutes : estimateMinutes(`${ja.excerpt}\n\n${ja.body}`),
    body: ja.body,
    sources: Array.isArray(ja.sources) ? ja.sources : undefined,
  };
  return mapped;
}


