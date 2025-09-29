import type { JSXElement } from 'solid-js';
import type en from './locales/en.json';

declare global {


  type TranslationKeys = keyof typeof en;

  type Features = 'home' | 'player' | 'list' | 'settings' | 'search' | 'queue' | 'video' | 'updater';

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
    author: string,
    duration: string
    channelUrl: string,
    lastUpdated?: string
  }

  type List = {
    id: string,
    name: string,
    thumbnail: string
  }
  type Collection = {
    [index: string]: CollectionItem | List
  }

  type Library = {
    history?: { [index: string]: CollectionItem },
    favorites?: { [index: string]: CollectionItem },
    listenLater?: { [index: string]: CollectionItem },
    channels?: { [index: string]: List & { uploader: string } },
    playlists?: { [index: string]: List },
    [index: string]: { [index: string]: CollectionItem }
  }

  type APAC = 'albums' | 'playlists' | 'artists' | 'channels';
  type SuperCollection = 'featured' | 'collections' | APAC | 'feed' | 'for_you';

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
    captions: Record<'url' | 'label', string>[],
    title: string,
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

}


export { };

