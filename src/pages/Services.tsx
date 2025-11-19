import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import ReviewForm from "@/components/ReviewForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Camera, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createLead } from "@/lib/inboxClient";
import heroImage from "@/assets/hero-portrait.jpeg";
import { getAboutContent } from "@/lib/about";

const Services = () => {
  const aboutContent = getAboutContent();
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
    }
  ];

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

          {/* Bio */}
          <div className="space-y-10 mb-16">
            <div className="space-y-4 text-center max-w-3xl mx-auto">
              <p className="text-2xl font-display font-semibold text-foreground">
                {aboutContent.aboutTitle}
              </p>
              {aboutContent.aboutBody.map((paragraph, index) => (
                <p key={index} className="text-lg text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-lg bg-muted">
                <img
                  src={heroImage}
                  alt="Portrait de Nolwenn"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-5 bg-card rounded-3xl p-6 shadow border border-border/60">
                <h3 className="text-2xl font-display font-semibold text-foreground">
                  {aboutContent.valuesTitle}
                </h3>
                <ul className="space-y-3 text-base text-muted-foreground">
                  {aboutContent.valuesItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-accent/20 rounded-3xl p-8 md:p-10 space-y-4 text-center max-w-4xl mx-auto">
              <h3 className="text-2xl font-display font-semibold text-foreground">
                {aboutContent.approachTitle}
              </h3>
              {aboutContent.approachBody
                .split("\n")
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index} className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
            </div>
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
              <QuoteDialog />
            </div>
          </div>

          <TestimonialsSection
            className="mt-20"
            subtitle="Avis authentiques de commerces, artisans et partenaires."
            ctaSlot={<TestimonialDialog />}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;

function ServiceInterestDialog({ service }: { service: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const messageValid = message.trim().length > 0;
  const idBase = service.toLowerCase().replace(/\s+/g, "-");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!emailValid || !messageValid) {
      toast({ title: "Veuillez remplir les champs requis" });
      return;
    }
    setLoading(true);
    const result = await createLead({
      category: "services",
      source: `services-section:${service}`,
      email,
      name: name || undefined,
      message,
      meta: { service },
    });
    setLoading(false);
    if (result.success) {
      toast({ title: "Merci ! Je reviens vers vous rapidement." });
      setName("");
      setEmail("");
      setMessage("");
      setSubmitted(false);
      setOpen(false);
      return;
    }
    toast({
      title: "Impossible d’enregistrer votre demande",
      description: result.error || "Veuillez réessayer dans quelques instants.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Label htmlFor={`interest-name-${idBase}`}>Nom</Label>
            <Input
              id={`interest-name-${idBase}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom (facultatif)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`interest-email-${idBase}`}>Email *</Label>
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
            <Label htmlFor={`interest-message-${idBase}`}>Message *</Label>
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
            <Button type="submit" disabled={loading} className="rounded-full">
              {loading ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuoteDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const messageValid = message.trim().length > 0;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!emailValid || !messageValid) {
      toast({ title: "Veuillez remplir les champs requis" });
      return;
    }
    setLoading(true);
    const result = await createLead({
      category: "quote",
      source: "services-quote",
      email,
      name: name || undefined,
      message,
    });
    setLoading(false);
    if (result.success) {
      toast({ title: "Merci ! Votre demande de devis a bien été envoyée." });
      setName("");
      setEmail("");
      setMessage("");
      setSubmitted(false);
      setOpen(false);
      return;
    }
    toast({
      title: "Impossible d’enregistrer votre demande",
      description: result.error || "Veuillez réessayer dans quelques instants.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full transition duration-200 hover:opacity-90">
          Envoyer un email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demande de devis</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-name">Nom</Label>
            <Input
              id="quote-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom (facultatif)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-email">Email *</Label>
            <Input
              id="quote-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={submitted && !emailValid}
              aria-describedby="quote-email-error"
            />
            {submitted && !emailValid && (
              <p id="quote-email-error" className="text-sm text-red-600">Email invalide</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-message">Décrivez votre projet *</Label>
            <Textarea
              id="quote-message"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={submitted && !messageValid}
              aria-describedby="quote-message-error"
            />
            {submitted && !messageValid && (
              <p id="quote-message-error" className="text-sm text-red-600">Message requis</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="rounded-full">
              {loading ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestimonialDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full transition duration-200 hover:opacity-90">
          Proposer un témoignage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proposer un témoignage</DialogTitle>
        </DialogHeader>
        <ReviewForm
          source="services-testimonial"
          successMessage="Merci ! Votre avis sera publié après validation."
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
