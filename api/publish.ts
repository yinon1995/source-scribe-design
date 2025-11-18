// API route: publish/delete articles in GitHub repo
// Contract: Always respond with JSON. Success responses include commit/file/deploy info.
// Failures carry a localized `error` string plus optional `missingEnv`, and expose `details.message`
// only while running in non-production environments to avoid leaking internals in prod.
// 2025-11-17 hardening summary:
// - respond() enforces JSON-only responses so Vercel never falls back to HTML 500s.
// - All env/network work stays in try/catch blocks inside the handler to keep module load safe.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { CATEGORY_OPTIONS, normalizeCategory, type JsonArticleCategory } from "../shared/articleCategories.js";
// Vercel function to publish JSON articles to GitHub (contents API)
type Article = {
  title: string;
  slug: string;
  category: JsonArticleCategory;
  tags?: string[];
  cover?: string;
  heroImage?: string;
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
  featured?: boolean;
};

const MAX_ARTICLE_BODY_LENGTH = 2_000_000;

function normalizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

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
const RAW_PUBLISH_BRANCH = process.env.PUBLISH_BRANCH;
const PUBLISH_BRANCH = RAW_PUBLISH_BRANCH?.trim() || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
const SITE_URL = "https://a-la-brestoise.vercel.app";
const INCLUDE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

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
type DeployResult = { triggered: boolean; error?: string | null };

async function triggerVercelDeployIfConfigured(): Promise<DeployResult> {
  if (!VERCEL_DEPLOY_HOOK_URL) {
    return { triggered: false, error: "Deploy hook non configuré" };
  }
  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[publish] Vercel deploy hook failed", res.status, txt);
      return { triggered: false, error: `Deploy hook ${res.status}` };
    }
    console.log("[publish] Vercel deploy hook triggered");
    return { triggered: true, error: null };
  } catch (err: any) {
    console.error("[publish] Error calling Vercel deploy hook", err);
    return { triggered: false, error: err?.message || "Deploy hook error" };
  }
}

type GithubRepoPreflightResult = {
  ok: boolean;
  status?: number;
};

