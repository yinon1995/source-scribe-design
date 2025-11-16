import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">Conditions d’utilisation</h1>
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">Objet</h2>
              <p>
                Les présentes conditions encadrent l'accès et l'utilisation du site « À la Brestoise ».
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Accès au site</h2>
              <p>
                Le site est accessible gratuitement. L'éditeur se réserve le droit de suspendre, interrompre ou limiter l'accès, notamment pour maintenance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Règles d'utilisation</h2>
              <p>
                L'utilisateur s'engage à utiliser le site conformément aux lois en vigueur et à ne pas porter atteinte aux droits de tiers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Contributions & témoignages</h2>
              <p>
                Les contenus transmis par les utilisateurs (témoignages, commentaires) doivent rester licites et respectueux. L'éditeur se réserve le droit de modération, d'édition ou de suppression.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Propriété intellectuelle</h2>
              <p>
                Voir Mentions légales – toute reproduction non autorisée est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Limitation de responsabilité</h2>
              <p>
                L'éditeur ne saurait être tenu responsable des dommages résultant de l'utilisation du site. Le site est fourni « en l'état ».
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Liens externes</h2>
              <p>
                La présence de liens n'implique aucune approbation. L'éditeur décline toute responsabilité quant aux contenus tiers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Modification des conditions</h2>
              <p>
                L'éditeur peut modifier les présentes à tout moment. L'utilisateur est invité à les consulter régulièrement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Droit applicable</h2>
              <p>
                Droit français. En cas de litige et à défaut d'accord amiable, compétence des tribunaux français.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;


