import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import CategoryFilter from "@/components/CategoryFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  CATEGORY_OPTIONS,
  normalizeCategory,
  postsIndex,
  getPostBySlug,
} from "@/lib/content";

function getCoverFromMagazineBody(body?: string): string | null {
  if (!body) return null;
  const m = body.match(/^\s*<!--\s*MAGAZINE_EDITOR_STATE:\s*(.*?)\s*-->/s);
  if (!m?.[1]) return null;
  try {
    const state = JSON.parse(m[1]);
    const blocks = Array.isArray(state?.blocks) ? state.blocks : [];
    for (const b of blocks) {
      const v =
        (typeof b?.src === "string" && b.src) ||
        (typeof b?.imageUrl === "string" && b.imageUrl) ||
        (typeof b?.content?.src === "string" && b.content.src) ||
        (typeof b?.content?.imageUrl === "string" && b.content.imageUrl);
      if (typeof v === "string" && v.length > 0) return v;
    }
    return null;
  } catch {
    return null;
  }
}

type ArticleCardData = {
  title: string;
  excerpt: string;
  image?: string;
  category: string;
  readTime: string;
  slug: string;
  tags: string[];
  searchIndex: string;
  featured?: boolean;
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const Articles = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // 🔒 Safety: skip any invalid post (no title or no slug)
  const articles = useMemo<ArticleCardData[]>(() => {
    return postsIndex
      .filter((post) => {
        if (!post) return false;
        const hasTitle =
          typeof post.title === "string" && post.title.trim().length > 0;
        const hasSlug =
          typeof post.slug === "string" && post.slug.trim().length > 0;
        return hasTitle && hasSlug;
      })
      .map((post) => {
        const tags = Array.isArray(post.tags) ? post.tags : [];
        const category = normalizeCategory(post.category);
        const featured = post.featured === true;
        const fullPost = getPostBySlug(post.slug);
        const magazineCover = getCoverFromMagazineBody(fullPost?.body);
        const excerpt = post.summary ?? "";
        const heroImage = magazineCover || post.heroImage;

        const joinedFields = [
          post.title,
          excerpt,
          category,
          tags.join(" "),
          post.slug ?? "",
        ]
          .filter(Boolean)
          .join(" ");

        return {
          title: post.title,
          excerpt,
          image: heroImage,
          category,
          readTime: `${post.readingMinutes ?? 1} min`,
          slug: post.slug as string,
          tags,
          searchIndex: normalizeText(joinedFields),
          featured,
        };
      });
  }, []);

  const categories = useMemo(() => ["Tous", ...CATEGORY_OPTIONS], []);

  useEffect(() => {
    setSearchQuery(initialSearch);
    setDebouncedQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmed = searchQuery.trim();
          if (trimmed) {
            next.set("search", trimmed);
          } else {
            next.delete("search");
          }
          return next;
        },
        { replace: true },
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  const focusSearch = (
    location.state as { focusSearch?: boolean } | null
  )?.focusSearch;
  useEffect(() => {
    if (focusSearch) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [focusSearch, location.pathname, location.search, navigate]);

  const normalizedQuery = normalizeText(debouncedQuery.trim());
  const hasSearchQuery = normalizedQuery.length > 0;
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory =
        activeCategory === "Tous" || article.category === activeCategory;
      const matchesSearch = hasSearchQuery
        ? article.searchIndex.includes(normalizedQuery)
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [articles, activeCategory, hasSearchQuery, normalizedQuery]);

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12 space-y-6">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Tous les articles
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explorez l'ensemble des contenus par thématique ou recherchez un
              sujet précis
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
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
            {filteredArticles.map((article) => (
              <ArticleCard key={article.slug} {...article} />
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                {hasSearchQuery
                  ? "Aucun article ne correspond à votre recherche."
                  : activeCategory === "Tous"
                    ? "Aucun article disponible pour le moment."
                    : "Aucun article pour cette thématique pour le moment."}
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
