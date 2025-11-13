import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json } from "./_lib/github";
import { sendEmail } from "./_lib/email";

function setCors(res: VercelResponse) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	setCors(res);
	if (req.method === "OPTIONS") {
		res.status(204).end();
		return;
	}
	if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

	let bodyObj: any = {};
	try {
		bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
	} catch {
		return json(res, 400, { error: "Invalid JSON" });
	}

	const fullName: string | undefined = bodyObj?.fullName || bodyObj?.name;
	const email: string | undefined = bodyObj?.email;
	const company: string | undefined = bodyObj?.company;
	const city: string | undefined = bodyObj?.city;
	const projectType: string | undefined = bodyObj?.projectType;
	const budget: string | undefined = bodyObj?.budget;
	const deadline: string | undefined = bodyObj?.deadline;
	const message: string | undefined = bodyObj?.message;
	const consent: boolean = Boolean(bodyObj?.consent);

	if (!fullName || !email || !message || !consent) {
		return json(res, 400, { error: "Champs requis manquants" });
	}

	try {
		const debugSteps: string[] = [];
		const siteName = "À la Brestoise";
		const siteUrl = process.env.SITE_URL || "https://a-la-brestoise.example";

		// Emails via Resend — require API key, from, and owner email
		if (process.env.RESEND_API_KEY && process.env.RESEND_FROM && process.env.OWNER_EMAIL) {
			// Notify owner
			const ownerTo = process.env.OWNER_EMAIL;
			const ownerHtml = `
				<div>
					<p>Vous avez reçu un nouveau message de contact.</p>
					<ul>
						<li>Nom: <strong>${fullName}</strong></li>
						<li>Email: ${email}</li>
						<li>Société: ${company || "-"}</li>
						<li>Ville: ${city || "-"}</li>
						<li>Projet: ${projectType || "-"}</li>
						<li>Budget: ${budget || "-"}</li>
						<li>Délai: ${deadline || "-"}</li>
					</ul>
					<p><strong>Message:</strong></p>
					<p>${(message || "").replace(/\n/g, "<br />")}</p>
					<hr />
					<p style="color:#666;font-size:12px">Vous recevez cet e-mail car un visiteur a soumis le formulaire de contact.</p>
				</div>`;
			void sendEmail({ to: ownerTo, subject: "[Contact] Nouveau message", html: ownerHtml });
			debugSteps.push("owner_email");

			// Auto-reply to sender
			const replyHtml = `
				<div>
					<p>Bonjour ${fullName},</p>
					<p>Merci pour votre message. Je vous répondrai sous 48h ouvrées.</p>
					<p><a href="${siteUrl}">${siteName}</a></p>
					<hr />
					<p style="color:#666;font-size:12px">Vous recevez cet e-mail car vous avez soumis une demande de contact.</p>
				</div>`;
			void sendEmail({ to: email, subject: "Réception de votre demande", html: replyHtml });
			debugSteps.push("sender_email");

			res.setHeader("X-Debug", `contact:${debugSteps.join(",")}`);
			return json(res, 200, { ok: true });
		}

		res.setHeader("X-Debug", "contact:missing_resend_env");
		return json(res, 202, { ok: false, fallback: "mailto" });
	} catch (e: any) {
		// eslint-disable-next-line no-console
		console.error("[api/contact] email error", { error: e?.message });
		res.setHeader("X-Debug", "contact:error");
		return json(res, 500, { error: e?.message || "server_error" });
	}
}

