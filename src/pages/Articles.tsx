import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import CategoryFilter from "@/components/CategoryFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { postsIndex } from "@/lib/content";
import { site } from "@/lib/siteContent";
import { getAllArticlesForAdmin } from "@/lib/articlesIndex";

const Articles = () => {
  function normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function labelForTag(tag?: string): string {
    const n = normalize(tag || "");
    if (n.includes("science")) return site.categories.beaute;
    if (n.includes("nouveau") || n.includes("commerce") || n.includes("lieu")) return site.categories.commercesEtLieux;
    if (n.includes("experience") || n.includes("lieu")) return site.categories.experience;
    if (n.includes("beaute")) return site.categories.beaute;
    return site.categories.beaute;
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    postsIndex.forEach((p) => (p.tags ?? []).forEach((t) => set.add(labelForTag(t))));
    // Ensure preferred order
    const list = [site.categories.beaute, site.categories.commercesEtLieux, site.categories.experience];
    const extras = Array.from(set).filter((c) => !list.includes(c));
    return ["Tous", ...list, ...extras];
  }, []);

  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Read initial query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
    setDebouncedQuery(q);
  }, []);

  // Debounce query
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Sync query to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (searchQuery) {
      params.set("q", searchQuery);
    } else {
      params.delete("q");
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
    window.history.replaceState(null, "", newUrl);
  }, [searchQuery]);

  const allArticles = useMemo(() => getAllArticlesForAdmin(), []);

  const filteredArticles = allArticles
    .filter(article => activeCategory === "Tous" || article.category === activeCategory)
    .filter(article => {
      const q = normalize(debouncedQuery);
      if (q === "") return true;
      const tokens = q.split(/\s+/).filter(Boolean);
      const haystack = [
        normalize(article.title),
        normalize(article.excerpt ?? ""),
        normalize(article.category ?? ""),
        ...(article.tags ?? []).map((t) => normalize(t)),
      ].join(" ");
      return tokens.every((t) => haystack.includes(t));
    });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12 space-y-6">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Tous les articles
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explorez l'ensemble des contenus par thématique ou recherchez un sujet précis
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 rounded-full h-12"
              />
            </div>
          </div>

          {/* Category Filter */}
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {filteredArticles.map((article, index) => (
              <ArticleCard key={index} {...article} />
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                Aucun article ne correspond à votre recherche
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Articles;
