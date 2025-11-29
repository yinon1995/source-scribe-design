import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { AboutContent } from "../shared/aboutContent.js";
import { DEFAULT_ABOUT_CONTENT } from "../shared/aboutContent.js";

type GithubConfig = {
  repo: string;
  token: string;
  branch: string;
};

type GithubConfigCheck =
  | { ok: true; config: GithubConfig }
  | { ok: false; missing: string[] };

type DeployResult = { triggered: boolean; error?: string | null };

type AboutApiResponse = {
  success: boolean;
  error?: string;
  content?: AboutContent;
  missingEnv?: string[];
  details?: { message?: string };
  deploy?: DeployResult;
};

const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RAW_PUBLISH_BRANCH = process.env.PUBLISH_BRANCH;
const PUBLISH_BRANCH = RAW_PUBLISH_BRANCH?.trim() || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
const INCLUDE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

const ABOUT_PATH = "content/about/a-propos.json";

export const config = {
  runtime: "nodejs",
};

function respond(res: VercelResponse, status: number, body: AboutApiResponse) {
  if (!res.headersSent) {
    res.setHeader("Content-Type", "application/json");
  }
  res.status(status).send(JSON.stringify(body));
}

function ensureGithubConfig(): GithubConfigCheck {
  const missing: string[] = [];
  if (!GITHUB_REPO) missing.push("GITHUB_REPO");
  if (!GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return {
    ok: true,
    config: {
      repo: GITHUB_REPO!,
      token: GITHUB_TOKEN!,
      branch: PUBLISH_BRANCH,
    },
  };
}

function extractBearerToken(req: VercelRequest): string {
  const header = typeof req.headers?.authorization === "string" ? req.headers.authorization : "";
  if (!header || !header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

function authorizeAdmin(req: VercelRequest): boolean {
  if (!PUBLISH_TOKEN) return true;
  const provided = extractBearerToken(req);
  return provided === PUBLISH_TOKEN;
}

async function readJsonBody<T>(req: VercelRequest): Promise<T> {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : (req.body as T);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : ({} as T);
}

async function githubGet(path: string, config: GithubConfig) {
  const url = `https://api.github.com/repos/${config.repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(
    config.branch,
  )}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${config.token}`,
    },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub GET ${res.status}: ${txt}`);
  }
  return res.json();
}

async function githubPut(path: string, content: string, message: string, config: GithubConfig) {
  let sha: string | undefined;
  const existing = await githubGet(path, config);
  if (existing && typeof existing.sha === "string") {
    sha = existing.sha;
  }
  const url = `https://api.github.com/repos/${config.repo}/contents/${encodeGitHubPath(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString("base64"),
      branch: config.branch,
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

function encodeGitHubPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function sanitizeAboutContent(value: unknown): AboutContent | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const aboutTitle = typeof obj.aboutTitle === "string" ? obj.aboutTitle : "";
  const aboutBody = Array.isArray(obj.aboutBody) ? obj.aboutBody.filter((entry): entry is string => typeof entry === "string") : [];
  const valuesTitle = typeof obj.valuesTitle === "string" ? obj.valuesTitle : "";
  const valuesItems = Array.isArray(obj.valuesItems)
    ? obj.valuesItems.filter((entry): entry is string => typeof entry === "string")
    : [];
  const approachTitle = typeof obj.approachTitle === "string" ? obj.approachTitle : "";
  const approachBody = typeof obj.approachBody === "string" ? obj.approachBody : "";

  if (!aboutTitle || !aboutBody.length || !valuesTitle || !approachTitle || !approachBody) {
    return null;
  }

  return {
    aboutTitle,
    aboutBody,
    valuesTitle,
    valuesItems,
    approachTitle,
    approachBody,
  };
}

function normalizeAboutPayload(payload: unknown): { ok: true; content: AboutContent } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Payload invalide" };
  }
  const obj = payload as Record<string, unknown>;

  const aboutTitle = typeof obj.aboutTitle === "string" ? obj.aboutTitle.trim() : "";
  const aboutBody = Array.isArray(obj.aboutBody)
    ? obj.aboutBody.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    : [];
  const valuesTitle = typeof obj.valuesTitle === "string" ? obj.valuesTitle.trim() : "";
  const valuesItems = Array.isArray(obj.valuesItems)
    ? obj.valuesItems.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    : [];
  const approachTitle = typeof obj.approachTitle === "string" ? obj.approachTitle.trim() : "";
  const approachBody = typeof obj.approachBody === "string" ? obj.approachBody.trim() : "";

  if (!aboutTitle || !aboutBody.length) return { ok: false, error: "Texte principal manquant." };
  if (!valuesTitle) return { ok: false, error: "Titre des valeurs manquant." };
  if (!approachTitle || !approachBody) return { ok: false, error: "Section approche manquante." };

  return {
    ok: true,
    content: {
      aboutTitle,
      aboutBody,
      valuesTitle,
      valuesItems,
      approachTitle,
      approachBody,
    },
  };
}

