declare global {

  type apiList = {
    [index: string]: {
      name: string,
      url: string,
      custom: boolean
    }
  }


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
    channelUrl: string,
    frequency?: number
  }

  type Library = {
    [index: string]: {
      [index: string]: CollectionItem | DOMStringMap
    }
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

}


export { };

