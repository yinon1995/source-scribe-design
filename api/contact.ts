import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createIssue, json } from "./_github";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { name, email, company, message } = bodyObj;
    if (!name || !email || !message) return json(res, 400, { error: "Champs requis manquants" });
    const title = `Contact: ${name} <${email}>`;
    const body = `Company: ${company || "-"}\n\nMessage:\n${message}`;
    await createIssue(title, body, ["contact"]);
    json(res, 200, { ok: true });
  } catch (e: any) {
    json(res, 500, { error: e.message || "server_error" });
  }
}


