import { FormEvent, useState } from "react";
import { useMemo } from "react";
import Hero from "@/components/Hero";
import ArticleCard from "@/components/ArticleCard";
import CategoryFilter from "@/components/CategoryFilter";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { site } from "@/lib/siteContent";
import { subscribe } from "@/lib/subscribe";
import { openMailto } from "@/lib/subscribe";
import { CATEGORY_OPTIONS, postsIndex } from "@/lib/content";
import { FALLBACK_ARTICLE_IMAGE } from "@/lib/images";

const Index = () => {
  const categories = useMemo(() => ["Tous", ...CATEGORY_OPTIONS], []);

  const [activeCategory, setActiveCategory] = useState("Tous");

  const latestArticles = useMemo(() => {
    const eligible = postsIndex
      .filter(
        (post) =>
          Boolean(post.title?.trim()) &&
          Boolean(post.slug?.trim()) &&
          Boolean((post.summary ?? "").trim()),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const featuredPool = eligible.filter((post) => post.featured === true);
    const source = featuredPool.length > 0 ? featuredPool : eligible;

    return source.slice(0, 3).map((post) => ({
      title: post.title,
      excerpt: post.summary ?? "",
      image: post.heroImage || FALLBACK_ARTICLE_IMAGE,
      category: post.category || site.categories.beaute,
      readTime: `${post.readingMinutes ?? 1} min`,
      slug: post.slug,
      tags: post.tags ?? [],
    }));
  }, []);

  const filteredArticles = activeCategory === "Tous"
    ? latestArticles
    : latestArticles.filter(article => article.category === activeCategory);

  const [email, setEmail] = useState("");
  const emailValid = /\S+@\S+\.\S+/.test(email);
  async function onSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      toast({ title: "Email invalide" });
      return;
    }
    const result = await subscribe(email, "home-cta");
    if (result === "ok") {
      toast({ title: "Merci !" });
      setEmail("");
    } else {
      const href = `mailto:nolwennalabrestoise@gmail.com?subject=${encodeURIComponent("Abonnement newsletter")}&body=${encodeURIComponent(`${email}\n\n(source: home-cta | path: ${window.location.pathname})`)}`;
      openMailto(href);
      toast({ title: "Erreur serveur — envoi par e-mail proposé." });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero />

      {/* Newsletter Bar (removed render) */}

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
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <p className="text-lg text-muted-foreground text-center md:text-left">
              inscrivez-vous à la newsletter pour ne rien manquer des prochaines publications
            </p>
            <form onSubmit={onSubscribe} className="w-full md:w-auto flex gap-2 justify-center">
              <label htmlFor="home-subscribe-email" className="sr-only">Email</label>
              <Input
                id="home-subscribe-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre e-mail"
                aria-invalid={!emailValid}
                className="rounded-full max-w-xs"
              />
              <Button type="submit" className="rounded-full transition duration-200 hover:opacity-90">
                S’abonner
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
