import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Camera, Sparkles, Mail } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CONTACT_EMAIL, CONTACT_MODE } from "@/config/contactFallback";
import { useContactFallback } from "@/context/ContactFallbackContext";

const Services = () => {
  const services = [
    {
      icon: FileText,
      title: "Ouverture de commerce",
      description: "Pack complet pour le lancement de votre boutique",
      features: [
        "Interview approfondie",
        "Reportage photo (8-12 images)",
        "Article de 800-1200 mots",
        "Publication sur le blog",
        "Partage sur les réseaux sociaux"
      ],
      price: "À partir de 450€"
    },
    {
      icon: Camera,
      title: "Couverture d'événement",
      description: "Du teasing à la restitution complète",
      features: [
        "Annonce avant l'événement",
        "Couverture photo pendant",
        "Article récapitulatif après",
        "Sélection de 15-20 photos",
        "Stories et posts en direct"
      ],
      price: "À partir de 550€"
    },
    {
      icon: Sparkles,
      title: "Storytelling de marque",
      description: "Racontez l'histoire de votre atelier ou produit",
      features: [
        "Immersion d'une journée",
        "Narration sur-mesure",
        "Photos d'ambiance",
        "Interview des fondateurs",
        "Article long format"
      ],
      price: "Sur devis"
    },
    {
      icon: Mail,
      title: "Newsletter & E-mailing",
      description: "Conception et rédaction de vos campagnes",
      features: [
        "Stratégie éditoriale",
        "Rédaction des contenus",
        "Design responsive",
        "Intégration technique",
        "Analyse des performances"
      ],
      price: "À partir de 350€"
    }
  ];

  const [testimonials, setTestimonials] = useState<{ message: string; nom: string; fonction_entreprise?: string }[]>([]);
  const { openFallback } = useContactFallback();
  const isPlaceholder = CONTACT_MODE === "placeholder";

  function handleMailCtaClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isPlaceholder) {
      e.preventDefault();
      openFallback();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 space-y-6 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Services & Partenariats
            </h1>
            <p className="text-xl text-muted-foreground">
              Des prestations sur-mesure pour valoriser votre commerce, événement ou marque 
              à travers des contenus éditoriaux de qualité
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {services.map((service, index) => (
              <Card key={index} className="bg-card rounded-2xl border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-4">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-display">{service.title}</CardTitle>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-primary">{service.price}</span>
                  <ServiceInterestDialog service={service.title} />
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* CTA + Mailto */}
          <div className="bg-accent/30 rounded-3xl p-8 md:p-12 space-y-6">
            <h2 className="text-3xl font-display font-bold text-foreground text-center">Un projet en tête ? Demander un devis :</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center">
              Discutons ensemble de vos besoins. Chaque prestation est personnalisable selon vos objectifs et votre budget.
            </p>
            <div className="flex justify-center">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demande de devis")}`}
                onClick={handleMailCtaClick}
              >
                <Button className="rounded-full transition duration-200 hover:opacity-90">Envoyer un email</Button>
              </a>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mt-20 space-y-8">
            <h2 className="text-3xl font-display font-bold text-foreground text-center">
              Ils m'ont fait confiance
            </h2>
            {testimonials.length > 0 && (
              <div className="grid md:grid-cols-3 gap-8">
                {testimonials.map((t, i) => (
                  <Card key={i} className="bg-card rounded-2xl border-border">
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground italic mb-4">“{t.message}”</p>
                      <p className="font-semibold text-foreground">— {t.nom}{t.fonction_entreprise ? `, ${t.fonction_entreprise}` : ""}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="max-w-2xl mx-auto">
              <TestimonialDialog />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;

function ServiceInterestDialog({ service }: { service: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const messageValid = message.trim().length > 0;
  const idBase = service.toLowerCase().replace(/\s+/g, "-");
  const { openFallback } = useContactFallback();
  const isPlaceholder = CONTACT_MODE === "placeholder";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (isPlaceholder) {
      openFallback();
      return;
    }
    if (!emailValid || !messageValid) {
      toast({ title: "Veuillez remplir les champs requis" });
      return;
    }
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "interesse-service", service, email, message }),
      });
      if (res.ok) {
        toast({ title: "Merci !" });
        setEmail("");
        setMessage("");
      } else {
        const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Intéressé(e) par ${service}`)}&body=${encodeURIComponent(`Email: ${email}\nService: ${service}\n\nMessage:\n${message}`)}`;
        window.location.href = href;
      }
    } catch {
      const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Intéressé(e) par ${service}`)}&body=${encodeURIComponent(`Email: ${email}\nService: ${service}\n\nMessage:\n${message}`)}`;
      window.location.href = href;
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full transition duration-200 hover:opacity-90">
          Intéressé(e)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Intéressé(e) — {service}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`interest-email-${idBase}`}>Email</Label>
            <Input
              id={`interest-email-${idBase}`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={submitted && !emailValid}
              aria-describedby={`interest-email-${idBase}-error`}
            />
            {submitted && !emailValid && (
              <p id={`interest-email-${idBase}-error`} className="text-sm text-red-600">Email invalide</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`interest-message-${idBase}`}>Message</Label>
            <Textarea
              id={`interest-message-${idBase}`}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={submitted && !messageValid}
              aria-describedby={`interest-message-${idBase}-error`}
            />
            {submitted && !messageValid && (
              <p id={`interest-message-${idBase}-error`} className="text-sm text-red-600">Message requis</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full">Envoyer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestimonialDialog() {
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { openFallback } = useContactFallback();
  const isPlaceholder = CONTACT_MODE === "placeholder";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (isPlaceholder) {
      openFallback();
      return;
    }
    if (!name.trim() || !message.trim()) {
      toast({ title: "Champs requis manquants" });
      return;
    }
    try {
      const res = await fetch("/api/testimonial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organisation,
          logoUrl: logoUrl || undefined,
          message,
          consent,
        }),
      });
      if (res.ok) {
        toast({ title: "Merci pour votre témoignage !" });
        setName("");
        setOrganisation("");
        setLogoUrl("");
        setMessage("");
        setConsent(false);
      } else {
        const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Témoignage")} &body=${encodeURIComponent(`Nom: ${name}\nOrganisation: ${organisation}\nLogo URL: ${logoUrl}\n\nMessage:\n${message}\n\nConsentement: ${consent ? "oui" : "non"}`)}`;
        window.location.href = href;
      }
    } catch {
      const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Témoignage")}&body=${encodeURIComponent(`Nom: ${name}\nOrganisation: ${organisation}\nLogo URL: ${logoUrl}\n\nMessage:\n${message}\n\nConsentement: ${consent ? "oui" : "non"}`)}`;
      window.location.href = href;
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full transition duration-200 hover:opacity-90">Proposer un témoignage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proposer un témoignage</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testi-name">Nom</Label>
              <Input
                id="testi-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={submitted && !name.trim()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testi-org">Organisation</Label>
              <Input
                id="testi-org"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="testi-logo">URL (logo)</Label>
              <Input
                id="testi-logo"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="testi-message">Message</Label>
              <Textarea
                id="testi-message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={submitted && !message.trim()}
              />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="testi-consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
            <Label htmlFor="testi-consent" className="text-sm text-muted-foreground cursor-pointer">
              autoriser la publication pour tous (visible)
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full">Envoyer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
