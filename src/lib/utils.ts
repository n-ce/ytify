import { audio, img, listAnchor, listContainer, listSection, loadingScreen, openInYtBtn, instanceSelector, playAllBtn, subtitleContainer, subtitleTrack, superModal, listBtnsContainer, title, subscribeListBtn } from "./dom";
import { getDB, removeFromCollection } from "./libraryUtils";
import { generateImageUrl, getThumbIdFromLink, sqrThumb } from "./imageUtils";
import { render } from 'solid-js/web';
import ListItem from "../components/ListItem";
import StreamItem from "../components/StreamItem";
import player from "./player";

export const params = (new URL(location.href)).searchParams;

export const $ = document.createElement.bind(document);

export const save = localStorage.setItem.bind(localStorage);

export const getSaved = localStorage.getItem.bind(localStorage);

export const removeSaved = localStorage.removeItem.bind(localStorage);

export const getApi = (type: string, index: number = -1) => JSON.parse((index > -1) ? instanceSelector.options[index].value : instanceSelector.value)[type];

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export const supportsOpus = (): Promise<boolean> => navigator.mediaCapabilities.decodingInfo({
  type: 'file',
  audio: {
    contentType: 'audio/ogg;codecs=opus'
  }
}).then(res => res.supported);

export const hostResolver = (url: string) =>
  linkHost.value + (linkHost.value.includes('ytify') ? url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + url.slice(1).split('/').join('=')) : url);

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


const linkHost = <HTMLSelectElement>document.getElementById('linkHost');

const savedLinkHost = getSaved('linkHost');
if (savedLinkHost)
  linkHost.value = savedLinkHost;

linkHost.addEventListener('change', () => {
  linkHost.selectedIndex === 0 ?
    removeSaved('linkHost') :
    save('linkHost', linkHost.value);
  location.reload();
});


const showImg = getSaved('imgLoad') !== 'off';

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
  if (showImg) {
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
  // using classic onclick to avoid attesting listeners
  document.getElementById('moreBtn')!.onclick = () => {
    superModal.showModal();
    history.pushState({}, '', '#');
    const s = superModal.dataset;
    const a = audio.dataset;
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

  listContainer.innerHTML = '';
  listContainer.appendChild(
    itemsLoader(
      group.relatedStreams
    )
  );

  listAnchor.click();
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
      })).observe(listContainer.children[listContainer.childElementCount - 3]);
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
      for (const item of listContainer.children)
        existingItems.push((<HTMLAnchorElement>item).href.slice(-11))

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

  const lcd = listContainer.dataset;
  lcd.url = url;
  lcd.type = type + 's';
  lcd.name = group.name;
  lcd.id = url.slice(type === 'playlist' ? 11 : 9);
  lcd.uploader = group.uploader || group.name;
  lcd.thumbnail = lcd.thumbnail?.startsWith(url) ? lcd.thumbnail.slice(url.length) :
    group.avatarUrl || group.thumbnail || group.relatedStreams[0].thumbnail;

  const db = Object(getDB());

  subscribeListBtn.innerHTML = `<i class="ri-stack-line"></i> Subscribe${db.hasOwnProperty(lcd.type) && db[lcd.type].hasOwnProperty(lcd.id) ? 'd' : ''
    }`;

  if (mix) playAllBtn.click();
  else {
    history.replaceState({}, '',
      location.origin + location.pathname +
      '?' + url
        .split('/')
        .join('=')
        .substring(1)
    );
    listContainer.dataset.url = url;
    document.title = group.name + ' - ytify';
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
    id: stream.url.substring(9),
    href: hostResolver(stream.url),
    title: stream.title,
    author: stream.uploaderName,
    duration: stream.duration > 0 ? convertSStoHHMMSS(stream.duration) : 'LIVE',
    uploaded: stream.uploadedDate,
    channelUrl: stream.uploaderUrl,
    views: (stream.views > 0 ? numFormatter(stream.views) + ' views' : ''),
    img: getThumbIdFromLink(stream.thumbnail)
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
    render(() => item.type === 'stream' ? streamItem(item) : listItem(item), fragment);


  return fragment;
}


// TLDR : Stream Item Click Action
export function superClick(e: Event) {
  e.preventDefault();

  const elem = e.target as HTMLAnchorElement;
  const eld = elem.dataset;
  const elc = elem.classList.contains.bind(elem.classList);

  if (elc('streamItem'))
    return elc('delete') ?
      removeFromCollection(listAnchor.dataset.id as string, eld.id as string)
      : player(eld.id);

  if (elc('ri-more-2-fill')) {
    superModal.showModal();
    history.pushState({}, '', '#');
    const elp = elem.parentElement?.dataset;
    for (const x in elp)
      superModal.dataset[x] = elp[x]
  }

  if (elc('listItem')) {
    let url = eld.url as string;
    if (!url.startsWith('/channel'))
      url = url.replace('?list=', 's/')
    fetchList(url);
    listContainer.dataset.thumbnail = url + eld.thumbnail;
  }
}


export async function parseTTML() {

  const imsc = await import('imsc/dist/imsc.all.min.js');

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
