import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getPostBySlug } from "@/lib/content";
import ReactMarkdown from "react-markdown";

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
      <article className="pb-20">
        <header className="pt-12 md:pt-20">
          <div className="container mx-auto px-4">
            {post.heroImage && (
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-10">
                <img src={post.heroImage} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-muted-foreground">{new Date(post.date).toLocaleDateString("fr-FR")}</p>
          </div>
        </header>

        <section className="mt-10">
          <div className="container mx-auto px-4">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown>{post.body}</ReactMarkdown>
            </div>
          </div>
        </section>
      </article>
      <Footer />
    </div>
  );
};

export default ArticleDetail;


