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
    uploaderAvatar: string
  }

  type CollectionItem = {
    id: string,
    title: string,
    author: string,
    duration: string
    channelUrl: string,
    frequency?: number
  }

  type Recommendation = {
    lengthSeconds: number,
    videoId: string,
    title: string,
    authorUrl: string,
    author: string
  };

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

}

export { };
