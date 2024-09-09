declare global {

  type APIList = Record<'name' | 'piped' | 'invidious' | 'hyperpipe', string>;


  type StreamItem = {
    url: string,
    type: string,
    name: string,
    views: number,
    title: string,
    videos: number,
    duration: number,
    category: string,
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



  type Codec = {
    urls: string[],
    bitrates: number[],
    length?: number
  }

  type Scheme = {
    [index: string]: {
      bg: (r: number, g: number, b: number) => string,
      borderColor: (r: number, g: number, b: number) => string,
      shadowColor: string,
      onBg: string,
      text: string
    }
  }

  type SuperCollection = 'featured' | 'collections' | 'channels' | 'feed' | 'playlists';

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
    title: string,
    uploader: string,
    duration: number,
    uploader: string,
    uploaderUrl: string,
    category: string,
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
    audioStreams: Record<'bitrate' | 'codec' | 'contentLength' | 'quality' | 'mimeType' | 'url', string>[]
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
    genre: string,
    liveNow: boolean,
    hlsUrl: string
  }

}


export { };

