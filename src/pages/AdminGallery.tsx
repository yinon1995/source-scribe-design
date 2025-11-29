import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Upload, AlertCircle, RefreshCw } from "lucide-react";
import HomePhotoStripGallery from "@/components/HomePhotoStripGallery";
import Footer from "@/components/Footer";
import { getAdminToken } from "@/lib/adminSession";
import { fileToCompressedDataURL } from "../magazine_editor/lib/imageUtils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Fallback import if API fails completely
import galleryConfigLocal from "../../content/home/gallery.json";

type GalleryItem = {
    id: string;
    src: string;
    alt: string;
    description: string;
};

type GalleryConfig = {
    title: string;
    items: GalleryItem[];
    homeHeroImages?: string[];
};

const AdminGallery = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [config, setConfig] = useState<GalleryConfig>({ title: "Galerie", items: [] });
    const [isLocalMode, setIsLocalMode] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Load gallery
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/homeGallery");

                if (!res.ok) {
                    console.error(`API GET failed: ${res.status}`);
                    setConfig(galleryConfigLocal as GalleryConfig);
                    setIsLocalMode(true);
                    setLoading(false);
                    return;
                }

                const json = await res.json();

                if (json.success && json.data) {
                    setConfig(json.data);
                    setIsLocalMode(json.source === "fs" || json.source === "empty");
                } else {
                    setConfig(galleryConfigLocal as GalleryConfig);
                }
            } catch (error) {
                console.error("Failed to load gallery:", error);
                setConfig(galleryConfigLocal as GalleryConfig);
                setIsLocalMode(true);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const remaining = MAX_ITEMS - config.items.length;
        if (remaining <= 0) {
            toast.error("Maximum 15 images atteint");
            return;
        }

        const filesToAdd = Array.from(files).slice(0, remaining);
        const newItems: GalleryItem[] = [];

        for (const file of filesToAdd) {
            if (!file.type.startsWith("image/")) continue;

            try {
                const dataUrl = await fileToDataUrl(file);
                newItems.push({
                    id: `img-${Date.now()}-${Math.random()}`,
                    src: dataUrl,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                    description: "",
                });
            } catch (error) {
                console.error("Failed to convert file:", error);
            }
        }

        if (newItems.length > 0) {
            setConfig({ ...config, items: [...config.items, ...newItems] });
            toast.success(`${newItems.length} image(s) ajoutée(s)`);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const updateItem = (index: number, field: keyof GalleryItem, value: string) => {
        const updated = [...config.items];
        updated[index] = { ...updated[index], [field]: value };
        setConfig({ ...config, items: updated });
    };

    const deleteItem = (index: number) => {
        setConfig({ ...config, items: config.items.filter((_, i) => i !== index) });
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === config.items.length - 1) return;

        const updated = [...config.items];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
        setConfig({ ...config, items: updated });
    };

    // --- Hero Image Logic ---

    async function uploadFile(file: File): Promise<string> {
        if (!file.type.startsWith("image/")) {
            throw new Error("Veuillez sélectionner une image.");
        }

        const token = getAdminToken();
        if (!token) {
            throw new Error("Session expirée.");
        }

        // 1. Convert to base64 for upload
        const base64 = await fileToCompressedDataURL(file);
        const content = base64.split(",")[1];

        // 2. Generate filename
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `hero-${Date.now()}.${ext}`;

        // 3. Upload via API
        const res = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                slug: "home",
                fileName,
                content,
                encoding: "base64",
            }),
        });

        if (!res.ok) {
            throw new Error("Erreur lors de l'upload.");
        }

        const data = await res.json();
        if (!data.ok || !data.path) {
            throw new Error(data.error || "Erreur lors de l'upload.");
        }

        const path = data.path;
        if (!path.startsWith("/") && !path.startsWith("http")) {
            throw new Error("Chemin d'image invalide retourné par le serveur.");
        }

        return path;
    }

    async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploading(true);
            const path = await uploadFile(files[0]);
            setConfig((prev) => ({
                ...prev,
                homeHeroImages: [...(prev.homeHeroImages || []), path],
            }));
            toast.success("Image d'ouverture ajoutée !");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Impossible d'uploader l'image.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    async function handleReplaceHero(index: number, e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploading(true);
            const path = await uploadFile(files[0]);
            setConfig((prev) => {
                const next = [...(prev.homeHeroImages || [])];
                next[index] = path;
                return { ...prev, homeHeroImages: next };
            });
            toast.success("Image remplacée !");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Impossible de remplacer l'image.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    function removeHero(index: number) {
        setConfig((prev) => ({
            ...prev,
            homeHeroImages: (prev.homeHeroImages || []).filter((_, i) => i !== index),
        }));
    }

    function moveHero(index: number, direction: "up" | "down") {
        setConfig((prev) => {
            const newImages = [...(prev.homeHeroImages || [])];
            if (direction === "up" && index > 0) {
                [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
            } else if (direction === "down" && index < newImages.length - 1) {
                [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
            }
            return { ...prev, homeHeroImages: newImages };
        });
    }

    // --- End Hero Image Logic ---

    const handleSaveClick = () => {
        setShowConfirmModal(true);
    };

    const confirmSave = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        try {
            const token = getAdminToken();
            if (!token) {
                toast.error("Session expirée, veuillez vous reconnecter");
                navigate("/admin");
                return;
            }

            const res = await fetch("/api/homeGallery", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(config),
            });

            if (!res.ok) {
                let errorDetails = "";
                try {
                    const errorJson = await res.json();
                    errorDetails = errorJson.error || JSON.stringify(errorJson);
                } catch {
                    errorDetails = await res.text();
                }

                console.error("homeGallery PUT failed", {
                    status: res.status,
                    body: errorDetails,
                });

                if (res.status === 404) {
                    toast.error("API locale indisponible — lancez: npm run dev:api");
                } else {
                    toast.error(`Erreur de sauvegarde: ${errorDetails}`);
                }
                return;
            }

            const json = await res.json();
            if (json.success) {
                toast.success("Galerie enregistrée avec succès");
                // Update local state with server response to be sure
                if (json.data) {
                    setConfig(json.data);
                }
            } else {
                toast.error(json.error || "Erreur de sauvegarde");
            }
        } catch (error) {
            console.error("Save failed:", error);
            toast.error("Erreur de sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const MAX_ITEMS = 15;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <main className="flex-1 py-10">
                <div className="container mx-auto px-4 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-display font-bold">Galerie Accueil</h1>
                        <Button variant="outline" onClick={() => navigate("/admin")}>
                            Retour
                        </Button>
                    </div>

                    {/* Local mode warning */}
                    {isLocalMode && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Mode local ou fallback — vérifiez les variables d'environnement si vous êtes en production.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Left: Editor */}
                        <div className="space-y-8">
                            {/* Hero Images Section */}
                            <Card className="p-4">
                                <h2 className="font-medium mb-4">Image d'ouverture (Accueil)</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                    {(config.homeHeroImages || []).map((src, index) => (
                                        <div key={index} className="relative group aspect-[4/5] bg-muted rounded-lg overflow-hidden border border-border">
                                            <img src={src} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <label className="cursor-pointer">
                                                    <div className="h-8 w-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center rounded-md transition-colors" title="Remplacer">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleReplaceHero(index, e)}
                                                    />
                                                </label>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => moveHero(index, "up")}
                                                    disabled={index === 0}
                                                    title="Monter"
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => moveHero(index, "down")}
                                                    disabled={index === (config.homeHeroImages?.length || 0) - 1}
                                                    title="Descendre"
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => removeHero(index)}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <label className="flex flex-col items-center justify-center aspect-[4/5] border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                        <span className="text-sm text-muted-foreground font-medium">Ajouter</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleHeroUpload}
                                        />
                                    </label>
                                </div>
                            </Card>

                            {/* Gallery Section */}
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-medium">Galerie ({config.items.length}/{MAX_ITEMS})</span>
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={config.items.length >= MAX_ITEMS}
                                            size="sm"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Ajouter
                                        </Button>
                                    </div>
                                </div>

                                {config.items.length >= MAX_ITEMS && (
                                    <p className="text-sm text-amber-600 mb-3">Maximum atteint (15 images)</p>
                                )}

                                <div className="space-y-3">
                                    {config.items.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-6 text-sm">
                                            Aucune image
                                        </p>
                                    ) : (
                                        config.items.map((item, index) => (
                                            <Card key={item.id} className="p-3">
                                                <div className="space-y-2">
                                                    {/* Thumbnail */}
                                                    <img
                                                        src={item.src}
                                                        alt={item.alt || "Preview"}
                                                        className="w-full h-24 object-cover rounded"
                                                    />

                                                    {/* Description */}
                                                    <Textarea
                                                        value={item.description}
                                                        onChange={(e) => updateItem(index, "description", e.target.value)}
                                                        placeholder="Description (lightbox)"
                                                        rows={2}
                                                        className="text-sm"
                                                    />

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => moveItem(index, "up")}
                                                            disabled={index === 0}
                                                        >
                                                            <ArrowUp className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => moveItem(index, "down")}
                                                            disabled={index === config.items.length - 1}
                                                        >
                                                            <ArrowDown className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => deleteItem(index)}
                                                            className="ml-auto"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </Card>

                            {/* Save Button */}
                            <Button
                                onClick={handleSaveClick}
                                disabled={saving || uploading}
                                className="w-full"
                                size="lg"
                            >
                                {uploading ? "Upload en cours..." : saving ? "Sauvegarde..." : "Enregistrer"}
                            </Button>
                        </div>

                        {/* Right: Preview */}
                        <div>
                            <Card className="p-4 sticky top-24">
                                <h2 className="font-medium mb-3">Aperçu Galerie</h2>
                                <div className="border border-border rounded overflow-hidden">
                                    <HomePhotoStripGallery itemsOverride={config.items} />
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enregistrer la galerie ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action mettra à jour la galerie et l'image d'ouverture de la page d’accueil.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminGallery;
