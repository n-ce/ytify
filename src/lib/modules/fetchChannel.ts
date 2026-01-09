
interface Video {
  title: string;
  videoId: string;
  viewCountText: string;
  publishedText: string;
  published: number;
  author: string;
  lengthSeconds: number;
  authorId: string;
}

export interface Channel {
  author: string;
  authorId: string;
  authorThumbnails: { url: string }[];
  authorUrl: string;
  subCount: number;
  description: string;
  latestVideos: Video[];
}

export default async function(
  channelId: string,
  api: string,
  page: number,
): Promise<{
  thumbnail: string, videos: Video[], author: string
}> {

  return fetch(`${api}/api/v1/channels/${channelId}?page=${page}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data: Channel) => ({
      author: data.author,
      thumbnail: data.authorThumbnails[0].url,
      videos: data.latestVideos
    }));
}
