import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ImageLightboxProps = {
    images: Array<{ id: string; src: string; alt: string; description?: string }>;
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
};

const ImageLightbox = ({ images, currentIndex, onClose, onNavigate }: ImageLightboxProps) => {
    const current = images[currentIndex];

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
            if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
        };

        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [onClose, onNavigate, currentIndex, images.length]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center max-w-6xl w-full">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    aria-label="Fermer"
                >
                    <X size={24} />
                </button>

                {/* Navigation - Previous */}
                {currentIndex > 0 && (
                    <button
                        onClick={() => onNavigate(currentIndex - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        aria-label="Image précédente"
                    >
                        <ChevronLeft size={28} />
                    </button>
                )}

                {/* Navigation - Next */}
                {currentIndex < images.length - 1 && (
                    <button
                        onClick={() => onNavigate(currentIndex + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        aria-label="Image suivante"
                    >
                        <ChevronRight size={28} />
                    </button>
                )}

                {/* Image */}
                <img
                    src={current.src}
                    alt={current.alt}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />

                {/* Description */}
                {current.description && (
                    <p className="mt-4 text-white text-center text-lg max-w-2xl">{current.description}</p>
                )}

                {/* Counter */}
                <p className="mt-2 text-white/60 text-sm">
                    {currentIndex + 1} / {images.length}
                </p>
            </div>
        </div>
    );
};

export default ImageLightbox;
