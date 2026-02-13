import type { JSXElement } from 'solid-js';
import type en from './locales/en.json';

declare global {

  type TranslationKeys = keyof typeof en;
  type SyncState = 'synced' | 'syncing' | 'dirty' | 'error';
  type Features = 'search' | 'library' | 'player' | 'list' | 'settings' | 'queue' | 'updater';
  type Context = 'link' | 'search' | 'hub' | 'playlists' | 'collection' | 'channels' | 'queue' | 'standby';

  interface YTImage {
    url: string;
    width: number;
    height: number;
  }

  interface TrackItem {
    id: string;
    title: string;
    duration: string;
    author: string;
    authorId?: string;
  }

  interface YTItem extends TrackItem {
    img?: string;
    albumId?: string;
    subtext?: string;
    type: 'video';
  }

  interface ListItem {
    id: string;
    name: string;
    img: string;
  }

  interface YTChannelItem extends ListItem {
    type: 'channel';
    subscribers?: string;
    videoCount?: string;
    description?: string;
    items?: YTItem[];
  }

  interface YTPlaylistItem extends ListItem {
    type: 'playlist';
    author?: string;
    videoCount?: string;
    items?: YTItem[];
  }

  interface YTArtistItem extends ListItem {
    type: 'artist';
    subscribers?: string;
    items?: YTItem[];
    albums?: YTAlbumItem[];
  }

  interface YTAlbumItem extends ListItem {
    type: 'album';
    author: string;
    year?: string;
    playlistId?: string;
    items?: YTItem[];
  }

  type YTListItem = YTChannelItem | YTPlaylistItem | YTArtistItem | YTAlbumItem;

  type Collection = { [index: string]: TrackItem };

  type Channel = ListItem;
  type Playlist = ListItem & {
    author: string
  };
  type Album = Playlist & {
    tracks: string[]
  };

  type LibraryAlbums = { [id: string]: Album };

  interface Meta {
    version: number,
    tracks: number,
    [index: string]: number
  }

  type AudioStream = {
    type: string,
    bitrate: string,
    encoding: string,
    clen: string,
    url: string,
    resolution: string,
    quality: string
  }

  type Invidious = {
    adaptiveFormats: AudioStream[],
    recommendedVideos: {
      title: string,
      author: string,
      lengthSeconds: number,
      authorUrl: string,
      videoId: string
    }[],
    title: string,
    captions: Record<'url' | 'label' | 'language_code', string>[],
    author: string,
    lengthSeconds: number,
    authorId: string,
    liveNow: boolean,
    hlsUrl: string,
    dashUrl: string,
  }
}

export { };
