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
            .catch(reject);
    });
};

