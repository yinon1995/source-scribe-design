import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import ReviewForm from "@/components/ReviewForm";

const ReviewsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Avis clients
            </h1>
            <p className="text-lg text-muted-foreground">
              Partagez votre expérience pour aider d’autres commerces, artisans et partenaires à connaître le studio.
              Chaque avis est vérifié avant publication.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border bg-card/60 p-6 shadow-sm">
            <h2 className="text-2xl font-display font-semibold mb-6">Laisser un avis</h2>
            <ReviewForm source="reviews-page" />
          </div>
        </div>
      </section>

      <section className="bg-accent/30 py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <TestimonialsSection
            title="Avis publiés"
            subtitle="Sélection de témoignages validés par l’équipe."
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ReviewsPage;


