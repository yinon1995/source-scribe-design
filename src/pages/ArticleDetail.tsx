import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getPostBySlug } from "@/lib/content";
import ArticleContent from "@/components/ArticleContent";

const ArticleDetail = () => {
  const { slug = "" } = useParams();
  const post = useMemo(() => getPostBySlug(slug), [slug]);

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
      <Navigation />
      <ArticleContent article={{ title: post.title, date: post.date, cover: post.heroImage, body: post.body }} />
      <Footer />
    </div>
  );
};

export default ArticleDetail;


