export type JsonArticle = {
  title: string;
  slug: string;
  category: "Commerces & lieux" | "Expérience" | "Beauté";
  tags: string[];
  cover: string;
  excerpt: string;
  body: string;
  author: string;
  date: string;
  readingMinutes?: number;
  sources?: string[];
};

export type PostFrontmatter = {
  title: string;
  slug: string;
  date: string;
  category: string;
  summary: string;
  tags: string[];
  heroImage?: string;
  readingMinutes?: number;
  sources?: string[];
  isJson?: boolean;
};

export type Post = PostFrontmatter & {
  body: string;
};

type MarkdownModule = string;

const markdownModules = import.meta.glob("/content/posts/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, MarkdownModule>;

const jsonModules = import.meta.glob("/content/articles/*.json", {
  eager: true,
}) as Record<string, any>;

type FrontmatterParseResult = {
  data: Record<string, unknown>;
  content: string;
};

function parseFrontmatter(source: string): FrontmatterParseResult {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(source);
  if (!match) {
    return { data: {}, content: source };
  }
  const yaml = match[1];
  const content = match[2] ?? "";
  const data: Record<string, unknown> = {};

  const lines = yaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let arrayBuffer: string[] | null = null;

  for (const line of lines) {
    const arrayMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayMatch && currentKey) {
      if (!arrayBuffer) arrayBuffer = [];
      arrayBuffer.push(stripQuotes(arrayMatch[1].trim()));
      continue;
    }

  if (arrayBuffer && currentKey && !arrayMatch) {
    data[currentKey] = [...arrayBuffer];
    arrayBuffer = null;
    currentKey = null;
  }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;

    currentKey = kv[1];
    const raw = kv[2]?.trim() ?? "";

    if (raw.startsWith("[") && raw.endsWith("]")) {
      const values = raw
        .slice(1, -1)
        .split(",")
        .map((entry) => stripQuotes(entry.trim()))
        .filter(Boolean);
      data[currentKey] = values;
      currentKey = null;
      continue;
    }

    if (raw.length > 0) {
      data[currentKey] = stripQuotes(raw);
      currentKey = null;
      continue;
    }

    arrayBuffer = [];
  }

  if (arrayBuffer && currentKey) {
    data[currentKey] = [...arrayBuffer];
  }

  return { data, content };
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]/, "").replace(/['"]$/, "");
}

function estimateMinutes(text: string, wpm = 200): number {
  const words = text
    .replace(/[`*_#>!\[\]\(\)`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}

function coerceFrontmatter(data: Record<string, unknown>, fallbackSlug: string): PostFrontmatter {
  const summary = typeof data.summary === "string" ? data.summary : "";
  const bodySources = Array.isArray(data.sources) ? data.sources.map(String) : undefined;
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const category = typeof data.category === "string" ? data.category : "Autre";

  const heroImage =
    typeof data.heroImage === "string" && data.heroImage.trim().length > 0 ? data.heroImage.trim() : undefined;

  const readingMinutes = typeof data.readingMinutes === "number" ? data.readingMinutes : undefined;

  const fm: PostFrontmatter = {
    title: typeof data.title === "string" ? data.title : "",
    slug: typeof data.slug === "string" && data.slug.trim().length > 0 ? data.slug.trim() : fallbackSlug,
    date:
      typeof data.date === "string" && data.date.trim().length > 0
        ? data.date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    category,
    summary,
    tags,
    heroImage,
    readingMinutes,
    sources: bodySources,
    isJson: false,
  };

  return fm;
}

const markdownPosts: Post[] = Object.entries(markdownModules).map(([path, source]) => {
  const { data, content } = parseFrontmatter(source ?? "");
  const fallbackSlug = path.split("/").pop()?.replace(/\.md$/, "") ?? "article";
  const fm = coerceFrontmatter(data, fallbackSlug);
  const readingMinutes = fm.readingMinutes ?? estimateMinutes(`${fm.summary}\n\n${content}`);

  return {
    ...fm,
    readingMinutes,
    body: content.trim(),
  };
});

const jsonArticles: JsonArticle[] = Object.values(jsonModules)
  .map((mod) => (mod && typeof mod === "object" && "default" in mod ? mod.default : mod))
  .filter((value): value is JsonArticle => Boolean(value && typeof value === "object"));

const jsonPosts: Post[] = jsonArticles.map((ja) => {
  const readingMinutes =
    typeof ja.readingMinutes === "number" && ja.readingMinutes > 0
      ? ja.readingMinutes
      : estimateMinutes(`${ja.excerpt}\n\n${ja.body}`);

  return {
    title: ja.title,
    slug: ja.slug,
    date: ja.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    category: ja.category,
    summary: ja.excerpt,
    tags: Array.isArray(ja.tags) ? ja.tags.map(String) : [],
    heroImage: ja.cover || undefined,
    readingMinutes,
    sources: Array.isArray(ja.sources) ? ja.sources.map(String) : undefined,
    isJson: true,
    body: ja.body,
  };
});

const posts: Post[] = [...markdownPosts, ...jsonPosts];

export const postsIndex: PostFrontmatter[] = posts
  .map(({ body, ...frontmatter }) => frontmatter)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}


