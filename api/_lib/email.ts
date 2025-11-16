import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail({
	to,
	subject,
	html,
}: { to: string | string[]; subject: string; html: string }): Promise<{ ok: boolean }> {
	try {
		const from = process.env.RESEND_FROM || "À la Brestoise <no-reply@example.com>";
		const keyPrefix = (process.env.RESEND_API_KEY || "").slice(0, 6);
		// eslint-disable-next-line no-console
		console.log("[api/_lib/email] sendEmail start", { to, subject, keyPrefix });
		const { data, error } = await resend.emails.send({ from, to, subject, html });
		if (error) {
			// eslint-disable-next-line no-console
			console.error("[api/_lib/email] sendEmail resend-error", {
				to,
				subject,
				message: (error as any)?.message,
				name: (error as any)?.name,
				statusCode: (error as any)?.statusCode,
			});
			return { ok: false };
		}
		// eslint-disable-next-line no-console
		console.log("[api/_lib/email] sendEmail ok", {
			to,
			subject,
			id: (data as any)?.id,
		});
		return { ok: true };
	} catch (e: any) {
		// eslint-disable-next-line no-console
		console.error("[api/_lib/email] sendEmail error", e?.message || e);
		return { ok: false };
	}
}


