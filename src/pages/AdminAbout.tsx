import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAdminToken } from "@/lib/adminSession";
import type { AboutContent } from "../../shared/aboutContent";
import { DEFAULT_ABOUT_CONTENT } from "../../shared/aboutContent";

type FormState = {
  aboutTitle: string;
  aboutBodyText: string;
  valuesTitle: string;
  valuesItems: string[];
  approachTitle: string;
  approachBody: string;
};

const EMPTY_FORM: FormState = {
  aboutTitle: "",
  aboutBodyText: "",
  valuesTitle: "",
  valuesItems: ["", "", ""],
  approachTitle: "",
  approachBody: "",
};

const AdminAbout = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    if (!initialForm) return false;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const token = getAdminToken();
        const response = await fetch("/api/about", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Impossible de charger le contenu.");
        }
        const data = await response.json().catch(() => null);
        const content: AboutContent | undefined = data?.content;
        const nextForm = mapContentToForm(content ?? DEFAULT_ABOUT_CONTENT);
        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Impossible de charger le contenu.");
        const fallbackForm = mapContentToForm(DEFAULT_ABOUT_CONTENT);
        setForm(fallbackForm);
        setInitialForm(fallbackForm);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, []);

  function updateFormField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateValueItem(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.valuesItems];
      next[index] = value;
      return { ...prev, valuesItems: next };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = normalizeForm(form);
    if (!normalized.ok) {
      toast.error(normalized.error);
      return;
    }
    try {
      setSaving(true);
      const token = getAdminToken();
      if (!token) {
        toast.error("Session administrateur expirée.");
        return;
      }
      const response = await fetch("/api/about", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(normalized.content),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Impossible d’enregistrer les modifications.");
      }
      const updatedContent: AboutContent | undefined = data.content;
      const nextForm = mapContentToForm(updatedContent ?? normalized.content);
      setForm(nextForm);
      setInitialForm(nextForm);
      toast.success("Section À propos mise à jour avec succès.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Impossible d’enregistrer les modifications.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Mettre à jour la section « À propos »</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement en cours…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <p className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Bloc principal</h3>
                <div className="space-y-2">
                  <Label htmlFor="about-title">Titre</Label>
                  <Input
                    id="about-title"
                    value={form.aboutTitle}
                    onChange={(e) => updateFormField("aboutTitle", e.target.value)}
                    placeholder="Nolwenn, plume brestoise..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about-body">Texte (séparez les paragraphes avec une ligne vide)</Label>
                  <Textarea
                    id="about-body"
                    rows={6}
                    value={form.aboutBodyText}
                    onChange={(e) => updateFormField("aboutBodyText", e.target.value)}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Mes valeurs</h3>
                <div className="space-y-2">
                  <Label htmlFor="values-title">Titre</Label>
                  <Input
                    id="values-title"
                    value={form.valuesTitle}
                    onChange={(e) => updateFormField("valuesTitle", e.target.value)}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {form.valuesItems.map((value, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`value-${index}`}>Valeur {index + 1}</Label>
                      <Input
                        id={`value-${index}`}
                        value={value}
                        onChange={(e) => updateValueItem(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Bloc approche</h3>
                <div className="space-y-2">
                  <Label htmlFor="approach-title">Titre</Label>
                  <Input
                    id="approach-title"
                    value={form.approachTitle}
                    onChange={(e) => updateFormField("approachTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approach-body">Texte</Label>
                  <Textarea
                    id="approach-body"
                    rows={6}
                    value={form.approachBody}
                    onChange={(e) => updateFormField("approachBody", e.target.value)}
                  />
                </div>
              </section>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin")}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement…" : hasChanges ? "Enregistrer" : "Enregistrer"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function mapContentToForm(content: AboutContent): FormState {
  return {
    aboutTitle: content.aboutTitle,
    aboutBodyText: content.aboutBody.join("\n\n"),
    valuesTitle: content.valuesTitle,
    valuesItems: [...content.valuesItems, "", "", ""].slice(0, 3),
    approachTitle: content.approachTitle,
    approachBody: content.approachBody,
  };
}

function normalizeForm(form: FormState): { ok: true; content: AboutContent } | { ok: false; error: string } {
  const aboutTitle = form.aboutTitle.trim();
  const aboutBody = form.aboutBodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const valuesTitle = form.valuesTitle.trim();
  const valuesItems = form.valuesItems.map((item) => item.trim()).filter(Boolean);
  const approachTitle = form.approachTitle.trim();
  const approachBody = form.approachBody.trim();

  if (!aboutTitle || aboutBody.length === 0) {
    return { ok: false, error: "Le texte principal doit contenir au moins un paragraphe." };
  }
  if (!valuesTitle || valuesItems.length < 3) {
    return { ok: false, error: "Merci de renseigner les trois valeurs." };
  }
  if (!approachTitle || !approachBody) {
    return { ok: false, error: "La section « approche » est incomplète." };
  }

  return {
    ok: true,
    content: {
      aboutTitle,
      aboutBody,
      valuesTitle,
      valuesItems,
      approachTitle,
      approachBody,
    },
  };
}

export default AdminAbout;


