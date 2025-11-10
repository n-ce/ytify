import { getStore } from "@netlify/blobs";
import type { Config, Handler } from "@netlify/functions";

// Type Definitions (copied from src/types.d.ts for serverless function context)
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

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: 'Request body is missing',
    };
  }

  const userId = event.path.split('/').pop(); // Extract userId from path /syncBulkTracks/{userId}

  if (!userId) {
    return {
      statusCode: 400,
      body: 'User ID is missing from the path',
    };
  }

  try {
    const { addedTrackItems } = JSON.parse(event.body) as BulkTrackRequestBody;

    if (!Array.isArray(addedTrackItems)) {
      return {
        statusCode: 400,
        body: 'Invalid payload: addedTrackItems must be an array',
      };
    }

    const trackStore = getStore('tracks');

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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Successfully synced ${addedTrackItems.length} tracks for user ${userId}` }),
    };
  } catch (error) {
    console.error(`Error syncing bulk tracks for user ${userId}:`, error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to sync bulk tracks', details: error instanceof Error ? error.message : 'An unknown error occurred' }),
    };
  }
};

export const config: Config = {
  // This function will be invoked by the client-side `pushBulkTrackChanges`
  // No specific schedule is needed.
};

export { handler };
