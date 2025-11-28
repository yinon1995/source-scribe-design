export interface InterleavedImage {
    src: string;
    alt?: string;
    caption?: string;
    mode?: "column" | "full";
}

const INTERLEAVED_IMAGES: Record<string, InterleavedImage[]> = {
    // Example for testing - replace with real slugs/images as needed
    "hotel-oceania-lille": [
        {
            src: "/placeholder.svg",
            alt: "Vue du lobby",
            caption: "Le lobby art déco rénové",
            mode: "column",
        },
        {
            src: "/placeholder.svg",
            alt: "Chambre deluxe",
            caption: "Une chambre spacieuse et lumineuse",
            mode: "full",
        },
    ],
};

export function getInterleavedImages(slug?: string): InterleavedImage[] {
    if (!slug) return [];
    return INTERLEAVED_IMAGES[slug] || [];
}
