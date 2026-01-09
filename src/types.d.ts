import type { JSXElement } from 'solid-js';
import type en from './locales/en.json';

declare global {


  type TranslationKeys = keyof typeof en;

  type SyncState = 'synced' | 'syncing' | 'dirty' | 'error';

  type Features = 'home' | 'player' | 'list' | 'settings' | 'queue' | 'updater';
  type Context = 'link' | 'search' | 'hub' | 'playlists' | 'collection' | 'channels' | 'queue' | 'standby';

  type StreamItem = {
    url: string,
    type: string,
    title: string,
    duration: number,
    uploaderName: string,
    uploaderUrl: string,
  } & Partial<{
    name: string,
    views: number,
    videos: number,
    uploaded: number,
    isShort?: boolean,
    thumbnail: string,
    subscribers: number,
    description: string,
    thumbnailUrl: string,
    playlistType: string,
    uploadedDate: string,
    uploaderAvatar: string,
    /* invidious fields */
    lengthSeconds: number,
    publishedText: string,
    viewCountText: string,
    viewCount: number,
    authorUrl: string,
    videoId: string,
    author: string
  }>

  type CollectionItem = {
    id: string,
    title: string,
    duration: string,
    author?: string,
    authorId?: string,
    albumId?: string,
    plays?: number
  }

  type Collection = { [index: string]: CollectionItem };

  type Album = {
    name: string,
    artist: string,
    thumbnail: string,
    tracks: string[]
  };

  type LibraryAlbums = { [id: string]: Album };

  interface Channel {
    id: string,
    name: string,
    thumbnail: string
  };
  interface Playlist extends Channel { uploader: string };

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

  interface YTStreamItem {
    id: string,
    title: string,
    author?: string,
    duration: string,
    uploaded?: string,
    authorId?: string,
    views?: string,
    img?: string,
    albumId?: string,
    type: 'stream' | 'video',
  }

  interface YTListItem {
    title: string,
    stats: string,
    thumbnail: string,
    uploaderData: string,
    url: string,
    type: 'channel' | 'playlist',
  }


}


export { };

