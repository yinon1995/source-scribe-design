import { Link } from "react-router-dom";
import { Linkedin, Mail, Instagram, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { site, NAV_LINKS } from "@/lib/siteContent";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { createLead } from "@/lib/inboxClient";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* About */}
          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold text-foreground">
              {site.name}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {site.tagline}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Navigation</h4>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Légal</h4>
            <nav className="flex flex-col gap-2">
              <Link to={site.footer.legal.mentions} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Mentions légales
              </Link>
              <Link to={site.footer.legal.privacy} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Politique de confidentialité
              </Link>
              <Link to={site.footer.legal.terms} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Conditions d’utilisation
              </Link>
            </nav>
          </div>

          {/* Newsletter */}
          <FooterNewsletter />
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 {site.name}. Tous droits réservés.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <style>{`
              .footer-social-link {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                color: hsl(var(--muted-foreground));
                transition: color 200ms ease-out;
                text-decoration: none;
              }
              .footer-social-link:hover {
                color: hsl(var(--foreground));
              }

              .footer-social-icon {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              }

              /* Rainbow band */
              .footer-social-icon::before {
                content: "";
                position: absolute;
                left: -10%;
                top: -20%;
                width: 40%;
                height: 140%;
                background: linear-gradient(
                  180deg,
                  #ff6b6b,
                  #f7c948,
                  #51cf66,
                  #339af0,
                  #845ef7
                );
                opacity: 0;
                transform: translateY(-20%);
                border-radius: 999px;
                pointer-events: none;
                transition: opacity 200ms ease-out, transform 250ms ease-out;
              }

              .footer-social-link:hover .footer-social-icon::before {
                opacity: 0.9;
                transform: translateY(20%);
              }
            `}</style>

            <a href={site.footer.social.linkedin} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <Linkedin className="h-5 w-5 relative z-10" />
              </span>
              <span className="sr-only">LinkedIn</span>
            </a>

            <a href={site.footer.social.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <Instagram className="h-5 w-5 relative z-10" />
              </span>
              <span className="sr-only">Instagram</span>
            </a>

            <a href={site.footer.social.tiktok} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <Music className="h-5 w-5 relative z-10" />
              </span>
              <span className="sr-only">TikTok</span>
            </a>

            <a
              href={site.footer.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
            >
              <span className="text-sm">nolwennalabrestoise@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const emailValid = /\S+@\S+\.\S+/.test(email);

  async function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      toast({ title: "Email invalide" });
      return;
    }
    setLoading(true);
    const result = await createLead({
      category: "newsletter",
      source: "footer-newsletter",
      email,
      meta: {
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
    });
    setLoading(false);
    if (result.success) {
      toast({ title: "Merci ! Votre e-mail a bien été enregistré." });
      setEmail("");
      return;
    }
    toast({
      title: "Impossible d’enregistrer votre e-mail",
      description: result.error || "Veuillez réessayer d’ici quelques instants.",
    });
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground">Newsletter</h4>
      <p className="text-sm text-muted-foreground">
        Recevez les nouveaux articles
      </p>
      <form onSubmit={onSubscribe} className="flex gap-2">
        <label htmlFor="footer-subscribe-email" className="sr-only">Email</label>
        <Input
          id="footer-subscribe-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre e-mail"
          aria-invalid={!emailValid}
          className="rounded-full"
        />
        <Button type="submit" disabled={loading} className="rounded-full bg-primary hover:bg-primary/90">
          {loading ? "..." : "S’abonner"}
        </Button>
      </form>
    </div>
  );
}
