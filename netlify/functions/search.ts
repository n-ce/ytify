import handler from '../../src/backend/getSearch.js';
import wrap from './_helper.js';

export default async function (req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const f = url.searchParams.get('f');

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing q parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return wrap(handler({ q, f: f || undefined }));
}

export const config = {
  path: "/api/search"
};
