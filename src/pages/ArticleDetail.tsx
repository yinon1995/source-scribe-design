import { useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { getPostBySlug } from "@/lib/content";
import ArticleContent from "@/components/ArticleContent";

const ArticleDetail = () => {
  const { slug = "" } = useParams();
  const post = useMemo(() => getPostBySlug(slug), [slug]);

  useEffect(() => {
    if (!post || typeof document === "undefined") return;
    const metaTitle = post.seoTitle?.trim() || post.title;
    const description = post.seoDescription?.trim() || post.summary || "";
    const keywords = Array.isArray(post.searchAliases) ? post.searchAliases.join(", ") : "";
    const canonicalSource =
      post.canonicalUrl?.trim() ||
      (typeof window !== "undefined" ? `${window.location.origin}/articles/${post.slug}` : undefined);

    const previousTitle = document.title;
    const previousDescription = upsertMetaTag("description", description);
    const previousKeywords = upsertMetaTag("keywords", keywords);
    const previousCanonical = upsertCanonicalLink(canonicalSource);

    document.title = `${metaTitle} | À la Brestoise`;

    return () => {
      document.title = previousTitle;
      upsertMetaTag("description", previousDescription);
      upsertMetaTag("keywords", previousKeywords);
      upsertCanonicalLink(previousCanonical);
    };
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-semibold mb-4">Article introuvable</h1>
            <Link to="/articles" className="text-primary underline">Retour aux articles</Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ArticleContent article={post} />
      <Footer />
    </div>
  );
};

export default ArticleDetail;

function upsertMetaTag(name: string, content?: string) {
  if (typeof document === "undefined") return content ?? undefined;
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  const previous = tag.getAttribute("content") ?? undefined;
  if (content && content.length > 0) {
    tag.setAttribute("content", content);
  } else {
    tag.removeAttribute("content");
  }
  return previous;
}

function upsertCanonicalLink(href?: string) {
  if (typeof document === "undefined") return href ?? undefined;
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  const previous = link.getAttribute("href") ?? undefined;
  if (href && href.length > 0) {
    link.setAttribute("href", href);
  } else {
    link.removeAttribute("href");
  }
  return previous;
}


