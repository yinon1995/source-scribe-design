import { FormEvent, useState } from "react";
import { useMemo } from "react";
import Hero from "@/components/Hero";
import ArticleCard from "@/components/ArticleCard";
import CategoryFilter from "@/components/CategoryFilter";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import HomePhotoStripGallery from "@/components/HomePhotoStripGallery";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { site } from "@/lib/siteContent";
import { createLead } from "@/lib/inboxClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_OPTIONS, normalizeCategory, postsIndex } from "@/lib/content";

const Index = () => {
  const categories = useMemo(() => ["Tous", ...CATEGORY_OPTIONS], []);

  const [activeCategory, setActiveCategory] = useState("Tous");

  const featuredArticles = useMemo(() => {
    return postsIndex
      .filter(
        (post) =>
          Boolean(post.title?.trim()) &&
          Boolean(post.slug?.trim()) &&
          post.featured === true,
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((post) => ({
        title: post.title,
        excerpt: (post.summary ?? "").trim() || `Découvrez ${post.title}`,
        image: post.heroImage,
        category: normalizeCategory(post.category),
        readTime: `${post.readingMinutes ?? 1} min`,
        slug: post.slug as string,
        tags: post.tags ?? [],
        featured: true,
      }));
  }, []);

  const filteredArticles = activeCategory === "Tous"
    ? featuredArticles
    : featuredArticles.filter((article) => article.category === activeCategory);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const emailValid = /\S+@\S+\.\S+/.test(email);
  async function onSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      toast({ title: "Email invalide" });
      return;
    }
    setSubmitting(true);
    const result = await createLead({
      category: "newsletter",
      source: "home-newsletter",
      email,
      meta: {
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
    });
    setSubmitting(false);
    if (result.success) {
      toast({ title: "Merci ! Votre e-mail a bien été enregistré." });
      setEmail("");
      return;
    }
    toast({
      title: "Impossible d’enregistrer votre e-mail",
      description: result.error || "Veuillez réessayer dans quelques instants.",
    });
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

          {filteredArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-12">
              Aucun article mis en avant pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.slug} {...article} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Photo Gallery */}
      <HomePhotoStripGallery />

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
              <Button type="submit" disabled={submitting} className="rounded-full transition duration-200 hover:opacity-90">
                {submitting ? "Envoi..." : "S’abonner"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <TestimonialsSection
        className="py-16 container mx-auto px-4"
        subtitle="Retours d’expérience après nos collaborations éditoriales."
      />

      <Footer />
    </div>
  );
};

export default Index;
