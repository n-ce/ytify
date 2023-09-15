import { audio, img, pipedInstances}   from "./dom";
import player from "./player";


export const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';


export const params = (new URL(location.href)).searchParams;

export const save = localStorage.setItem.bind(localStorage);

export const getSaved = localStorage.getItem.bind(localStorage);

export function convertSStoHHMMSS(seconds: number): string {
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return hh > 0 ?
    `${hh}:${mmStr}:${ssStr}` :
    `${mmStr}:${ssStr}`;
}

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);



export function setMetaData(
  id: string,
  thumbnail: string,
  streamName: string,
  authorName: string,
  authorUrl: string
) {

  if (getSaved('img')) {
    save('img', thumbnail)
    thumbnail = '';
  } else img.src = thumbnail;

  const title = <HTMLAnchorElement>document.getElementById('title');
  title.href = `https://youtube.com/watch?v=${id}`;
  title.textContent = streamName;

  const author = <HTMLAnchorElement>document.getElementById('author');
  author.href = `https://youtube.com${authorUrl}`;
  author.textContent = authorName;

  document.title = streamName + ' - ytify';

  if (thumbnail?.includes('maxres'))
    thumbnail = thumbnail.replace('maxres', 'hq');

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setPositionState();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: streamName,
      artist: authorName,
      artwork: [
        { src: thumbnail, sizes: '96x96' },
        { src: thumbnail, sizes: '128x128' },
        { src: thumbnail, sizes: '192x192' },
        { src: thumbnail, sizes: '256x256' },
        { src: thumbnail, sizes: '384x384' },
        { src: thumbnail, sizes: '512x512' },
      ]
    });
  }
}




export function updatePositionState() {
  if ('mediaSession' in navigator) {
    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    }
  }
}

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => {
    audio.play();
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audio.pause();
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("seekforward", () => {
    audio.currentTime += 10;
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("seekbackward", () => {
    audio.currentTime -= 10;
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("seekto", e => {
    audio.currentTime = e.seekTime || 0;
    updatePositionState();
  });
  navigator.mediaSession.setActionHandler("nexttrack", () => {
    // audio on end
    updatePositionState();
  });
}



const stealthContainer = document.getElementById('stealth');
const stealthAnchor = <HTMLAnchorElement>document.getElementById('/stealth');

type item = 'title' | 'name' | 'uploaderName' | 'description' | 'thumbnail' | 'type' | 'url' | 'views' | 'duration' | 'uploadedDate' | 'uploaderAvatar' | 'videos' | 'subscribers';

function loadGroup(group: string) {
  fetch(pipedInstances.value + group)
    .then(res => res.json())
    .then(group => group.relatedStreams)
    .then(streams => itemsLoader(streams))
    .then(fragment => {
      if (!stealthContainer) return;
      stealthContainer.innerHTML = '';
      stealthContainer.appendChild(fragment);
      stealthAnchor.click();
    })
    .catch(err => {
      if (err.message !== 'No Data Found' && pipedInstances.selectedIndex < pipedInstances.length - 1) {
        pipedInstances.selectedIndex++;
        loadGroup(group);
        return;
      }
      alert(err);
    })
}
function createStreamItem(stream: Record<item, string>) {
  const streamItem = document.createElement('stream-item');
  streamItem.textContent = stream.title;
  streamItem.dataset.author = stream.uploaderName;
  streamItem.dataset.thumbnail = stream.thumbnail;
  streamItem.dataset.views = stream.views;
  streamItem.dataset.duration = stream.duration;
  streamItem.dataset.uploaded = stream.uploadedDate || '';
  streamItem.dataset.avatar = stream.uploaderAvatar || '';
  streamItem.addEventListener('click', () => {
    player(stream.url.substring(9))
  })
  return streamItem;
}


function createPlaylistItem(playlist: Record<item, string>) {

  const playlistItem = document.createElement('playlist-item');
  playlistItem.textContent = playlist.name;
  playlistItem.dataset.length = playlist.videos;
  playlistItem.dataset.author = playlist.uploaderName;
  playlistItem.dataset.thumbnail = playlist.thumbnail;
  playlistItem.addEventListener('click', () => {
    loadGroup(playlist.url.replace('?list=', 's/'));
  })
  return playlistItem;
}

function createChannelItem(channel: Record<item, string>) {
  const channelItem = document.createElement('channel-item');
  channelItem.textContent = channel.name;
  channelItem.dataset.thumbnail = channel.thumbnail;
  channelItem.dataset.description = channel.description;
  channelItem.dataset.subscribers = channel.subscribers;
  channelItem.addEventListener('click', () => {
    loadGroup(channel.url);
  })

  return channelItem;
}

export function itemsLoader(itemsArray: Record<item, string>[]): DocumentFragment {
  if (!itemsArray.length)
    throw new Error('No Data Found');
  const fragment = document.createDocumentFragment();

  for (const item of itemsArray) {

    const type = item.type === 'stream' ? createStreamItem(item) : item.type === 'playlist' ? createPlaylistItem(item) : createChannelItem(item);


    fragment.appendChild(type);
  }

  return fragment;
}
