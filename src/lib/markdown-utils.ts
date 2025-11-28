
export function compileTokensToMarkdown(
    text: string,
    imageMap: Record<string, { dataUrl: string; alt: string; caption?: string; align: "left" | "right" | "full" }>
): string {
    return text.replace(/\[\[img:([a-zA-Z0-9-]+)((?:\|[a-z]+=\"[^\"]*\")*)\]\]/g, (match, id) => {
        const img = imageMap[id];
        if (!img) return match; // Keep token if image missing

        // Generate HTML that will be rendered by rehypeRaw
        const alignClass = img.align === "left" ? "img-left" : img.align === "right" ? "img-right" : "img-full";
        const escapedAlt = img.alt.replace(/"/g, '&quot;');
        const escapedCaption = img.caption ? img.caption.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

        if (img.caption) {
            // Use figure with caption
            return `\n\n<figure class="journal-figure journal-figure--${img.align}">\n<img src="${img.dataUrl}" alt="${escapedAlt}" class="${alignClass}" />\n<figcaption>${escapedCaption}</figcaption>\n</figure>\n\n`;
        } else {
            // Just the image with class
            return `\n\n<img src="${img.dataUrl}" alt="${escapedAlt}" class="${alignClass}" />\n\n`;
        }
    });
}
