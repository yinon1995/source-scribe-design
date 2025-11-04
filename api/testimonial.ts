import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createIssue, json } from "./_github";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { name, role, text } = bodyObj;
    if (!name || !text) return json(res, 400, { error: "Nom et texte requis" });
    const title = `Témoignage: ${name}${role ? " — " + role : ""}`;
    const body = `${text}`;
    await createIssue(title, body, ["testimonial"]);
    json(res, 200, { ok: true });
  } catch (e: any) {
    json(res, 500, { error: e.message || "server_error" });
  }
}


