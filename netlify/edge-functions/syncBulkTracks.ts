import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/edge-functions";

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

interface BulkTrackRequestBody {
    addedTrackItems: CollectionItem[];
}

export default async (req: Request, context: Context): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    if (!req.body) {
        return new Response('Request body is missing', { status: 400 });
    }

    const userId = context.params.userId;

    if (!userId) {
        return new Response('User ID is missing from the path', { status: 400 });
    }

    try {
        const { addedTrackItems } = await req.json() as BulkTrackRequestBody;

        if (!Array.isArray(addedTrackItems)) {
            return new Response('Invalid payload: addedTrackItems must be an array', { status: 400 });
        }

        let trackStore;
        try {
            trackStore = getStore('tracks');
        } catch (storeError) {
            console.error("Failed to initialize tracks store:", storeError);
            return new Response(JSON.stringify({
                error: 'Netlify Blobs configuration error',
                details: 'Could not initialize "tracks" store. Ensure Netlify Blobs is enabled for this site.',
                rawError: String(storeError)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch existing tracks for the user
        let userTracks: Collection = await trackStore.get(userId, { type: 'json' }) || {};

        // Update or add tracks
        for (const track of addedTrackItems) {
            if (track && track.id) {
                userTracks[track.id] = track;
            }
        }

        // Save the updated track map
        await trackStore.set(userId, JSON.stringify(userTracks));

        return new Response(JSON.stringify({
            message: `Successfully synced ${addedTrackItems.length} tracks for user ${userId}`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(`Error syncing bulk tracks for user ${userId}:`, error);
        return new Response(JSON.stringify({
            error: 'Failed to sync bulk tracks',
            details: error instanceof Error ? error.message : 'An unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config: Config = {
    path: "/.netlify/functions/syncBulkTracks/:userId",
};
