import { useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { getPostBySlug } from "@/lib/content";
import ArticleContent from "@/components/ArticleContent";
import SignatureBlock from "@/components/SignatureBlock";
import Navigation from "@/components/Navigation";
import { MagazineArticleView } from "@/magazine_editor/components/MagazineArticleView";
import type { ArticleBlock, Reference, ArticleSettings } from "@/magazine_editor/types";

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

    // Robots
    const robotsContent = post.allowIndexing === false ? "noindex, nofollow" : "index, follow";
    const previousRobots = upsertMetaTag("robots", robotsContent);

    // Open Graph
    const previousOgTitle = upsertPropertyTag("og:title", metaTitle);
    const previousOgDesc = upsertPropertyTag("og:description", description);
    const imageUrl = post.heroImage
      ? (post.heroImage.startsWith('http') || post.heroImage.startsWith('data:') ? post.heroImage : `${window.location.origin}${post.heroImage}`)
      : "";
    const previousOgImage = upsertPropertyTag("og:image", imageUrl);
    const previousOgUrl = upsertPropertyTag("og:url", canonicalSource);

    // Twitter
    const previousTwitterCard = upsertMetaTag("twitter:card", "summary_large_image");

    document.title = `${metaTitle} | À la Brestoise`;

    return () => {
      document.title = previousTitle;
      upsertMetaTag("description", previousDescription);
      upsertMetaTag("keywords", previousKeywords);
      upsertCanonicalLink(previousCanonical);
      upsertMetaTag("robots", previousRobots);
      upsertPropertyTag("og:title", previousOgTitle);
      upsertPropertyTag("og:description", previousOgDesc);
      upsertPropertyTag("og:image", previousOgImage);
      upsertPropertyTag("og:url", previousOgUrl);
      upsertMetaTag("twitter:card", previousTwitterCard);
    };
  }, [post]);

  // Check for Magazine Editor State
  const magazineState = useMemo(() => {
    if (!post?.body) return null;
    // Match comment at start of string, allowing for optional whitespace/newlines
    const match = post.body.match(/^\s*<!-- MAGAZINE_EDITOR_STATE: (.*?) -->/s);
    if (match) {
      try {
        return JSON.parse(match[1]) as {
          blocks: ArticleBlock[];
          references: Reference[];
          settings?: ArticleSettings;
        };
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("Failed to parse magazine state, falling back to legacy renderer", e);
        }
        return null;
      }
    }
    return null;
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
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
      {magazineState ? (
        <>
          <div className="pt-20 pb-10">
            <MagazineArticleView
              blocks={magazineState.blocks}
              references={magazineState.references}
              settings={{
                ...(magazineState.settings || {
                  headerEnabled: true,
                  headerText: 'À la Brestoise',
                  footerEnabled: true,
                  footerText: ''
                }),
                featured: post.featured,
                date: post.date,
                readingMinutes: post.readingMinutes,
                category: post.category as any,
              }}
            />
          </div>
        </>
      ) : (
        <>
          <ArticleContent article={post} journalMode={true} />
          <SignatureBlock />
        </>
      )}
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

function upsertPropertyTag(property: string, content?: string) {
  if (typeof document === "undefined") return content ?? undefined;
  let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
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
