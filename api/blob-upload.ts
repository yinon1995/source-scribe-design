import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
<<<<<<< HEAD
import type { VercelRequest, VercelResponse } from '@vercel/node';
=======
>>>>>>> 8cded01f7c3d9db8bbf12a4c70b904e769904c7f

export const config = {
    runtime: 'nodejs',
};

<<<<<<< HEAD
export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    let body: HandleUploadBody;
    try {
        // Parse body robustly
        body = typeof request.body === 'string'
            ? JSON.parse(request.body)
            : request.body;
    } catch (e) {
        return response.status(400).json({ error: 'Invalid JSON body' });
    }
=======
export default async function handler(request: Request) {
    const body = (await request.json()) as HandleUploadBody;
>>>>>>> 8cded01f7c3d9db8bbf12a4c70b904e769904c7f

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
<<<<<<< HEAD
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // clientPayload is sent from the browser as a stringified JSON
                let payload: { token?: string } = {};
                try {
                    payload = clientPayload ? JSON.parse(clientPayload) : {};
                } catch (e) {
                    // ignore parse error, payload remains empty
                }

                const { token } = payload;
                const configuredToken = process.env.PUBLISH_TOKEN;

                // Validate token
                if (!token || (configuredToken && token !== configuredToken)) {
                    throw new Error('Unauthorized');
                }

                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
                    maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
                    tokenPayload: JSON.stringify({
                        uploadedBy: 'admin',
                    }),
                    addRandomSuffix: true,
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Blob upload completed:', blob.url);
                try {
                    // Optional: process tokenPayload if needed
                    // const { uploadedBy } = JSON.parse(tokenPayload || '{}');
                } catch (error) {
                    console.error('Error in onUploadCompleted:', error);
                    // Do not fail the request here, just log
                }
            },
        });

        return response.status(200).json(jsonResponse);
    } catch (error) {
        console.error('Blob upload error:', error);
        return response.status(400).json(
            { error: (error as Error).message }
=======
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
>>>>>>> 8cded01f7c3d9db8bbf12a4c70b904e769904c7f
        );
    }
}