async function githubRepoPreflight(): Promise<GithubRepoPreflightResult> {
  if (!GITHUB_REPO || !GITHUB_TOKEN) return { ok: false, status: 0 };
  const url = `https://api.github.com/repos/${GITHUB_REPO}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });
  if (res.status === 200) return { ok: true, status: 200 };
  return { ok: false, status: res.status };
}

type ApiResponseShape = {
  success: boolean;
  error?: string;
  details?: { message?: string };
  missingEnv?: string[];
  [key: string]: unknown;
};

function respond(res: VercelResponse, status: number, body: ApiResponseShape) {
  if (!res.headersSent) {
    res.setHeader("Content-Type", "application/json");
  }
  res.status(status).send(JSON.stringify(body));
}

type ErrorExtras = {
  missingEnv?: string[];
  detailsMessage?: string;
};

function sendError(res: VercelResponse, status: number, error: string, extras: ErrorExtras = {}) {
  const payload: ApiResponseShape = {
    success: false,
    error,
  };
  if (extras.missingEnv?.length) {
    payload.missingEnv = extras.missingEnv;
  }
  if (INCLUDE_ERROR_DETAILS && extras.detailsMessage) {
    payload.details = { message: extras.detailsMessage };
  }
  respond(res, status, payload);
}

export const config = {
  runtime: "nodejs",
};

console.log("[publish] api/publish.ts module loaded");
console.log("[publish] GITHUB_REPO:", GITHUB_REPO);
console.log("[publish] PUBLISH_BRANCH:", PUBLISH_BRANCH);

async function readJsonBody<T = Record<string, unknown>>(req: VercelRequest): Promise<T> {
  const existing = (req as any).body;
  if (existing !== undefined && existing !== null) {
    if (typeof existing === "string") {
      const parsed = existing.length ? JSON.parse(existing) : {};
      (req as any).body = parsed;
      return parsed as T;
    }
    if (Buffer.isBuffer(existing)) {
      const text = existing.toString("utf8");
      const parsed = text ? JSON.parse(text) : {};
      (req as any).body = parsed;
      return parsed as T;
    }
    return existing as T;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }
  if (!chunks.length) {
    const empty = {} as T;
    (req as any).body = empty;
    return empty;
  }
  const text = Buffer.concat(chunks).toString("utf8");
  const parsed = text ? JSON.parse(text) : {};
  (req as any).body = parsed;
  return parsed as T;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[publish] handler invoked", req.method);

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
          sendError(res, 401, "Admin token invalide");
          return;
        }
      }
    } catch {
      // ignore, fallback
    }
    let payload: any = {};
    try {
      payload = await readJsonBody<Record<string, unknown>>(req);
    } catch {
      sendError(res, 400, "JSON invalide");
      return;
    }
    const slugFromQuery = typeof req.query?.slug === "string" ? String(req.query.slug) : "";
    const rawSlug = String((payload?.slug || slugFromQuery) || "").trim();
    const slug = slugify(rawSlug);
    if (!slug) {
      console.warn("[publish] DELETE missing slug", { rawSlug });
      sendError(res, 400, "Slug manquant");
      return;
    }

    // If missing credentials, gracefully report ok:false to allow client to keep UI consistent
    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      const missingEnv = [
        !GITHUB_REPO ? "GITHUB_REPO" : null,
        !RAW_PUBLISH_BRANCH ? "PUBLISH_BRANCH" : null,
        !GITHUB_TOKEN ? "GITHUB_TOKEN" : null,
      ].filter(Boolean) as string[];
      sendError(res, 503, "Suppression en attente — configuration GitHub manquante (GITHUB_REPO / PUBLISH_BRANCH / GITHUB_TOKEN).", {
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
      let list: Array<Pick<Article, "title" | "slug" | "category" | "tags" | "cover" | "excerpt" | "date"> & {
        readingMinutes?: number;
        featured?: boolean;
      }> = [];
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

      const deploy = await triggerVercelDeployIfConfigured();
      respond(res, 200, {
        success: true,
        slug,
        deletedFromIndex,
        deletedFile,
        files: { article: articlePath, index: indexPath },
        deployTriggered: deploy.triggered,
        deploy,
      });
      return;
    } catch (e: any) {
      const message = e?.message ? String(e.message) : String(e);
      const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
      const status = m ? Number(m[1]) : undefined;
      console.error("[publish] GitHub error", { repo: GITHUB_REPO, branch: PUBLISH_BRANCH, message });
      sendError(res, 502, "Erreur GitHub, vérifiez le dépôt / la branche / le token.", {
        detailsMessage: status ? `${status} ${message}` : message,
      });
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
          sendError(res, 401, "Admin token invalide");
          return;
        }
      }
    } catch {
      // ignore
    }
    let article: any;
    try {
      article = await readJsonBody<Article>(req);
    } catch {
      sendError(res, 400, "JSON invalide");
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
    const bodyValue = typeof article.body === "string" ? article.body : "";
    const trimmedBodyValue = bodyValue.trim();
    if (!trimmedBodyValue || trimmedBodyValue.length < 50) {
      fieldErrors.body = "Le contenu est trop court.";
    } else if (bodyValue.length > MAX_ARTICLE_BODY_LENGTH) {
      fieldErrors.body = `Le contenu est trop long (max ${MAX_ARTICLE_BODY_LENGTH} caractères).`;
    } else {
      article.body = bodyValue;
    }
    if (article.date) {
      const d = new Date(article.date);
      if (isNaN(d.getTime())) fieldErrors.date = "La date n’est pas valide.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      respond(res, 422, { success: false, error: "Champs invalides.", errors: fieldErrors });
      return;
    }

    article.featured = article.featured === true;

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
      const missingEnv = [
        !GITHUB_REPO ? "GITHUB_REPO" : null,
        !RAW_PUBLISH_BRANCH ? "PUBLISH_BRANCH" : null,
        !GITHUB_TOKEN ? "GITHUB_TOKEN" : null,
      ].filter(Boolean) as string[];
      respond(res, 503, {
        success: false,
        error: "Publication en attente — configuration GitHub manquante (GITHUB_REPO / PUBLISH_BRANCH / GITHUB_TOKEN).",
        missingEnv,
      });
      return;
    }

    // Repo preflight check (detect 404 or 403 early with clear message)
    try {
      const check = await githubRepoPreflight();
      const repoStatus = check.status;
      if (!check.ok && (repoStatus === 404 || repoStatus === 403)) {
        // Log diagnostic info on server without leaking secrets
        console.error("[publish] GitHub repo access error", { status: repoStatus, repo: GITHUB_REPO, branch: PUBLISH_BRANCH });
        sendError(res, 502, "Référentiel introuvable ou accès refusé.", { detailsMessage: `status=${repoStatus}` });
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
      const cover = normalizeImageUrl(article.cover) ?? normalizeImageUrl((article as any).heroImage);
      const featured = article.featured === true;
      const articleForWrite = {
        ...article,
        cover: cover,
        featured,
        readingMinutes,
        sources: Array.isArray(article.sources) ? article.sources : [],
      } as Article & { readingMinutes: number };

      type Meta = Pick<Article, "title" | "slug" | "category" | "tags" | "cover" | "excerpt" | "date"> & {
        readingMinutes?: number;
        featured?: boolean;
        heroImage?: string;
      };
      const meta: Meta = {
        title: articleForWrite.title,
        slug: articleForWrite.slug,
        category: articleForWrite.category,
        tags: articleForWrite.tags || [],
        cover: articleForWrite.cover || "",
        heroImage: articleForWrite.cover || "",
        excerpt: articleForWrite.excerpt || "",
        date: articleForWrite.date || new Date().toISOString(),
        readingMinutes,
        featured,
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

      const existedBefore = list.some((item) => item.slug === slug);
      const nextList = list
        .filter((item) => item.slug !== meta.slug)
        .concat(meta)
        .sort((a, b) => {
          const left = b.date || "";
          const right = a.date || "";
          return left.localeCompare(right);
        });
      const commitMessage = existedBefore
        ? `chore(cms): update article ${slug}`
        : `feat(article): publish ${slug} from admin`;

      const articlePath = `content/articles/${slug}.json`;
      const putArticleRes = await githubPut(articlePath, JSON.stringify(articleForWrite, null, 2), commitMessage);
      const putIndexRes = await githubPut(indexPath, JSON.stringify(nextList, null, 2), commitMessage);

      // Build commit/links payload
      const commitSha: string | undefined = putIndexRes?.commit?.sha || putArticleRes?.commit?.sha;
      const commitUrl: string | undefined = putIndexRes?.commit?.html_url || putArticleRes?.commit?.html_url;

      const deploy = await triggerVercelDeployIfConfigured();
      const statusCode = existedBefore ? 200 : 201;
      respond(res, statusCode, {
        success: true,
        slug,
        url: `${SITE_URL}/articles/${slug}`,
        commit: commitSha ? { sha: commitSha, url: commitUrl } : undefined,
        files: { article: articlePath, index: indexPath },
        deployTriggered: deploy.triggered,
        deploy,
      });
      return;
    } catch (e: any) {
      const message = e?.message ? String(e.message) : String(e);
      // Try to extract status code if present in the message like "GitHub PUT 422: ..."
      const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
      const status = m ? Number(m[1]) : undefined;
      console.error("[publish] GitHub error", { repo: GITHUB_REPO, branch: PUBLISH_BRANCH, message });
      sendError(res, 502, "Erreur GitHub, vérifiez le dépôt / la branche / le token.", {
        detailsMessage: status ? `${status} ${message}` : message,
      });
      return;
    }
  }

  try {
    if (req.method === "OPTIONS") {
      respond(res, 200, { success: true });
      return;
    }
    if (req.method === "DELETE") {
      await handleDelete();
      return;
    }
    if (req.method === "POST") {
      await handlePublish();
      return;
    }
    respond(res, 405, { success: false, error: "Méthode non autorisée" });
  } catch (err) {
    console.error("[publish] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Erreur serveur interne";
    respond(res, 500, { success: false, error: message || "Erreur serveur interne" });
  }
}


