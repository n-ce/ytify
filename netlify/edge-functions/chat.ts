import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/edge-functions';

type ChatMessage = {
  timestamp: number;
  message: string;
  sender: string;
};

export default async (req: Request, context: Context) => {
  const blobStore = getStore('board');
  let chat: ChatMessage[] = (await blobStore.getJSON('chat')) || [];

  if (req.method === 'POST') {
    const { message, sender } = await req.json();
    if (!message || !sender) return new Response('Invalid message format', { status: 400 });

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const newChat = chat
      .filter(msg => now - msg.timestamp <= oneWeek)
      .concat({
        timestamp: now,
        message,
        sender,
      });

    await blobStore.setJSON('chat', newChat);

    return new Response(null, { status: 204 });
  } 
  else if (req.method === 'GET')
    return new Response(JSON.stringify(existingChatData), { headers: { 'Content-Type': 'application/json' } });
  else return new Response('Method Not Allowed', { status: 405 });
};

export const config: Config = {
  path: ['/board'],
};
