import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, githubGet, githubPut } from "./_github";

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function redactEmail(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return "***";
  return `***@${email.slice(at + 1)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const isLocal = !process.env.VERCEL || process.env.VERCEL_ENV === "development" || process.env.NODE_ENV !== "production";
  if (isLocal) {
    return json(res, 200, { ok: true, dev: true });
  }
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  let bodyObj: any = {};
  try {
    bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, 400, { error: "Invalid JSON" });
  }

  const email: string | undefined = bodyObj?.email;
  const source: string | undefined = bodyObj?.source;
  const path: string | undefined = bodyObj?.path;
  const ua: string | undefined = bodyObj?.ua;
  const origin = (req.headers?.origin as string) || (req.headers?.referer as string) || undefined;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || (req.socket as any)?.remoteAddress || undefined;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return json(res, 400, { error: "Email invalide" });
  }

  // 1) Webhook forwarding (Formspree or generic)
  const webhook = process.env.FORMSPREE_ENDPOINT || process.env.SUBSCRIBE_WEBHOOK_URL;
  if (webhook) {
    try {
      const f = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, path, ua, ip, origin, at: new Date().toISOString() }),
      });
      // eslint-disable-next-line no-console
      console.log("[api/subscribe] webhook", { status: f.status, email: redactEmail(email), source });
      // Pass through status — 2xx considered OK
      const status = f.status;
      if (status >= 200 && status < 300) {
        return json(res, 200, { ok: true });
      } else {
        return json(res, status, { ok: false, error: "webhook_error" });
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[api/subscribe] webhook error", { error: e?.message, email: redactEmail(email) });
      // Fallthrough to next strategy
    }
  }

  // 2) GitHub append to CSV (if token configured)
  if (process.env.GITHUB_TOKEN) {
    try {
      const filePath = process.env.GITHUB_FILE_PATH || "data/subscribers.csv";
      const existing = await githubGet(filePath);
      let current = "";
      if (existing && (existing as any).content) {
        const decoded = Buffer.from(String((existing as any).content), "base64").toString("utf8");
        current = decoded.endsWith("\n") ? decoded : decoded + "\n";
      }
      const iso = new Date().toISOString();
      const line = `${iso},${email},${source || ""},${ip || ""},${origin || ""},${path || ""},${(ua || "").replace(/,/g, " ")}\n`;
      const next = current + line;
      await githubPut(filePath, next, "chore(subscribers): append new email");
      // eslint-disable-next-line no-console
      console.log("[api/subscribe] github csv append", { email: redactEmail(email), source });
      return json(res, 200, { ok: true });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[api/subscribe] github error", { error: e?.message, email: redactEmail(email) });
      // Fallthrough to 202 fallback
    }
  }

  // 3) No envs — graceful 202 fallback
  return json(res, 202, { ok: false, fallback: "mailto" });
}

