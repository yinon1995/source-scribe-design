import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail({
	to,
	subject,
	html,
}: { to: string | string[]; subject: string; html: string }): Promise<void> {
	try {
		const from = process.env.RESEND_FROM || "À la Brestoise <no-reply@example.com>";
		await resend.emails.send({ from, to, subject, html });
	} catch (e: any) {
		// eslint-disable-next-line no-console
		console.error("[api/_lib/email] sendEmail error", e?.message || e);
	}
}


