import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-portrait.jpeg";
import { getAboutContent } from "@/lib/about";

const About = () => {
  const aboutContent = getAboutContent();
  const approachParagraphs = aboutContent.approachBody
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <article className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16 space-y-8">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              À propos
            </h1>
            <div className="space-y-6 max-w-[65ch] mx-auto">
              <p className="text-2xl font-display font-semibold text-foreground text-center">
                {aboutContent.aboutTitle}
              </p>
              {aboutContent.aboutBody.map((paragraph, index) => (
                <p key={index} className="text-xl text-muted-foreground leading-relaxed prose-justify">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Approach Section - Justified Block */}
            <div className="mt-16 max-w-[820px] mx-auto px-6">
              <h2 className="text-3xl font-display font-semibold text-foreground text-center mb-8">
                {aboutContent.approachTitle}
              </h2>
              <div className="space-y-6 text-[18px] md:text-[20px] text-muted-foreground leading-relaxed text-justify">
                {approachParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
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
                  {aboutContent.valuesTitle}
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  {aboutContent.valuesItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Expertise */}
          <div className="bg-card rounded-2xl p-8 md:p-12 space-y-8">
            <h2 className="text-3xl font-display font-semibold text-foreground text-center">
              Domaines d&apos;expertise
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Beauté & cosmétique
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tests produits, décryptage d’ingrédients, analyses
                  scientifiques sourcées, guides d’achat – le tout dans un
                  article ludique et 100% transparent.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Commerces & lieux
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Domaines hôteliers, boutiques & concept-stores, cafés et
                  restaurants, ateliers créatifs, activités locales.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  Événementiel
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Salons professionnels, lieux de réception, événements
                  culturels, sportifs et musicaux.
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
