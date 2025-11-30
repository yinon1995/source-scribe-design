export const CONSENT_KEY = "abl_cookie_consent_v1";

export type ConsentState = {
    analytics: boolean;
    marketing: boolean;
};

export function getStoredConsent(): ConsentState | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as ConsentState;
    } catch {
        return null;
    }
}

export function storeConsent(consent: ConsentState) {
    if (typeof window === "undefined") return;
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    applyConsentToGoogle(consent);
}

export function applyConsentToGoogle(consent: ConsentState) {
    if (typeof window === "undefined") return;

    // Ensure gtag exists
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
        window.dataLayer.push(args);
    }

    // Update consent
    // Note: We use the 'update' command now that the user has made a choice
    gtag("consent", "update", {
        analytics_storage: consent.analytics ? "granted" : "denied",
        ad_storage: consent.marketing ? "granted" : "denied",
        ad_user_data: consent.marketing ? "granted" : "denied",
        ad_personalization: consent.marketing ? "granted" : "denied",
    });

    // Push a custom event so GTM triggers can fire immediately if needed
    window.dataLayer.push({ event: "consent_update" });
}

// Type definition for window
declare global {
    interface Window {
        dataLayer: any[];
        gtag?: (...args: any[]) => void;
    }
}
