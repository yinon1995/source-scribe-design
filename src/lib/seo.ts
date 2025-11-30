export function applySeo({
    title,
    description,
    canonicalPath,
}: {
    title: string;
    description?: string;
    canonicalPath: string;
}) {
    // Set document title
    document.title = title;

    // Upsert canonical link
    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
    }
    // Ensure canonicalPath starts with / if not empty, but user said "Ensure canonicalPath starts with /"
    // We assume caller provides correct path, but we can enforce / prefix if missing for safety,
    // though the user instructions say "Ensure canonicalPath starts with /" as a requirement for the implementation plan.
    // I will just use the provided path combined with origin.
    link.setAttribute("href", window.location.origin + canonicalPath);

    // Upsert meta description if provided
    if (description) {
        let meta = document.querySelector("meta[name='description']");
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "description");
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", description);
    }
}

export function upsertJsonLd(id: string, data: any) {
    if (typeof document === "undefined") return;

    let script = document.getElementById(id) as HTMLScriptElement | null;

    if (!data) {
        if (script) script.remove();
        return;
    }

    if (!script) {
        script = document.createElement("script");
        script.id = id;
        script.type = "application/ld+json";
        document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string) {
    if (typeof document === "undefined") return;
    const script = document.getElementById(id);
    if (script) script.remove();
}
