import React from "react";
import ReactMarkdown from "react-markdown";

export type ArticleRenderable = {
  title: string;
  date: string; // ISO or YYYY-MM-DD
  cover?: string | null;
  body: string; // markdown
};

type Props = {
  article: ArticleRenderable;
};

const ArticleContent: React.FC<Props> = ({ article }) => {
  const displayDate = article.date ? new Date(article.date).toLocaleDateString("fr-FR") : "";

  return (
    <article className="pb-20">
      <header className="pt-12 md:pt-20">
        <div className="container mx-auto px-4">
          {article.cover && (
            <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight mb-4">
            {article.title}
          </h1>
          {displayDate && <p className="text-muted-foreground">{displayDate}</p>}
        </div>
      </header>

      <section className="mt-10">
        <div className="container mx-auto px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown>{article.body}</ReactMarkdown>
          </div>
        </div>
      </section>
    </article>
  );
};

export default ArticleContent;


