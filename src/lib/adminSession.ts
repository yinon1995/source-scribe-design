// Admin token persistence (localStorage), SSR-safe
const ADMIN_TOKEN_KEY = "a-la-brestoise-admin-token";

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
	const v = storage.getItem(ADMIN_TOKEN_KEY);
	return v && v.length > 0 ? v : null;
}

export function setAdminToken(token: string): void {
	const storage = getStorage();
	if (!storage) return;
	storage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(ADMIN_TOKEN_KEY);
}



