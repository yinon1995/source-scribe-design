import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createLead } from "@/lib/inboxClient";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type ReviewFormProps = {
  source: string;
  className?: string;
  successMessage?: string;
  submitLabel?: string;
  onSubmitted?: () => void;
};

export const ReviewForm = ({
  source,
  className,
  successMessage = "Merci ! Votre avis a été envoyé et sera publié après validation.",
  submitLabel = "Envoyer",
  onSubmitted,
}: ReviewFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameValid = Boolean(name.trim());
  const messageValid = Boolean(message.trim());

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!nameValid || !messageValid) {
      toast({ title: "Merci de remplir les champs requis." });
      return;
    }
    setLoading(true);
    const result = await createLead({
      category: "testimonial",
      source,
      name,
      email: email || undefined,
      message,
      meta: {
        company: company || undefined,
        role: role || undefined,
        city: city || undefined,
        rating,
        avatarUrl: avatarUrl || undefined,
        instagramUrl: instagramUrl || undefined,
      },
    });
    setLoading(false);
    if (result.success) {
      toast({ title: successMessage });
      setName("");
      setEmail("");
      setCompany("");
      setRole("");
      setCity("");
      setAvatarUrl("");
      setInstagramUrl("");
      setMessage("");
      setRating(5);
      setSubmitted(false);
      onSubmitted?.();
      return;
    }
    toast({
      title: "Impossible d’enregistrer votre témoignage",
      description: result.error || "Veuillez réessayer dans quelques instants.",
    });
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="review-name">Nom *</Label>
          <Input
            id="review-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={submitted && !nameValid}
            aria-describedby="review-name-error"
          />
          {submitted && !nameValid && (
            <p id="review-name-error" className="text-sm text-destructive">
              Nom requis
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-email">Email</Label>
          <Input
            id="review-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Facultatif mais utile pour vous répondre"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-company">Entreprise</Label>
          <Input
            id="review-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-role">Rôle / poste</Label>
          <Input
            id="review-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-city">Ville</Label>
          <Input
            id="review-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Note *</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                type="button"
                key={value}
                variant={value <= rating ? "default" : "outline"}
                size="icon"
                onClick={() => setRating(value)}
                aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
              >
                <Star className={value <= rating ? "h-4 w-4 fill-background" : "h-4 w-4"} />
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="review-avatar">Photo / avatar (URL)</Label>
          <Input
            id="review-avatar"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="review-instagram">Lien Instagram</Label>
          <Input
            id="review-instagram"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/..."
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="review-message">Message *</Label>
          <Textarea
            id="review-message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={submitted && !messageValid}
            aria-describedby="review-message-error"
          />
          {submitted && !messageValid && (
            <p id="review-message-error" className="text-sm text-destructive">
              Message requis
            </p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading} className="rounded-full">
        {loading ? "Envoi..." : submitLabel}
      </Button>
    </form>
  );
};

export default ReviewForm;


