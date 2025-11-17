// API route: publish/delete articles in GitHub repo
import { CATEGORY_OPTIONS, normalizeCategory, type JsonArticleCategory } from "../shared/articleCategories";
// Vercel function to publish JSON articles to GitHub (contents API)
type Article = {
  title: string;
  slug: string;
  category: JsonArticleCategory;
  tags?: string[];
  cover?: string;
  excerpt?: string;
  body: string; // markdown
  author?: string;
  date?: string; // ISO
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
};

function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toBase64(content: string | Uint8Array) {
  return Buffer.from(content).toString("base64");
}

const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUBLISH_BRANCH = process.env.PUBLISH_BRANCH || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;

console.log("[publish] GITHUB_REPO:", GITHUB_REPO);
console.log("[publish] PUBLISH_BRANCH:", PUBLISH_BRANCH);

function encodeGitHubPath(path: string) {
  // Encode each path segment, not slashes. Using full encodeURIComponent would break the URL
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubGet(path: string) {
  if (!GITHUB_REPO || !GITHUB_TOKEN) return undefined;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(PUBLISH_BRANCH)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  return res.json();
}

async function githubPut(path: string, content: string, message: string) {
  if (!GITHUB_REPO || !GITHUB_TOKEN) throw new Error("Missing GitHub credentials");
  let sha: string | undefined;
  const existing = await githubGet(path);
  if (existing && typeof existing.sha === "string") sha = existing.sha;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeGitHubPath(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch: PUBLISH_BRANCH,
      sha,
      committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[publish] GitHub PUT failed", res.status, txt);
    throw new Error(`GitHub PUT ${res.status}: ${txt}`);
  }
  return res.json();
}

// Fire-and-forget deploy hook so publishing from /admin keeps the live site fresh
async function triggerVercelDeployIfConfigured(): Promise<boolean> {
  if (!VERCEL_DEPLOY_HOOK_URL) return false;
  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
    if (!res.ok) {
      console.error("[publish] Vercel deploy hook failed", res.status, await res.text());
      return false;
    }
    console.log("[publish] Vercel deploy hook triggered");
    return true;
  } catch (err) {
    console.error("[publish] Error calling Vercel deploy hook", err);
  }
  return false;
}

