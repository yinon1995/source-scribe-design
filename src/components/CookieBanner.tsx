import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getStoredConsent, storeConsent, type ConsentState } from "@/lib/consent";
import { cn } from "@/lib/utils";

export default function CookieBanner() {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);

    // Default customization state
    const [preferences, setPreferences] = useState<ConsentState>({
        analytics: true,
        marketing: false,
    });

    useEffect(() => {
        // Check if consent is already stored
        const stored = getStoredConsent();
        if (!stored) {
            // Small delay to prevent layout thrashing on load
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Hide on admin pages
    if (location.pathname.startsWith("/admin")) {
        return null;
    }

    if (!isVisible) return null;

    const handleAcceptAll = () => {
        const fullConsent = { analytics: true, marketing: true };
        storeConsent(fullConsent);
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        const noConsent = { analytics: false, marketing: false };
        storeConsent(noConsent);
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        storeConsent(preferences);
        setIsVisible(false);
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-6 space-y-4">
                {!isCustomizing ? (
                    <>
                        <div className="space-y-2">
                            <h3 className="font-display font-semibold text-lg">Gestion des cookies 🍪</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Nous utilisons des cookies pour analyser notre trafic et vous proposer une expérience personnalisée.
                                Vous pouvez accepter, refuser ou personnaliser vos choix.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setIsCustomizing(true)}>
                                Personnaliser
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleRejectAll}>
                                Tout refuser
                            </Button>
                            <Button size="sm" onClick={handleAcceptAll}>
                                Tout accepter
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-display font-semibold text-lg">Vos préférences</h3>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsCustomizing(false)}>
                                    ✕
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between space-x-4">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Nécessaires
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            Indispensables au fonctionnement du site.
                                        </p>
                                    </div>
                                    <Switch checked={true} disabled />
                                </div>

                                <div className="flex items-center justify-between space-x-4">
                                    <div className="space-y-0.5">
                                        <label htmlFor="analytics" className="text-sm font-medium leading-none cursor-pointer">
                                            Analytique
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            Mesure d'audience (Google Analytics).
                                        </p>
                                    </div>
                                    <Switch
                                        id="analytics"
                                        checked={preferences.analytics}
                                        onCheckedChange={(c) => setPreferences(p => ({ ...p, analytics: c }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-4">
                                    <div className="space-y-0.5">
                                        <label htmlFor="marketing" className="text-sm font-medium leading-none cursor-pointer">
                                            Marketing
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            Publicités personnalisées.
                                        </p>
                                    </div>
                                    <Switch
                                        id="marketing"
                                        checked={preferences.marketing}
                                        onCheckedChange={(c) => setPreferences(p => ({ ...p, marketing: c }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button size="sm" onClick={handleSavePreferences} className="w-full sm:w-auto">
                                Enregistrer mes choix
                            </Button>
                        </div>
                    </>
                )}

                <div className="pt-2 border-t border-border/50 text-center sm:text-left">
                    <a href="/politique-de-confidentialite" className="text-[10px] text-muted-foreground hover:underline">
                        Politique de confidentialité
                    </a>
                </div>
            </div>
        </div>
    );
}
