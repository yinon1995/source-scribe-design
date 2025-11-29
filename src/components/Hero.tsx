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

  // Auto-rotation logic
  useEffect(() => {
    if (heroImages.length <= 1) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

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

  // Calculate visible cards
  const getVisibleCards = () => {
    if (heroImages.length === 0) return [];
    if (heroImages.length === 1) return [{ index: 0, img: heroImages[0], position: 0 }];

    const cards = [];
    // Always show up to 3 cards if possible
    const count = Math.min(heroImages.length, 3);

    for (let i = 0; i < count; i++) {
      const actualIndex = (currentIndex + i) % heroImages.length;
      cards.push({
        index: actualIndex,
        img: heroImages[actualIndex],
        position: i // 0 = front, 1 = middle, 2 = back
      });
    }
    // Reverse so the back cards render first (z-index stacking by DOM order, though we'll use z-index explicitly too)
    return cards.reverse();
  };

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

          {/* Hero Image / Fan Stack */}
          <div className="relative group perspective-1000">
            <div
              className={cn(
                "relative aspect-[4/5] w-full max-w-md mx-auto",
                heroImages.length > 1 ? "cursor-pointer" : ""
              )}
              onClick={heroImages.length > 1 ? nextImage : undefined}
              role={heroImages.length > 1 ? "button" : undefined}
              aria-label={heroImages.length > 1 ? "Image suivante" : undefined}
              tabIndex={heroImages.length > 1 ? 0 : undefined}
              onKeyDown={(e) => {
                if (heroImages.length > 1 && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  nextImage();
                }
              }}
            >
              {getVisibleCards().map((card) => (
                <div
                  key={`${card.index}-${card.position}`} // Re-keying ensures animation triggers on position change
                  className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl transition-all duration-700 ease-in-out bg-muted"
                  style={{
                    zIndex: 30 - card.position * 10, // Front = 30, Middle = 20, Back = 10
                    transform: `
                                translateX(${card.position * 12}px) 
                                translateY(${card.position * -12}px) 
                                scale(${1 - card.position * 0.05})
                            `,
                    opacity: 1 - card.position * 0.15, // Slight fade for back cards
                  }}
                >
                  <img
                    src={card.img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay to darken back cards slightly more for depth */}
                  {card.position > 0 && (
                    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                  )}
                </div>
              ))}
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
