import Footer from "@/components/Footer";

const LegalMentions = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">Mentions légales</h1>
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">Éditeur du site</h2>
              <p>
                « À la Brestoise » est un site éditorial.
              </p>
              <p>
                Éditeur & responsable de publication : <strong>Nolwenn (À la Brestoise)</strong> – Brest, France.
              </p>
              <p>
                Contact : via le formulaire disponible sur le site.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground">Hébergeur</h2>
              <p>
                Le site est hébergé par <strong>Vercel Inc.</strong> – https://vercel.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Propriété intellectuelle</h2>
              <p>
                L'ensemble des contenus (textes, visuels, logos) présents sur ce site est protégé par le droit d'auteur.
              </p>
              <p>
                Toute reproduction, représentation, modification ou diffusion, totale ou partielle, est interdite sans autorisation écrite préalable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Responsabilité</h2>
              <p>
                Les informations publiées sont fournies à titre éditorial et indicatif. L'éditeur ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Liens externes</h2>
              <p>
                Le site peut contenir des liens vers des sites tiers. L'éditeur n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leurs contenus et pratiques.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Données personnelles</h2>
              <p>
                Pour connaître la politique de traitement des données et vos droits, veuillez consulter la <strong>Politique de confidentialité</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Contact</h2>
              <p>
                Pour toute question, utilisez le formulaire de contact disponible sur le site.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalMentions;


