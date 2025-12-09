import { Link } from "react-router-dom";
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
                transition: color 180ms ease-out;
                text-decoration: none;
                color: hsl(var(--muted-foreground));
              }
              .footer-social-link:hover {
                color: #a38366;
              }

              .footer-social-icon {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.25rem;
                height: 1.25rem;
              }

              /* Base glass stroke */
              .footer-social-glass-stroke {
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                opacity: 0;
              }

              /* Hover: a glass wave runs along the stroke */
              .footer-social-link:hover .footer-social-glass-stroke {
                animation: footerSocialGlass 750ms ease-out forwards;
              }

              @keyframes footerSocialGlass {
                0% {
                  stroke-dashoffset: 100;
                  opacity: 0;
                }
                10% {
                  opacity: 0.9;
                }
                80% {
                  stroke-dashoffset: 0;
                  opacity: 0.8;
                }
                100% {
                  stroke-dashoffset: 0;
                  opacity: 0;
                }
              }
            `}</style>

            <a href={site.footer.social.linkedin} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <FooterLinkedInIcon className="h-full w-full" />
              </span>
              <span className="sr-only">LinkedIn</span>
            </a>

            <a href={site.footer.social.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <FooterInstagramIcon className="h-full w-full" />
              </span>
              <span className="sr-only">Instagram</span>
            </a>

            <a href={site.footer.social.tiktok} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <span className="footer-social-icon">
                <FooterTikTokIcon className="h-full w-full" />
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

function FooterLinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <defs>
        <linearGradient id="footer-social-glass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>
      </defs>

      {/* Base */}
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" strokeWidth="1.7" />
      <rect x="2" y="9" width="4" height="12" strokeWidth="1.7" />
      <circle cx="4" cy="4" r="2" strokeWidth="1.7" />

      {/* Highlight */}
      <g className="footer-social-glass-stroke" stroke="url(#footer-social-glass)" strokeWidth="2.1">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </g>
    </svg>
  );
}

function FooterInstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Base */}
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="1.7" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" strokeWidth="1.7" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="1.7" />

      {/* Highlight */}
      <g className="footer-social-glass-stroke" stroke="url(#footer-social-glass)" strokeWidth="2.1">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </g>
    </svg>
  );
}

function FooterTikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Base */}
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" strokeWidth="1.7" />

      {/* Highlight */}
      <path
        className="footer-social-glass-stroke"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
        stroke="url(#footer-social-glass)"
        strokeWidth="2.1"
      />
    </svg>
  );
}
