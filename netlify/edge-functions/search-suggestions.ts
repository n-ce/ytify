import { Context, Config } from '@netlify/edge-functions';

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const music = url.searchParams.get('music') === 'true';

  if (!q) {
    return new Response(JSON.stringify([]), {
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    if (music) {
      // YouTube Music suggestions (YTMUSIC / WEB_REMIX)
      const res = await fetch(`https://music.youtube.com/youtubei/v1/music/get_search_suggestions?alt=json&key=AIzaSyAO_FJ2Slq_6k8J8vX1Q1Q1Q1Q1Q1Q1Q`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Origin': 'https://music.youtube.com',
          'Referer': 'https://music.youtube.com/'
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20250219.01.00',
              hl: 'en',
              gl: 'US'
            }
          },
          input: q
        })
      });

      const data = await res.json();
      
      // Parse YTMUSIC response
      const suggestions = data.contents?.[0]?.searchSuggestionsSectionRenderer?.contents?.map((s: any) => {
        const renderer = s.searchSuggestionRenderer;
        if (!renderer) return null;
        return renderer.suggestion?.runs?.map((r: any) => r.text).join('') || null;
      }).filter(Boolean) || [];

      return new Response(JSON.stringify(suggestions), {
        headers: { 'content-type': 'application/json' },
      });
    } else {
      // General YouTube suggestions (WEB)
      // Mirroring youtubei.js getSearchSuggestions implementation
      const suggestUrl = new URL('https://suggestqueries-clients6.youtube.com/complete/search');
      suggestUrl.searchParams.set('client', 'youtube');
      suggestUrl.searchParams.set('gs_ri', 'youtube');
      suggestUrl.searchParams.set('gs_id', '0');
      suggestUrl.searchParams.set('cp', '0');
      suggestUrl.searchParams.set('ds', 'yt');
      suggestUrl.searchParams.set('sugexp', 'ytzpb5_e2,ytpo.bo.lqp.elu=1,ytpo.bo.lqp.ecsc=1,ytpo.bo.lqp.mcsc=3,ytpo.bo.lqp.mec=1,ytpo.bo.lqp.rw=0.8,ytpo.bo.lqp.fw=0.2,ytpo.bo.lqp.szp=1,ytpo.bo.lqp.mz=3,ytpo.bo.lqp.al=en_us,ytpo.bo.lqp.zrm=1,ytpo.bo.lqp.er=1,ytpo.bo.ro.erl=1,ytpo.bo.ro.mlus=3,ytpo.bo.ro.erls=3,ytpo.bo.qfo.mlus=3,ytzprp.ppp.e=1,ytzprp.ppp.st=772,ytzprp.ppp.p=5');
      suggestUrl.searchParams.set('hl', 'en');
      suggestUrl.searchParams.set('gl', 'US');
      suggestUrl.searchParams.set('q', q);

      const res = await fetch(suggestUrl.toString());
      const text = await res.text();
      
      // youtubei.js parses window.google.ac.h(...)
      const jsonText = text.replace('window.google.ac.h(', '').slice(0, -1);
      const data = JSON.parse(jsonText);
      const suggestions = data[1].map((s: any) => s[0]);

      return new Response(JSON.stringify(suggestions), {
        headers: { 'content-type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/api/search-suggestions'
};
