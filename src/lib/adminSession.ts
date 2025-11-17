// Admin session helpers (in-memory only)
// Note: we intentionally keep this token out of localStorage/sessionStorage
// so that refreshing the tab naturally signs the admin out.
let inMemoryToken: string | null = null;

/**
 * Returns the current admin token for this SPA session only.
 * Not persisted to any storage.
 */
export function getAdminToken(): string | null {
	return inMemoryToken;
}

/**
 * Sets the admin token for the current SPA session.
 * Passing null/empty clears the token.
 */
export function setAdminToken(token: string | null): void {
	inMemoryToken = token && token.trim() ? token.trim() : null;
}

/**
 * Clears the admin token for the current SPA session.
 */
export function clearAdminToken(): void {
	inMemoryToken = null;
}

