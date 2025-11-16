// Vercel function to publish JSON articles to GitHub (contents API)

type Article = {
  title: string;
  slug: string;
  category: "Commerces & lieux" | "Expérience" | "Beauté";
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

const REPO = process.env.GITHUB_REPO; // e.g. "nolwennrobet-lab/source-scribe-design"
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.PUBLISH_BRANCH || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK_URL;

function encodeGitHubPath(path: string) {
  // Encode each path segment, not slashes. Using full encodeURIComponent would break the URL
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubGet(path: string) {
  if (!REPO || !TOKEN) return undefined;
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(BRANCH)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${TOKEN}`,
    },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  return res.json();
}

async function githubPut(path: string, content: string, message: string) {
  if (!REPO || !TOKEN) throw new Error("Missing GitHub credentials");
  let sha: string | undefined;
  const existing = await githubGet(path);
  if (existing && typeof existing.sha === "string") sha = existing.sha;
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeGitHubPath(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch: BRANCH,
      sha,
      committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub PUT ${res.status}: ${txt}`);
  }
  return res.json();
}

async function githubRepoPreflight(): Promise<{ ok: true } | { ok: false; status: number }> {
  if (!REPO || !TOKEN) return { ok: false, status: 0 };
  const url = `https://api.github.com/repos/${REPO}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${TOKEN}`,
    },
  });
  if (res.status === 200) return { ok: true };
  return { ok: false, status: res.status };
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
          res.status(401).json({ ok: false, error: "Non autorisé." });
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
      res.status(400).json({ error: "Slug requis pour la suppression." });
      return;
    }

    // If missing credentials, gracefully report ok:false to allow client to keep UI consistent
    if (!REPO || !TOKEN) {
      const missingEnv = [!REPO ? "GITHUB_REPO" : null, !TOKEN ? "GITHUB_TOKEN" : null].filter(Boolean);
      res.status(200).json({ ok: false, error: "Suppression en attente — configuration GitHub manquante (GITHUB_REPO/GITHUB_TOKEN).", missingEnv });
      return;
    }

    // Helper to DELETE a file in GitHub repo via Contents API
    async function githubDelete(path: string, message: string) {
      const existing = await githubGet(path);
      if (!existing || !existing.sha) return { existed: false, result: undefined as any };
      const url = `https://api.github.com/repos/${REPO}/contents/${encodeGitHubPath(path)}`;
      const resDel = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `token ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, sha: existing.sha, branch: BRANCH, committer: { name: "A la Brestoise bot", email: "bot@alabrestoise.local" } }),
      });
      if (!resDel.ok) {
        const txt = await resDel.text();
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

      // 3) Trigger Vercel deployment hook (fire-and-forget)
      let deploy: { triggered: boolean; error?: string } | undefined;
      if (DEPLOY_HOOK) {
        deploy = { triggered: false };
        try {
          const hookRes = await fetch(DEPLOY_HOOK, { method: "POST" });
          deploy.triggered = hookRes.ok;
          if (!hookRes.ok) deploy.error = `Hook HTTP ${hookRes.status}`;
        } catch (err: any) {
          deploy.error = "Échec de la demande de déploiement Vercel.";
        }
      }
      const deployTriggered = Boolean(DEPLOY_HOOK) && Boolean(deploy?.triggered);

      res.status(200).json({ ok: true, slug, deletedFromIndex, deletedFile, deployTriggered, deploy });
      return;
    } catch (e: any) {
      const message = e?.message ? String(e.message) : String(e);
      const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
      const status = m ? Number(m[1]) : undefined;
      console.error("[publish] GitHub error", { repo: REPO, branch: BRANCH, message });
      res.status(500).json({ ok: false, error: "Échec de la suppression GitHub.", details: { status, message } });
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
          res.status(401).json({ ok: false, error: "Non autorisé." });
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
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    // Payload validation → 422 with structured field errors
    const fieldErrors: { title?: string; slug?: string; category?: string; body?: string; date?: string } = {};
    const allowedCategories = new Set(["Commerces & lieux", "Expérience", "Beauté"]);
    if (!article || typeof article !== "object") {
      res.status(422).json({ ok: false, error: "Champs invalides.", errors: { title: "Le titre est obligatoire.", slug: "Le slug ne peut contenir que des lettres, chiffres et tirets.", body: "Le contenu est trop court." } });
      return;
    }
    if (!article.title || !String(article.title).trim()) fieldErrors.title = "Le titre est obligatoire.";
    if (!article.category || !allowedCategories.has(article.category)) fieldErrors.category = "La thématique est obligatoire.";
    if (!article.body || String(article.body).trim().length < 50) fieldErrors.body = "Le contenu est trop court.";
    if (article.date) {
      const d = new Date(article.date);
      if (isNaN(d.getTime())) fieldErrors.date = "La date n’est pas valide.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      res.status(422).json({ ok: false, error: "Champs invalides.", errors: fieldErrors });
      return;
    }

    const normalizedSlugInput = slugify(String(article.slug || article.title || ""));
    if (!normalizedSlugInput) {
      res.status(422).json({
        ok: false,
        error: "Champs invalides.",
        errors: { slug: "Le slug ne peut contenir que des lettres, chiffres et tirets." },
      });
      return;
    }
    article.slug = normalizedSlugInput;
    const slug = normalizedSlugInput;

    // If missing credentials, gracefully report ok:false and keep draft
    if (!REPO || !TOKEN) {
      const missingEnv = [!REPO ? "GITHUB_REPO" : null, !TOKEN ? "GITHUB_TOKEN" : null].filter(Boolean);
      res.status(200).json({ ok: false, error: "Publication en attente — configuration GitHub manquante (GITHUB_REPO/GITHUB_TOKEN). Le brouillon a été conservé localement.", missingEnv });
      return;
    }

    // Repo preflight check (detect 404 or 403 early with clear message)
    try {
      const check = await githubRepoPreflight();
      if (!check.ok && (check.status === 404 || check.status === 403)) {
        // Log diagnostic info on server without leaking secrets
        console.error("publish: GitHub error", { status: check.status, repo: REPO, branch: BRANCH });
        res.status(200).json({ ok: false, error: "Référentiel introuvable ou accès refusé.", details: { status: check.status } });
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

      // Optionally trigger Vercel deployment
      let deploy: { triggered: boolean; error?: string } = { triggered: false };
      if (DEPLOY_HOOK) {
        try {
          const dh = await fetch(DEPLOY_HOOK, { method: "POST" });
          deploy.triggered = dh.ok;
          if (!dh.ok) deploy.error = `Hook HTTP ${dh.status}`;
        } catch (e: any) {
          deploy.error = String(e?.message || e);
        }
      }
      const deployTriggered = Boolean(DEPLOY_HOOK) && Boolean(deploy.triggered);

      res.status(200).json({
        ok: true,
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
      console.error("[publish] GitHub error", { repo: REPO, branch: BRANCH, message });
      res.status(500).json({ ok: false, error: "Échec de la publication GitHub. Vérifiez la configuration du dépôt.", details: { status, message } });
      return;
    }
  }

  // Method routing
  if (req.method === "OPTIONS") {
    res.status(200).end();
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
  res.status(405).json({ error: "Method not allowed" });
}


