import { audio, img, listAnchor, listContainer, listSection, loadingScreen, openInYtBtn, playAllBtn, subtitleContainer, subtitleTrack, superModal, listBtnsContainer, title, subscribeListBtn, instanceSelector, subtitleSelector } from "./dom";
import { fetchCollection, getDB, removeFromCollection } from "./libraryUtils";
import { generateImageUrl, getThumbIdFromLink, sqrThumb } from "./imageUtils";
import { render } from 'solid-js/web';
import ListItem from "../components/ListItem";
import StreamItem from "../components/StreamItem";
import player from "./player";
import { params, store } from "../store";


export const $ = document.createElement.bind(document);

export const save = localStorage.setItem.bind(localStorage);

export const removeSaved = localStorage.removeItem.bind(localStorage);

export const goTo = (route: string) => (<HTMLAnchorElement>document.getElementById(route)).click();

export const getApi = (
  type: 'piped' | 'invidious',
  index: number = instanceSelector.selectedIndex || 0) =>
  store.api[index][type];

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export const hostResolver = (url: string) =>
  store.linkHost + (store.linkHost.includes('ytify') ? url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + url.slice(1).split('/').join('=')) : url);

export async function quickSwitch() {
  if (!store.stream.id) return;
  if (store.player.playbackState === 'playing')
    audio.pause();
  const timeOfSwitch = audio.currentTime;
  await player(store.stream.id);
  audio.currentTime = timeOfSwitch;
  audio.play();
}

export function notify(text: string) {
  const el = $('p');
  const clear = () => document.getElementsByClassName('snackbar')[0] && el.remove();
  el.className = 'snackbar';
  el.textContent = text;
  el.onclick = clear;
  setTimeout(clear, 8e3);
  document.body.appendChild(el);
}


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




let more = () => undefined;

document.getElementById('moreBtn')!.addEventListener('click', () => more());

export async function setMetaData(
  id: string,
  streamName: string,
  authorName: string,
  music: boolean = false
) {
  const metadataObj: MediaMetadataInit = {
    title: streamName,
    artist: authorName,
  };

  const imgx = generateImageUrl(id, 'maxres');
  if (store.loadImage !== 'off') {
    img.src = music ? await sqrThumb(imgx) : imgx;
    metadataObj.artwork = [
      { src: img.src, sizes: '96x96' },
      { src: img.src, sizes: '128x128' },
      { src: img.src, sizes: '192x192' },
      { src: img.src, sizes: '256x256' },
      { src: img.src, sizes: '384x384' },
      { src: img.src, sizes: '512x512' },
    ]
    img.alt = streamName;
  }


  title.href = hostResolver(`/watch?v=${id}`);
  title.textContent = streamName;

  more = function() {
    superModal.showModal();
    history.pushState({}, '', '#');
    const s = superModal.dataset;
    const a = store.stream;
    s.id = a.id;
    s.title = a.title;
    s.author = a.author;
    s.duration = a.duration;
    s.channelUrl = a.channelUrl;
  }

  document.getElementById('author')!.textContent = authorName;

  if (location.pathname === '/')
    document.title = streamName + ' - ytify';


  if ('mediaSession' in navigator) {
    navigator.mediaSession.setPositionState();
    navigator.mediaSession.metadata = new MediaMetadata(metadataObj);
  }

}



export async function fetchList(url: string | undefined, mix = false) {
  if (!url)
    return notify('No Channel URL provided');

  loadingScreen.showModal();
  const api = getApi('piped');

  const group = await fetch(api + url)
    .then(res => res.json())
    .catch(err => {
      if (err.message !== 'No Data Found' && instanceSelector.selectedIndex < instanceSelector.length - 1) {
        instanceSelector.selectedIndex++;
        fetchList(url, mix);
        return;
      }
      notify(mix ? 'No Mixes Found' : err.message);
      instanceSelector.selectedIndex = 0;
    })
    .finally(() => loadingScreen.close());

  if (!group.relatedStreams.length)
    return notify('No Data Found');


  if (listContainer.classList.contains('reverse'))
    listContainer.classList.remove('reverse');
  listContainer.innerHTML = '';
  listContainer.appendChild(
    itemsLoader(
      group.relatedStreams
    )
  );

  goTo('/list');
  listSection.scrollTo(0, 0);

  let token = group.nextpage;
  function setObserver(callback: () => Promise<string>) {
    new IntersectionObserver((entries, observer) =>
      entries.forEach(async e => {
        if (e.isIntersecting) {
          token = await callback();
          observer.disconnect();
          if (token)
            setObserver(callback);
        }
      }))
      .observe(listContainer.children[listContainer.childElementCount - 3]);
  }
  if (!mix && token)
    setObserver(async () => {
      const data = await fetch(
        api + '/nextpage/' +
        url.substring(1) + '?nextpage=' + encodeURIComponent(token)
      )
        .then(res => res.json())
        .catch(e => console.log(e));
      if (!data) return;
      const existingItems: string[] = [];
      listContainer.querySelectorAll('.streamItem').forEach((v) => {
        existingItems.push((v as HTMLElement).dataset.id as string);
      });
      listContainer.appendChild(
        itemsLoader(
          data.relatedStreams.filter(
            (item: StreamItem) => !existingItems.includes(
              item.url.slice(-11))
          )
        )
      );
      return data.nextpage;
    });

  const type = url.includes('channel') ? 'channel' : 'playlist';

  listBtnsContainer.className = type;

  openInYtBtn.innerHTML = '<i class="ri-external-link-line"></i> ' + group.name;

  store.list.name = group.name;
  store.list.url = url;
  store.list.type = type + 's';
  store.list.id = url.slice(type === 'playlist' ? 11 : 9);
  store.list.uploader = group.uploader || group.name;
  store.list.thumbnail = store.list.thumbnail?.startsWith(url) ? store.list.thumbnail.slice(url.length) :
    group.avatarUrl || group.thumbnail || group.relatedStreams[0].thumbnail;

  const db = Object(getDB());

  subscribeListBtn.innerHTML = `<i class="ri-stack-line"></i> Subscribe${db.hasOwnProperty(store.list.type) && db[store.list.type].hasOwnProperty(store.list.id) ? 'd' : ''
    }`;

  if (mix) playAllBtn.click();
  else {
    // replace string for youtube playlist link support
    store.list.url = url.replace('ts/', 't?list=');
    document.title = group.name + ' - ytify';

    history.replaceState({}, '',
      location.origin + location.pathname +
      '?' + url
        .split('/')
        .join('=')
        .substring(1)
    );

  }

}

