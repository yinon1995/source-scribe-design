import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import defaultHeroImage from "@/assets/hero-portrait.jpeg";
import { site } from "@/lib/siteContent";
import { Link } from "react-router-dom";
import { createLead } from "@/lib/inboxClient";
import { cn } from "@/lib/utils";

const Hero = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Hero images logic
  const [heroImages, setHeroImages] = useState<string[]>([defaultHeroImage]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function loadHeroImages() {
      try {
        const res = await fetch("/api/homeGallery");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.homeHeroImages && Array.isArray(json.data.homeHeroImages) && json.data.homeHeroImages.length > 0) {
            setHeroImages(json.data.homeHeroImages);
          }
        }
      } catch (e) {
        console.error("Failed to load hero images", e);
      }
    }
    loadHeroImages();
  }, []);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  };

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const subjectValid = subject.trim().length > 0;
  const messageValid = message.trim().length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!emailValid || !subjectValid || !messageValid) {
      toast({ title: "Veuillez remplir les champs requis" });
      return;
    }
    setSubmitting(true);
    const result = await createLead({
      category: "suggestion",
      source: "hero-proposer-sujet",
      email,
      message,
      meta: { subject },
    });
    setSubmitting(false);
    if (!result.success) {
      toast({
        title: "Impossible d’enregistrer votre suggestion",
        description: result.error || "Veuillez réessayer dans quelques instants.",
      });
      return;
    }
    toast({ title: "Merci pour votre idée !" });
    setEmail("");
    setSubject("");
    setMessage("");
    setSubmitted(false);
    setDialogOpen(false);
  }

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight tracking-tight">
                {site.hero.title}
              </h1>
            </div>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              {site.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={site.hero.ctaHref}>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 transition duration-200 hover:opacity-90"
                >
                  {site.hero.ctaLabel}
                </Button>
              </Link>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 border-2 transition-colors duration-200 hover:opacity-90"
                  >
                    Proposer un sujet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Proposer un sujet</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="proposer-email">Email</Label>
                      <Input
                        id="proposer-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={submitted && !emailValid}
                        aria-describedby="proposer-email-error"
                      />
                      {submitted && !emailValid && (
                        <p id="proposer-email-error" className="text-sm text-red-600">Email invalide</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposer-sujet">Sujet</Label>
                      <Input
                        id="proposer-sujet"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        aria-invalid={submitted && !subjectValid}
                        aria-describedby="proposer-sujet-error"
                      />
                      {submitted && !subjectValid && (
                        <p id="proposer-sujet-error" className="text-sm text-red-600">Sujet requis</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposer-message">Message</Label>
                      <Textarea
                        id="proposer-message"
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        aria-invalid={submitted && !messageValid}
                        aria-describedby="proposer-message-error"
                      />
                      {submitted && !messageValid && (
                        <p id="proposer-message-error" className="text-sm text-red-600">Message requis</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="rounded-full" disabled={submitting}>
                        {submitting ? "Envoi..." : "Envoyer"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative group">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-xl relative bg-muted">
              <img
                key={heroImages[currentIndex]} // Key forces re-render for animation if needed, or just src update
                src={heroImages[currentIndex]}
                alt="Portrait professionnel"
                className="w-full h-full object-cover transition-opacity duration-500"
              />

              {/* Fan Control */}
              {heroImages.length > 1 && (
                <button
                  onClick={nextImage}
                  aria-label="Image suivante"
                  className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center cursor-pointer hover:opacity-100 opacity-80 transition-opacity z-10"
                >
                  <div className="relative w-8 h-8">
                    {/* Card 1 (Bottom) */}
                    <div className="absolute top-0 left-0 w-6 h-8 bg-white/40 rounded-sm transform rotate-[-10deg] translate-x-[-2px] translate-y-[2px] border border-white/20 shadow-sm"></div>
                    {/* Card 2 (Middle) */}
                    <div className="absolute top-0 left-0 w-6 h-8 bg-white/60 rounded-sm transform rotate-[5deg] translate-x-[2px] border border-white/30 shadow-sm"></div>
                    {/* Card 3 (Top) */}
                    <div className="absolute top-0 left-0 w-6 h-8 bg-white/90 rounded-sm transform rotate-[20deg] translate-x-[6px] translate-y-[-2px] border border-white/40 shadow-sm flex items-center justify-center">
                      {/* Tiny arrow */}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black/50 w-3 h-3 transform rotate-[-20deg]">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </button>
              )}
            </div>
            {/* Decorative arch */}
            <div className="absolute -top-8 -right-8 w-32 h-32 border border-border rounded-full opacity-50 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
