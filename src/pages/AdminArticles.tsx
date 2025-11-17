// Admin list page
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { getAllArticlesForAdmin, type AdminArticleListItem } from "@/lib/articlesIndex";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAdminToken } from "@/lib/adminSession";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminArticles = () => {
	const navigate = useNavigate();

	const [rows, setRows] = useState<AdminArticleListItem[]>(() => getAllArticlesForAdmin());

	function handleEdit(slug: string) {
		navigate(`/admin/nouvel-article?slug=${encodeURIComponent(slug)}`);
	}

	async function handleDelete(slug: string) {
		const token = getAdminToken();
		if (!token) {
			toast.error("Session administrateur expirée — veuillez vous reconnecter.");
			navigate("/admin");
			return;
		}

		try {
			const res = await fetch(`/api/publish?slug=${encodeURIComponent(slug)}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await res.json().catch(() => ({}));

			if (!res.ok || !data?.ok) {
				console.error("Delete failed", data);
				toast.error(data?.error || "Erreur lors de la suppression de l'article.");
				return;
			}

			const removedSlug = typeof data?.slug === "string" && data.slug.trim().length > 0 ? data.slug : slug;
			setRows((current) => current.filter((row) => row.slug !== removedSlug));
			toast.success("Article supprimé — la mise à jour du site public peut prendre 1 à 3 minutes.");
		} catch (err) {
			console.error(err);
			toast.error("Erreur réseau lors de la suppression.");
		}
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
								{rows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-muted-foreground py-6">
											Aucun article publié pour le moment.
										</TableCell>
									</TableRow>
								) : (
										rows.map((row) => (
										<TableRow
											key={row.slug}
											className="hover:bg-muted"
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
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															handleEdit(row.slug);
														}}
													>
														Modifier
													</Button>
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button
																size="sm"
																variant="destructive"
																onClick={(e) => {
																	e.stopPropagation();
																}}
															>
																Supprimer
															</Button>
														</AlertDialogTrigger>
														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
																<AlertDialogDescription>
																	Cette action est irréversible. L’article sera retiré de la liste et du site après la prochaine mise à jour.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel>Annuler</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDelete(row.slug)}
																>
																	Oui, supprimer
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</div>
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


