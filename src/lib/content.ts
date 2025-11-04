// Lightweight Markdown content loader using import.meta.glob and simple frontmatter parsing

export type PostFrontmatter = {
  title: string;
  slug: string;
  date: string; // ISO string YYYY-MM-DD
  summary: string;
  tags?: string[];
  heroImage?: string;
};

export type Post = PostFrontmatter & {
  body: string;
};

type RawPost = {
  path: string;
  source: string;
};

const rawModules = import.meta.glob("/content/posts/*.md", { as: "raw", eager: true }) as Record<string, string>;

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
  return { ...fm, body: content };
});

export const postsIndex: PostFrontmatter[] = [...posts]
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map(({ body, ...fm }) => fm);

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}


