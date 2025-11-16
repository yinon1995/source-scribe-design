// Admin token persistence (localStorage), SSR-safe
const ADMIN_TOKEN_KEY = "a-la-brestoise-admin-token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL

function getStorage(): Storage | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function getAdminToken(): string | null {
	const storage = getStorage();
	if (!storage) return null;
	const raw = storage.getItem(ADMIN_TOKEN_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || !parsed.token || !parsed.ts) return null;
		if (Date.now() - Number(parsed.ts) > MAX_AGE_MS) {
			storage.removeItem(ADMIN_TOKEN_KEY);
			return null;
		}
		return String(parsed.token);
	} catch {
		// Backward compat: plain token string
		if (raw && raw.length > 0) return raw;
		return null;
	}
}

export function setAdminToken(token: string): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.setItem(ADMIN_TOKEN_KEY, JSON.stringify({ token, ts: Date.now() }));
	} catch {
		// fallback: store raw string
		storage.setItem(ADMIN_TOKEN_KEY, token);
	}
}

export function clearAdminToken(): void {
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(ADMIN_TOKEN_KEY);
}



