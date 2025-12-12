import type { JSXElement } from 'solid-js';
import type en from './locales/en.json';

declare global {


  type TranslationKeys = keyof typeof en;

  type SyncState = 'synced' | 'syncing' | 'dirty' | 'error';

  type Features = 'home' | 'player' | 'list' | 'settings' | 'queue' | 'updater';
  type Context = 'link' | 'search' | 'hub' | 'playlists' | 'collection' | 'channels' | 'queue';

  type StreamItem = {
    url: string,
    type: string,
    name: string,
    views: number,
    title: string,
    videos: number,
    uploaded: number,
    duration: number,
    isShort?: boolean,
    thumbnail: string,
    subscribers: number,
    description: string,
    uploaderUrl: string,
    thumbnailUrl: string,
    playlistType: string,
    uploadedDate: string,
    uploaderName: string,
    uploaderAvatar: string,
    /* invidious fields */
    lengthSeconds: number,
    publishedText: string,
    viewCountText: string,
    viewCount: number,
    authorUrl: string,
    videoId: string,
    author: string
  }

  type CollectionItem = {
    id: string,
    title: string,
    author?: string,
    duration: string
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
    codec: string,
    url: string,
    quality: string,
    bitrate: string,
    contentLength: number,
    mimeType: string
  }

  type Piped = {
    instance: string,
    title: string,
    duration: number,
    uploader: string,
    uploaderUrl: string,
    livestream: boolean,
    hls: string
    relatedStreams: {
      url: string,
      title: string,
      uploaderName: string,
      duration: number,
      uploaderUrl: string,
      type: string
    }[],
    audioStreams: AudioStream[],
    subtitles: Record<'url' | 'name' | 'label', string>[]
  }


  type Invidious = {
    adaptiveFormats: Record<'type' | 'bitrate' | 'encoding' | 'clen' | 'url' | 'resolution' | 'quality', string>[],
    recommendedVideos: {
      title: string,
      author: string,
      lengthSeconds: number,
      authorUrl: string,
      videoId: string
    }[],
    title: string,
    captions: Record<'url' | 'label', string>[],
    author: string,
    lengthSeconds: number,
    authorUrl: string,
    liveNow: boolean,
    hlsUrl: string,
    dashUrl: string,
  }

  interface WindowEventMap {
    'dbchange': CustomEvent<{ db: Library, change: string }>;
  }

  interface YTStreamItem {
    id: string,
    title: string,
    author?: string,
    duration: string,
    uploaded?: string,
    authorId?: string,
    channelUrl?: string,
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

