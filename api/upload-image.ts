// Vercel function to upload an image to GitHub under public/uploads/<slug>/

type UploadBody = {
  slug?: string;
  fileName?: string;
  content?: string; // base64
};

const REPO = process.env.GITHUB_REPO; // e.g. "nolwennrobet-lab/source-scribe-design"
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.PUBLISH_BRANCH || "main";

function encodeGitHubPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function toBase64(content: string | Uint8Array) {
  return Buffer.from(content).toString("base64");
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
  if (existing && typeof (existing as any).sha === "string") sha = (existing as any).sha;
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
    // ignore
  }

  let body: UploadBody | undefined;
  try {
    body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch {
    res.status(400).json({ ok: false, error: "Invalid JSON" });
    return;
  }

  const slug = String(body?.slug || "").trim();
  const fileName = String(body?.fileName || "").trim();
  const content = String(body?.content || "").trim();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    res.status(422).json({ ok: false, error: "Slug invalide." });
    return;
  }
  if (!fileName || /\//.test(fileName)) {
    res.status(422).json({ ok: false, error: "Nom de fichier invalide." });
    return;
  }
  if (!content) {
    res.status(422).json({ ok: false, error: "Contenu manquant (base64)." });
    return;
  }

  if (!REPO || !TOKEN) {
    const missingEnv = [!REPO ? "GITHUB_REPO" : null, !TOKEN ? "GITHUB_TOKEN" : null].filter(Boolean);
    res.status(200).json({ ok: false, error: "Configuration GitHub manquante.", missingEnv });
    return;
  }

  try {
    const path = `public/uploads/${slug}/${fileName}`;
    await githubPut(path, content, `feat(assets): upload image for ${slug}`);
    res.status(200).json({ ok: true, path: `/uploads/${slug}/${fileName}` });
  } catch (e: any) {
    const message = e?.message ? String(e.message) : String(e);
    const m = /GitHub\s+[A-Z]+\s+(\d{3})/.exec(message);
    const status = m ? Number(m[1]) : undefined;
    res.status(500).json({ ok: false, error: "Échec du téléversement GitHub.", details: { status, message } });
  }
}















