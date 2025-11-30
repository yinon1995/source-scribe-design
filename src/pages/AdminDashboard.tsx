// Admin home page (hub)
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchLeads } from "@/lib/inboxClient";
import { fetchTestimonials } from "@/lib/testimonialsClient";
import { getAdminToken } from "@/lib/adminSession";
import { useEffect, useState } from "react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ leads: 0, testimonials: 0 });
  const adminToken = getAdminToken();

  useEffect(() => {
    async function load() {
      if (!adminToken) return;

      try {
        const [leadsRes, testimonialsData] = await Promise.all([
          fetchLeads(adminToken),
          fetchTestimonials(adminToken)
        ]);

        const unhandledLeads = leadsRes.success && leadsRes.leads
          ? leadsRes.leads.filter(l => !l.handled).length
          : 0;

        const pendingTestimonials = Array.isArray(testimonialsData)
          ? testimonialsData.filter(t => t.status === "pending").length
          : 0;

        setCounts({ leads: unhandledLeads, testimonials: pendingTestimonials });
      } catch (e) {
        // Ignore errors, counts remain 0
      }
    }
    load();
  }, [adminToken]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-10 md:py-16">
        <div className="container mx-auto px-4 space-y-8">
          {/* Headline provided by AdminGuard; this section focuses on quick actions */}
          <h2 className="text-xl md:text-2xl font-display font-semibold">
            Que souhaitez-vous faire ?
          </h2>
          <p className="text-muted-foreground">
            Choisissez ce que vous voulez faire.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>Créer un nouvel article</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Rédiger et publier un nouvel article sur À la Brestoise.
                </p>
                <Button variant="default" size="default" className="self-start" onClick={() => navigate("/admin/nouvel-article")}>
                  Commencer
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>Modifier les articles existants</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Mettre à jour, republier ou supprimer un article déjà publié.
                </p>
                <Button variant="default" size="default" className="self-start" onClick={() => navigate("/admin/articles")}>
                  Ouvrir la liste
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Voir les demandes
                  {counts.leads > 0 && <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">{counts.leads}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Consulter les newsletters, devis, services et contacts reçus.
                </p>
                <Button variant="default" size="default" className="self-start" onClick={() => navigate("/admin/demandes")}>
                  Ouvrir l’inbox
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Gérer les avis
                  {counts.testimonials > 0 && <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">{counts.testimonials}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Modérer les témoignages reçus et publier ceux approuvés.
                </p>
                <Button variant="default" size="default" className="self-start" onClick={() => navigate("/admin/temoignages")}>
                  Accéder aux avis
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>Mettre à jour À propos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Éditer le texte de présentation affiché sur la page Services & Partenariats.
                </p>
                <Button variant="default" size="default" className="self-start" onClick={() => navigate("/admin/a-propos")}>
                  Ouvrir l’éditeur
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>Gérer la galerie</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Ajouter, supprimer ou remplacer les images de la galerie.
                </p>
                <Button variant="default" size="default" className="self-start" onClick={() => navigate("/admin/galerie")}>
                  Ouvrir la galerie
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;


