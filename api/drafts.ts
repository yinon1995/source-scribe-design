// API route: manage drafts in GitHub repo (content/drafts)
// Contract: Always respond with JSON.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { CATEGORY_OPTIONS, normalizeCategory, type JsonArticleCategory } from "../shared/articleCategories.js";
import { ARTICLE_BODY_FONT_VALUES, type ArticleBodyFont } from "../shared/articleBodyFonts.js";

// Same Article type as publish.ts
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
  bodyFont?: ArticleBodyFont;
  // Draft specific
  status?: "draft";
};

const MAX_ARTICLE_BODY_LENGTH = 2_000_000;

function normalizeBodyFont(value: unknown): ArticleBodyFont | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim().toLowerCase();
  return ARTICLE_BODY_FONT_VALUES.find((font) => font === candidate) ?? undefined;
}

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
const INCLUDE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

function encodeGitHubPath(path: string) {
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
    console.error("[drafts] GitHub PUT failed", res.status, txt);
    throw new Error(`GitHub PUT ${res.status}: ${txt}`);
  }
  return res.json();
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

function sendError(res: VercelResponse, status: number, error: string, extras: { missingEnv?: string[]; detailsMessage?: string } = {}) {
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

async function readJsonBody<T = Record<string, unknown>>(req: VercelRequest): Promise<T> {
  const existing = (req as any).body;
  if (existing !== undefined && existing !== null) {
    if (typeof existing === "string") {
      const parsed = existing.length ? JSON.parse(existing) : {};
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
  console.log("[drafts] handler invoked", req.method);

  // AUTH CHECK
  try {
    if (PUBLISH_TOKEN) {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";
      if (provided !== PUBLISH_TOKEN) {
        console.warn("[drafts] Unauthorized attempt");
        sendError(res, 401, "Admin token invalide");
        return;
      }
    }
  } catch {
    // ignore
  }

  // GET: List drafts or Get specific draft
  if (req.method === "GET") {
    const slugFromQuery = typeof req.query?.slug === "string" ? String(req.query.slug) : "";

    if (slugFromQuery) {
      // Get specific draft
      try {
        const articlePath = `content/drafts/${slugFromQuery}.json`;
        const existing = await githubGet(articlePath);
        if (existing && existing.content) {
          const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
          const parsed = JSON.parse(decoded);
          respond(res, 200, { success: true, article: parsed });
        } else {
          respond(res, 404, { success: false, error: "Brouillon introuvable" });
        }
      } catch (e: any) {
        console.error("[drafts] GET article error", e);
        respond(res, 500, { success: false, error: e.message });
      }
      return;
    }

    // List drafts
    try {
      const indexPath = `content/drafts/index.json`;
      const existing = await githubGet(indexPath);
      let list = [];
      if (existing && existing.content) {
        const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) list = parsed;
      }
      respond(res, 200, { success: true, drafts: list });
    } catch (e: any) {
      console.error("[drafts] GET error", e);
      respond(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // DELETE: Delete draft
  if (req.method === "DELETE") {
    let payload: any = {};
    try {
      payload = await readJsonBody<Record<string, unknown>>(req);
    } catch {
      // ignore
    }
    const slugFromQuery = typeof req.query?.slug === "string" ? String(req.query.slug) : "";
    const rawSlug = String((payload?.slug || slugFromQuery) || "").trim();
    const slug = slugify(rawSlug);

    if (!slug) {
      sendError(res, 400, "Slug manquant");
      return;
    }

    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      sendError(res, 503, "Configuration GitHub manquante");
      return;
    }

    async function githubDelete(path: string, message: string) {
      const existing = await githubGet(path);
      if (!existing || !existing.sha) return { existed: false };
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
      if (!resDel.ok) throw new Error(`GitHub DELETE failed`);
      return { existed: true };
    }

    try {
      // 1) Update index
      const indexPath = `content/drafts/index.json`;
      let list: any[] = [];
      try {
        const existing = await githubGet(indexPath);
        if (existing && existing.content) {
          const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch { }

      const nextList = list.filter((m) => m.slug !== slug);
      if (nextList.length !== list.length) {
        await githubPut(indexPath, JSON.stringify(nextList, null, 2), `chore(drafts): delete ${slug} from index`);
      }

      // 2) Delete file
      const articlePath = `content/drafts/${slug}.json`;
      await githubDelete(articlePath, `chore(drafts): delete ${slug}`);

      respond(res, 200, { success: true, slug });
    } catch (e: any) {
      console.error("[drafts] DELETE error", e);
      sendError(res, 502, "Erreur lors de la suppression du brouillon");
    }
    return;
  }

  // POST: Save draft
  if (req.method === "POST") {
    let article: any;
    try {
      article = await readJsonBody<Article>(req);
    } catch {
      sendError(res, 400, "JSON invalide");
      return;
    }

    // Minimal validation for drafts
    if (!article.title) {
      respond(res, 422, { success: false, error: "Le titre est obligatoire pour un brouillon." });
      return;
    }

    // Generate slug if missing
    const slug = slugify(article.slug || article.title);
    article.slug = slug;
    article.status = "draft";

    if (!GITHUB_REPO || !GITHUB_TOKEN) {
      sendError(res, 503, "Configuration GitHub manquante");
      return;
    }

    // --- IMAGE PROCESSING (Keep logic to ensure images work in drafts) ---
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

      // Parse editor state, upload images, and rewrite URLs
      let processedBody = typeof article.body === "string" ? article.body : "";
      let coverImage = normalizeImageUrl(article.cover) ?? normalizeImageUrl((article as any).heroImage);

      const stateMatch = processedBody.match(/^\s*<!-- MAGAZINE_EDITOR_STATE: (.*?) -->/s);
      if (stateMatch) {
        try {
          const editorState = JSON.parse(stateMatch[1]);
          if (editorState && Array.isArray(editorState.blocks)) {
            let stateChanged = false;
            const replacements: Array<{ old: string, new: string }> = [];

            // Helper to hash string
            const crypto = require('crypto');
            const hashString = (str: string) => crypto.createHash('sha1').update(str).digest('hex').substring(0, 16);

            for (const block of editorState.blocks) {
              if (block.type === 'image' && block.content?.imageUrl?.startsWith('data:image/')) {
                const dataUrl = block.content.imageUrl;
                const matches = dataUrl.match(/^data:(image\/([a-zA-Z+]+));base64,(.+)$/);

                if (matches) {
                  // Fix extension mapping
                  let extension = matches[2];
                  if (extension === 'jpeg') extension = 'jpg';
                  if (extension === 'svg+xml') extension = 'svg';

                  const base64Data = matches[3];

                  // Create stable filename based on content hash
                  const filename = hashString(base64Data);
                  const publicPath = `images/articles/${slug}/img_${filename}.${extension}`;
                  const fullPublicUrl = `/${publicPath}`;

                  // Upload to GitHub
                  try {
                    // Check if exists first to avoid re-uploading same image
                    const existing = await githubGet(`public/${publicPath}`);
                    if (!existing) {
                      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeGitHubPath(`public/${publicPath}`)}`;
                      await fetch(url, {
                        method: "PUT",
                        headers: {
                          Accept: "application/vnd.github+json",
                          Authorization: `token ${GITHUB_TOKEN}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          message: `feat(assets): upload image for draft ${slug}`,
                          content: base64Data, // Already base64
                          branch: PUBLISH_BRANCH,
                          committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" },
                        }),
                      });
                      console.log(`[drafts] Uploaded image: ${publicPath}`);
                    }

                    // Update Block
                    block.content.imageUrl = fullPublicUrl;
                    stateChanged = true;
                    replacements.push({ old: dataUrl, new: fullPublicUrl });

                    // If this was the cover/hero, update it too
                    if (coverImage === dataUrl) {
                      coverImage = fullPublicUrl;
                    }

                  } catch (err) {
                    console.error(`[drafts] Failed to upload image ${filename}`, err);
                  }
                }
              }
            }

            if (stateChanged) {
              // 1. Update the JSON state comment
              const newStateString = JSON.stringify(editorState);
              processedBody = processedBody.replace(stateMatch[0], `<!-- MAGAZINE_EDITOR_STATE: ${newStateString} -->`);

              // 2. Update markdown references (global replace of data URLs)
              for (const { old, new: newUrl } of replacements) {
                processedBody = processedBody.split(old).join(newUrl);
              }

              article.body = processedBody;
            }
          }
        } catch (e) {
          console.error("[drafts] Failed to process editor state images", e);
        }
      }

      // Update article with processed body and cover
      article.cover = coverImage;
      article.readingMinutes = readingMinutes;

    } catch (e) {
      console.error("[drafts] Image processing error", e);
    }

    // Save Draft
    try {
      const articlePath = `content/drafts/${slug}.json`;
      const indexPath = `content/drafts/index.json`;

      // 1. Save Article File
      await githubPut(articlePath, JSON.stringify(article, null, 2), `chore(drafts): save ${slug}`);

      // 2. Update Index
      let list: any[] = [];
      try {
        const existing = await githubGet(indexPath);
        if (existing && existing.content) {
          const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch { }

      const meta = {
        title: article.title,
        slug: article.slug,
        category: article.category,
        tags: article.tags || [],
        cover: article.cover || "",
        excerpt: article.excerpt || "",
        date: article.date || new Date().toISOString(),
        status: "draft"
      };

      const nextList = list
        .filter((item) => item.slug !== slug)
        .concat(meta)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      await githubPut(indexPath, JSON.stringify(nextList, null, 2), `chore(drafts): update index for ${slug}`);

      respond(res, 200, { success: true, slug });
    } catch (e: any) {
      console.error("[drafts] Save error", e);
      sendError(res, 502, "Erreur lors de la sauvegarde du brouillon");
    }
    return;
  }

  respond(res, 405, { success: false, error: "Méthode non autorisée" });
}
