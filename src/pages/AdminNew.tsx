import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminNew = () => {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !summary || !body) {
      toast.error("Veuillez renseigner le titre, le résumé et le corps de l'article.");
      return;
    }
    setSubmitting(true);
    try {
      let imageBase64: string | undefined;
      let imageName: string | undefined;
      if (imageFile) {
        imageName = imageFile.name;
        const buf = await imageFile.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        imageBase64 = `data:${imageFile.type};base64,${b64}`;
      }

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          title,
          summary,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          bodyMarkdown: body,
          date: date || undefined,
          image: imageBase64
            ? { base64: imageBase64, filename: imageName }
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Échec de la publication");
      }
      toast.success("Article publié", {
        action: {
          label: "Voir",
          onClick: () => (window.location.href = json.urls.article),
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">Nouvel article</h1>
          <form onSubmit={handlePublish} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'article" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Résumé (≤ 160 caractères)</Label>
              <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Résumé court en français" rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="beaute, soin, peau" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date de publication (optionnelle)</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image à la une (optionnelle)</Label>
              <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Contenu (Markdown)</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="# Titre\n\nVotre article en Markdown" rows={16} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe administrateur</Label>
              <Input id="password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={submitting} className="rounded-full px-8">
                {submitting ? "Publication…" : "Publier"}
              </Button>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default AdminNew;


