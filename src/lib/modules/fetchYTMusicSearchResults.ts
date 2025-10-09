import { config, fetchJson, generateImageUrl, getThumbIdFromLink } from '@lib/utils';

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


export default async function(
  query: string,
): Promise<(YTStreamItem | YTListItem)[]> {
  const filter = config.searchFilter.substring(6); // remove "music_"
  const url = `https://ytm-jgmk.onrender.com/api/search?q=${encodeURIComponent(query)}&filter=${filter}`;

  return fetchJson<YTMusicSearchResponse>(url)
    .then(data => {
      return data.results.filter(item => {
        if (item.resultType === 'artist') {
          return (item as YTMusicArtistResult).radioId;
        }
        return true;
      }).map(item => {
        if (item.resultType === 'song' || item.resultType === 'video') {
          const videoItem = item as YTMusicSongResult | YTMusicVideoResult;
          return {
            id: videoItem.videoId,
            title: videoItem.title,
            author: item.resultType === 'song' ? videoItem.artists.find(a => a.id)?.name + ' - Topic' : videoItem.artists[0].name,
            duration: videoItem.duration,
            channelUrl: videoItem.artists.length > 0 ? `/channel/${videoItem.artists[0].id}` : '',
            views: 'views' in videoItem ? videoItem.views + ' Plays' : videoItem.album?.name !== videoItem.title ? videoItem.album?.name : '',
            img: item.resultType === 'video' ? item.videoId : getThumbIdFromLink(videoItem.thumbnails[0].url || 'https://i.ytimg.com/vi_webp/' + videoItem.videoId + '/mqdefault.webp?host=i.ytimg.com'),
            type: item.resultType === 'song' ? 'stream' : 'video',
          } as YTStreamItem;
        } else {
          const listItem = item as YTMusicArtistResult | YTMusicAlbumResult | YTMusicPlaylistResult;
          return {
            title: 'title' in listItem ? listItem.title : listItem.artist,
            stats: 'itemCount' in listItem ? listItem.itemCount + ' Plays' : ('year' in listItem ? listItem.year : ''),
            thumbnail: generateImageUrl(getThumbIdFromLink(listItem.thumbnails[0].url), ''),
            uploaderData: 'author' in listItem ? listItem.author : ('artists' in listItem ? listItem.artists.find(a => a.id)?.name : ''),

            url: `/${item.resultType === 'artist' ? 'artist' : 'playlists'}/${listItem.resultType === 'album' ? listItem.playlistId : listItem.browseId}`,
            type: item.resultType === 'artist' ? 'channel' : 'playlist',
          } as YTListItem;
        }
      });
    });
};
