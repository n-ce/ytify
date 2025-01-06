declare global {

  interface Window {
    inject_ytify_services: (arg0: {}) => Promise<void>
  }

  type StreamItem = {
    url: string,
    type: string,
    name: string,
    views: number,
    title: string,
    videos: number,
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
    channelUrl: string
  }

  type List = Record<'id' | 'name' | 'thumbnail', string>
  type Collection = {
    [index: string]: CollectionItem | DOMStringMap
  }

  type Library = {
    history?: Collection,
    favorites: Collection,
    listenLater: Collection,
    discover?: {
      [index: string]: CollectionItem & { frequency: number }
    },
    channels: { [index: string]: List & { uploader: string } },
    playlists: { [index: string]: List },
    [index: string]: Collection
  }

  type SuperCollection = 'featured' | 'collections' | 'channels' | 'feed' | 'playlists' | 'supermix';

  type Scheme = {
    [index: string]: {
      bg: (r: number, g: number, b: number) => string,
      borderColor: (r: number, g: number, b: number) => string,
      shadowColor: string,
      onBg: string,
      text: string
    }
  }

  type ToggleSwitch = {
    name: string
    id: string,
    checked: boolean,
    onClick: (e: EventHandler<HTMLInputElement>) => void
  }

  type Selector = {
    label: string,
    id: string,
    onChange: (e: { target: HTMLSelectElement }) => void,
    onMount: (target: HTMLSelectElement) => void,
    children: JSXElement
  }

  type Piped = {
    instance: string,
    title: string,
    uploader: string,
    duration: number,
    uploader: string,
    uploaderUrl: string,
    livestream: boolean,
    subtitles: [],
    hls: string
    relatedStreams: {
      url: string,
      title: string,
      uploaderName: string,
      duration: number,
      uploaderUrl: string,
      type: string
    }[],
    audioStreams: {
      codec: string,
      url: string,
      quality: string,
      bitrate: string,
      contentLength: number,
      mimeType: string
    }[]
  }

  type Invidious = {
    adaptiveFormats: Record<'type' | 'bitrate' | 'encoding' | 'clen' | 'url', string>[],
    recommendedVideos: {
      title: string,
      author: string,
      lengthSeconds: number,
      authorUrl: string,
      videoId: string
    }[],
    title: string,
    author: string,
    lengthSeconds: number,
    authorUrl: string,
    liveNow: boolean,
    hlsUrl: string,
    dashUrl: string,
    videoThumbnails: Record<'url' | 'quality', string>[]
  }

}


export { };

