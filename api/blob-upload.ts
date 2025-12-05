import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(request: Request) {
    const body = (await request.json()) as HandleUploadBody;

    try {
        // User confirmed env var is BLOB_READ_WRITE_TOKEN
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

        if (!blobToken) {
            throw new Error("Blob token missing. Configure BLOB_READ_WRITE_TOKEN in Vercel.");
        }

        const jsonResponse = await handleUpload({
            body,
            request,
            token: blobToken,
            onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
                // Auth check
                const configuredToken = process.env.PUBLISH_TOKEN;
                if (configuredToken) {
                    const authHeader = request.headers.get('authorization');
                    const provided = authHeader && authHeader.startsWith("Bearer ")
                        ? authHeader.slice(7).trim()
                        : "";

                    // Also check clientPayload if header is missing (fallback)
                    const payloadToken = clientPayload ? JSON.parse(clientPayload).token : null;

                    if (provided !== configuredToken && payloadToken !== configuredToken) {
                        throw new Error('Unauthorized');
                    }
                }

                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'],
                    tokenPayload: JSON.stringify({
                        // optional payload
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }: { blob: any; tokenPayload?: string | null }) => {
                // Optional: log upload
                console.log('blob uploaded', blob.url);
            },
        });

        return new Response(JSON.stringify(jsonResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }
}
