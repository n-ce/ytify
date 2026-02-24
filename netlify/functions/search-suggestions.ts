import handler from '../../src/backend/getSearchSuggestions.js';
import wrap from './_helper.js';

export default async function (req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const music = url.searchParams.get('music') === 'true';

  if (!q) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600'
      },
    });
  }

  return wrap(handler({ q, music }));
}

export const config = {
  path: "/api/search-suggestions"
};
