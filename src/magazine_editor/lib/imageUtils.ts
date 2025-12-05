import { upload } from "@vercel/blob/client";
import { getAdminToken } from "@/lib/adminSession";

export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export async function uploadImageToBlob(
    file: File,
    options: { folder: string; token?: string }
): Promise<string> {
    const token = options.token || getAdminToken();
    if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
    }

    // Construct a path: images/{folder}/{Date.now()}-{filename}
    // Sanitize filename to be safe
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "");
    const filename = `${Date.now()}-${safeName}`;
    const pathname = `images/${options.folder}/${filename}`;

    const newBlob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        multipart: true,
        clientPayload: JSON.stringify({ token }), // Send token for auth check
    });

    return newBlob.url;
}

/**
 * Convert a File to a compressed data URL (resized + quality-reduced).
 * This prevents 413 "Payload Too Large" errors when publishing with many images.
 */
export const fileToCompressedDataURL = async (
    file: File,
    maxDim = 1600,
    quality = 0.82
): Promise<string> => {
    // Skip compression for non-raster or animated formats
    if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.type === 'image/x-icon') {
        return fileToDataUrl(file);
    }

    return new Promise((resolve, reject) => {
        // Use createImageBitmap for efficient decoding
        createImageBitmap(file)
            .then(bitmap => {
                const { width, height } = bitmap;

                // Calculate new dimensions
                let newWidth = width;
                let newHeight = height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        newWidth = maxDim;
                        newHeight = Math.round((height * maxDim) / width);
                    } else {
                        newHeight = maxDim;
                        newWidth = Math.round((width * maxDim) / height);
                    }
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    bitmap.close();
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
                bitmap.close();

                // Convert to blob with compression
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob'));
                            return;
                        }

                        // Read blob as data URL
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    },
                    // Use WebP if supported, otherwise JPEG
                    'image/webp',
                    quality
                );
            })
            .catch((err) => {
                console.warn("Compression failed, falling back to original.", err);
                fileToDataUrl(file).then(resolve).catch(reject);
            });
    });
};
