import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-portrait.jpeg";
import { site } from "@/lib/siteContent";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight tracking-tight">
                {site.hero.title}
              </h1>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              {site.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={site.hero.ctaHref}>
                <Button 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 transition duration-200 hover:opacity-90"
                >
                  {site.hero.ctaLabel}
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full px-8 border-2 transition-colors duration-200 hover:opacity-90"
              >
                Proposer un sujet
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-xl">
              <img
                src={heroImage}
                alt="Portrait professionnel"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative arch */}
            <div className="absolute -top-8 -right-8 w-32 h-32 border border-border rounded-full opacity-50"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
