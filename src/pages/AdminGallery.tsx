import { useState, useEffect, useRef, useMemo } from "react";
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
import { uploadImageToBlob } from "../magazine_editor/lib/imageUtils";
import defaultHeroImage from "@/assets/hero-portrait.jpeg";
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
import { Input } from "@/components/ui/input";

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
    const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

    // Helper to manage local previews
    const addLocalPreview = (id: string, file: File) => {
        const url = URL.createObjectURL(file);
        setLocalPreviews(prev => ({ ...prev, [id]: url }));
        return url;
    };

    const removeLocalPreview = (id: string) => {
        setLocalPreviews(prev => {
            const next = { ...prev };
            if (next[id]) {
                URL.revokeObjectURL(next[id]);
                delete next[id];
            }
            return next;
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(localPreviews).forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Load gallery
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/homeGallery");

                if (!res.ok) {
                    console.error(`API GET failed: ${res.status}`);
                    const fallback = { ...galleryConfigLocal } as GalleryConfig;
                    if (!fallback.homeHeroImages || fallback.homeHeroImages.length === 0) {
                        fallback.homeHeroImages = [defaultHeroImage];
                    }
                    setConfig(fallback);
                    setIsLocalMode(true);
                    setLoading(false);
                    return;
                }

                const json = await res.json();

                if (json.success && json.data) {
                    const loadedConfig = json.data;
                    if (!loadedConfig.homeHeroImages || loadedConfig.homeHeroImages.length === 0) {
                        loadedConfig.homeHeroImages = [defaultHeroImage];
                    }
                    setConfig(loadedConfig);
                    setIsLocalMode(json.source === "fs" || json.source === "empty");
                } else {
                    const fallback = { ...galleryConfigLocal } as GalleryConfig;
                    if (!fallback.homeHeroImages || fallback.homeHeroImages.length === 0) {
                        fallback.homeHeroImages = [defaultHeroImage];
                    }
                    setConfig(fallback);
                }
            } catch (error) {
                console.error("Failed to load gallery:", error);
                const fallback = { ...galleryConfigLocal } as GalleryConfig;
                if (!fallback.homeHeroImages || fallback.homeHeroImages.length === 0) {
                    fallback.homeHeroImages = [defaultHeroImage];
                }
                setConfig(fallback);
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

        const MAX_ITEMS = 15;
        const remaining = MAX_ITEMS - config.items.length;
        if (remaining <= 0) {
            toast.error("Maximum 15 images atteint");
            return;
        }

        const filesToAdd = Array.from(files).slice(0, remaining);

        setUploading(true);
        try {
            const newItems: GalleryItem[] = [];

            for (const file of filesToAdd) {
                if (!file.type.startsWith("image/")) continue;

                try {
                    const token = getAdminToken();
                    const blobUrl = await uploadImageToBlob(file, { folder: 'gallery', token: token || undefined });
                    newItems.push({
                        id: `img-${Date.now()}-${Math.random()}`,
                        src: blobUrl,
                        alt: file.name.replace(/\.[^/.]+$/, ""),
                        description: "",
                    });
                } catch (error) {
                    console.error("Failed to upload file:", error);
                    toast.error(`Erreur upload: ${file.name}`);
                }
            }

            if (newItems.length > 0) {
                setConfig({ ...config, items: [...config.items, ...newItems] });
                toast.success(`${newItems.length} image(s) ajoutée(s)`);
            }
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
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

    async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const tempId = `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const placeholder = `pending:${tempId}`;

        addLocalPreview(tempId, file);

        // Add placeholder
        setConfig((prev) => ({
            ...prev,
            homeHeroImages: [...(prev.homeHeroImages || []), placeholder],
        }));

        setUploading(true);
        try {
            setUploading(true);
            const token = getAdminToken();
            const path = await uploadImageToBlob(files[0], { folder: 'gallery/hero', token: token || undefined });
            setConfig((prev) => ({
                ...prev,
                homeHeroImages: (prev.homeHeroImages || []).map(src => src === placeholder ? path : src),
            }));
            toast.success("Image d'ouverture ajoutée !");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Impossible d'uploader l'image.");
            // Remove placeholder
            setConfig((prev) => ({
                ...prev,
                homeHeroImages: (prev.homeHeroImages || []).filter(src => src !== placeholder),
            }));
        } finally {
            removeLocalPreview(tempId);
            setUploading(false);
            e.target.value = "";
        }
    }

    async function handleReplaceHero(index: number, e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const tempId = `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const placeholder = `pending:${tempId}`;

        addLocalPreview(tempId, file);

        setUploading(true);

        // Optimistic update
        setConfig((prev) => {
            const next = [...(prev.homeHeroImages || [])];
            next[index] = placeholder;
            return { ...prev, homeHeroImages: next };
        });

        try {
            setUploading(true);
            const token = getAdminToken();
            const path = await uploadImageToBlob(files[0], { folder: 'gallery/hero', token: token || undefined });
            setConfig((prev) => {
                const next = [...(prev.homeHeroImages || [])];
                // Only replace if it's still the placeholder
                if (next[index] === placeholder) {
                    next[index] = path;
                } else {
                    const foundIdx = next.indexOf(placeholder);
                    if (foundIdx !== -1) next[foundIdx] = path;
                }
                return { ...prev, homeHeroImages: next };
            });
            toast.success("Image remplacée !");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Impossible de remplacer l'image.");
            // Revert
            setConfig((prev) => ({
                ...prev,
                homeHeroImages: (prev.homeHeroImages || []).filter(src => src !== placeholder),
            }));
        } finally {
            removeLocalPreview(tempId);
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
        // Guard: Check for ephemeral URLs
        const hasEphemeral = config.items.some(i => i.src.startsWith('data:') || i.src.startsWith('blob:')) ||
            (config.homeHeroImages || []).some(src => src.startsWith('data:') || src.startsWith('blob:'));

        if (hasEphemeral) {
            toast.error("Sauvegarde bloquée : images temporaires détectées. Veuillez ré-uploader.");
            setShowConfirmModal(false);
            return;
        }

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
                                    {(config.homeHeroImages || []).map((src, index) => {
                                        const isPending = src.startsWith('pending:');
                                        const tempId = isPending ? src.split(':')[1] : null;
                                        const displaySrc = (tempId && localPreviews[tempId]) ? localPreviews[tempId] : src;

                                        return (
                                            <div key={index} className="relative group aspect-[4/5] bg-muted rounded-lg overflow-hidden border border-border">
                                                <img src={displaySrc} alt="" className={`w-full h-full object-cover ${isPending ? 'opacity-50' : ''}`} />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    {!isPending && (
                                                        <>
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
                                                        </>
                                                    )}
                                                    {isPending && <span className="text-white text-xs font-medium">Upload...</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                                        src={localPreviews[item.id] || item.src}
                                                        alt={item.alt || "Preview"}
                                                        className={`w-full h-24 object-cover rounded ${!item.src && localPreviews[item.id] ? 'opacity-70' : ''}`}
                                                    />
                                                    <div className="grid gap-2">
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={item.alt}
                                                                onChange={(e) => updateItem(index, "alt", e.target.value)}
                                                                placeholder="Texte alternatif (SEO)"
                                                                className="flex-1"
                                                            />
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => moveItem(index, "up")}
                                                                    disabled={index === 0}
                                                                    title="Monter"
                                                                >
                                                                    <ArrowUp className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => moveItem(index, "down")}
                                                                    disabled={index === config.items.length - 1}
                                                                    title="Descendre"
                                                                >
                                                                    <ArrowDown className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    onClick={() => deleteItem(index)}
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <Textarea
                                                            value={item.description}
                                                            onChange={(e) => updateItem(index, "description", e.target.value)}
                                                            placeholder="Description (optionnel)"
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Right: Preview */}
                        <div className="space-y-6">
                            <Card className="p-4 bg-muted/30 sticky top-6">
                                <h2 className="font-medium mb-4 text-muted-foreground uppercase text-xs tracking-wider">Aperçu Live</h2>
                                <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
                                    <div className="pointer-events-none select-none origin-top scale-[0.85] -mb-[15%]">
                                        <HomePhotoStripGallery
                                            itemsOverride={config.items}
                                        />
                                    </div>
                                </div>
                            </Card>

                            <div className="flex justify-end gap-4 sticky bottom-6 bg-background/80 backdrop-blur p-4 border-t border-border rounded-lg shadow-lg">
                                <Button variant="outline" onClick={() => navigate("/admin")}>
                                    Annuler
                                </Button>
                                <Button onClick={handleSaveClick} disabled={saving}>
                                    {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enregistrer les modifications ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action mettra à jour la galerie sur le site public.
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
