import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Upload, AlertCircle } from "lucide-react";
import HomePhotoStripGallery from "@/components/HomePhotoStripGallery";
import Footer from "@/components/Footer";
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
};

const AdminGallery = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<GalleryConfig>({ title: "Galerie", items: [] });
    const [isLocalMode, setIsLocalMode] = useState(false);

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
                    setIsLocalMode(json.source === "fs-fallback" || Boolean(json.missingEnv));
                } else if (json.items) {
                    setConfig(json);
                    setIsLocalMode(false);
                } else {
                    console.error("Unexpected API response", json);
                    setConfig(galleryConfigLocal as GalleryConfig);
                    setIsLocalMode(true);
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

    const save = async () => {
        setSaving(true);
        try {
            const token = sessionStorage.getItem("adminToken");
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

                // Show specific error
                if (res.status === 404) {
                    toast.error("API locale indisponible — lancez: npm run dev:api");
                } else {
                    toast.error(`Erreur de sauvegarde (code: ${res.status})`);
                }
                return;
            }

            const json = await res.json();
            if (json.success) {
                toast.success("Enregistré");
                // Re-fetch to stay in sync
                try {
                    const refreshRes = await fetch("/api/homeGallery");
                    if (refreshRes.ok) {
                        const refreshJson = await refreshRes.json();
                        if (refreshJson.success && refreshJson.data) {
                            setConfig(refreshJson.data);
                        }
                    }
                } catch (e) {
                    console.warn("Could not refresh after save:", e);
                }
            } else {
                console.error("Save returned success:false", json);
                toast.error(json.error || "Erreur de sauvegarde");
            }
        } catch (error) {
            console.error("Save failed:", error);
            if (error instanceof TypeError && error.message.includes("fetch")) {
                toast.error("API locale indisponible — lancez: npm run dev:api");
            } else {
                toast.error("Erreur de sauvegarde");
            }
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
                                Mode local — la sauvegarde est désactivée (env manquantes)
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Left: Editor */}
                        <div className="space-y-4">
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-medium">Images ({config.items.length}/{MAX_ITEMS})</span>
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
                                            Ajouter des images
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
                                onClick={save}
                                disabled={saving}
                                className="w-full"
                                size="lg"
                            >
                                {saving ? "Sauvegarde..." : "Enregistrer"}
                            </Button>
                        </div>

                        {/* Right: Preview */}
                        <div>
                            <Card className="p-4">
                                <h2 className="font-medium mb-3">Aperçu</h2>
                                <div className="border border-border rounded overflow-hidden">
                                    <HomePhotoStripGallery itemsOverride={config.items} />
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AdminGallery;
