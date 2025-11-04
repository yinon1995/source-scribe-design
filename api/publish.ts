// Vercel function to publish JSON articles to GitHub (contents API)

type Article = {
  title: string;
  slug: string;
  category: "Commerces & lieux" | "Expérience" | "Beauté";
  tags: string[];
  cover: string;
  excerpt: string;
  body: string; // markdown
  author: string;
  date: string; // ISO
};

function toBase64(content: string | Uint8Array) {
  return Buffer.from(content).toString("base64");
}

const REPO = process.env.GITHUB_REPO; // e.g. "nolwennrobet-lab/source-scribe-design"
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.GITHUB_BRANCH || "main";

async function githubGet(path: string) {
  if (!REPO || !TOKEN) return undefined;
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`;
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
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, content: toBase64(content), branch: BRANCH, sha }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub PUT ${res.status}: ${txt}`);
  }
  return res.json();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Admin gate via Authorization: Bearer <token>
  try {
    const configuredToken = process.env.PUBLISH_TOKEN;
    if (configuredToken) {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";
      if (provided !== configuredToken) {
        res.status(401).json({ ok: false, error: "Accès refusé — mot de passe administrateur invalide." });
        return;
      }
    }
  } catch {
    // ignore, fallback to continue
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
  if (!article.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(article.slug))) fieldErrors.slug = "Le slug ne peut contenir que des lettres, chiffres et tirets.";
  if (!article.body || String(article.body).trim().length < 50) fieldErrors.body = "Le contenu est trop court.";
  if (article.date) {
    const d = new Date(article.date);
    if (isNaN(d.getTime())) fieldErrors.date = "La date n’est pas valide.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    res.status(422).json({ ok: false, error: "Champs invalides.", errors: fieldErrors });
    return;
  }

  // If missing credentials, gracefully report ok:false and keep draft
  if (!REPO || !TOKEN) {
    const missingEnv = [!REPO ? "GITHUB_REPO" : null, !TOKEN ? "GITHUB_TOKEN" : null].filter(Boolean);
    res.status(200).json({ ok: false, error: "Publication en attente — configuration GitHub manquante (GITHUB_REPO/GITHUB_TOKEN). Le brouillon a été conservé localement.", missingEnv });
    return;
  }

  const slug = article.slug;

  try {
    // Write full article JSON
    const articlePath = `content/articles/${slug}.json`;
    await githubPut(articlePath, JSON.stringify(article, null, 2), `chore(cms): publish article ${slug}`);

    // Update index.json
    type Meta = Pick<Article, "title" | "slug" | "category" | "tags" | "cover" | "excerpt" | "date">;
    const meta: Meta = {
      title: article.title,
      slug: article.slug,
      category: article.category,
      tags: article.tags || [],
      cover: article.cover,
      excerpt: article.excerpt,
      date: article.date,
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

    const bySlug = new Map<string, Meta>(list.map((m) => [m.slug, m]));
    bySlug.set(meta.slug, meta);
    const nextList = Array.from(bySlug.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    await githubPut(indexPath, JSON.stringify(nextList, null, 2), `chore(cms): update articles index (${slug})`);
  } catch (e: any) {
    const message = e?.message ? String(e.message) : String(e);
    // Try to extract status code if present in the message like "GitHub PUT 422: ..."
    const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
    const status = m ? Number(m[1]) : undefined;
    res.status(500).json({ ok: false, error: "Échec de la publication GitHub.", details: { status, message } });
    return;
  }

  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (deployHook) {
    try { await fetch(deployHook, { method: "POST" }); } catch {}
  }

  res.status(200).json({ ok: true, url: `/articles/${slug}` });
}


