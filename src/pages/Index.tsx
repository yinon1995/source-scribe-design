import { FormEvent, useState } from "react";
import Hero from "@/components/Hero";
import ArticleCard from "@/components/ArticleCard";
import CategoryFilter from "@/components/CategoryFilter";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { site } from "@/lib/siteContent";
import beautyHero from "@/assets/beauty-hero.jpg";
import cafeInterior from "@/assets/cafe-interior.jpg";
import skincareDetail from "@/assets/skincare-detail.jpg";
import boutiqueExterior from "@/assets/boutique-exterior.jpg";

const Index = () => {
  const categories = [
    "Tous",
    site.categories.beaute,
    site.categories.commercesEtLieux,
    site.categories.experience,
  ];

  const [activeCategory, setActiveCategory] = useState("Tous");

  const articles = [
    {
      title: "Acide hyaluronique : mythes vs données scientifiques",
      excerpt: "Décryptage scientifique de cet ingrédient star de la cosmétique. Entre promesses marketing et réalité clinique, que peut-on vraiment attendre de l'acide hyaluronique ?",
      image: beautyHero,
      category: site.categories.beaute,
      readTime: "8 min",
      slug: "acide-hyaluronique-mythes-vs-donnees"
    },
    {
      title: "5 ouvertures à ne pas manquer ce mois-ci",
      excerpt: "Découvrez les nouveaux commerces qui réinventent l'expérience shopping dans votre ville. Du concept-store éco-responsable à la boutique d'artisanat local.",
      image: boutiqueExterior,
      category: site.categories.commercesEtLieux,
      readTime: "6 min",
      slug: "5-ouvertures-ne-pas-manquer"
    },
    {
      title: "Une journée dans un café céramique : récit & conseils",
      excerpt: "Immersion dans un lieu hybride où se mêlent café de spécialité et atelier de céramique. Une expérience créative et gourmande à vivre absolument.",
      image: cafeInterior,
      category: site.categories.experience,
      readTime: "10 min",
      slug: "journee-cafe-ceramique"
    },
    {
      title: "Niacinamide 10% : quand est-ce pertinent ?",
      excerpt: "Analyse approfondie de la niacinamide en concentration élevée. Pour quels types de peau ? Quelles associations éviter ? Les études cliniques décryptées.",
      image: skincareDetail,
      category: site.categories.beaute,
      readTime: "7 min",
      slug: "niacinamide-10-pertinence"
    },
    {
      title: "SPF 50 au quotidien : mode d'emploi complet",
      excerpt: "Tout ce qu'il faut savoir sur la protection solaire quotidienne. Quantités, réapplication, compatibilité avec le maquillage et idées reçues.",
      image: beautyHero,
      category: "Beauté",
      readTime: "9 min",
      slug: "spf-50-quotidien-mode-emploi"
    },
    {
      title: "Inside [Nom du salon] : tendances 2025",
      excerpt: "Reportage exclusif depuis le plus grand salon professionnel de la beauté. Les innovations qui vont marquer l'année et les marques à suivre.",
      image: skincareDetail,
      category: "Événements",
      readTime: "12 min",
      slug: "inside-salon-tendances-2025"
    }
  ];

  const filteredArticles = activeCategory === "Tous"
    ? articles
    : articles.filter(article => article.category === activeCategory);

  const [email, setEmail] = useState("");
  const emailValid = /\S+@\S+\.\S+/.test(email);
  async function onSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      toast({ title: "Email invalide" });
      return;
    }
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
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero />

      {/* Newsletter Bar */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <form onSubmit={onSubscribe} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center">
            <p className="text-sm text-muted-foreground flex-1">
              Recevez les nouveaux articles
            </p>
            <div className="flex w-full sm:w-auto gap-2">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre e-mail"
                className="rounded-full"
              />
              <Button type="submit" className="rounded-full transition duration-200 hover:opacity-90">
                S’abonner
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Articles récents
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Explorez les derniers contenus par thématique
            </p>
          </div>

          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {filteredArticles.map((article, index) => (
              <ArticleCard key={index} {...article} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-accent/30">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Recevez les nouveaux articles
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Inscrivez-vous à la newsletter pour ne rien manquer des prochaines publications
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
