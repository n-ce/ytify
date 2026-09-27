import type { Config, Context } from "@netlify/edge-functions";

const PREVIEW_PATHS = ["/album/", "/artist/", "/channel/", "/playlist/"];
const API_BASE = "https://api.ytify.workers.dev";

function generatePreviewHtml(data: {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "music.album" | "music.playlist" | "profile" | "website";
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.title)}</title>
  <meta name="description" content="${escapeHtml(data.description)}">
  <meta property="og:title" content="${escapeHtml(data.title)}">
  <meta property="og:description" content="${escapeHtml(data.description)}">
  <meta property="og:image" content="${escapeHtml(data.image)}">
  <meta property="og:url" content="${escapeHtml(data.url)}">
  <meta property="og:type" content="${data.type}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(data.title)}">
  <meta name="twitter:description" content="${escapeHtml(data.description)}">
  <meta name="twitter:image" content="${escapeHtml(data.image)}">
  <link rel="canonical" href="${escapeHtml(data.url)}">
  <script>location.replace('/' + location.pathname.slice(1))</script>
</head>
<body></body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname;

  const isPreviewRoute = PREVIEW_PATHS.some((p) => path.startsWith(p));
  if (!isPreviewRoute) {
    return context.next();
  }

  const id = path.split("/")[2];
  if (!id) {
    return context.next();
  }

  let apiPath = "";
  if (path.startsWith("/album/")) apiPath = "album";
  else if (path.startsWith("/artist/")) apiPath = "artist";
  else if (path.startsWith("/channel/")) apiPath = "channel";
  else if (path.startsWith("/playlist/")) apiPath = "playlist";

  const apiUrl = `${API_BASE}/${apiPath}?id=${id}`;

  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();

    let previewData: {
      title: string;
      description: string;
      image: string;
      url: string;
      type: "music.album" | "music.playlist" | "profile" | "website";
    };

    if (path.startsWith("/album/")) {
      previewData = {
        title: data.name || "Album",
        description: `Album by ${data.author || "Unknown Artist"}`,
        image: data.img || "",
        url: url.href,
        type: "music.album",
      };
    } else if (path.startsWith("/playlist/")) {
      previewData = {
        title: data.name || "Playlist",
        description: `Playlist by ${data.author || "Unknown"}`,
        image: data.img || "",
        url: url.href,
        type: "music.playlist",
      };
    } else if (path.startsWith("/artist/")) {
      previewData = {
        title: data.name || "Artist",
        description: `Artist on ytify`,
        image: data.img || "",
        url: url.href,
        type: "profile",
      };
    } else if (path.startsWith("/channel/")) {
      previewData = {
        title: data.name || "Channel",
        description: `Channel on ytify`,
        image: data.img || "",
        url: url.href,
        type: "profile",
      };
    } else {
      return context.next();
    }

    return new Response(generatePreviewHtml(previewData), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return context.next();
  }
};

export const config: Config = {
  path: ["/album/*", "/artist/*", "/channel/*", "/playlist/*"],
};