import { useCallback, useRef, useState, type FormEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Star, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReviewFormProps = {
  source: string;
  className?: string;
  successMessage?: string;
  submitLabel?: string;
  onSubmitted?: () => void;
};

const MAX_EVENT_PHOTOS = 5;

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
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const eventPhotosInputRef = useRef<HTMLInputElement | null>(null);

  const nameValid = Boolean(name.trim());
  const messageValid = Boolean(message.trim());

  const resetAvatarInput = useCallback(() => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }, []);

  const resetEventPhotosInput = useCallback(() => {
    if (eventPhotosInputRef.current) {
      eventPhotosInputRef.current.value = "";
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!nameValid || !messageValid) {
      toast({ title: "Merci de remplir les champs requis." });
      return;
    }
    setLoading(true);
    const payload = {
      name,
      source,
      email: email || undefined,
      clientType: clientType || undefined,
      role: role || undefined,
      city: city || undefined,
      rating,
      message,
      avatar: avatarDataUrl || undefined,
      photos: eventPhotos.length ? eventPhotos : undefined,
    };
    const submission = await submitTestimonial(payload);
    setLoading(false);
    if (!submission.ok) {
      toast({
        variant: "destructive",
        title: "Impossible d’enregistrer votre témoignage",
        description: submission.error,
      });
      return;
    }
    toast({ title: successMessage });
    setName("");
    setEmail("");
    setClientType("");
    setRole("");
    setCity("");
    setAvatarDataUrl(null);
    setAvatarSource(null);
    setEventPhotos([]);
    setMessage("");
    setRating(5);
    setSubmitted(false);
    resetAvatarInput();
    resetEventPhotosInput();
    onSubmitted?.();
  }

  const handleAvatarFile = useCallback(async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setAvatarSource(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setIsCropperOpen(true);
    } catch {
      toast({ title: "Impossible de charger l’image sélectionnée." });
    }
  }, []);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCancelCrop = useCallback(() => {
    setIsCropperOpen(false);
    setAvatarSource(null);
  }, []);

  const handleConfirmAvatar = useCallback(async () => {
    if (!avatarSource || !croppedAreaPixels) {
      handleCancelCrop();
      return;
    }
    try {
      setAvatarProcessing(true);
      const cropped = await getCroppedImage(avatarSource, croppedAreaPixels);
      setAvatarDataUrl(cropped);
    } catch {
      toast({ title: "Impossible de recadrer l’image." });
    } finally {
      setAvatarProcessing(false);
      setIsCropperOpen(false);
      setAvatarSource(null);
      resetAvatarInput();
    }
  }, [avatarSource, croppedAreaPixels, handleCancelCrop, resetAvatarInput]);

  async function handleEventPhotoFiles(fileList: FileList | File[]) {
    if (!fileList || MAX_EVENT_PHOTOS === 0) return;
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    try {
      const dataUrls = await Promise.all(files.map((file) => fileToDataUrl(file)));
      setEventPhotos((prev) => {
        const remaining = Math.max(0, MAX_EVENT_PHOTOS - prev.length);
        if (remaining === 0) return prev;
        return [...prev, ...dataUrls.slice(0, remaining)];
      });
    } catch {
      toast({ title: "Impossible de charger certaines images." });
    }
  }

  function removeEventPhoto(index: number) {
    setEventPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAvatar() {
    setAvatarDataUrl(null);
    setAvatarSource(null);
    resetAvatarInput();
  }

  return (
    <>
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
            onClick={() => avatarInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                avatarInputRef.current?.click();
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
              ref={avatarInputRef}
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
              <div className="mt-3 flex flex-col items-center gap-2">
                <img
                  src={avatarDataUrl}
                  alt="Aperçu de l’avatar"
                  className="h-16 w-16 rounded-full object-cover border"
                />
                <Button type="button" variant="ghost" size="sm" onClick={clearAvatar}>
                  Supprimer l’avatar
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-sm font-medium">Photos de l’événement (optionnel)</Label>
          <div
            role="button"
            tabIndex={0}
            className="mt-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 px-4 py-6 text-center cursor-pointer hover:border-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
            onClick={() => eventPhotosInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                eventPhotosInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) {
                handleEventPhotoFiles(e.dataTransfer.files);
              }
            }}
          >
            <input
              ref={eventPhotosInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleEventPhotoFiles(e.target.files);
              }}
            />
            <p className="text-sm font-medium">
              Ajoutez jusqu’à {MAX_EVENT_PHOTOS} photos (facultatif)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG ou PNG recommandés – elles illustreront votre avis après validation.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {eventPhotos.length}/{MAX_EVENT_PHOTOS} sélectionnées
            </p>
            {eventPhotos.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {eventPhotos.map((src, index) => (
                  <div key={`event-photo-${index}`} className="relative h-16 w-16">
                    <img
                      src={src}
                      alt={`Photo ${index + 1}`}
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => removeEventPhoto(index)}
                      className="absolute -right-1 -top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground shadow"
                      aria-label={`Retirer la photo ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
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

      <Dialog open={isCropperOpen} onOpenChange={(open) => {
        if (!open) handleCancelCrop();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recadrer votre avatar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-64 w-full overflow-hidden rounded-xl bg-muted">
              {avatarSource && (
                <Cropper
                  image={avatarSource}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Zoom</Label>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0] ?? 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelCrop}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAvatar}
              disabled={!croppedAreaPixels || avatarProcessing}
            >
              {avatarProcessing ? "Traitement..." : "Valider l’avatar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReviewForm;

type SubmitTestimonialPayload = {
  name: string;
  source: string;
  email?: string;
  clientType?: string;
  role?: string;
  city?: string;
  rating: number;
  message: string;
  avatar?: string;
  photos?: string[];
};

type SubmitTestimonialResult =
  | { ok: true }
  | { ok: false; error: string };

async function submitTestimonial(payload: SubmitTestimonialPayload): Promise<SubmitTestimonialResult> {
  try {
    const res = await fetch("/api/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      console.error("Failed to submit testimonial", { status: res.status, data });
      return { ok: false, error: data?.error ?? "Une erreur est survenue." };
    }
    return { ok: true };
  } catch (error: any) {
    console.error("Failed to submit testimonial", error);
    return { ok: false, error: "Une erreur est survenue." };
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getCroppedImage(imageSrc: string, crop: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context manquant");
  canvas.width = Math.round(crop.width);
  canvas.height = Math.round(crop.height);

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}


