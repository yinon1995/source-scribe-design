import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORY,
  normalizeCategory as baseNormalizeCategory,
  type JsonArticleCategory,
  type NormalizedCategory,
} from "../../shared/articleCategories";
import {
  ARTICLE_BODY_FONT_VALUES,
  type ArticleBodyFont,
} from "../../shared/articleBodyFonts";
export type { ArticleBodyFont };

export { CATEGORY_OPTIONS, DEFAULT_CATEGORY };
export type { JsonArticleCategory, NormalizedCategory };

export function normalizeCategory(input?: JsonArticleCategory | string | null): NormalizedCategory {
  return baseNormalizeCategory(input);
}

export function normalizeBodyFont(value?: string | null): ArticleBodyFont | undefined {
  if (!value) return undefined;
  const candidate = value.trim().toLowerCase();
  return ARTICLE_BODY_FONT_VALUES.find((font) => font === candidate) ?? undefined;
}

export type JsonArticle = {
  title: string;
  slug: string;
  category: JsonArticleCategory;
  tags?: string[];
  cover?: string;
  heroImage?: string;
  excerpt?: string;
  body: string;
  author?: string;
  date?: string;
  readingMinutes?: number;
  sources?: string[];
  heroLayout?: "default" | "image-full" | "compact";
  showTitleInHero?: boolean;
  footerType?: "default" | "practical-info" | "cta";
  footerNote?: string;
  authorSlug?: string;
  authorAvatarUrl?: string;
  authorRole?: string;
  primaryPlaceName?: string;
  practicalInfo?: {
    address?: string;
    phone?: string;
    websiteUrl?: string;
    googleMapsUrl?: string;
    openingHours?: string;
  };
  seoTitle?: string;
  seoDescription?: string;
  searchAliases?: string[];
  canonicalUrl?: string;
  schemaType?: "Article" | "LocalBusiness" | "Restaurant";
  featured?: boolean;
  bodyFont?: ArticleBodyFont;
  journalImages?: Array<{
    src: string;
    alt?: string;
    caption?: string;
    mode?: "column" | "wide";
  }>;
  allowIndexing?: boolean;
};

export type PostFrontmatter = {
  title: string;
  slug: string;
  date: string;
  category: string;
  summary?: string;
  tags?: string[];
  heroImage?: string;
  readingMinutes?: number;
  sources?: string[];
  heroLayout?: "default" | "image-full" | "compact";
  showTitleInHero?: boolean;
  footerType?: "default" | "practical-info" | "cta";
  footerNote?: string;
  author?: string;
  authorSlug?: string;
  authorAvatarUrl?: string;
  authorRole?: string;
  primaryPlaceName?: string;
  practicalInfo?: {
    address?: string;
    phone?: string;
    websiteUrl?: string;
    googleMapsUrl?: string;
    openingHours?: string;
  };
  seoTitle?: string;
  seoDescription?: string;
  searchAliases?: string[];
  canonicalUrl?: string;
  schemaType?: "Article" | "LocalBusiness" | "Restaurant";
  isJson?: boolean;
  featured?: boolean;
  bodyFont?: ArticleBodyFont;
  journalImages?: Array<{
    src: string;
    alt?: string;
    caption?: string;
    mode?: "column" | "wide";
  }>;
  allowIndexing?: boolean;
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

type ArticleIndexEntry = {
  title?: string;
  slug?: string;
  category?: JsonArticleCategory | string;
  tags?: string[];
  cover?: string;
  heroImage?: string;
  excerpt?: string;
  date?: string;
  readingMinutes?: number;
  featured?: boolean;
};

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
    featured: false,
    journalImages: (data.journalImages as any) || [],
  };
  const normalizedBodyFont = normalizeBodyFont(typeof data.bodyFont === "string" ? data.bodyFont : undefined);
  if (normalizedBodyFont) {
    fm.bodyFont = normalizedBodyFont;
  }

  return fm;
}

const markdownPosts: Post[] = Object.entries(markdownModules).map(([path, source]) => {
  const { data, content } = parseFrontmatter(source ?? "");
  const fallbackSlug = path.split("/").pop()?.replace(/\.md$/, "") ?? "article";
  const fm = coerceFrontmatter(data, fallbackSlug);
  const readingMinutes = fm.readingMinutes ?? estimateMinutes(`${fm.summary ?? ""}\n\n${content}`);

  return {
    ...fm,
    readingMinutes,
    body: content.trim(),
  };
});

function unwrapModuleValue(value: any) {
  if (value && typeof value === "object" && "default" in value) {
    return (value as { default: unknown }).default;
  }
  return value;
}

