import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, githubGet, githubPut } from "./_lib/github";
import { sendEmail } from "./_lib/email";

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
  if (req.method !== "POST") {
		res.setHeader("X-Debug", "subscribe:method_not_allowed");
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
		res.setHeader("X-Debug", "subscribe:invalid_email");
    return json(res, 400, { error: "Email invalide" });
  }

	const debugSteps: string[] = [];
	let okWebhook = false;
	let okCsv = false;
	let okEmails = false;

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
			if (f.status >= 200 && f.status < 300) {
				okWebhook = true;
				debugSteps.push(`webhook:${f.status}`);
			} else {
				debugSteps.push(`webhook_non2xx:${f.status}`);
			}
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[api/subscribe] webhook error", { error: e?.message, email: redactEmail(email) });
			debugSteps.push("webhook_error");
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
			okCsv = true;
			debugSteps.push("csv_ok");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[api/subscribe] github error", { error: e?.message, email: redactEmail(email) });
			debugSteps.push("csv_error");
    }
  }

	// 3) Emails via Resend (fire-and-forget). Considered success if envs present (attempted).
	if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
		okEmails = true;
		debugSteps.push("emails_attempt");
		void sendEmail({
			to: email,
			subject: "Bienvenue à la newsletter ✨",
			html: "<p>Merci ! Vous recevrez les prochains articles.</p>",
		});
		const owner = process.env.OWNER_EMAIL;
		if (owner) {
			void sendEmail({
				to: owner,
				subject: "Nouveau abonné",
				html: `<p>Email: ${email}</p><p>Source: ${source || ""}</p><p>Path: ${path || ""}</p>`,
			});
		}
	}

	const okAny = okWebhook || okCsv || okEmails;
	res.setHeader("X-Debug", `subscribe:${debugSteps.join(",") || "none"}`);
	if (okAny) {
		return json(res, 200, { ok: true });
	}
	return json(res, 202, { ok: false, fallback: "mailto" });
}