async function readAboutFromGithub(config: GithubConfig): Promise<AboutContent> {
  try {
    const existing = await githubGet(ABOUT_PATH, config);
    if (!existing || !existing.content) {
      return DEFAULT_ABOUT_CONTENT;
    }
    const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return sanitizeAboutContent(parsed) ?? DEFAULT_ABOUT_CONTENT;
  } catch {
    return DEFAULT_ABOUT_CONTENT;
  }
}

async function triggerVercelDeployIfConfigured(): Promise<DeployResult> {
  if (!VERCEL_DEPLOY_HOOK_URL) {
    return { triggered: false, error: "Deploy hook non configuré" };
  }
  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: "POST" });
    if (!res.ok) {
      const txt = await res.text();
      return { triggered: false, error: `Deploy hook ${res.status}: ${txt}` };
    }
    return { triggered: true, error: null };
  } catch (error: any) {
    return { triggered: false, error: error?.message || "Deploy hook error" };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const check = ensureGithubConfig();
      const missingEnv = !check.ok ? check.missing : [];
      if (!check.ok) {
        respond(res, 200, { success: true, content: DEFAULT_ABOUT_CONTENT, missingEnv });
        return;
      }
      const content = await readAboutFromGithub(check.config);
      respond(res, 200, { success: true, content });
      return;
    }

    if (req.method === "PUT") {
      if (!authorizeAdmin(req)) {
        respond(res, 401, { success: false, error: "Admin token invalide" });
        return;
      }

      const check = ensureGithubConfig();
      const missingEnv = !check.ok ? check.missing : [];
      if (!check.ok) {
        respond(res, 503, {
          success: false,
          error: "Configuration GitHub manquante.",
          missingEnv,
        });
        return;
      }

      let payload: unknown = null;
      try {
        payload = await readJsonBody(req);
      } catch {
        respond(res, 400, { success: false, error: "JSON invalide" });
        return;
      }

      const normalized = normalizeAboutPayload(payload);
      if (!normalized.ok) {
        const err = normalized.error;
        respond(res, 422, { success: false, error: err });
        return;
      }

      try {
        await githubPut(
          ABOUT_PATH,
          JSON.stringify(normalized.content, null, 2),
          "chore(about): update about content",
          check.config,
        );
        const deploy = await triggerVercelDeployIfConfigured();
        respond(res, 200, { success: true, content: normalized.content, deploy });
        return;
      } catch (error: any) {
        const message = error?.message ? String(error.message) : "Erreur GitHub";
        respond(res, 502, {
          success: false,
          error: "Erreur GitHub lors de l’écriture.",
          details: INCLUDE_ERROR_DETAILS ? { message } : undefined,
        });
        return;
      }
    }

    respond(res, 405, { success: false, error: "Méthode non autorisée" });
  } catch (error: any) {
    const message = error?.message ? String(error.message) : "Erreur serveur interne";
    respond(res, 500, {
      success: false,
      error: "Erreur serveur interne",
      details: INCLUDE_ERROR_DETAILS ? { message } : undefined,
    });
  }
}


