// Shared subscribe helper - additive and type-safe
export type SubscribeResult = "ok" | "mailto";

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export const API: string = (import.meta as any)?.env?.VITE_API_BASE?.replace(/\/+$/, "") || "";

export function openMailto(href: string) {
  try {
    const a = document.createElement("a");
    a.href = href;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  } catch {
    // ignore
  }
}

export async function subscribe(email: string, source: string): Promise<SubscribeResult> {
  if (!isValidEmail(email)) {
    const err: { code: "invalid_email" } = { code: "invalid_email" };
    throw err;
  }
  try {
    const payload = {
      email,
      source,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    const url = `${API}/api/subscribe`;
    // Temporary debug logs (prod-safe)
    // eslint-disable-next-line no-console
    console.log("[subscribe] sending", { email, source, env: (import.meta as any)?.env?.MODE, url });
    const res = await timeout(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      7000
    );
    // eslint-disable-next-line no-console
    console.log("[subscribe] response", res.status);
    const result: SubscribeResult = res.status === 200 ? "ok" : "mailto";
    // Tiny logger
    // eslint-disable-next-line no-console
    console.debug("[subscribe]", { email, source, status: res.status, result });
    return result;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("[subscribe]", { email, source, error: (e as Error)?.message, result: "mailto" });
    return "mailto";
  }
}


