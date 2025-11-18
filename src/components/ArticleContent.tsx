import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import rehypeRaw from "rehype-raw";
import type { Post } from "@/lib/content";
import { FALLBACK_ARTICLE_IMAGE } from "@/lib/images";

type Props =
  | { article: Post; body?: undefined; sources?: string[]; localMap?: Record<string, string> }
  | { article?: undefined; body: string; sources?: string[]; localMap?: Record<string, string> };

const ArticleContent: React.FC<Props> = (props) => {
  const article = props.article;
  const displayDate = article?.date ? new Date(article.date).toLocaleDateString("fr-FR") : "";
  const heroImage = article ? article.heroImage ?? FALLBACK_ARTICLE_IMAGE : null;
  const heroLayout = article?.heroLayout ?? "default";
  const showTitleInHero = article ? article.showTitleInHero !== false : true;
  const footerType = article?.footerType ?? "default";
  const body = article ? article.body : props.body || "";
  const sources = (article?.sources || props.sources || []) as string[];
  const localMap = props.localMap;
  const practicalInfo = article?.practicalInfo;
  const hasPracticalInfo =
    practicalInfo &&
    Object.values(practicalInfo).some((value) => typeof value === "string" && value.trim().length > 0);

  const heroSection = article
    ? renderHero({ article, displayDate, heroImage: heroImage ?? FALLBACK_ARTICLE_IMAGE, heroLayout, showTitleInHero })
    : null;

  return (
    <article className="pb-20">
      {heroSection}

      <section className="mt-10">
        <div className="container mx-auto px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-img:rounded-xl prose-figure:my-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks, remarkDirective]}
              rehypePlugins={[rehypeRaw]}
              components={{
                img: ({ node: _node, ...imgProps }) => {
                  const rawSrc = imgProps.src || "";
                  if (rawSrc.startsWith("local:") && !localMap) {
                    return null;
                  }
                  const resolved =
                    rawSrc.startsWith("local:") && localMap ? localMap[rawSrc] || rawSrc : localMap?.[rawSrc] || rawSrc;
                  const baseClass = "my-6 w-full max-w-full rounded-2xl border border-border/60 shadow-sm";
                  const className = imgProps.className ? `${baseClass} ${imgProps.className}` : baseClass;
                  const altText =
                    (imgProps.alt && imgProps.alt.trim().length > 0
                      ? imgProps.alt
                      : article?.title
                        ? `Illustration – ${article.title}`
                        : "Illustration d'article") || "Illustration d'article";
                  return (
                    <img
                      {...imgProps}
                      src={resolved}
                      loading={imgProps.loading ?? "lazy"}
                      alt={altText}
                      className={className}
                    />
                  );
                },
              }}
            >
              {body}
            </ReactMarkdown>

            {Array.isArray(sources) && sources.length > 0 && (
              <section className="mt-10">
                <h3>Sources</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  {sources.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </section>
            )}

            {article?.author && (
              <section className="mt-12 border-t border-border pt-8">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {article.authorAvatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.authorAvatarUrl}
                      alt={article.author}
                      className="h-16 w-16 rounded-full object-cover border"
                    />
                  )}
                  <div>
                    <p className="text-lg font-semibold">{article.author}</p>
                    {article.authorRole && <p className="text-sm text-muted-foreground">{article.authorRole}</p>}
                  </div>
                </div>
              </section>
            )}

            {footerType === "practical-info" && (hasPracticalInfo || article?.primaryPlaceName) && (
              <section className="mt-12 bg-muted/40 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {article?.primaryPlaceName || "Infos pratiques"}
                  </h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {practicalInfo?.address && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Adresse</p>
                      <p>{practicalInfo.address}</p>
                    </div>
                  )}
                  {practicalInfo?.phone && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Téléphone</p>
                      <p>{practicalInfo.phone}</p>
                    </div>
                  )}
                  {practicalInfo?.websiteUrl && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Site web</p>
                      <a href={practicalInfo.websiteUrl} target="_blank" rel="noreferrer" className="underline">
                        {practicalInfo.websiteUrl}
                      </a>
                    </div>
                  )}
                  {practicalInfo?.googleMapsUrl && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Google Maps</p>
                      <a href={practicalInfo.googleMapsUrl} target="_blank" rel="noreferrer" className="underline">
                        Voir l’itinéraire
                      </a>
                    </div>
                  )}
                  {practicalInfo?.openingHours && (
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Horaires</p>
                      <p className="whitespace-pre-line">{practicalInfo.openingHours}</p>
                    </div>
                  )}
                </div>
                {article?.footerNote && <p className="text-sm text-muted-foreground">{article.footerNote}</p>}
              </section>
            )}

            {footerType === "cta" && article?.footerNote && (
              <section className="mt-12 rounded-2xl bg-primary text-primary-foreground p-6 text-center">
                <p className="text-lg font-semibold">{article.footerNote}</p>
              </section>
            )}

            {footerType === "default" && article?.footerNote && (
              <p className="mt-12 text-center text-muted-foreground italic">{article.footerNote}</p>
            )}
          </div>
        </div>
      </section>
    </article>
  );
};

export default ArticleContent;

type HeroProps = {
  article: Post;
  displayDate: string;
  heroImage: string;
  heroLayout: "default" | "image-full" | "compact";
  showTitleInHero: boolean;
};

function renderHero({ article, displayDate, heroImage, heroLayout, showTitleInHero }: HeroProps) {
  if (heroLayout === "image-full" && heroImage) {
    return (
      <header className="relative h-[360px] md:h-[460px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt={article.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="relative z-10 h-full flex items-end pb-10">
          <div className="container mx-auto px-4 text-white space-y-4">
            {article.category && (
              <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs tracking-wide uppercase">
                {article.category}
              </span>
            )}
            {showTitleInHero && (
              <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight">{article.title}</h1>
            )}
            <div className="text-sm md:text-base text-white/90">
              {displayDate}
              {article.readingMinutes && (
                <span className="ml-4 inline-flex items-center gap-1">
                  <span aria-hidden>🕒</span> {article.readingMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  if (heroLayout === "compact") {
    return (
      <header className="pt-10 md:pt-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 space-y-4">
            {article.category && (
              <span className="inline-flex rounded-full bg-neutral-200 px-3 py-1 text-xs">{article.category}</span>
            )}
            {showTitleInHero && (
              <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">{article.title}</h1>
            )}
            <div className="text-muted-foreground text-sm">
              {displayDate}
              {article.readingMinutes && (
                <span className="ml-4 inline-flex items-center gap-1">
                  <span aria-hidden>🕒</span> {article.readingMinutes} min
                </span>
              )}
            </div>
          </div>
          {heroImage && (
            <div className="w-full md:w-64 rounded-2xl overflow-hidden bg-muted shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt={article.title} className="w-full h-48 object-cover" />
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="pt-12 md:pt-20">
      <div className="container mx-auto px-4">
        {article.category && (
          <div className="mb-4">
            <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs">{article.category}</span>
          </div>
        )}
        {heroImage && (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-muted mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}
        {showTitleInHero && (
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight mb-4">
            {article.title}
          </h1>
        )}
        <div className="text-muted-foreground">
          {displayDate}
          {article.readingMinutes && (
            <span className="ml-4 inline-flex items-center gap-1">
              <span aria-hidden>🕒</span> {article.readingMinutes} min
            </span>
          )}
        </div>
      </div>
    </header>
  );
}


