import React, { useState } from "react";

export type AutoGalleryItem = {
    id: string;
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
};

type AutoGalleryMarqueeProps = {
    items: AutoGalleryItem[];
    speedSeconds?: number;
};

const AutoGalleryMarquee = ({ items, speedSeconds = 45 }: AutoGalleryMarqueeProps) => {
    const [isPaused, setIsPaused] = useState(false);

    // Duplicate items for seamless loop
    const marqueeItems = [...items, ...items];

    return (
        <div
            className="overflow-hidden w-full"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            // Support for touch interactions to pause
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            <div
                className="gallery-marquee-track"
                data-paused={isPaused}
                style={{
                    "--duration": `${speedSeconds}s`,
                } as React.CSSProperties}
            >
                {marqueeItems.map((item, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        className={`flex-shrink-0 ${item.className || ""}`}
                        onClick={item.onClick}
                    >
                        <div
                            className="w-full h-full gallery-pulse"
                            style={{
                                animationDelay: `${index * 0.6}s`,
                            }}
                        >
                            <img
                                src={item.src}
                                alt={item.alt}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AutoGalleryMarquee;
