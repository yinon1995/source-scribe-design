import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(request: Request) {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
                // Auth check
                const configuredToken = process.env.PUBLISH_TOKEN;
                if (configuredToken) {
                    const payload = clientPayload ? JSON.parse(clientPayload) : {};
                    const providedToken = payload.token;

                    if (providedToken !== configuredToken) {
                        throw new Error('Unauthorized');
                    }
                }

                // Check for Blob token existence
                if (!process.env.BLOB_READ_WRITE_TOKEN) {
                    throw new Error('Blob token missing: configure BLOB_READ_WRITE_TOKEN');
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

        return Response.json(jsonResponse);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'Unauthorized') {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (msg.includes('Blob token missing')) {
            return Response.json({ error: msg }, { status: 500 });
        }
        return Response.json(
            { error: msg },
            { status: 400 }
        );
    }
}
