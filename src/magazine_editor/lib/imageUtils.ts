
import { upload } from '@vercel/blob/client';

export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

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

/**
 * Compute SHA-256 hash of a file for deduplication and stable filenames.
 */
export const fileToSha256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Upload an image to the server via /api/upload-image.
 * Returns the public URL path.
 */
export const uploadImage = async (file: File, slug: string, token?: string): Promise<string> => {
    // 1. Generate hash-based filename
    const hash = await fileToSha256(file);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `img_${hash.slice(0, 12)}.${ext}`;

    // 2. Try Vercel Blob Upload (Client-side direct upload)
    try {
        const newBlob = await upload(`uploads/${slug}/${fileName}`, file, {
            access: 'public',
            handleUploadUrl: '/api/blob-upload',
            clientPayload: JSON.stringify({ token }),
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return newBlob.url;
    } catch (blobError: any) {
        console.warn("Blob upload failed, falling back to GitHub.", blobError);
        // If it's a 413 from Blob (unlikely for client upload) or auth error, we might want to stop.
        // But for now, fallback to GitHub is safer for backward compat if Blob isn't set up.
    }

    // 3. Fallback: GitHub Upload via /api/upload-image
    // Get raw base64 (no compression)
    const dataUrl = await fileToDataUrl(file);
    const content = dataUrl.split(',')[1];

    const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            slug,
            fileName,
            content,
            encoding: 'base64'
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        // Provide actionable error messages
        if (res.status === 413) {
            throw new Error(`Upload failed (413): Image too large for GitHub fallback. Please configure Vercel Blob.`);
        }
        throw new Error(err.error || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok || !data.path) {
        throw new Error(data.error || 'Invalid response from upload API');
    }

    return data.path;
};