async function githubRepoPreflight(): Promise<{ ok: true } | { ok: false; status: number }> {
  if (!GITHUB_REPO || !GITHUB_TOKEN) return { ok: false, status: 0 };
  const url = `https://api.github.com/repos/${GITHUB_REPO}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });
  if (res.status === 200) return { ok: true };
  return { ok: false, status: res.status };
}

type ApiResponseShape = {
  success: boolean;
  [key: string]: unknown;
};

function respond(res: any, status: number, body: ApiResponseShape) {
  res.status(status).json(body);
}

export default async function handler(req: any, res: any) {
  async function handleDelete() {
    // Admin gate via Authorization: Bearer <token>
    try {
      if (PUBLISH_TOKEN) {
        const authHeader = req.headers?.authorization || req.headers?.Authorization;
        const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (provided !== PUBLISH_TOKEN) {
          console.warn("[publish] Unauthorized delete attempt");
          respond(res, 401, { success: false, error: "Admin token invalide" });
          return;
        }
      }
    } catch {
      // ignore, fallback
    }
    let payload: any;
    try {
      payload = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    } catch {
      payload = {};
    }
    const slugFromQuery = typeof req.query?.slug === "string" ? String(req.query.slug) : "";
    const rawSlug = String((payload?.slug || slugFromQuery) || "").trim();
    const slug = slugify(rawSlug);
    if (!slug) {
      console.warn("[publish] DELETE missing slug", { rawSlug });
      respond(res, 400, { success: false, error: "Slug manquant" });
      return;
    }

    // If missing credentials, gracefully report ok:false to allow client to keep UI consistent
    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      const missingEnv = [!GITHUB_REPO ? "GITHUB_REPO" : null, !GITHUB_TOKEN ? "GITHUB_TOKEN" : null].filter(Boolean);
      respond(res, 503, {
        success: false,
        error: "Suppression en attente — configuration GitHub manquante (GITHUB_REPO/GITHUB_TOKEN).",
        missingEnv,
      });
      return;
    }

    // Helper to DELETE a file in GitHub repo via Contents API
    async function githubDelete(path: string, message: string) {
      const existing = await githubGet(path);
      if (!existing || !existing.sha) return { existed: false, result: undefined as any };
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeGitHubPath(path)}`;
      const resDel = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, sha: existing.sha, branch: PUBLISH_BRANCH, committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" } }),
      });
      if (!resDel.ok) {
        const txt = await resDel.text();
        console.error("[publish] GitHub DELETE failed", resDel.status, txt);
        throw new Error(`GitHub DELETE ${resDel.status}: ${txt}`);
      }
      const json = await resDel.json();
      return { existed: true, result: json };
    }

    try {
      // 1) Load and update index.json
      const indexPath = `content/articles/index.json`;
      let list: Array<Pick<Article, "title" | "slug" | "category" | "tags" | "cover" | "excerpt" | "date"> & { readingMinutes?: number }> = [];
      try {
        const existing = await githubGet(indexPath);
        if (existing && existing.content) {
          const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch {
        // ignore, treat as empty list
      }
      const beforeLen = list.length;
      const nextList = list.filter((m) => m.slug !== slug);
      let deletedFromIndex = false;
      if (nextList.length !== beforeLen) {
        await githubPut(indexPath, JSON.stringify(nextList, null, 2), `feat(article): delete ${slug} from index`);
        deletedFromIndex = true;
      }

      // 2) Delete article file
      const articlePath = `content/articles/${slug}.json`;
      let deletedFile = false;
      try {
        const delRes = await githubDelete(articlePath, `feat(article): delete ${slug} from admin`);
        deletedFile = delRes.existed;
      } catch (e) {
        // If the file doesn't exist, githubGet earlier would have returned undefined; but if DELETE fails for another reason, surface error
        throw e;
      }

      const deployTriggered = await triggerVercelDeployIfConfigured();
      const deploy =
        VERCEL_DEPLOY_HOOK_URL !== undefined
          ? { triggered: deployTriggered }
          : undefined;
      respond(res, 200, {
        success: true,
        slug,
        deletedFromIndex,
        deletedFile,
        deployTriggered,
        deploy,
      });
      return;
    } catch (e: any) {
      const message = e?.message ? String(e.message) : String(e);
      const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
      const status = m ? Number(m[1]) : undefined;
      console.error("[publish] GitHub error", { repo: GITHUB_REPO, branch: PUBLISH_BRANCH, message });
      respond(res, 500, { success: false, error: "Échec de la suppression GitHub.", details: { status, message } });
      return;
    }
  }

  async function handlePublish() {
    // Admin gate via Authorization: Bearer <token>
    try {
      if (PUBLISH_TOKEN) {
        const authHeader = req.headers?.authorization || req.headers?.Authorization;
        const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (provided !== PUBLISH_TOKEN) {
          console.warn("[publish] Unauthorized publish attempt");
          respond(res, 401, { success: false, error: "Admin token invalide" });
          return;
        }
      }
    } catch {
      // ignore
    }
    let article: Article | undefined;
    try {
      article = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    } catch {
      respond(res, 400, { success: false, error: "JSON invalide" });
      return;
    }

    // Payload validation → 422 with structured field errors
    const fieldErrors: { title?: string; slug?: string; category?: string; body?: string; date?: string } = {};
    const allowedCategories = new Set(CATEGORY_OPTIONS);
    if (!article || typeof article !== "object") {
      console.warn("[publish] Invalid payload (not an object)");
      respond(res, 422, {
        success: false,
        error: "Champs invalides.",
        errors: {
          title: "Le titre est obligatoire.",
          slug: "Le slug ne peut contenir que des lettres, chiffres et tirets.",
          body: "Le contenu est trop court.",
        },
      });
      return;
    }
    if (!article.title || !String(article.title).trim()) fieldErrors.title = "Le titre est obligatoire.";
    const rawCategory = typeof article.category === "string" ? article.category.trim() : "";
    if (!rawCategory) {
      fieldErrors.category = "La thématique est obligatoire.";
    } else {
      const normalizedCategory = normalizeCategory(rawCategory);
      if (!allowedCategories.has(normalizedCategory)) {
        fieldErrors.category = "La thématique est obligatoire.";
      } else {
        article.category = normalizedCategory;
      }
    }
    if (!article.body || String(article.body).trim().length < 50) fieldErrors.body = "Le contenu est trop court.";
    if (article.date) {
      const d = new Date(article.date);
      if (isNaN(d.getTime())) fieldErrors.date = "La date n’est pas valide.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      respond(res, 422, { success: false, error: "Champs invalides.", errors: fieldErrors });
      return;
    }

    const normalizedSlugInput = slugify(String(article.slug || article.title || ""));
    if (!normalizedSlugInput) {
      respond(res, 422, {
        success: false,
        error: "Champs invalides.",
        errors: { slug: "Slug manquant" },
      });
      return;
    }
    article.slug = normalizedSlugInput;
    const slug = normalizedSlugInput;

    // If missing credentials, gracefully report ok:false and keep draft
    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      const missingEnv = [!GITHUB_REPO ? "GITHUB_REPO" : null, !GITHUB_TOKEN ? "GITHUB_TOKEN" : null].filter(Boolean);
      respond(res, 503, {
        success: false,
        error: "Publication en attente — configuration GitHub manquante (GITHUB_REPO/GITHUB_TOKEN). Le brouillon a été conservé localement.",
        missingEnv,
      });
      return;
    }

    // Repo preflight check (detect 404 or 403 early with clear message)
    try {
      const check = await githubRepoPreflight();
      if (!check.ok && (check.status === 404 || check.status === 403)) {
        // Log diagnostic info on server without leaking secrets
        console.error("[publish] GitHub repo access error", { status: check.status, repo: GITHUB_REPO, branch: PUBLISH_BRANCH });
        respond(res, 502, { success: false, error: "Référentiel introuvable ou accès refusé.", details: { status: check.status } });
        return;
      }
    } catch {
      // ignore; proceed to attempt writes which will surface detailed errors
    }

    try {
      // Ensure readingMinutes exists (compute as fallback)
      function estimateMinutes(text: string, wpm = 200) {
        const words = text
          .replace(/[`*_#>!\[\]\(\)`~\-]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .split(" ")
          .filter(Boolean).length;
        return Math.max(1, Math.round(words / wpm));
      }
      const readingMinutes = Number(article.readingMinutes) > 0
        ? Number(article.readingMinutes)
        : estimateMinutes(`${article.excerpt || ""}\n\n${article.body || ""}`);
      const articleForWrite = { ...article, readingMinutes, sources: Array.isArray(article.sources) ? article.sources : [] } as Article & { readingMinutes: number };

      type Meta = Pick<Article, "title" | "slug" | "category" | "tags" | "cover" | "excerpt" | "date"> & { readingMinutes?: number };
      const meta: Meta = {
        title: articleForWrite.title,
        slug: articleForWrite.slug,
        category: articleForWrite.category,
        tags: articleForWrite.tags || [],
        cover: articleForWrite.cover || "",
        excerpt: articleForWrite.excerpt || "",
        date: articleForWrite.date || new Date().toISOString(),
        readingMinutes,
      };

      const indexPath = `content/articles/index.json`;
      let list: Meta[] = [];
      try {
        const existing = await githubGet(indexPath);
        if (existing && existing.content) {
          const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) list = parsed as Meta[];
        }
      } catch {
        // start fresh if anything goes wrong reading
      }

      const existingIndex = list.findIndex((item) => item.slug === slug);
      const existedBefore = existingIndex >= 0;
      if (existedBefore) {
        const prev = list[existingIndex];
        list[existingIndex] = {
          ...prev,
          title: meta.title,
          category: meta.category,
          tags: meta.tags,
          cover: meta.cover,
          excerpt: meta.excerpt,
          date: meta.date,
          readingMinutes: meta.readingMinutes,
        };
      } else {
        list.push(meta);
      }
      const nextList = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
      const commitMessage = existedBefore
        ? `chore(cms): update article ${slug}`
        : `feat(article): publish ${slug} from admin`;

      const articlePath = `content/articles/${slug}.json`;
      const putArticleRes = await githubPut(articlePath, JSON.stringify(articleForWrite, null, 2), commitMessage);
      const putIndexRes = await githubPut(indexPath, JSON.stringify(nextList, null, 2), commitMessage);

      // Build commit/links payload
      const commitSha: string | undefined = putIndexRes?.commit?.sha || putArticleRes?.commit?.sha;
      const commitUrl: string | undefined = putIndexRes?.commit?.html_url || putArticleRes?.commit?.html_url;
      const articleFileUrl: string | undefined = putArticleRes?.content?.html_url;
      const indexFileUrl: string | undefined = putIndexRes?.content?.html_url;

      const deployTriggered = await triggerVercelDeployIfConfigured();
      const statusCode = existedBefore ? 200 : 201;
      const deploy =
        VERCEL_DEPLOY_HOOK_URL !== undefined
          ? { triggered: deployTriggered }
          : undefined;
      respond(res, statusCode, {
        success: true,
        slug,
        url: `/articles/${slug}`,
        commit: commitSha ? { sha: commitSha, url: commitUrl } : undefined,
        files: { article: articleFileUrl, index: indexFileUrl },
        deployTriggered,
        deploy,
      });
      return;
    } catch (e: any) {
      const message = e?.message ? String(e.message) : String(e);
      // Try to extract status code if present in the message like "GitHub PUT 422: ..."
      const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
      const status = m ? Number(m[1]) : undefined;
      console.error("[publish] GitHub error", { repo: GITHUB_REPO, branch: PUBLISH_BRANCH, message });
      respond(res, 500, {
        success: false,
        error: "Échec de la publication GitHub. Vérifiez la configuration du dépôt.",
        details: { status, message },
      });
      return;
    }
  }

  // Method routing
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method === "DELETE") {
    try {
      await handleDelete();
    } catch (error) {
      console.error("[publish] Unhandled delete error", error);
      respond(res, 500, { success: false, error: "Erreur serveur interne" });
    }
    return;
  }
  if (req.method === "POST") {
    try {
      await handlePublish();
    } catch (error) {
      console.error("[publish] Unhandled publish error", error);
      respond(res, 500, { success: false, error: "Erreur serveur interne" });
    }
    return;
  }
  respond(res, 405, { success: false, error: "Method not allowed" });
}