function isJsonArticle(value: any): value is JsonArticle {
  return (
    value &&
    typeof value === "object" &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    typeof value.body === "string"
  );
}

const jsonArticles: JsonArticle[] = [];
let articleIndexEntries: ArticleIndexEntry[] = [];

for (const [path, mod] of Object.entries(jsonModules)) {
  const value = unwrapModuleValue(mod);
  if (path.endsWith("index.json")) {
    if (Array.isArray(value)) {
      articleIndexEntries = value as ArticleIndexEntry[];
    }
    continue;
  }
  if (isJsonArticle(value)) {
    jsonArticles.push(value);
  }
}

function normalizeImageSrc(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapIndexEntryToFrontmatter(entry: ArticleIndexEntry): PostFrontmatter | null {
  if (!entry || typeof entry !== "object") return null;
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
  if (!title || !slug) return null;
  const category = normalizeCategory(entry.category || DEFAULT_CATEGORY);
  const tags = Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag)) : [];
  const summary = typeof entry.excerpt === "string" ? entry.excerpt : "";
  const heroImage = normalizeImageSrc(entry.cover) ?? normalizeImageSrc(entry.heroImage);
  const date =
    typeof entry.date === "string" && entry.date.trim().length > 0
      ? entry.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const readingMinutes =
    typeof entry.readingMinutes === "number" && entry.readingMinutes > 0 ? entry.readingMinutes : undefined;

  return {
    title,
    slug,
    date,
    category,
    summary,
    tags,
    heroImage,
    readingMinutes,
    featured: entry.featured === true,
    isJson: true,
  };
}

const jsonIndexFrontmatters: PostFrontmatter[] = articleIndexEntries
  .map((entry) => mapIndexEntryToFrontmatter(entry))
  .filter((entry): entry is PostFrontmatter => Boolean(entry));

const jsonPosts: Post[] = jsonArticles.map((ja) => {
  const date = ja.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const readingMinutes =
    typeof ja.readingMinutes === "number" && ja.readingMinutes > 0
      ? ja.readingMinutes
      : estimateMinutes(`${ja.excerpt ?? ""}\n\n${ja.body ?? ""}`);
  const searchAliases = Array.isArray(ja.searchAliases)
    ? ja.searchAliases.map((alias) => String(alias))
    : undefined;
  const heroImage = normalizeImageSrc(ja.cover) ?? normalizeImageSrc(ja.heroImage);

  return {
    title: ja.title,
    slug: ja.slug,
    date,
    category: normalizeCategory(ja.category),
    summary: ja.excerpt,
    tags: Array.isArray(ja.tags) ? ja.tags.map(String) : undefined,
    heroImage,
    readingMinutes,
    sources: Array.isArray(ja.sources) ? ja.sources.map(String) : undefined,
    isJson: true,
    body: ja.body,
    heroLayout: ja.heroLayout ?? "default",
    showTitleInHero: typeof ja.showTitleInHero === "boolean" ? ja.showTitleInHero : true,
    footerType: ja.footerType ?? "default",
    footerNote: ja.footerNote,
    author: ja.author,
    authorSlug: ja.authorSlug,
    authorAvatarUrl: ja.authorAvatarUrl,
    authorRole: ja.authorRole,
    primaryPlaceName: ja.primaryPlaceName,
    practicalInfo: ja.practicalInfo,
    seoTitle: ja.seoTitle,
    seoDescription: ja.seoDescription,
    searchAliases,
    canonicalUrl: ja.canonicalUrl,
    schemaType: ja.schemaType ?? "Article",
    featured: ja.featured === true,
    bodyFont: normalizeBodyFont(ja.bodyFont),
    journalImages: ja.journalImages,
    allowIndexing: ja.allowIndexing,
  };
});

const posts: Post[] = [...markdownPosts, ...jsonPosts];

const markdownFrontmatters = markdownPosts.map(({ body, ...frontmatter }) => frontmatter);
const jsonFrontmatters = jsonPosts.map(({ body, ...frontmatter }) => frontmatter);
const indexedSlugs = new Set(jsonIndexFrontmatters.map((fm) => fm.slug));
const fallbackJsonFrontmatters = jsonFrontmatters.filter((fm) => !indexedSlugs.has(fm.slug));

export const postsIndex: PostFrontmatter[] = [...markdownFrontmatters, ...jsonIndexFrontmatters, ...fallbackJsonFrontmatters].sort(
  (a, b) => (a.date < b.date ? 1 : -1),
);

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}


