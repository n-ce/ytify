declare global {
  const imsc: any;

  type StreamItem = {
    url: string,
    type: string,
    name: string,
    views: number,
    title: string,
    videos: number,
    category: string,
    duration: number,
    thumbnail: string,
    subscribers: number,
    description: string,
    uploaderUrl: string,
    thumbnailUrl: string,
    playlistType: string,
    uploadedDate: string,
    uploaderName: string,
    uploaderAvatar: string
  }

  type CollectionItem = {
    id: string,
    title: string,
    author: string,
    duration: string
    thumbnail: string,
    channelUrl: string,
    frequency?: number

  }

  type Library = {
    [index: string]: {
      [index: string]: CollectionItem | DOMStringMap
    }
  }

  interface Opus {
    urls: string[],
    bitrates: number[]
  }

  interface M4A extends Opus {
    options: HTMLOptionElement[]
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

}

export { };
