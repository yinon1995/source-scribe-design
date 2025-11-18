import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminBackButton } from "@/components/AdminBackButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeadMetaGrid from "@/components/admin/LeadMetaGrid";
import { toast } from "@/hooks/use-toast";
import { fetchLeads, deleteLead } from "@/lib/inboxClient";
import { getAdminToken } from "@/lib/adminSession";
import { formatLeadMessagePreview } from "@/lib/leadFormatting";
import { ALL_LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, type Lead, type LeadCategory } from "@/lib/inboxTypes";

type LeadFilter = LeadCategory | "all";
type TimeFilter = "all" | "last-30-days" | "last-90-days";

const categoryFilters: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  ...ALL_LEAD_CATEGORIES.map((category) => ({
    value: category,
    label: LEAD_CATEGORY_LABELS[category],
  })),
];

const formatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const AdminInbox = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const adminToken = getAdminToken();

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!adminToken) {
        setError("Session administrateur invalide.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await fetchLeads(adminToken);
      if (!mounted) return;
      setLoading(false);
      if (!result.success || !result.leads) {
        setError(result.error || "Impossible de charger les demandes.");
        return;
      }
      setLeads(result.leads);
      setError(null);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [adminToken]);

  const filteredLeads = useMemo(() => {
    const byCategory = filter === "all" ? leads : leads.filter((lead) => lead.category === filter);
    if (timeFilter === "all") return byCategory;
    const now = new Date();
    const days = timeFilter === "last-30-days" ? 30 : 90;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);
    return byCategory.filter((lead) => {
      if (!lead.createdAt) return true;
      const created = new Date(lead.createdAt);
      return created >= cutoff;
    });
  }, [leads, filter, timeFilter]);

  async function handleDelete(id: string) {
    if (!adminToken) {
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter." });
      return;
    }
    const confirm = window.confirm("Supprimer cette demande ?");
    if (!confirm) return;
    const result = await deleteLead(id, adminToken);
    if (result.success) {
      toast({ title: "Demande supprimée" });
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
      return;
    }
    toast({
      title: "Suppression impossible",
      description: result.error || "Une erreur est survenue.",
    });
  }

  return (
    <div className="space-y-6">
      <AdminBackButton />
      <Card>
        <CardHeader>
          <CardTitle>Demandes reçues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as LeadFilter)}>
            <TabsList className="flex flex-wrap justify-start gap-2">
              {categoryFilters.map((option) => {
                const count = option.value === "all"
                  ? leads.length
                  : leads.filter((lead) => lead.category === option.value).length;
                return (
                  <TabsTrigger key={option.value} value={option.value} className="text-sm">
                    {option.label}
                    <span className="ml-2 text-xs text-muted-foreground">({count})</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Période :</span>
              <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Toutes les périodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  <SelectItem value="last-30-days">Derniers 30 jours</SelectItem>
                  <SelectItem value="last-90-days">3 derniers mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Chargement des demandes…</p>}
          {!loading && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && filteredLeads.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
          )}

          {!loading && !error && filteredLeads.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap align-top text-sm">
                        {formatter.format(new Date(lead.createdAt))}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="secondary">{LEAD_CATEGORY_LABELS[lead.category]}</Badge>
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {lead.source}
                      </TableCell>
                      <TableCell className="align-top text-sm space-y-1">
                        {lead.name && <div className="font-medium text-foreground">{lead.name}</div>}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="text-primary underline break-all">
                            {lead.email}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-start gap-3">
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {formatLeadMessagePreview(lead)}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLead(lead)}>
                            Voir
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)}>
                          Supprimer
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

      <div className="text-sm text-muted-foreground">
        Les demandes sont stockées dans <code>content/inbox/leads.json</code>. Supprimer une ligne la retire
        également de cette archive.
      </div>
    </div>
  );
};

export default AdminInbox;

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
              <DialogTitle>Détails de la demande</DialogTitle>
              <DialogDescription>
                {LEAD_CATEGORY_LABELS[lead.category]} • {formatter.format(new Date(lead.createdAt))}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <DetailRow label="Nom complet" value={lead.name || "—"} />
              <DetailRow
                label="Email"
                value={
                  lead.email
                    ? <a href={`mailto:${lead.email}`} className="text-primary underline">{lead.email}</a>
                    : "—"
                }
              />
              <DetailRow label="Source" value={<span className="text-muted-foreground">{lead.source}</span>} />
              <div>
                <div className="font-medium">Message</div>
                <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {lead.message?.trim() || "—"}
                </div>
              </div>
              <LeadMetaGrid meta={lead.meta} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="font-medium">{label}</div>
      <div>{value}</div>
    </div>
  );
}
