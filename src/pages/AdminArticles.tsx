import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { postsIndex } from "@/lib/content";
import { getAllArticlesForAdmin } from "@/lib/articlesIndex";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminArticles = () => {
	const navigate = useNavigate();

	const rows = useMemo(() => {
		return getAllArticlesForAdmin()
			.slice()
			.sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());
	}, []);

	function handleEdit(slug: string) {
		navigate(`/admin/nouvel-article?slug=${slug}`);
	}

	function handleRepublish(slug: string) {
		toast.info(`Fonctionnalité à venir : republier ${slug}`);
	}

	function handleDelete(slug: string) {
		if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;
		toast.info(`Fonctionnalité à venir : supprimer ${slug}`);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<main className="flex-1 py-8 md:py-12">
				<div className="container mx-auto px-4 space-y-6">
					<button
						className="text-sm text-muted-foreground hover:underline"
						onClick={() => navigate("/admin")}
					>
						← Retour au tableau de bord
					</button>

					<h1 className="text-2xl md:text-3xl font-display font-bold">
						Modifier les articles existants
					</h1>

					<p className="text-muted-foreground">
						Choisissez un article à mettre à jour, republier ou supprimer.
					</p>

					<div className="overflow-x-auto rounded-xl border bg-card">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Titre</TableHead>
									<TableHead>Slug</TableHead>
									<TableHead>Date de publication</TableHead>
									<TableHead>Statut</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{postsIndex.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-muted-foreground py-6">
											Aucun article publié pour le moment.
										</TableCell>
									</TableRow>
								) : (
										rows.map((row) => (
										<TableRow
											key={row.slug}
											className="hover:bg-muted cursor-pointer"
											onClick={() => handleEdit(row.slug)}
										>
											<TableCell className="font-medium">
													{row.title || "(Sans titre)"}
											</TableCell>
											<TableCell className="text-muted-foreground">
													{row.slug}
											</TableCell>
											<TableCell>
													{new Date(row.date as any).toLocaleDateString("fr-FR")}
											</TableCell>
											<TableCell>Publié</TableCell>
											<TableCell className="text-right space-x-2">
												<Button
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														handleEdit(row.slug);
													}}
												>
													Modifier
												</Button>
												<Button
													size="sm"
													variant="secondary"
													onClick={(e) => {
														e.stopPropagation();
														handleRepublish(row.slug);
													}}
												>
													Republier
												</Button>
												<Button
													size="sm"
													variant="destructive"
													onClick={(e) => {
														e.stopPropagation();
														handleDelete(row.slug);
													}}
												>
													Supprimer
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};

export default AdminArticles;


