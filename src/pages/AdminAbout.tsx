import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
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
import { fileToCompressedDataURL } from "../magazine_editor/lib/imageUtils";

type FormState = {
  aboutTitle: string;
  aboutBodyText: string;
  valuesTitle: string;
  valuesItems: string[];
  approachTitle: string;
  approachBody: string;
  aboutImages: string[];
};

const EMPTY_FORM: FormState = {
  aboutTitle: "",
  aboutBodyText: "",
  valuesTitle: "",
  valuesItems: ["", "", ""],
  approachTitle: "",
  approachBody: "",
  aboutImages: [],
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

  function addValueItem() {
    setForm((prev) => ({
      ...prev,
      valuesItems: [...prev.valuesItems, ""],
    }));
  }

  function removeValueItem(index: number) {
    setForm((prev) => ({
      ...prev,
      valuesItems: prev.valuesItems.filter((_, i) => i !== index),
    }));
  }

  function moveValueItem(index: number, direction: "up" | "down") {
    setForm((prev) => {
      const newItems = [...prev.valuesItems];
      if (direction === "up" && index > 0) {
        [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      } else if (direction === "down" && index < newItems.length - 1) {
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      }
      return { ...prev, valuesItems: newItems };
    });
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      aboutImages: prev.aboutImages.filter((_, i) => i !== index),
    }));
  }

  function moveImage(index: number, direction: "up" | "down") {
    setForm((prev) => {
      const newImages = [...prev.aboutImages];
      if (direction === "up" && index > 0) {
        [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      } else if (direction === "down" && index < newImages.length - 1) {
        [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      }
      return { ...prev, aboutImages: newImages };
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }

    try {
      const token = getAdminToken();
      if (!token) {
        toast.error("Session expirée.");
        return;
      }

      // 1. Convert to base64 for upload
      const base64 = await fileToCompressedDataURL(file);
      const content = base64.split(",")[1]; // Remove data:image/...;base64, prefix

      // 2. Generate filename
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `about-${Date.now()}.${ext}`;

      // 3. Upload via API
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: "about",
          fileName,
          content,
          encoding: "base64",
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'upload.");
      }

      const data = await res.json();
      if (!data.ok || !data.path) {
        throw new Error(data.error || "Erreur lors de l'upload.");
      }

      // 4. Add to state
      setForm((prev) => ({
        ...prev,
        aboutImages: [...prev.aboutImages, data.path],
      }));
      toast.success("Image ajoutée !");
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'uploader l'image.");
    } finally {
      // Reset input
      e.target.value = "";
    }
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
                <div className="space-y-3">
                  {form.valuesItems.map((value, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={value}
                        onChange={(e) => updateValueItem(index, e.target.value)}
                        placeholder={`Valeur ${index + 1}`}
                        className="flex-1"
                      />
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveValueItem(index, "up")}
                          disabled={index === 0}
                          title="Monter"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moveValueItem(index, "down")}
                          disabled={index === form.valuesItems.length - 1}
                          title="Descendre"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeValueItem(index)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addValueItem}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Ajouter une valeur
                  </Button>
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

              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {form.aboutImages.map((src, index) => (
                    <div key={index} className="relative group aspect-[3/4] bg-muted rounded-lg overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveImage(index, "up")}
                          disabled={index === 0}
                          title="Monter"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveImage(index, "down")}
                          disabled={index === form.aboutImages.length - 1}
                          title="Descendre"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeImage(index)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">Ajouter une image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
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
    valuesItems: [...content.valuesItems],
    approachTitle: content.approachTitle,
    approachBody: content.approachBody,
    aboutImages: content.aboutImages || [],
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
  const aboutImages = form.aboutImages;

  if (!aboutTitle || aboutBody.length === 0) {
    return { ok: false, error: "Le texte principal doit contenir au moins un paragraphe." };
  }
  if (!valuesTitle) {
    return { ok: false, error: "Le titre des valeurs est requis." };
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
      aboutImages,
    },
  };
}

export default AdminAbout;


