// Simple session-based admin token storage using sessionStorage
// Safe for SSR via typeof window checks and try/catch guards

const KEY = "admin-publish-token";

export function getAdminToken(): string | null {
	try {
		if (typeof window === "undefined") return null;
		return window.sessionStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function setAdminToken(value: string): void {
	try {
		if (typeof window === "undefined") return;
		window.sessionStorage.setItem(KEY, value);
	} catch {
		// ignore
	}
}

export function clearAdminToken(): void {
	try {
		if (typeof window === "undefined") return;
		window.sessionStorage.removeItem(KEY);
	} catch {
		// ignore
	}
}



