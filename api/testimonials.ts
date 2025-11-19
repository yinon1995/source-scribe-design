import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import type { Testimonial, TestimonialCreateInput } from "../shared/testimonials.js";
import { clampRating } from "../shared/testimonials.js";

type GithubConfig = {
  repo: string;
  token: string;
  branch: string;
};

type GithubConfigCheck =
  | { ok: true; config: GithubConfig }
  | { ok: false; missing: string[] };

const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PUBLISH_BRANCH = process.env.PUBLISH_BRANCH?.trim() || "main";
const PUBLISH_TOKEN = process.env.PUBLISH_TOKEN;
const INCLUDE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

const TESTIMONIALS_PATH = "content/testimonials/testimonials.json";

export const config = {
  runtime: "nodejs",
};

type ApiResponse<T extends Record<string, unknown> = Record<string, never>> = {
  success: boolean;
  error?: string;
  missingEnv?: string[];
  details?: string;
} & T;

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

function authorizeAdmin(req: VercelRequest): boolean {
  if (!PUBLISH_TOKEN) return true;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const provided = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  return provided === PUBLISH_TOKEN;
}

function encodeGitHubPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function toBase64(content: string | Uint8Array) {
  return Buffer.from(content).toString("base64");
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
  if (existing && typeof (existing as any).sha === "string") {
    sha = (existing as any).sha;
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

async function readTestimonials(config: GithubConfig): Promise<Testimonial[]> {
  try {
    const existing = await githubGet(TESTIMONIALS_PATH, config);
    if (!existing || !existing.content) return [];
    const decoded = Buffer.from(String((existing as any).content), "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return (parsed as Testimonial[]).map(ensureTestimonialShape);
    }
    return [];
  } catch {
    return [];
  }
}

function ensureTestimonialShape(testimonial: Testimonial): Testimonial {
  return {
    ...testimonial,
    clientType: testimonial.clientType ?? testimonial.company ?? null,
    avatar: testimonial.avatar ?? testimonial.avatarUrl ?? null,
    photos: sanitizePhotoArray(testimonial.photos),
  };
}

async function writeTestimonials(testimonials: Testimonial[], config: GithubConfig) {
  const sorted = [...testimonials].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await githubPut(TESTIMONIALS_PATH, JSON.stringify(sorted, null, 2), "chore(testimonials): update testimonials", config);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function optionalDataUrl(value: unknown): string | undefined {
  const str = optionalString(value);
  if (!str) return undefined;
  if (!str.startsWith("data:image/")) return undefined;
  return str;
}

function optionalDataUrlArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((entry): entry is string => typeof entry === "string" && entry.startsWith("data:image/"));
  return items.length > 0 ? items : undefined;
}

function sanitizePhotoArray(value: unknown): string[] | null {
  const items = optionalDataUrlArray(value);
  return items ?? null;
}

function normalizeTestimonialPayload(input: unknown): { ok: true; value: TestimonialCreateInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Payload invalide" };
  }
  const data = input as Record<string, unknown>;
  const name = optionalString(data.name);
  if (!name) {
    return { ok: false, error: "Nom requis" };
  }
  const body = optionalString(data.body);
  if (!body) {
    return { ok: false, error: "Témoignage requis" };
  }
  const rating = clampRating(data.rating, 5);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Note invalide" };
  }
  const value: TestimonialCreateInput = {
    name,
    body,
    clientType: optionalString(data.clientType),
    company: optionalString(data.company),
    role: optionalString(data.role),
    city: optionalString(data.city),
    rating,
    avatarDataUrl: optionalDataUrl(data.avatarDataUrl),
    avatarUrl: optionalString(data.avatarUrl),
    photos: optionalDataUrlArray(data.photos),
    sourceLeadId: optionalString(data.sourceLeadId),
  };
  return { ok: true, value };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    const check = ensureGithubConfig();
    if (check.ok === false) {
      respond(res, 503, {
        success: false,
        error: "Configuration GitHub manquante.",
        missingEnv: check.missing,
      });
      return;
    }
    const { config } = check;

    if (req.method === "GET") {
      const testimonials = await readTestimonials(config);
      respond(res, 200, { success: true, testimonials });
      return;
    }

    if (req.method === "POST") {
      if (!authorizeAdmin(req)) {
        respond(res, 401, { success: false, error: "Admin token invalide" });
        return;
      }
      let payload: unknown;
      try {
        payload = await readJsonBody(req);
      } catch (error: any) {
        respond(res, 400, {
          success: false,
          error: "JSON invalide",
          details: INCLUDE_ERROR_DETAILS ? error?.message : undefined,
        });
        return;
      }
      const result = normalizeTestimonialPayload(payload);
      if (!result.ok) {
        const errorMessage = "error" in result ? result.error : "Payload invalide";
        console.error("Invalid testimonial payload", errorMessage);
        respond(res, 422, { success: false, error: errorMessage });
        return;
      }
      const testimonial: Testimonial = {
        id: randomUUID(),
        name: result.value.name,
        body: result.value.body,
        rating: result.value.rating,
        clientType: result.value.clientType ?? result.value.company ?? null,
        company: result.value.company ?? null,
        role: result.value.role ?? null,
        city: result.value.city ?? null,
        avatar: result.value.avatarDataUrl ?? result.value.avatarUrl ?? null,
        avatarUrl: result.value.avatarUrl ?? null,
        photos:
          result.value.photos && result.value.photos.length > 0
            ? result.value.photos
            : null,
        sourceLeadId: result.value.sourceLeadId ?? null,
        createdAt: new Date().toISOString(),
      };
      const current = await readTestimonials(config);
      await writeTestimonials([testimonial, ...current], config);
      respond(res, 201, { success: true, testimonial });
      return;
    }

    if (req.method === "DELETE") {
      if (!authorizeAdmin(req)) {
        respond(res, 401, { success: false, error: "Admin token invalide" });
        return;
      }
      const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
      if (!id) {
        respond(res, 400, { success: false, error: "Identifiant manquant" });
        return;
      }
      const current = await readTestimonials(config);
      const next = current.filter((testimonial) => testimonial.id !== id);
      if (next.length === current.length) {
        respond(res, 404, { success: false, error: "Témoignage introuvable" });
        return;
      }
      await writeTestimonials(next, config);
      respond(res, 200, { success: true });
      return;
    }

    respond(res, 405, { success: false, error: "Méthode non autorisée" });
  } catch (error: any) {
    respond(res, 500, {
      success: false,
      error: "Erreur serveur interne",
      details: INCLUDE_ERROR_DETAILS ? error?.message : undefined,
    });
  }
}


