// Vercel Node 18 serverless function to publish a Markdown post to GitHub

type ImagePayload = { base64: string; filename: string };

type PublishBody = {
  title: string;
  summary: string;
  tags?: string[];
  bodyMarkdown: string;
  date?: string;
  image?: ImagePayload;
};

function toBase64(content: string | Uint8Array) {
  return Buffer.from(content).toString("base64");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function githubPutContent(path: string, content: string | Uint8Array, message: string) {
  const owner = process.env.GITHUB_OWNER as string;
  const repo = process.env.GITHUB_REPO as string;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN as string;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub error ${res.status}: ${txt}`);
  }
  return res.json();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminPassword = req.headers["x-admin-password"] || req.headers["X-Admin-Password"] || req.headers["x-ADMIN-password"];
  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let body: PublishBody | undefined;
  try {
    body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (!body || !body.title || !body.summary || !body.bodyMarkdown) {
    res.status(400).json({ error: "Missing required fields: title, summary, bodyMarkdown" });
    return;
  }

  const dateStr = body.date || new Date().toISOString().slice(0, 10);
  const slug = slugify(body.title);
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(5, 7);

  let heroImagePath: string | undefined;
  if (body.image?.base64 && body.image?.filename) {
    const cleanName = body.image.filename.replace(/[^A-Za-z0-9_.-]/g, "-");
    heroImagePath = `public/images/${y}/${m}/${slug}-${cleanName}`;
    const imagePublicUrl = `/images/${y}/${m}/${slug}-${cleanName}`;
    const commaIdx = body.image.base64.indexOf(",");
    const base64Data = commaIdx >= 0 ? body.image.base64.slice(commaIdx + 1) : body.image.base64;
    await githubPutContent(heroImagePath, Buffer.from(base64Data, "base64"), `chore(cms): add hero image for ${slug}`);
    heroImagePath = imagePublicUrl;
  }

  const frontmatter = [
    "---",
    `title: "${body.title.replace(/"/g, '\\"')}` + "",
    `slug: "${slug}` + "",
    `date: "${dateStr}` + "",
    `summary: "${body.summary.replace(/"/g, '\\"')}` + "",
    body.tags && body.tags.length ? `tags: [${body.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]` : undefined,
    heroImagePath ? `heroImage: "${heroImagePath}` + "" : undefined,
    "---\n",
  ]
    .filter(Boolean)
    .join("\n");

  const markdown = `${frontmatter}${body.bodyMarkdown}\n`;
  const postPath = `content/posts/${slug}.md`;
  await githubPutContent(postPath, markdown, `chore(cms): publish post ${slug}`);

  const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (deployHook) {
    try {
      await fetch(deployHook, { method: "POST" });
    } catch {
      // ignore
    }
  }

  res.status(200).json({ ok: true, slug, urls: { article: `/articles/${slug}` } });
}


