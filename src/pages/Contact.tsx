import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import { CONTACT_MODE, CONTACT_WHATSAPP_URL } from "@/config/contactFallback";
import { useNavigate } from "react-router-dom";
import { openGmailCompose, getGmailComposeUrl } from "@/config/contact";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const isPlaceholder = CONTACT_MODE === "placeholder";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPlaceholder) {
      openGmailCompose({ subject: "À la Brestoise – Demande de contact" });
      return;
    }
    if (!projectType) {
      toast.error("Veuillez sélectionner un type de projet.");
      return;
    }
    const fullName = (document.getElementById("name") as HTMLInputElement)?.value?.trim();
    const email = (document.getElementById("email") as HTMLInputElement)?.value?.trim();
    const company = (document.getElementById("company") as HTMLInputElement)?.value?.trim();
    const city = (document.getElementById("city") as HTMLInputElement)?.value?.trim();
    const budget = (document.getElementById("budget") as HTMLInputElement)?.value?.trim();
    const deadline = (document.getElementById("deadline") as HTMLInputElement)?.value?.trim();
    const message = (document.getElementById("message") as HTMLTextAreaElement)?.value?.trim();
    const consent = (document.getElementById("consent") as HTMLInputElement)?.checked ?? false;

    const payload = { fullName, email, company, city, projectType, budget, deadline, message, consent };
    try {
      setLoading(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 200) {
        toast.success("Merci !");
        (e.currentTarget as HTMLFormElement).reset();
        setProjectType(undefined);
      } else {
        toast.error("Erreur serveur — envoi par e-mail proposé.");
      }
    } catch {
      toast.error("Erreur serveur — envoi par e-mail proposé.");
    } finally {
      setLoading(false);
    }
  };

  const handleMailLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openGmailCompose({ subject: "À la Brestoise – Demande de contact" });
  };

  if (isPlaceholder) {
    return (
      <div className="min-h-screen bg-background">
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-2xl space-y-8 text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">Contact</h1>
            <p className="text-lg text-muted-foreground">
              Le formulaire de contact sera bientôt disponible. En attendant, utilisez les raccourcis ci-dessous
              pour nous écrire ou revenir à l’accueil.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                className="flex-1 rounded-full"
                onClick={() => openGmailCompose({ subject: "À la Brestoise – Demande de contact" })}
              >
                Ouvrir l’e-mail
              </Button>
              <Button
                className="flex-1 rounded-full"
                variant="secondary"
                onClick={() => window.open(CONTACT_WHATSAPP_URL, "_blank", "noopener,noreferrer")}
              >
                Ouvrir WhatsApp
              </Button>
              <Button className="flex-1 rounded-full" variant="ghost" onClick={() => navigate("/")}>
                Retour à l’accueil
              </Button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Contact professionnel
            </h1>
            <p className="text-lg text-muted-foreground">
              Un projet de collaboration ? Remplissez ce formulaire et je reviendrai vers vous rapidement.
            </p>
            <p className="text-sm">
              <a
                href={getGmailComposeUrl({ subject: "À la Brestoise – Demande de contact" })}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleMailLinkClick}
              >
                Écrire un e-mail
              </a>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input id="name" required className="rounded-lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required className="rounded-lg" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company">Société</Label>
                <Input id="company" className="rounded-lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" className="rounded-lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-type">Type de projet *</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger id="project-type" className="rounded-lg">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article-beaute">Article beauté</SelectItem>
                  <SelectItem value="ouverture">Ouverture de commerce</SelectItem>
                  <SelectItem value="evenement">Couverture d'événement</SelectItem>
                  <SelectItem value="interview">Interview / Portrait</SelectItem>
                  <SelectItem value="newsletter">Newsletter / E-mailing</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget indicatif</Label>
                <Input id="budget" placeholder="Ex: 500€" className="rounded-lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Délai souhaité</Label>
                <Input id="deadline" placeholder="Ex: Dans 2 semaines" className="rounded-lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                required
                rows={6}
                placeholder="Décrivez votre projet, vos besoins et vos attentes..."
                className="rounded-lg resize-none"
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="consent" required className="mt-1" />
              <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                J'accepte que mes données soient collectées et traitées dans le cadre de ma demande.
                Conformément au RGPD, vous pouvez exercer vos droits en me contactant.
              </Label>
            </div>

            <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full bg-primary hover:bg-primary/90">
              {loading ? "Envoi..." : "Envoyer ma demande"}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Délai de réponse : 48h ouvrées maximum
            </p>
            <p className="text-sm text-muted-foreground">
              Pour toute question urgente, vous pouvez également me contacter sur les réseaux sociaux.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
