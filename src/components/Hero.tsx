import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-portrait.jpeg";
import { site } from "@/lib/siteContent";
import { Link } from "react-router-dom";
import { CONTACT_EMAIL, CONTACT_MODE } from "@/config/contactFallback";
import { useContactFallback } from "@/context/ContactFallbackContext";

const Hero = () => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const subjectValid = subject.trim().length > 0;
  const messageValid = message.trim().length > 0;
  const { openFallback } = useContactFallback();
  const isPlaceholder = CONTACT_MODE === "placeholder";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPlaceholder) {
      openFallback();
      return;
    }
    setSubmitted(true);
    if (!emailValid || !subjectValid || !messageValid) {
      toast({ title: "Veuillez remplir les champs requis" });
      return;
    }
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "proposer-un-sujet", email, subject, message }),
      });
      if (res.ok) {
        toast({ title: "Merci !" });
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Proposition de sujet")}&body=${encodeURIComponent(`Email: ${email}\nSujet: ${subject}\n\nMessage:\n${message}`)}`;
        window.location.href = href;
      }
    } catch {
      const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Proposition de sujet")}&body=${encodeURIComponent(`Email: ${email}\nSujet: ${subject}\n\nMessage:\n${message}`)}`;
      window.location.href = href;
    }
  }

  function handleMailLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isPlaceholder) {
      e.preventDefault();
      openFallback();
    }
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
              <Dialog>
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
                      <Button type="submit" className="rounded-full">Envoyer</Button>
                    </DialogFooter>
                  </form>
                  <p className="text-xs text-muted-foreground">
                    ou envoyer un email directement à{" "}
                    <a
                      className="underline"
                      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Proposition de sujet")}`}
                      onClick={handleMailLinkClick}
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-xl">
              <img
                src={heroImage}
                alt="Portrait professionnel"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative arch */}
            <div className="absolute -top-8 -right-8 w-32 h-32 border border-border rounded-full opacity-50"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