listContainer.addEventListener('click', superClick);

if (params.has('channel') || params.has('playlists'))
  fetchList('/' +
    location.search
      .substring(1)
      .split('=')
      .join('/')
  );

export function itemsLoader(itemsArray: StreamItem[]) {
  if (!itemsArray.length)
    throw new Error('No Data Found');

  const streamItem = (stream: StreamItem) => StreamItem({
    id: stream.videoId || stream.url.substring(9),
    href: hostResolver(stream.url || 'https://youtu.be/' + stream.videoId),
    title: stream.title,
    author: stream.uploaderName || stream.author,
    duration: (stream.duration || stream.lengthSeconds) > 0 ? convertSStoHHMMSS(stream.duration || stream.lengthSeconds) : 'LIVE',
    uploaded: stream.uploadedDate || stream.publishedText,
    channelUrl: stream.uploaderUrl || stream.authorUrl,
    views: stream.viewCountText || (stream.views > 0 ? numFormatter(stream.views) + ' views' : ''),
    img: getThumbIdFromLink(stream.thumbnail || 'https://i.ytimg.com/vi_webp/' + stream.videoId + '/mqdefault.webp?host=i.ytimg.com')
  })

  const listItem = (item: StreamItem) => ListItem(
    item.name,
    item.subscribers > 0 ?
      (numFormatter(item.subscribers) + ' subscribers') :
      (item.videos > 0 ? item.videos + ' streams' : ''),
    generateImageUrl(
      getThumbIdFromLink(
        item.thumbnail
      )
    ),
    item.description || item.uploaderName,
    item.url
  )

  const fragment = document.createDocumentFragment();
  for (const item of itemsArray)
    render(() => (item.type === 'stream' || item.type === 'video') ? streamItem(item) : listItem(item), fragment);


  return fragment;
}


// TLDR : Stream Item Click Action
export function superClick(e: Event) {
  const elem = e.target as HTMLAnchorElement;
  if (elem.target === '_blank') return;
  e.preventDefault();

  const eld = elem.dataset;
  const elc = elem.classList.contains.bind(elem.classList);

  if (elc('streamItem'))
    return elc('delete') ?
      removeFromCollection(listAnchor.dataset.id as string, eld.id as string)
      : player(eld.id);

  else if (elc('ri-more-2-fill')) {
    superModal.showModal();
    history.pushState({}, '', '#');
    const elp = elem.parentElement?.dataset;
    for (const x in elp)
      superModal.dataset[x] = elp[x];
  }

  else if (elc('ur_pls_item'))
    fetchCollection(elem.textContent as string);

  else if (elc('listItem')) {
    let url = eld.url as string;
    if (!url.startsWith('/channel'))
      url = url.replace('?list=', 's/')
    fetchList(url);
    store.list.thumbnail = url + eld.thumbnail;
  }
}


export async function parseTTML() {

  const imsc = await import('imsc/dist/imsc.all.min.js');

  const myTrack = audio.textTracks[0];
  myTrack.mode = "hidden";
  const d = img.getBoundingClientRect();


  subtitleContainer.style.top = Math.floor(d.y) + 'px';
  subtitleContainer.style.left = Math.floor(d.x) + 'px';
  subtitleSelector.parentElement!.style.position = 'static';
  subtitleSelector.style.top = Math.floor(d.y) + 'px';
  subtitleSelector.style.left = Math.floor(d.x) + 'px';


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
            subtitleContainer.removeChild(subtitleActive);
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
