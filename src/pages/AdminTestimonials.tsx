import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeadMetaGrid from "@/components/admin/LeadMetaGrid";
import { toast } from "@/hooks/use-toast";
import { fetchLeads, deleteLead } from "@/lib/inboxClient";
import { getAdminToken } from "@/lib/adminSession";
import { formatLeadMessagePreview } from "@/lib/leadFormatting";
import type { Lead } from "@/lib/inboxTypes";
import { clampRating, formatTestimonialLocation, type Testimonial, type TestimonialCreateInput } from "@/lib/testimonials";
import { createTestimonial, deleteTestimonial, fetchTestimonials } from "@/lib/testimonialsClient";
import { Instagram, Star } from "lucide-react";

const formatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const AdminTestimonials = () => {
  const adminToken = getAdminToken();
  const [pendingLeads, setPendingLeads] = useState<Lead[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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
        const [leadsRes, testimonialsRes] = await Promise.allSettled([
          fetchLeads(adminToken),
          fetchTestimonials(),
        ]);
        if (!mounted) return;

        if (leadsRes.status === "fulfilled" && leadsRes.value.success) {
          const items = leadsRes.value.leads ?? [];
          setPendingLeads(items.filter((lead) => lead.category === "testimonial"));
          setError(null);
        } else {
          setPendingLeads([]);
          setError(leadsRes.status === "fulfilled" ? (leadsRes.value.error || "Impossible de charger les demandes.") : leadsRes.reason?.message);
        }

        if (testimonialsRes.status === "fulfilled") {
          setTestimonials(testimonialsRes.value);
        } else {
          toast({
            title: "Impossible de charger les témoignages publiés",
            description: testimonialsRes.reason?.message || "Veuillez réessayer.",
          });
        }
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

  async function handleApprove(lead: Lead) {
    if (!adminToken) {
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter." });
      return;
    }
    const meta = lead.meta || {};
    const payload: TestimonialCreateInput = {
      name: lead.name?.trim() || "Anonyme",
      company: firstString(meta, ["company", "organisation", "organization"]),
      role: firstString(meta, ["role", "fonction", "fonction_entreprise"]),
      city: firstString(meta, ["city", "ville"]),
      rating: clampRating(meta.rating, 5),
      body: (lead.message || "").trim(),
      avatarUrl: firstString(meta, ["avatarUrl", "logoUrl"]),
      instagramUrl: firstString(meta, ["instagramUrl"]),
      sourceLeadId: lead.id,
    };
    if (!payload.body) {
      toast({ title: "Message manquant", description: "Impossible de publier un témoignage sans contenu." });
      return;
    }
    const result = await createTestimonial(payload, adminToken);
    if (!result.success || !result.testimonial) {
      toast({ title: "Publication impossible", description: result.error || "Veuillez réessayer." });
      return;
    }
    const deleteResult = await deleteLead(lead.id, adminToken);
    if (!deleteResult.success) {
      toast({
        title: "Témoignage publié mais suppression de la demande échouée",
        description: deleteResult.error,
      });
    }
    setPendingLeads((prev) => prev.filter((item) => item.id !== lead.id));
    setTestimonials((prev) => [result.testimonial!, ...prev]);
    toast({ title: "Témoignage publié" });
  }

  async function handleReject(id: string) {
    if (!adminToken) {
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter." });
      return;
    }
    const result = await deleteLead(id, adminToken);
    if (!result.success) {
      toast({ title: "Impossible de supprimer", description: result.error });
      return;
    }
    setPendingLeads((prev) => prev.filter((lead) => lead.id !== id));
    toast({ title: "Demande supprimée" });
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

  const pendingCount = pendingLeads.length;
  const publishedCount = testimonials.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/admin">
          <Button variant="outline" size="sm">
            ← Retour à l’espace rédaction
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Avis en attente ({pendingCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          {loading && (
            <p className="text-sm text-muted-foreground">Chargement en cours…</p>
          )}
          {!loading && pendingLeads.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun témoignage en attente.</p>
          )}
          {!loading && pendingLeads.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap align-top text-sm">
                        {formatter.format(new Date(lead.createdAt))}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="font-semibold text-foreground">{lead.name || "—"}</div>
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="text-xs text-primary underline">{lead.email}</a>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        {renderRating(firstNumber(lead.meta?.rating))}
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {formatLeadMessagePreview(lead)}
                      </TableCell>
                      <TableCell className="align-top text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedLead(lead)}>
                          Voir
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(lead)}>
                          Publier
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleReject(lead.id)}>
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
          {loading && testimonials.length === 0 && (
            <p className="text-sm text-muted-foreground">Chargement des témoignages…</p>
          )}
          {!loading && testimonials.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun témoignage publié pour l’instant.</p>
          )}
          {testimonials.length > 0 && (
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
                  {testimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell className="whitespace-nowrap align-top text-sm">
                        {formatter.format(new Date(testimonial.createdAt))}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <p className="text-xs text-muted-foreground">{formatTestimonialLocation(testimonial)}</p>
                      </TableCell>
                      <TableCell className="align-top">{renderStars(testimonial.rating)}</TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        <span className="line-clamp-2">{testimonial.body}</span>
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

      <LeadDetailsDialog lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <PublishedTestimonialDialog testimonial={selectedTestimonial} onClose={() => setSelectedTestimonial(null)} />
    </div>
  );
};

export default AdminTestimonials;

function firstString(meta: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!meta) return undefined;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function firstNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

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

type LeadDetailsDialogProps = {
  lead: Lead | null;
  onClose: () => void;
};

function LeadDetailsDialog({ lead, onClose }: LeadDetailsDialogProps) {
  return (
    <Dialog open={!!lead} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-xl">
        {lead && (
          <>
            <DialogHeader>
              <DialogTitle>Témoignage en attente</DialogTitle>
              <DialogDescription>
                Reçu le {formatter.format(new Date(lead.createdAt))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium">Nom</div>
                <div>{lead.name || "—"}</div>
              </div>
              <div>
                <div className="font-medium">Email</div>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-primary underline">{lead.email}</a>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div>
                <div className="font-medium">Note</div>
                <div>{renderRating(firstNumber(lead.meta?.rating))}</div>
              </div>
              <div>
                <div className="font-medium">Message</div>
                <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {lead.message?.trim() || "—"}
                </div>
              </div>
              <LeadMetaGrid meta={lead.meta} />
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

type PublishedTestimonialDialogProps = {
  testimonial: Testimonial | null;
  onClose: () => void;
};

function PublishedTestimonialDialog({ testimonial, onClose }: PublishedTestimonialDialogProps) {
  return (
    <Dialog open={!!testimonial} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-xl">
        {testimonial && (
          <>
            <DialogHeader>
              <DialogTitle>Témoignage publié</DialogTitle>
              <DialogDescription>
                Publié le {formatter.format(new Date(testimonial.createdAt))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium">Nom</div>
                <div>{testimonial.name}</div>
              </div>
              <div className="flex items-center gap-2">
                {renderStars(testimonial.rating)}
                <span className="text-muted-foreground text-xs">({testimonial.rating}/5)</span>
              </div>
              {formatTestimonialLocation(testimonial) && (
                <div>
                  <div className="font-medium">Informations</div>
                  <div className="text-muted-foreground">{formatTestimonialLocation(testimonial)}</div>
                </div>
              )}
              <div>
                <div className="font-medium">Message</div>
                <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {testimonial.body}
                </div>
              </div>
              {testimonial.instagramUrl && (
                <a
                  href={testimonial.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline"
                >
                  <Instagram className="h-4 w-4" />
                  Voir sur Instagram
                </a>
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


