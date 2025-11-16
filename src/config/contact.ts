// NOTE: For now we route users directly to Gmail compose because the production
// email/domain is not ready. Once email infrastructure exists, swap this helper
// to the real sending flow.

export const CONTACT_EMAIL = "nolwennalabrestoise@gmail.com";

export type GmailComposeOptions = {
  to?: string;
  subject?: string;
  body?: string;
};

const GMAIL_COMPOSE_BASE = "https://mail.google.com/mail/?view=cm&fs=1";

export function getGmailComposeUrl(options?: GmailComposeOptions): string {
  const params = new URLSearchParams();
  params.set("to", options?.to || CONTACT_EMAIL);
  if (options?.subject) params.set("su", options.subject);
  if (options?.body) params.set("body", options.body);
  return `${GMAIL_COMPOSE_BASE}&${params.toString()}`;
}

export function openGmailCompose(options?: GmailComposeOptions) {
  if (typeof window === "undefined") return;
  const url = getGmailComposeUrl(options);
  window.open(url, "_blank", "noopener,noreferrer");
}

