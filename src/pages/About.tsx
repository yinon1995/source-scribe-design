import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-portrait.jpeg";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <article className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16 space-y-8">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              À propos
            </h1>
            <div className="space-y-6 text-center max-w-3xl mx-auto">
              <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-line">
                {`« Nolwenn, plume brestois 100% beurre salé.

Specializing in content for events, places, businesses and the universe of beauty, I write to give relief to local experiences and identities.

« À la Brestoise », it is an editorial signature: authentic texts, précis et ancrés dans le territoire, avec une touche moderne qui fait la différence.

My approach: comprendre votre univers, capter ce qui le rend unique et le traduire en mots qui résonnent, qui inspirent et qui vous ressemblent. »`}
              </p>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-semibold text-foreground">Une approche exigente</h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Each article published here rests on in-depth research, verified sources et une écriture claire.
                  <br />
                  My goal: to offer informative content for my readers
                  <br />
                  And to highlight businesses and brands of professionals
                </p>
              </div>
            </div>
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
                <h3 className="text-lg font-semibold text-foreground">Commerces & lieux</h3>
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
