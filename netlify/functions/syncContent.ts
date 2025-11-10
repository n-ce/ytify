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

  try {
    const data = JSON.parse(event.body) as Collection | CollectionItem[]; // Explicitly type the parsed data
    const contentStore = getStore('content'); // Use string literal directly

    const timestamp = Date.now();
    const key = String(timestamp);

    await contentStore.set(key, JSON.stringify(data), {
      metadata: {
        lastModified: timestamp,
      },
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timestamp }),
    };
  } catch (error) {
    console.error("Error pushing immutable content:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to push immutable content', details: error instanceof Error ? error.message : 'An unknown error occurred' }),
    };
  }
};

export const config: Config = {
  // This function will be invoked by the client-side `pushImmutableContent`
  // No specific schedule is needed.
};

export { handler };
