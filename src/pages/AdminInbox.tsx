import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { fetchLeads, deleteLead } from "@/lib/inboxClient";
import { getAdminToken } from "@/lib/adminSession";
import { ALL_LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, type Lead, type LeadCategory } from "@/lib/inboxTypes";

type LeadFilter = LeadCategory | "all";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (filter === "all") return leads;
    return leads.filter((lead) => lead.category === filter);
  }, [leads, filter]);

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
      <Card>
        <CardHeader>
          <CardTitle>Demandes reçues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                      <TableCell className="align-top text-sm text-muted-foreground">
                        <p className="whitespace-pre-wrap break-words">
                          {lead.message || "—"}
                        </p>
                        {lead.meta && (
                          <p className="mt-2 text-xs text-muted-foreground break-words">
                            {JSON.stringify(lead.meta)}
                          </p>
                        )}
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

      <div className="text-sm text-muted-foreground">
        Les demandes sont stockées dans <code>content/inbox/leads.json</code>. Supprimer une ligne la retire
        également de cette archive.
      </div>
    </div>
  );
};

export default AdminInbox;


