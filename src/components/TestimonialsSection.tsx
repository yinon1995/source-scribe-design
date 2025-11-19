import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, StarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTestimonials } from "@/lib/testimonialsClient";
import type { Testimonial } from "@/lib/testimonials";
import { formatTestimonialLocation } from "@/lib/testimonials";

type TestimonialsSectionProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  ctaSlot?: ReactNode;
};

const TestimonialsSection = ({
  title = "Ils m'ont fait confiance",
  subtitle,
  className,
  ctaSlot,
}: TestimonialsSectionProps) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchTestimonials();
        if (!mounted) return;
        setTestimonials(data);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setTestimonials([]);
        setError(err?.message || "Impossible de charger les témoignages.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const publishedTestimonials = useMemo(
    () =>
      testimonials
        .filter((testimonial) => testimonial.status === "published")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [testimonials],
  );
  const hasMany = publishedTestimonials.length > 1;
  const showSection = publishedTestimonials.length > 0 || !!ctaSlot || loading;
  const averageRating = useMemo(() => {
    if (!publishedTestimonials.length) return null;
    const sum = publishedTestimonials.reduce((acc, item) => acc + item.rating, 0);
    return sum / publishedTestimonials.length;
  }, [publishedTestimonials]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [publishedTestimonials.length]);

  const current = publishedTestimonials.length
    ? publishedTestimonials[Math.min(currentIndex, publishedTestimonials.length - 1)]
    : null;

  function goPrev() {
    setCurrentIndex((index) => (index > 0 ? index - 1 : index));
  }

  function goNext() {
    setCurrentIndex((index) =>
      publishedTestimonials.length === 0 || index >= publishedTestimonials.length - 1 ? index : index + 1,
    );
  }

  if (!showSection) {
    return null;
  }

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          {averageRating !== null && (
            <p className="text-sm text-muted-foreground">
              Note moyenne : <span className="font-semibold text-foreground">{formatAverageRating(averageRating)}</span>
            </p>
          )}
        </div>
        {ctaSlot}
      </div>

      {loading && publishedTestimonials.length === 0 && (
        <p className="text-sm text-muted-foreground">Chargement des témoignages…</p>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !current && !error && (
        <p className="text-sm text-muted-foreground">Aucun témoignage publié pour le moment.</p>
      )}

      {current && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" className="rounded-full" onClick={goPrev} disabled={currentIndex === 0}>
              Précédent
            </Button>
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} / {publishedTestimonials.length}
            </p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={goNext}
              disabled={publishedTestimonials.length === 0 || currentIndex >= publishedTestimonials.length - 1}
            >
              Suivant
            </Button>
          </div>

          <Card className="mx-auto max-w-3xl rounded-[32px] border bg-card/90 p-8 shadow-lg">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {renderAvatar(current)}
                <div>
                  <p className="text-xl font-semibold">{current.name}</p>
                  {formatTestimonialLocation(current) && (
                    <p className="text-sm text-muted-foreground">{formatTestimonialLocation(current)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-primary">
                {renderStars(current.rating)}
                <span className="text-sm text-muted-foreground">{current.rating}/5</span>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground">“{current.message}”</p>
              <div className="text-sm text-muted-foreground">
                {new Date(current.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              {current.photos && current.photos.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Photos de l’événement</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {current.photos.slice(0, 5).map((src, index) => (
                      <div
                        key={`${current.id}-photo-${index}`}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted"
                      >
                        <img
                          src={src}
                          alt={`Photo ${index + 1} partagée par ${current.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
};

function initials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, index) => {
    const filled = index < rating;
    const Icon = filled ? Star : StarOff;
    return <Icon key={index} className={cn("h-4 w-4", filled ? "fill-primary text-primary" : "text-muted-foreground")} />;
  });
}

function formatAverageRating(average: number) {
  const rounded = Math.round(average * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}/5` : `${rounded.toFixed(1)}/5`;
}

function renderAvatar(testimonial: Testimonial) {
  const source = testimonial.avatar ?? testimonial.avatarUrl ?? undefined;
  if (source) {
    return (
      <img
        src={source}
        alt={testimonial.name}
        className="h-12 w-12 rounded-full object-cover border"
        loading="lazy"
      />
    );
  }
  return (
    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
      {initials(testimonial.name)}
    </div>
  );
}

export default TestimonialsSection;


