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
        return Response.json(
            { error: (error as Error).message },
            { status: 400 }
        );
    }
}
