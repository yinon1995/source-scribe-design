import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-portrait.jpeg";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <article className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16 space-y-6">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              À propos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une double compétence : rédaction beauté et reportages locaux
            </p>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
              <img
                src={heroImage}
                alt="Portrait"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-6 text-center">
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
Nolwenn, brestoise 100% beurre salé et rédactrice spécialisée en contenus pour l’événementiel, les différents lieux et commerces et l’univers de la beauté.
Passionnée par la valorisation des expériences et des savoir-faire, j’aide les entreprises locales à mettre en lumière leur univers à travers des textes justes, vivants et modernes. Cela me tient à cœur de partager mon univers, ici à Brest, « À la Brestoise ».
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-display font-semibold text-foreground">
                    Une approche exigeante
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Chaque article publié ici repose sur une recherche approfondie, des sources 
                    vérifiées et une écriture claire. Mon objectif : vous offrir des contenus 
                    informatifs qui vous aident vraiment dans vos choix.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-display font-semibold text-foreground">
                  Mes valeurs
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Clarté et accessibilité de l'information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Approche terrain pour les reportages locaux</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Élégance dans la forme et le fond</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Expertise */}
          <div className="bg-card rounded-2xl p-8 md:p-12 space-y-8">
            <h2 className="text-3xl font-display font-semibold text-foreground text-center">
              Domaines d'expertise
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Beauté & cosmétique</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tests produits, décryptage d’ingrédients, analyse scientifiques sourcés, guide d’achat le tout en un article ludique et 100% transparent !
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Commerces & places</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Domaines hôteliers, boutiques & concept-stores, cafés et restaurants, ateliers créatifs, activités
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Événementiel</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Salons professionnels, lieux de réception, événements culturel, sportif, musical
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default About;
