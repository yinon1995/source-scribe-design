// Admin list page
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { getAllArticlesForAdmin, type AdminArticleListItem } from "@/lib/articlesIndex";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminBackButton } from "@/components/AdminBackButton";
import { toast } from "sonner";
import { getAdminToken } from "@/lib/adminSession";
import { Star, FileEdit, UploadCloud, Trash2, Loader2 } from "lucide-react";
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

type DraftItem = {
	title: string;
	slug: string;
	date: string;
	status: "draft";
};

const AdminArticles = () => {
	const navigate = useNavigate();

	const [rows, setRows] = useState<AdminArticleListItem[]>(() => getAllArticlesForAdmin());
	const [drafts, setDrafts] = useState<DraftItem[]>([]);
	const [loadingDrafts, setLoadingDrafts] = useState(true);
	const [publishingDraft, setPublishingDraft] = useState<string | null>(null);

	useEffect(() => {
		const fetchDrafts = async () => {
			const token = getAdminToken();
			if (!token) return;

			try {
				const res = await fetch("/api/drafts", {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (res.ok) {
					const data = await res.json();
					if (data.success && Array.isArray(data.drafts)) {
						setDrafts(data.drafts);
					}
				}
			} catch (e) {
				console.error("Failed to fetch drafts", e);
			} finally {
				setLoadingDrafts(false);
			}
		};

		fetchDrafts();
	}, []);

	function handleEdit(slug: string) {
		navigate(`/admin/nouvel-article?slug=${encodeURIComponent(slug)}`);
	}

	function handleEditDraft(slug: string) {
		navigate(`/admin/nouvel-article?slug=${encodeURIComponent(slug)}&source=draft`);
	}

	async function handlePublishDraft(slug: string) {
		const token = getAdminToken();
		if (!token) {
			toast.error("Session expirée");
			return;
		}

		setPublishingDraft(slug);
		try {
			// 1. Fetch draft content
			const draftRes = await fetch(`/api/drafts?slug=${slug}`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!draftRes.ok) throw new Error("Impossible de charger le brouillon");
			const draftData = await draftRes.json();
			if (!draftData.success || !draftData.article) throw new Error("Données du brouillon invalides");

			const article = draftData.article;
			// Remove draft status
			delete article.status;

			// 2. Publish
			const pubRes = await fetch("/api/publish", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(article),
			});

			const pubData = await pubRes.json();
			if (!pubRes.ok || !pubData.success) {
				throw new Error(pubData.error || "Erreur lors de la publication");
			}

			// 3. Delete draft
			await fetch(`/api/drafts?slug=${slug}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` }
			});

			toast.success("Brouillon publié avec succès !");

			// Refresh lists
			setDrafts(current => current.filter(d => d.slug !== slug));
			// We can't easily refresh published rows without reload as they come from static build, 
			// but we can try to add it manually or just reload page
			window.location.reload();

		} catch (error: any) {
			console.error("Publish draft error", error);
			toast.error(error.message || "Erreur lors de la publication du brouillon");
		} finally {
			setPublishingDraft(null);
		}
	}

	async function handleDeleteDraft(slug: string) {
		const token = getAdminToken();
		if (!token) return;

		try {
			const res = await fetch(`/api/drafts?slug=${slug}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` }
			});
			if (res.ok) {
				setDrafts(current => current.filter(d => d.slug !== slug));
				toast.success("Brouillon supprimé");
			} else {
				toast.error("Erreur lors de la suppression");
			}
		} catch (e) {
			toast.error("Erreur réseau");
		}
	}

	// Ensure delete flow revokes tokenless sessions and keeps UI in sync with backend
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

			if (!res.ok || !data?.success) {
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
					<AdminBackButton />

					<h1 className="text-2xl md:text-3xl font-display font-bold">
						Modifier les articles existants
					</h1>

					<p className="text-muted-foreground">
						Choisissez un article à mettre à jour, republier ou supprimer.
					</p>

					{/* Drafts Section */}
					<div className="space-y-4">
						<h2 className="text-xl font-bold flex items-center gap-2">
							<FileEdit className="h-5 w-5" />
							Brouillons
						</h2>

						{loadingDrafts ? (
							<div className="text-sm text-muted-foreground">Chargement des brouillons...</div>
						) : drafts.length === 0 ? (
							<div className="text-sm text-muted-foreground italic">Aucun brouillon enregistré.</div>
						) : (
							<div className="overflow-x-auto rounded-xl border bg-card mb-8">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Titre</TableHead>
											<TableHead>Slug</TableHead>
											<TableHead>Dernière modification</TableHead>
											<TableHead>Statut</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{drafts.map((draft) => (
											<TableRow key={draft.slug} className="hover:bg-muted/50">
												<TableCell className="font-medium">{draft.title}</TableCell>
												<TableCell className="text-muted-foreground text-xs">{draft.slug}</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{draft.date ? new Date(draft.date).toLocaleDateString("fr-FR") : "-"}
												</TableCell>
												<TableCell>
													<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
														Brouillon
													</span>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-2">
														<Button size="sm" variant="outline" onClick={() => handleEditDraft(draft.slug)}>
															Modifier
														</Button>
														<Button
															size="sm"
															variant="default"
															onClick={() => handlePublishDraft(draft.slug)}
															disabled={publishingDraft === draft.slug}
														>
															{publishingDraft === draft.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-1" />}
															Publier
														</Button>
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button size="sm" variant="destructive" className="px-2">
																	<Trash2 className="h-4 w-4" />
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
																	<AlertDialogDescription>
																		Cette action est irréversible.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>Annuler</AlertDialogCancel>
																	<AlertDialogAction onClick={() => handleDeleteDraft(draft.slug)}>
																		Supprimer
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>

					<div className="h-px bg-border my-8" />

					{/* Published Articles Section */}
					<div className="space-y-4">
						<h2 className="text-xl font-bold flex items-center gap-2">
							<UploadCloud className="h-5 w-5" />
							Articles Publiés
						</h2>

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
													<div className="flex items-center gap-2">
														{row.featured && (
															<span className="inline-flex items-center text-amber-500" title="Mis en avant sur la page d’accueil">
																<Star className="h-4 w-4 fill-current" aria-hidden />
																<span className="sr-only">Article mis en avant sur la page d’accueil</span>
															</span>
														)}
														<span>{row.title || "(Sans titre)"}</span>
													</div>
												</TableCell>
												<TableCell className="text-muted-foreground">
													{row.slug}
												</TableCell>
												<TableCell>
													{new Date(row.date as any).toLocaleDateString("fr-FR")}
												</TableCell>
												<TableCell>
													<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
														Publié
													</span>
												</TableCell>
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
				</div>
			</main>
			<Footer />
		</div>
	);
};

export default AdminArticles;
