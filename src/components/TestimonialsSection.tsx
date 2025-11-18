import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, StarOff, ChevronLeft, ChevronRight } from "lucide-react";
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
  const listRef = useRef<HTMLDivElement>(null);

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

  const hasMany = testimonials.length > 1;
  const showSection = testimonials.length > 0 || !!ctaSlot || loading;
  const averageRating = useMemo(() => {
    if (!testimonials.length) return null;
    const sum = testimonials.reduce((acc, item) => acc + item.rating, 0);
    return sum / testimonials.length;
  }, [testimonials]);

  useEffect(() => {
    if (!hasMany) return;
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1 >= testimonials.length ? 0 : prev + 1));
    }, 6000);
    return () => window.clearInterval(interval);
  }, [hasMany, testimonials.length]);

  if (!showSection) {
    return null;
  }

  function scrollByCard(direction: number) {
    if (!listRef.current) return;
    const container = listRef.current;
    const scrollAmount = container.clientWidth * 0.8 * direction;
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
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

      {loading && testimonials.length === 0 && (
        <p className="text-sm text-muted-foreground">Chargement des témoignages…</p>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && testimonials.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">Aucun témoignage publié pour le moment.</p>
      )}

      {testimonials.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="icon" onClick={() => scrollByCard(-1)} aria-label="Témoignage précédent" disabled={!hasMany}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => scrollByCard(1)} aria-label="Témoignage suivant" disabled={!hasMany}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div
            ref={listRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
          >
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="min-w-[280px] snap-start rounded-2xl border bg-card/80 p-6 md:min-w-[360px]"
              >
                <CardContent className="flex flex-col gap-4 p-0">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {getAvatarSource(testimonial) && (
                        <AvatarImage src={getAvatarSource(testimonial)!} alt={testimonial.name} />
                      )}
                      <AvatarFallback>{initials(testimonial.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      {formatTestimonialLocation(testimonial) && (
                        <p className="text-sm text-muted-foreground">
                          {formatTestimonialLocation(testimonial)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-base text-muted-foreground leading-relaxed">“{testimonial.body}”</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{new Date(testimonial.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

function getAvatarSource(testimonial: Testimonial) {
  return testimonial.avatar ?? testimonial.avatarUrl ?? undefined;
}

export default TestimonialsSection;


