import { config, fetchJson, generateImageUrl, getThumbIdFromLink, convertSStoHHMMSS } from '@lib/utils';

// Response types for different search filters

// music_songs
interface YTMusicSongResult {
  album: {
    id: string;
    name: string;
  };
  artists: {
    id: string;
    name: string;
  }[];
  category: string;
  duration: string;
  duration_seconds: number;
  inLibrary: boolean;
  isExplicit: boolean;
  resultType: 'song';
  thumbnails: {
    height: number;
    url: string;
    width: number;
  }[];
  title: string;
  videoId: string;
  videoType: string;
  year: null | string;
}

// music_artists
interface YTMusicArtistResult {
  artist: string;
  browseId: string;
  category: string;
  radioId: string;
  resultType: 'artist';
  shuffleId: string;
  thumbnails: {
    height: number;
    url: string;
    width: number;
  }[];
}

// music_videos
interface YTMusicVideoResult {
  artists: {
    id: string;
    name: string;
  }[];
  category: string;
  duration: string;
  duration_seconds: number;
  resultType: 'video';
  thumbnails: {
    height: number;
    url: string;
    width: number;
  }[];
  title: string;
  videoId: string;
  videoType: string;
  views: string;
  year: null | string;
}

// music_albums
interface YTMusicAlbumResult {
  artists: {
    id: string;
    name: string;
  }[];
  browseId: string;
  category: string;
  duration: null;
  isExplicit: boolean;
  playlistId: string;
  resultType: 'album';
  thumbnails: {
    height: number;
    url: string;
    width: number;
  }[];
  title: string;
  type: string;
  year: string;
}

// music_playlists
interface YTMusicPlaylistResult {
  author: string;
  browseId: string;
  category: string;
  itemCount: string;
  resultType: 'playlist';
  thumbnails: {
    height: number;
    url: string;
    width: number;
  }[];
  title: string;
}

type YTMusicSearchResult = YTMusicSongResult | YTMusicArtistResult | YTMusicVideoResult | YTMusicAlbumResult | YTMusicPlaylistResult;

interface YTMusicSearchResponse {
  results: YTMusicSearchResult[];
}

const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default async function(
  query: string,
): Promise<(YTStreamItem | YTListItem)[]> {
  const filter = config.searchFilter.substring(6); // remove "music_"
  const api = 'https://ytify-backend.vercel.app';
  const url = api + `/api/search?q=${encodeURIComponent(normalizeString(query))}&filter=${filter}`;

  return fetchJson<YTMusicSearchResponse>(url)
    .then(data => {
      return data.results.filter(item => {
        if (item.resultType === 'artist') {
          return (item as YTMusicArtistResult).thumbnails[0].url.includes('googleusercontent');
        }
        if (item.resultType === 'song') {
          const videoItem = item as YTMusicSongResult;
          return videoItem.artists?.some(a => a.id);
        }
        return true;
      }).map(item => {
        if (item.resultType === 'song' || item.resultType === 'video') {
          const videoItem = item as YTMusicSongResult | YTMusicVideoResult;
          const artist = videoItem.artists?.find(a => a.id);
          const artistName = item.resultType === 'song' ? artist?.name : videoItem.artists?.[0]?.name;
          return {
            id: videoItem.videoId,
            title: videoItem.title,
            author: artistName ? (item.resultType === 'song' ? artistName + ' - Topic' : artistName) : 'Unknown',
            duration: convertSStoHHMMSS(videoItem.duration_seconds),
            authorId: videoItem.artists.length > 0 ? videoItem.artists[0].id : artist?.id,
            views: 'views' in videoItem ? videoItem.views + ' Plays' : videoItem.album?.name,
            albumId: 'album' in videoItem ? videoItem.album.id : '',
            img: item.resultType === 'video' ? item.videoId : getThumbIdFromLink(videoItem.thumbnails[0].url || 'https://i.ytimg.com/vi_webp/' + videoItem.videoId + '/mqdefault.webp?host=i.ytimg.com'),
            type: item.resultType === 'song' ? 'stream' : 'video',
          } as YTStreamItem;
        } else if (item.resultType === 'album') {
          const albumItem = item as YTMusicAlbumResult;
          return {
            title: albumItem.title,
            stats: albumItem.year,
            thumbnail: generateImageUrl(getThumbIdFromLink(albumItem.thumbnails[0].url), ''),
            uploaderData: albumItem.artists?.find(a => a.id)?.name,
            url: `/album/${albumItem.browseId}`,
            type: 'playlist',
          } as YTListItem;
        } else {
          const listItem = item as YTMusicArtistResult | YTMusicPlaylistResult;
          return {
            title: 'title' in listItem ? listItem.title : (listItem as YTMusicArtistResult).artist,
            stats: 'itemCount' in listItem ? (listItem as YTMusicPlaylistResult).itemCount + ' Plays' : '',
            thumbnail: generateImageUrl(getThumbIdFromLink(listItem.thumbnails[0].url), ''),
            uploaderData: 'author' in listItem ? (listItem as YTMusicPlaylistResult).author : '',
            url: `/${item.resultType === 'artist' ? 'artist' : 'playlists'}/${listItem.browseId}`,
            type: item.resultType === 'artist' ? 'channel' : 'playlist',
          } as YTListItem;
        }
      });
    });
};
