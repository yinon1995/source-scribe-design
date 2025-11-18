// Admin home page (hub)
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<main className="flex-1 py-10 md:py-16">
				<div className="container mx-auto px-4 space-y-8">
					<div className="flex justify-end">
						<Link to="/admin">
							<Button variant="outline" size="sm">
								← Retour à l’espace rédaction
							</Button>
						</Link>
					</div>
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
								<Button className="self-start" onClick={() => navigate("/admin/nouvel-article")}>
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
								<Button variant="outline" className="self-start" onClick={() => navigate("/admin/articles")}>
									Ouvrir la liste
								</Button>
							</CardContent>
						</Card>

						<Card className="flex flex-col justify-between">
							<CardHeader>
								<CardTitle>Voir les demandes</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<p className="text-sm text-muted-foreground">
									Consulter les newsletters, devis, services et contacts reçus.
								</p>
								<Button variant="secondary" className="self-start" onClick={() => navigate("/admin/demandes")}>
									Ouvrir l’inbox
								</Button>
							</CardContent>
						</Card>

						<Card className="flex flex-col justify-between">
							<CardHeader>
								<CardTitle>Gérer les avis</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<p className="text-sm text-muted-foreground">
									Modérer les témoignages reçus et publier ceux approuvés.
								</p>
								<Button variant="outline" className="self-start" onClick={() => navigate("/admin/temoignages")}>
									Accéder aux avis
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


