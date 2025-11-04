import { Link } from "react-router-dom";
import { Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { site } from "@/lib/siteContent";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

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
              <Link to="/articles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Articles
              </Link>
              <Link to="/thematiques" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Thématiques
              </Link>
              <Link to="/a-propos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                À propos
              </Link>
              <Link to="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Services
              </Link>
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
          
          <div className="flex items-center gap-4">
            <a href={site.footer.social.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-full hover:bg-accent p-2 transition duration-200">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href={site.footer.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              TikTok
            </a>
            <a href={site.footer.social.whatsapp} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              WhatsApp +33 6 58 29 72 20
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
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast({ title: "Merci !" });
        setEmail("");
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ title: j.error || "Erreur serveur" });
      }
    } catch (err) {
      toast({ title: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground">Newsletter</h4>
      <p className="text-sm text-muted-foreground">
        Recevez les nouveaux articles
      </p>
      <form onSubmit={onSubscribe} className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre e-mail"
          className="rounded-full"
        />
        <Button type="submit" disabled={loading} className="rounded-full bg-primary hover:bg-primary/90">
          {loading ? "..." : "S’abonner"}
        </Button>
      </form>
    </div>
  );
}
