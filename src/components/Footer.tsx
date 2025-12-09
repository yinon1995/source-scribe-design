import { Link } from "react-router-dom";
import { Linkedin, Mail, Instagram } from "lucide-react";
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
                width: 1.25rem;
                height: 1.25rem;
                overflow: hidden;
              }

              .footer-social-icon svg {
                position: relative;
                z-index: 10;
              }

              /* Rainbow band with wave animation */
              .footer-social-icon::before {
                content: "";
                position: absolute;
                width: 160%;
                height: 160%;
                top: -30%;
                left: -80%;
                background: linear-gradient(
                  120deg,
                  #ff6b6b,
                  #f7c948,
                  #51cf66,
                  #339af0,
                  #845ef7
                );
                opacity: 0;
                transform: translateX(-100%) rotate(20deg);
                pointer-events: none;
                z-index: 1;
              }

              @keyframes footer-social-wave {
                0% {
                  opacity: 0;
                  transform: translateX(-120%) rotate(20deg);
                }
                15% {
                  opacity: 1;
                }
                85% {
                  opacity: 1;
                  transform: translateX(120%) rotate(20deg);
                }
                100% {
                  opacity: 0;
                  transform: translateX(140%) rotate(20deg);
                }
              }

              .footer-social-link:hover .footer-social-icon::before {
                animation: footer-social-wave 600ms ease-out forwards;
              }
            `}</style>

            <a href={site.footer.social.linkedin} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <Linkedin className="h-full w-full relative z-10" />
              </span>
              <span className="sr-only">LinkedIn</span>
            </a>

            <a href={site.footer.social.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <Instagram className="h-full w-full relative z-10" />
              </span>
              <span className="sr-only">Instagram</span>
            </a>

            <a href={site.footer.social.tiktok} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 relative z-10"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
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
    </footer >
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
