import type { JsonArticle } from "./content";

export type AdminArticleListItem = {
  slug: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  readingMinutes?: number;
  status: "Publié";
};

function normalizeJsonArticle(input: any): AdminArticleListItem | null {
  if (!input || typeof input !== "object") return null;
  const ja = input as JsonArticle;

  const slug = (ja.slug || "").trim();
  const title = (ja.title || "").trim();
  if (!slug || !title) return null;

  const category = (ja.category || "").toString() || "Autre";
  const date =
    (ja.date && ja.date.slice(0, 10)) ||
    new Date().toISOString().slice(0, 10);
  const excerpt = (ja.excerpt || "").toString();
  const readingMinutes =
    typeof ja.readingMinutes === "number" && ja.readingMinutes > 0
      ? ja.readingMinutes
      : undefined;

  return {
    slug,
    title,
    category,
    date,
    excerpt,
    readingMinutes,
    status: "Publié",
  };
}

// Load all JSON article files at build time.
// Important: unwrap `.default` from the globbed modules.
const jsonModules = import.meta.glob("/content/articles/*.json", {
  eager: true,
}) as Record<string, any>;

const adminArticles: AdminArticleListItem[] = Object.entries(jsonModules)
  .filter(([path]) => !path.endsWith("index.json"))
  .map(([, mod]) => {
    const ja =
      mod && typeof mod === "object" && "default" in mod
        ? (mod as any).default
        : mod;
    return normalizeJsonArticle(ja);
  })
  .filter((row): row is AdminArticleListItem => row !== null)
  // Newest first
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getAllArticlesForAdmin(): AdminArticleListItem[] {
  return adminArticles;
}
