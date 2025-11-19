import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminBackButton } from "@/components/AdminBackButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { getAdminToken } from "@/lib/adminSession";
import { clampRating, formatTestimonialLocation, type Testimonial, type TestimonialStatus } from "@/lib/testimonials";
import { deleteTestimonial, fetchTestimonials, updateTestimonialStatus } from "@/lib/testimonialsClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const formatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const AdminTestimonials = () => {
  const adminToken = getAdminToken();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!adminToken) {
        setError("Session administrateur invalide.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchTestimonials(adminToken);
        if (!mounted) return;
        setTestimonials(data);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
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
  }, [adminToken]);

  const pendingTestimonials = useMemo(
    () => testimonials.filter((testimonial) => testimonial.status === "pending"),
    [testimonials],
  );
  const publishedTestimonials = useMemo(
    () => testimonials.filter((testimonial) => testimonial.status === "published"),
    [testimonials],
  );
  const rejectedTestimonials = useMemo(
    () => testimonials.filter((testimonial) => testimonial.status === "rejected"),
    [testimonials],
  );

  async function handleStatusChange(testimonial: Testimonial, status: TestimonialStatus) {
    if (!adminToken) {
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter." });
      return;
    }
    const result = await updateTestimonialStatus(testimonial.id, status, adminToken);
    if (!result.success || !result.testimonial) {
      toast({
        title: "Mise à jour impossible",
        description: result.error || "Veuillez réessayer.",
      });
      return;
    }
    setTestimonials((prev) =>
      prev.map((item) => (item.id === result.testimonial!.id ? result.testimonial! : item)),
    );
    toast({
      title: status === "published" ? "Témoignage publié" : status === "rejected" ? "Témoignage rejeté" : "Statut mis à jour",
    });
  }

  async function handleDeleteTestimonial(id: string) {
    if (!adminToken) {
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter." });
      return;
    }
    const confirm = window.confirm("Supprimer ce témoignage publié ?");
    if (!confirm) return;
    const result = await deleteTestimonial(id, adminToken);
    if (!result.success) {
      toast({ title: "Suppression impossible", description: result.error });
      return;
    }
    setTestimonials((prev) => prev.filter((testimonial) => testimonial.id !== id));
    toast({ title: "Témoignage supprimé" });
  }

  const pendingCount = pendingTestimonials.length;
  const publishedCount = publishedTestimonials.length;
  const rejectedCount = rejectedTestimonials.length;

  return (
    <div className="space-y-6">
      <AdminBackButton />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Avis en attente ({pendingCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Chargement en cours…</p>}
          {!loading && pendingCount === 0 && (
            <p className="text-sm text-muted-foreground">Aucun témoignage en attente.</p>
          )}
          {pendingCount > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTestimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell className="whitespace-nowrap align-top text-sm">
                        {formatter.format(new Date(testimonial.createdAt))}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="font-semibold text-foreground">{testimonial.name || "—"}</div>
                        {testimonial.email && (
                          <a href={`mailto:${testimonial.email}`} className="text-xs text-primary underline">{testimonial.email}</a>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        {renderRating(testimonial.rating)}
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2">{testimonial.message}</span>
                      </TableCell>
                      <TableCell className="align-top text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedTestimonial(testimonial)}>
                          Voir
                        </Button>
                        <Button size="sm" onClick={() => handleStatusChange(testimonial, "published")}>
                          Publier
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(testimonial, "rejected")}>
                          Rejeter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Témoignages publiés ({publishedCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && publishedCount === 0 && (
            <p className="text-sm text-muted-foreground">Chargement des témoignages…</p>
          )}
          {!loading && publishedCount === 0 && (
            <p className="text-sm text-muted-foreground">Aucun témoignage publié pour l’instant.</p>
          )}
          {publishedCount > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Témoignage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publishedTestimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell className="whitespace-nowrap align-top text-sm">
                        {formatter.format(new Date(testimonial.createdAt))}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {getAvatarSource(testimonial) && (
                              <AvatarImage src={getAvatarSource(testimonial)!} alt={testimonial.name} />
                            )}
                            <AvatarFallback>{initials(testimonial.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">{testimonial.name}</div>
                            <p className="text-xs text-muted-foreground">
                              {formatTestimonialLocation(testimonial) ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">{renderStars(testimonial.rating)}</TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2">{testimonial.message}</span>
                      </TableCell>
                      <TableCell className="align-top text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedTestimonial(testimonial)}>
                          Voir
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTestimonial(testimonial.id)}>
                          Supprimer le témoignage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {rejectedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Témoignages rejetés ({rejectedCount})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedTestimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell className="whitespace-nowrap align-top text-sm">
                        {formatter.format(new Date(testimonial.createdAt))}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        {renderRating(testimonial.rating)}
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2">{testimonial.message}</span>
                      </TableCell>
                      <TableCell className="align-top text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedTestimonial(testimonial)}>
                          Voir
                        </Button>
                        <Button size="sm" onClick={() => handleStatusChange(testimonial, "published")}>
                          Re-publier
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTestimonial(testimonial.id)}>
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <TestimonialDetailsDialog testimonial={selectedTestimonial} onClose={() => setSelectedTestimonial(null)} />
    </div>
  );
};

export default AdminTestimonials;

function renderRating(value?: number) {
  if (!value) return "—";
  return `${clampRating(value, 5)}/5`;
}

function renderStars(rating: number) {
  const safeRating = clampRating(rating, 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < safeRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

type TestimonialDetailsDialogProps = {
  testimonial: Testimonial | null;
  onClose: () => void;
};

function TestimonialDetailsDialog({ testimonial, onClose }: TestimonialDetailsDialogProps) {
  return (
    <Dialog open={!!testimonial} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-xl">
        {testimonial && (
          <>
            <DialogHeader>
              <DialogTitle>Détail du témoignage</DialogTitle>
              <DialogDescription>
                Reçu le {formatter.format(new Date(testimonial.createdAt))} — statut : {formatStatus(testimonial.status)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {getAvatarSource(testimonial) && (
                    <AvatarImage src={getAvatarSource(testimonial)!} alt={testimonial.name} />
                  )}
                  <AvatarFallback>{initials(testimonial.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Nom</div>
                  <div>{testimonial.name}</div>
                </div>
              </div>
              <div>
                <div className="font-medium">Note</div>
                <div className="flex items-center gap-2">
                  {renderStars(testimonial.rating)}
                  <span className="text-muted-foreground text-xs">({testimonial.rating}/5)</span>
                </div>
              </div>
              {(testimonial.clientType || testimonial.role || testimonial.city) && (
                <div>
                  <div className="font-medium">Profil</div>
                  <div className="text-muted-foreground">
                    {[
                      testimonial.clientType ?? testimonial.company,
                      testimonial.role,
                      testimonial.city,
                    ]
                      .filter((part) => part && part.trim().length > 0)
                      .join(" • ")}
                  </div>
                </div>
              )}
              <div>
                <div className="font-medium">Message</div>
                <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {testimonial.message}
                </div>
              </div>
              {testimonial.email && (
                <div>
                  <div className="font-medium">Email</div>
                  <a href={`mailto:${testimonial.email}`} className="text-primary underline">
                    {testimonial.email}
                  </a>
                </div>
              )}
              {testimonial.source && (
                <div>
                  <div className="font-medium">Source</div>
                  <div className="text-muted-foreground">{testimonial.source}</div>
                </div>
              )}
              {testimonial.photos && testimonial.photos.length > 0 && (
                <div>
                  <div className="font-medium">Photos partagées</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {testimonial.photos.map((src, index) => (
                      <img
                        key={`${testimonial.id}-photo-${index}`}
                        src={src}
                        alt={`Photo ${index + 1} partagée par ${testimonial.name}`}
                        className="h-24 w-full rounded-md object-cover border"
                      />
                    ))}
                  </div>
                </div>
              )}
              {testimonial.avatar && (
                <div>
                  <div className="font-medium">Avatar</div>
                  <img
                    src={testimonial.avatar}
                    alt={`Avatar de ${testimonial.name}`}
                    className="mt-2 h-20 w-20 rounded-full object-cover"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getAvatarSource(testimonial: Testimonial) {
  return testimonial.avatar ?? testimonial.avatarUrl ?? undefined;
}

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
function formatStatus(status: TestimonialStatus) {
  switch (status) {
    case "pending":
      return "En attente";
    case "published":
      return "Publié";
    case "rejected":
      return "Rejeté";
    default:
      return status;
  }
}

