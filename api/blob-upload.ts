import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    runtime: 'nodejs',
};

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

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
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
        );
    }
}
