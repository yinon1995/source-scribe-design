import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">Conditions d’utilisation</h1>
          <p className="text-muted-foreground leading-relaxed">
            Ces conditions s’appliquent à l’utilisation du site. Contenu à compléter.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;


