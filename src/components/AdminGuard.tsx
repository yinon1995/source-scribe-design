import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/adminSession";
import { useNavigate } from "react-router-dom";

type AdminGuardProps = PropsWithChildren<{
  title?: string;
}>;

const AdminGuard = ({ children, title }: AdminGuardProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [touched, setTouched] = useState(false);
  const [authState, setAuthState] = useState<"idle" | "checking" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    const trimmed = token.trim();
    if (!trimmed) return false;
    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${trimmed}`,
        },
      });
      if (response.status !== 200) return false;
      const data = await response.json().catch(() => null);
      return Boolean(data?.ok);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const existing = getAdminToken();
    if (!existing) return;

    (async () => {
      setAuthState("checking");
      const valid = await validateToken(existing);
      if (cancelled) return;
      if (valid) {
        setHasAccess(true);
        setAuthState("idle");
        setErrorMessage(null);
        setTouched(false);
      } else {
        clearAdminToken();
        setHasAccess(false);
        setAuthState("error");
        setErrorMessage("Votre session administrateur a expiré. Veuillez vous reconnecter.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [validateToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErrorMessage(null);
    const trimmed = password.trim();
    if (!trimmed) return;
    setAuthState("checking");
    const valid = await validateToken(trimmed);
    if (!valid) {
      setAuthState("error");
      setErrorMessage("Mot de passe incorrect. Veuillez réessayer.");
      clearAdminToken();
      setHasAccess(false);
      return;
    }
    setAdminToken(trimmed);
    setHasAccess(true);
    setPassword("");
    setAuthState("idle");
    setErrorMessage(null);
    setTouched(false);
  }

  function handleLogout() {
    clearAdminToken();
    setHasAccess(false);
    setPassword("");
    setErrorMessage(null);
    setAuthState("idle");
    setTouched(false);
    navigate("/admin");
  }

  if (hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 py-10 md:py-16">
          <div className="container mx-auto px-4 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                {title ?? "Espace rédaction"}
              </h1>
              <Button variant="outline" onClick={handleLogout}>
                Se déconnecter
              </Button>
            </div>
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-display">
              Accès espace rédaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="admin-pass" className="text-sm font-medium text-foreground">
                  Mot de passe administrateur
                </label>
                <Input
                  id="admin-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                />
                {touched && !password.trim() && (
                  <p className="text-xs text-destructive">
                    Merci d’entrer le mot de passe administrateur.
                  </p>
                )}
                {authState === "error" && errorMessage && (
                  <p className="text-xs text-destructive">{errorMessage}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={authState === "checking"}>
                {authState === "checking" ? "Vérification…" : "Entrer dans l’espace rédaction"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminGuard;



