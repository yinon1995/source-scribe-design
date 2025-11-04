import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createIssue, json } from "./_github";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { email } = bodyObj;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json(res, 400, { error: "Email invalide" });
    const title = `Newsletter: ${email}`;
    const body = `New subscriber email: ${email}\nSource: A la Brestoise`;
    await createIssue(title, body, ["newsletter"]);
    json(res, 200, { ok: true });
  } catch (e: any) {
    json(res, 500, { error: e.message || "server_error" });
  }
}


