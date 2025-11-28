import { useState, useEffect } from "react";
import galleryConfigImport from "../../content/home/gallery.json";
import ImageLightbox from "./ImageLightbox";
import AutoGalleryMarquee from "./AutoGalleryMarquee";

type GalleryItem = {
    id: string;
    src: string;
    alt: string;
    description?: string;
};

type HomePhotoStripGalleryProps = {
    itemsOverride?: GalleryItem[];
};

const HomePhotoStripGallery = ({ itemsOverride }: HomePhotoStripGalleryProps = {}) => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load gallery from API or fallback to static import
    useEffect(() => {
        // If admin provides override, use it immediately
        if (itemsOverride) {
            setItems(itemsOverride);
            setLoading(false);
            return;
        }

        // Fetch from API
        const loadGallery = async () => {
            try {
                // Add timestamp to prevent caching
                const res = await fetch(`/api/homeGallery?t=${Date.now()}`);
                const json = await res.json();
                if (json.success && json.data && json.data.items) {
                    setItems(json.data.items);
                } else {
                    // Fallback to static import
                    setItems(galleryConfigImport.items as GalleryItem[]);
                }
            } catch (error) {
                // Fallback to static import if API fails
                setItems(galleryConfigImport.items as GalleryItem[]);
            } finally {
                setLoading(false);
            }
        };

        loadGallery();
    }, [itemsOverride]);

    // If loading or no items, don't render anything
    if (loading || !items || items.length === 0) {
        return null;
    }

    const isSmallGallery = items.length <= 5;

    return (
        <section className="py-16 bg-gradient-to-b from-background to-muted/20">
            <div className="container mx-auto px-4">
                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                    {galleryConfigImport.title}
                </h2>

                {/* Photo Strip */}
                <div className="w-full">
                    <AutoGalleryMarquee
                        items={items.map((item, index) => {
                            // Determine tile size using a pattern
                            const isLarge = index % 3 === 0;
                            const width = isSmallGallery
                                ? isLarge
                                    ? "w-80"
                                    : "w-64"
                                : isLarge
                                    ? "w-96"
                                    : "w-72";
                            const height = isLarge ? "h-80" : "h-64";

                            return {
                                id: item.id,
                                src: item.src,
                                alt: item.alt,
                                className: `${width} ${height} mr-4 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer`,
                                onClick: () => setLightboxIndex(index),
                            };
                        })}
                        speedSeconds={45}
                    />
                </div>


            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <ImageLightbox
                    images={items}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onNavigate={setLightboxIndex}
                />
            )}
        </section>
    );
};

export default HomePhotoStripGallery;
