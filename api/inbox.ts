import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";

type LeadCategory = "newsletter" | "services" | "quote" | "testimonial" | "contact";

type Lead = {
  id: string;
  category: LeadCategory;
  source: string;
  email?: string;
  name?: string;
  message?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

type ApiResponse<T extends Record<string, unknown> = Record<string, never>> = {
  success: boolean;
  error?: string;
  details?: string;
  missingEnv?: string[];
} & T;

const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RAW_PUBLISH_BRANCH = process.env.PUBLISH_BRANCH;
const PUBLISH_BRANCH = RAW_PUBLISH_BRANCH?.trim() || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const INBOX_PATH = "content/inbox/leads.json";
const INCLUDE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

export const config = {
  runtime: "nodejs",
};

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function respond<T extends Record<string, unknown>>(res: VercelResponse, status: number, body: ApiResponse<T>) {
  if (!res.headersSent) {
    res.setHeader("Content-Type", "application/json");
  }
  res.status(status).send(JSON.stringify(body));
}

type GithubConfig = {
  repo: string;
  token: string;
  branch: string;
};

function encodeGitHubPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function toBase64(content: string | Uint8Array) {
  return Buffer.from(content).toString("base64");
}

async function githubGet(path: string, config: GithubConfig) {
  const url = `https://api.github.com/repos/${config.repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(config.branch)}`;
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
      content: toBase64(content),
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

async function readJsonBody<T>(req: VercelRequest): Promise<T> {
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

async function readLeads(config: GithubConfig): Promise<Lead[]> {
  try {
    const existing = await githubGet(INBOX_PATH, config);
    if (!existing || !existing.content) return [];
    const decoded = Buffer.from(String(existing.content), "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return parsed as Lead[];
    }
    return [];
  } catch {
    return [];
  }
}

async function writeLeads(leads: Lead[], message: string, config: GithubConfig) {
  const sorted = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await githubPut(INBOX_PATH, JSON.stringify(sorted, null, 2), message, config);
}

function missingGithubEnv(): string[] {
  return [
    !GITHUB_REPO ? "GITHUB_REPO" : null,
    !RAW_PUBLISH_BRANCH ? "PUBLISH_BRANCH" : null,
    !GITHUB_TOKEN ? "GITHUB_TOKEN" : null,
  ].filter(Boolean) as string[];
}

function getGithubConfig(): { ok: true; config: GithubConfig } | { ok: false; missing: string[] } {
  const missing = missingGithubEnv();
  if (missing.length) {
    return { ok: false, missing };
  }
  return {
    ok: true,
    config: {
      repo: GITHUB_REPO as string,
      token: GITHUB_TOKEN as string,
      branch: PUBLISH_BRANCH,
    },
  };
}

function ensureGithubConfig(res: VercelResponse): GithubConfig | null {
  const result = getGithubConfig();
  if (!result.ok) {
    respond(res, 503, {
      success: false,
      error: "Configuration GitHub manquante.",
      missingEnv: result.missing,
    });
    return null;
  }
  return result.config;
}

function isLeadCategory(value: string): value is LeadCategory {
  return ["newsletter", "services", "quote", "testimonial", "contact"].includes(value);
}

type LeadPayload = {
  category?: string;
  source?: string;
  email?: string;
  name?: string;
  message?: string;
  meta?: unknown;
};

function normalizeLeadPayload(payload: LeadPayload): { ok: true; value: Omit<Lead, "id" | "createdAt"> } | { ok: false; error: string } {
  const categoryRaw = typeof payload.category === "string" ? payload.category.trim().toLowerCase() : "";
  if (!isLeadCategory(categoryRaw)) {
    return { ok: false, error: "Catégorie invalide" };
  }
  const category = categoryRaw as LeadCategory;
  const source = typeof payload.source === "string" ? payload.source.trim().slice(0, 120) : "";
  if (!source) {
    return { ok: false, error: "Source manquante" };
  }
  const email = typeof payload.email === "string" ? payload.email.trim() : undefined;
  const name = typeof payload.name === "string" ? payload.name.trim() : undefined;
  const message = typeof payload.message === "string" ? payload.message.trim() : undefined;
  const meta =
    typeof payload.meta === "object" && payload.meta !== null
      ? (payload.meta as Record<string, unknown>)
      : undefined;

  const categoryNeedsEmail = category !== "testimonial";
  const categoryNeedsMessage = category === "services" || category === "quote" || category === "testimonial" || category === "contact";

  if (categoryNeedsEmail && (!email || !/^\S+@\S+\.\S+$/.test(email))) {
    return { ok: false, error: "Email requis" };
  }
  if (categoryNeedsMessage && !message) {
    return { ok: false, error: "Message requis" };
  }

  return {
    ok: true,
    value: {
      category,
      source,
      email,
      name,
      message,
      meta,
    },
  };
}

function authorizeAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (!PUBLISH_TOKEN) return true;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (provided !== PUBLISH_TOKEN) {
    respond(res, 401, { success: false, error: "Admin token invalide" });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      if (!authorizeAdmin(req, res)) return;
      const config = ensureGithubConfig(res);
      if (!config) return;
      const leads = await readLeads(config);
      respond(res, 200, { success: true, leads });
      return;
    }

    if (req.method === "POST") {
      const config = ensureGithubConfig(res);
      if (!config) return;
      let payload: LeadPayload = {};
      try {
        payload = await readJsonBody<LeadPayload>(req);
      } catch (err: any) {
        respond(res, 400, { success: false, error: "JSON invalide", details: INCLUDE_ERROR_DETAILS ? err?.message : undefined });
        return;
      }
      const normalized = normalizeLeadPayload(payload);
      if (!normalized.ok) {
        respond(res, 422, { success: false, error: normalized.error });
        return;
      }
      const normalizedLead = normalized.value;
      const lead: Lead = {
        ...normalizedLead,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      };
      try {
        const current = await readLeads(config);
        await writeLeads([lead, ...current], `feat(inbox): add lead ${lead.id}`, config);
        respond(res, 201, { success: true, lead });
      } catch (err: any) {
        respond(res, 502, {
          success: false,
          error: "Impossible d’enregistrer la demande.",
          details: INCLUDE_ERROR_DETAILS ? err?.message : undefined,
        });
      }
      return;
    }

    if (req.method === "DELETE") {
      if (!authorizeAdmin(req, res)) return;
      const config = ensureGithubConfig(res);
      if (!config) return;
      const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
      if (!id) {
        respond(res, 400, { success: false, error: "Identifiant manquant" });
        return;
      }
      try {
        const leads = await readLeads(config);
        const next = leads.filter((lead) => lead.id !== id);
        if (next.length === leads.length) {
          respond(res, 404, { success: false, error: "Demande introuvable" });
          return;
        }
        await writeLeads(next, `chore(inbox): delete lead ${id}`, config);
        respond(res, 200, { success: true });
      } catch (err: any) {
        respond(res, 502, {
          success: false,
          error: "Impossible de mettre à jour l’inbox.",
          details: INCLUDE_ERROR_DETAILS ? err?.message : undefined,
        });
      }
      return;
    }

    respond(res, 405, { success: false, error: "Méthode non autorisée" });
  } catch (err: any) {
    respond(res, 500, {
      success: false,
      error: "Erreur serveur interne",
      details: INCLUDE_ERROR_DETAILS ? err?.message : undefined,
    });
  }
}


