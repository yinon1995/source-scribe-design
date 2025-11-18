import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createLead } from "@/lib/inboxClient";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [clientType, setClientType] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        clientType: clientType || undefined,
        role: role || undefined,
        city: city || undefined,
        rating,
        avatarDataUrl: avatarDataUrl || undefined,
      },
    });
    setLoading(false);
    if (result.success) {
      toast({ title: successMessage });
      setName("");
      setEmail("");
      setClientType("");
      setRole("");
      setCity("");
      setAvatarDataUrl(null);
      setMessage("");
      setRating(5);
      setSubmitted(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onSubmitted?.();
      return;
    }
    toast({
      title: "Impossible d’enregistrer votre témoignage",
      description: result.error || "Veuillez réessayer dans quelques instants.",
    });
  }

  function handleAvatarFile(file: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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
          <Label htmlFor="review-client-type">Type de client</Label>
          <Select value={clientType || undefined} onValueChange={setClientType}>
            <SelectTrigger id="review-client-type">
              <SelectValue placeholder="Sélectionnez un type de client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Client particulier">Client particulier</SelectItem>
              <SelectItem value="Artisan / commerçant">Artisan / commerçant</SelectItem>
              <SelectItem value="Entreprise">Entreprise</SelectItem>
              <SelectItem value="Association">Association</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-role">Rôle / poste</Label>
          <Select value={role || undefined} onValueChange={setRole}>
            <SelectTrigger id="review-role">
              <SelectValue placeholder="Sélectionnez un rôle / poste" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fondateur / dirigeant">Fondateur / dirigeant</SelectItem>
              <SelectItem value="Responsable communication / marketing">Responsable communication / marketing</SelectItem>
              <SelectItem value="Chef(fe) de projet">Chef(fe) de projet</SelectItem>
              <SelectItem value="Client particulier">Client particulier</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-city">Ville</Label>
          <Input
            id="review-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex : Brest, Finistère…"
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
          <Label className="text-sm font-medium">Photo / avatar</Label>
          <div
            role="button"
            tabIndex={0}
            className="mt-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 px-4 py-6 text-center cursor-pointer hover:border-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleAvatarFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarFile(file);
              }}
            />
            <p className="text-sm font-medium">Glissez-déposez une image ou cliquez pour choisir un fichier</p>
            <p className="text-xs text-muted-foreground mt-1">
              L’image servira uniquement d’avatar pour votre avis.
            </p>
            {avatarDataUrl && (
              <img
                src={avatarDataUrl}
                alt="Aperçu de l’avatar"
                className="mt-3 h-16 w-16 rounded-full object-cover"
              />
            )}
          </div>
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


