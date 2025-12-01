import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/edge-functions";

// Type Definitions
type CollectionItem = {
    id: string,
    title: string,
    author: string,
    duration: string
    authorId: string,
    albumId?: string,
    plays?: number
}

type Collection = { [index: string]: CollectionItem };

export default async (req: Request): Promise<Response> => {
    // GET: Retrieve content by timestamp
    if (req.method === 'GET') {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const timestamp = pathParts[pathParts.length - 1];

        if (!timestamp) {
            return new Response('Timestamp is required', { status: 400 });
        }

        try {
            let contentStore;
            try {
                contentStore = getStore('content');
            } catch (storeError) {
                console.error("Failed to initialize content store:", storeError);
                return new Response(JSON.stringify({
                    error: 'Netlify Blobs configuration error',
                    details: 'Could not initialize "content" store.',
                    rawError: String(storeError)
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const data = await contentStore.get(timestamp, { type: 'text' });

            if (data === null) {
                return new Response(`Content not found for timestamp ${timestamp}`, { status: 404 });
            }

            return new Response(data, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error("Error retrieving content:", error);
            return new Response(JSON.stringify({
                error: 'Failed to retrieve content',
                details: error instanceof Error ? error.message : 'An unknown error occurred'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // POST: Store new content
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    if (!req.body) {
        return new Response('Request body is missing', { status: 400 });
    }

    try {
        const data = await req.json() as Collection | CollectionItem[];

        let contentStore;
        try {
            contentStore = getStore('content');
        } catch (storeError) {
            console.error("Failed to initialize content store:", storeError);
            return new Response(JSON.stringify({
                error: 'Netlify Blobs configuration error',
                details: 'Could not initialize "content" store. Ensure Netlify Blobs is enabled for this site.',
                rawError: String(storeError)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const timestamp = Date.now();
        const key = String(timestamp);

        await contentStore.set(key, JSON.stringify(data), {
            metadata: {
                lastModified: timestamp,
            },
        });

        return new Response(JSON.stringify({ timestamp }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error pushing immutable content:", error);
        return new Response(JSON.stringify({
            error: 'Failed to push immutable content',
            details: error instanceof Error ? error.message : 'An unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config: Config = {
    path: "/.netlify/functions/syncContent/:timestamp?",
};
