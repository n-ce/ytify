import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSubfeed } from '../src/backend/subfeed.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const channelIdsParam = request.query.ids;

  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  if (!channelIdsParam) {
    return response.status(400).json({ error: 'Missing ids parameter' });
  }

  try {
    const channelIds = (typeof channelIdsParam === 'string') 
      ? channelIdsParam.split(',') 
      : channelIdsParam;
    
    const subfeed = await getSubfeed(channelIds);
    return response.status(200).json(subfeed);
  } catch (error) {
    console.error('Error in subfeed API handler:', error);
    return response.status(500).json({ error: 'Something went wrong' });
  }
}
