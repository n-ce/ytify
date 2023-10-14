import { audio, img, listItemsAnchor, listItemsContainer, pipedInstances, subtitleContainer, subtitleTrack, superModal } from "./dom";


export const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const params = (new URL(location.href)).searchParams;

export const save = localStorage.setItem.bind(localStorage);

export const getSaved = localStorage.getItem.bind(localStorage);

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const imgUrl = (id: string, res: string) => `https://corsproxy.io?https://i.ytimg.com/vi_webp/${id}/${res}default.webp`;

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return '';
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = '0' + mmStr;
  if (ss < 10) ssStr = '0' + ssStr;
  return (hh > 0 ?
    hh + ':' : '') + `${mmStr}:${ssStr}`;
}


export function setMetaData(
  id: string,
  streamName: string,
  authorName: string,
  authorUrl: string,
  thumbnailUrl: string
) {

  if (!getSaved('img'))
    img.src = thumbnailUrl;

  const title = <HTMLAnchorElement>document.getElementById('title');
  title.href = `https://youtube.com/watch?v=${id}`;
  title.textContent = streamName;
  img.alt = streamName;

  const author = <HTMLAnchorElement>document.getElementById('author');
  author.href = 'https://youtube.com' + authorUrl;
  author.textContent = authorName;

  if (location.pathname === '/')
    document.title = streamName + ' - ytify';

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setPositionState();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: streamName,
      artist: authorName,
      artwork: [
        { src: imgUrl(id, ''), sizes: '96x96' },
        { src: imgUrl(id, ''), sizes: '128x128' },
        { src: imgUrl(id, 'mq'), sizes: '192x192' },
        { src: imgUrl(id, 'mq'), sizes: '256x256' },
        { src: imgUrl(id, 'hq'), sizes: '384x384' },
        { src: imgUrl(id, 'hq'), sizes: '512x512' },
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

export type Item = {
  url: string,
  type: string,
  name: string,
  views: number,
  title: string,
  videos: number,
  duration: number,
  category: string,
  thumbnail: string,
  subscribers: number,
  description: string,
  playlistType: string,
  uploaderUrl: string,
  uploadedDate: string,
  uploaderName: string,
  uploaderAvatar: string
}

function createStreamItem(stream: Item) {
  const id = stream.url.substring(9);
  const streamItem = document.createElement('stream-item');
  streamItem.dataset.id = id;
  streamItem.textContent = streamItem.dataset.title = stream.title;
  streamItem.dataset.author = stream.uploaderName;
  streamItem.dataset.thumbnail = imgUrl(id, 'mq');
  streamItem.dataset.views = stream.views > 0 ? numFormatter(stream.views) + ' views' : '';
  streamItem.dataset.duration = convertSStoHHMMSS(stream.duration);
  streamItem.dataset.uploaded = stream.uploadedDate || '';
  streamItem.dataset.avatar = stream.uploaderAvatar || '';
  streamItem.addEventListener('click', () => {
    superModal.classList.toggle('hide');
    const _ = superModal.dataset;
    _.id = id;
    _.title = stream.title;
    _.thumbnail = streamItem.dataset.thumbnail;
    _.author = stream.uploaderName;
    _.channelUrl = stream.uploaderUrl;
    _.duration = streamItem.dataset.duration;
  })
  return streamItem;
}

function createListItem(list: Item) {
  const listItem = document.createElement('list-item');
  listItem.textContent = list.name;
  listItem.dataset.thumbnail = list.thumbnail;

  listItem.dataset.uploaderData = list.description || list.uploaderName || '';

  listItem.dataset.stats = list.subscribers > 0 ? numFormatter(list.subscribers) + ' subscribers' : list.videos > 0 ? list.videos + ' streams' : '';

  listItem.addEventListener('click', () => {

    if (list.type === 'channel')
      return open('https://youtube.com' + list.url);

    const url = list.playlistType === 'NORMAL' ? list.url.replace('?list=', 's/') : '/playlists/' + list.url.slice(-13);

    fetch(pipedInstances.value + url)
      .then(res => res.json())
      .then(group => group.relatedStreams)
      .then(streams => itemsLoader(streams))
      .then(fragment => {
        listItemsContainer.innerHTML = '';
        listItemsContainer.appendChild(fragment);
        listItemsAnchor.click();
      })
      .catch(err => {
        if (err.message !== 'No Data Found' && pipedInstances.selectedIndex < pipedInstances.length - 1) {
          pipedInstances.selectedIndex++;
          listItem.click();
          return;
        }
        alert(err);
        pipedInstances.selectedIndex = 0;
      })
  })
  return listItem;
}



export function itemsLoader(itemsArray: Item[]): DocumentFragment {
  if (!itemsArray.length)
    throw new Error('No Data Found');
  const fragment = document.createDocumentFragment();

  for (const item of itemsArray) {

    const type = item.type === 'stream' ? createStreamItem(item) : createListItem(item);

    fragment.appendChild(type);
  }

  return fragment;
}


// subtitles

let loaded = false;
function loadParser() {

  // Dynamically Loading Library on Demand only
  if (loaded)
    return true;
  const imscript = document.createElement('script');
  imscript.src = 'https://unpkg.com/imsc/dist/imsc.all.min.js';
  imscript.type = 'text/javascript';
  document.head.appendChild(imscript);
  return new Promise(res => {
    imscript.addEventListener('load', () => {
      loaded = true;
      res(true);
    })
  })
}



export async function parseTTML() {
  if (!loaded)
    await loadParser();

  const myTrack = audio.textTracks[0];
  myTrack.mode = "hidden";
  const d = img.getBoundingClientRect();

  subtitleContainer.style.top = Math.floor(d.y) + 'px';
  subtitleContainer.style.left = Math.floor(d.x) + 'px';


  fetch(subtitleTrack.src)
    .then(res => res.text())
    .then(text => {
      const imscDoc = imsc.fromXML(text);
      const timeEvents = imscDoc.getMediaTimeEvents();
      const telen = timeEvents.length;

      for (let i = 0; i < telen; i++) {
        const myCue = new VTTCue(timeEvents[i], (i < telen - 1) ? timeEvents[i + 1] : audio.duration, '');

        myCue.onenter = () => {
          const subtitleActive = subtitleContainer.firstChild;
          if (subtitleActive)
            subtitleContainer.removeChild(subtitleActive)
          imsc.renderHTML(
            imsc.generateISD(imscDoc, myCue.startTime),
            subtitleContainer,
            img,
            Math.floor(d.height),
            Math.floor(d.width)
          );
        }
        myCue.onexit = () => {
          const subtitleActive = subtitleContainer.firstChild;
          if (subtitleActive)
            subtitleContainer.removeChild(subtitleActive)
        }
        myTrack.addCue(myCue);
      }
    });
}

