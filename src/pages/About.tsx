import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-portrait.jpeg";
import { getAboutContent } from "@/lib/about";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import { applySeo } from "@/lib/seo";
import { site } from "@/lib/siteContent";

const About = () => {
  const aboutContent = getAboutContent();

  useEffect(() => {
    applySeo({
      title: `À propos - ${site.name}`,
      description: aboutContent.aboutTitle,
      canonicalPath: "/a-propos",
    });
  }, [aboutContent]);

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
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg relative">
              <AboutImageCarousel images={aboutContent.aboutImages || []} />
            </div>

            <div className="space-y-6">
              {aboutContent.valuesItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-display font-semibold text-foreground">
                    {aboutContent.valuesTitle}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {aboutContent.valuesItems.map((item, index) => (
                      <li
                        key={index}
                        className="relative pl-6 leading-relaxed text-muted-foreground
                                   before:content-[''] before:absolute before:left-0
                                   before:top-[0.85em] before:-translate-y-1/2
                                   before:h-1.5 before:w-1.5 before:rounded-full
                                   before:bg-muted-foreground/60"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

function AboutImageCarousel({ images }: { images: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 40 });

  useEffect(() => {
    if (!emblaApi || images.length <= 1) return;

    // Auto-play
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [emblaApi, images.length]);

  if (images.length === 0) {
    return (
      <img
        src={heroImage}
        alt="Portrait"
        className="w-full h-full object-cover"
      />
    );
  }

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt="Portrait"
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="overflow-hidden h-full" ref={emblaRef}>
      <div className="flex h-full">
        {images.map((src, index) => (
          <div className="flex-[0_0_100%] min-w-0 h-full relative" key={index}>
            <img
              src={src}
              alt={`Portrait ${index + 1}`}
              className="w-full h-full object-cover block"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
