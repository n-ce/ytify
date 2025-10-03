import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const title = url.searchParams.get("title");
  const artist = url.searchParams.get("artist");

  if (!title || !artist) {
    return new Response("Missing title or artist parameters", { status: 400 });
  }

  // Placeholder for JioSaavn API URL - this needs to be the actual API endpoint
  // I'm assuming a structure like: https://api.jiosaavn.com/search/songs?query=...
  // This will need to be replaced with the actual API endpoint found from Sumit Kolhe's project or similar.
  const jioSaavnApiUrl = `https://www.jiosaavn.com/api.php?_format=json&_marker=0&api_version=4&ctx=web6dot0&reqtype=search&query=${encodeURIComponent(`${title} ${artist}`)}`;

  try {
    const response = await fetch(jioSaavnApiUrl);
    if (!response.ok) {
      throw new Error(`JioSaavn API returned ${response.status}`);
    }
    const data = await response.json();

    // Now, implement the client-side parsing logic here
    // This part is adapted from src/lib/modules/jioSaavn.ts
    const normalizeString = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");

    const matchingTrack = data.results.find((track: any) =>
      normalizeString(title).toLowerCase().startsWith(normalizeString(track.title).toLowerCase()) &&
      track.artists.primary.some((art: any) => normalizeString(artist).toLowerCase().startsWith(normalizeString(art.name).toLowerCase()))
    );

    if (!matchingTrack) {
      return new Response("Music stream not found in JioSaavn results", { status: 404 });
    }

    // Assuming the matchingTrack contains the necessary downloadUrl structure
    // This part might need adjustment based on the actual JioSaavn API response
    return new Response(JSON.stringify(matchingTrack), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(error.message || "Internal Server Error", { status: 500 });
  }
};
