import { html, render } from "lit";
import { audio, canvas, context, img, listAnchor, listContainer, listSection, loadingScreen, openInYtBtn, pipedInstances, playAllBtn, saveListBtn, superModal, thumbnailProxies } from "./dom";
import { removeFromCollection } from "../scripts/library";


export const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const params = (new URL(location.href)).searchParams;

export const $ = document.createElement.bind(document);

export const save = localStorage.setItem.bind(localStorage);

export const getSaved = localStorage.getItem.bind(localStorage);

export const removeSaved = localStorage.removeItem.bind(localStorage);

export const getDB = (): Library => JSON.parse(getSaved('library') || '{"discover":{}}');

export const saveDB = (data: Library) => save('library', JSON.stringify(data));

export const getCollection = (name: string) => <HTMLDivElement>(<HTMLDetailsElement>document.getElementById(name)).lastElementChild;

export const idFromURL = (link: string | null) => link?.match(/(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i)?.[7];

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

export const generateImageUrl = (
  id: string,
  res: string = 'mqdefault',
  proxy: string = thumbnailProxies.value
) => proxy + (id.startsWith('/') ?
  `${id}=s176-c-k-c0x00ffffff-no-rj?host=yt3.googleusercontent.com` :
  `/vi_webp/${id}/${res}.webp?host=i.ytimg.com`);

export function notify(text: string) {
  const el = $('p');
  const clear = () => document.getElementsByClassName('snackbar')[0] && el.remove();
  el.className = 'snackbar';
  el.textContent = text;
  el.onclick = clear;
  setTimeout(clear, 8e3);
  document.body.appendChild(el);
}

const linkHost = (<HTMLSelectElement>document.getElementById('linkHost'));
const savedLinkHost = getSaved('linkHost');
if (savedLinkHost)
  linkHost.value = savedLinkHost;

linkHost.addEventListener('change', () => {
  linkHost.selectedIndex === 0 ?
    removeSaved('linkHost') :
    save('linkHost', linkHost.value);
});

export const hostResolver = (url: string) =>
  linkHost.value + (linkHost.value.includes('ytify') ? url.
    startsWith('/watch') ?
    ('?s' + url.slice(8)) :
    ('/list?' + url.slice(1).split('/').join('=')) : url);


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

// Square Image Generator 
export function sqrThumb(canvasImg: HTMLImageElement) {
  const width = canvasImg.width;
  const height = canvasImg.height;
  const side = Math.min(width, height);
  canvas.width = side;
  canvas.height = side;
  // centre the selection
  const offsetX = (width - side) / 2;
  const offsetY = (height - side) / 2;
  context.drawImage(canvasImg, offsetX, offsetY, side, side, 0, 0, side, side);
  return canvas.toDataURL();
}


img.onload = () => img.naturalWidth === 120 ? img.src = img.src.replace('maxres', 'mq').replace('.webp', '.jpg').replace('vi_webp', 'vi') : '';
img.onerror = () => img.src.includes('max') ? img.src = img.src.replace('maxres', 'mq') : '';


export function setMetaData(
  id: string,
  streamName: string,
  authorName: string,
  authorUrl: string,
  music: boolean = false
) {
  const imgX = generateImageUrl(id, 'maxresdefault');
  if (!getSaved('img') && !music)
    img.src = imgX;

  img.alt = streamName;

  const title = <HTMLAnchorElement>document.getElementById('title');
  title.href = hostResolver(`/watch?v=${id}`);
  title.textContent = streamName;
  title.onclick = _ => {
    _.preventDefault();
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

  const author = <HTMLAnchorElement>document.getElementById('author');
  author.href = 'https://youtube.com' + authorUrl;
  author.onclick = _ => {
    _.preventDefault();
    fetchList(authorUrl);
  }
  author.textContent = authorName;

  if (location.pathname === '/')
    document.title = streamName + ' - ytify';

  const canvasImg = new Image();
  canvasImg.onload = () => {
    const sqrImg = getSaved('img') ? blankImage : sqrThumb(canvasImg);
    if (music)
      img.src = sqrImg;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setPositionState();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: streamName,
        artist: authorName,
        artwork: [
          { src: sqrImg, sizes: '96x96' },
          { src: sqrImg, sizes: '128x128' },
          { src: sqrImg, sizes: '192x192' },
          { src: sqrImg, sizes: '256x256' },
          { src: sqrImg, sizes: '384x384' },
          { src: sqrImg, sizes: '512x512' },
        ]
      });
    }

  }
  canvasImg.crossOrigin = '';
  canvasImg.src = imgX;
}



export function fetchList(url: string, mix = false) {

  loadingScreen.showModal();

  fetch(pipedInstances.value + url)
    .then(res => res.json())
    .then(group => {
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
            pipedInstances.value + '/nextpage/' +
            url.substring(1) + '?nextpage=' + encodeURIComponent(token)
          )
            .then(res => res.json())
            .catch(e => console.log(e));
          if (!data) return;
          listContainer.appendChild(itemsLoader(data.relatedStreams));
          return data.nextpage;
        });

      openInYtBtn.innerHTML = '<i class="ri-youtube-line"></i> ' + group.name;
      saveListBtn.innerHTML = `<i class="ri-stack-line"></i> ${url.includes('channel') ? 'Subscribe' : 'Save'}`;

      if (mix) playAllBtn.click();
      else {
        history.replaceState({}, '',
          location.origin + location.pathname +
          '?' + url
            .split('/')
            .join('=')
            .substring(1)
        );
        document.title = group.name + ' - ytify';
      }
    })
    .catch(err => {
      if (err.message !== 'No Data Found' && pipedInstances.selectedIndex < pipedInstances.length - 1) {
        pipedInstances.selectedIndex++;
        fetchList(url, mix);
        return;
      }
      notify(mix ? 'No Mixes Found' : err.message);
      pipedInstances.selectedIndex = 0;
    })
    .finally(() => loadingScreen.close());
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

  const streamItem = (stream: StreamItem) => html`<stream-item 
      data-id=${stream.url.substring(9)} 
      data-title=${stream.title}
      data-author=${stream.uploaderName}
      views=${stream.views > 0 ? numFormatter(stream.views) + ' views' : ''}
      data-duration=${convertSStoHHMMSS(stream.duration)}
      uploaded=${stream.uploadedDate}
      data-channel_url=${stream.uploaderUrl}
  />`;

  function getThumbIdFromLink(url: string) {
    // for featured playlists
    if (url.startsWith('/')) return url;

    const l = new URL(url);
    const p = l.pathname;

    return l.search.includes('ytimg') ?
      p.split('/')[2] :
      p.split('=')[0];
  }

  const listItem = (item: StreamItem) => html`<list-item
      title=${item.name}
      thumbnail=${!getSaved('img') && item.thumbnail ?
      generateImageUrl(
        getThumbIdFromLink(
          item.thumbnail
        )
      ) : blankImage
    }
    uploader_data = ${item.description || item.uploaderName}
    stats = ${item.subscribers > 0 ?
      (numFormatter(item.subscribers) + ' subscribers') :
      (item.videos > 0 ? item.videos + ' streams' : '')
    }
    type = ${item.type}
    url = ${item.url}
    />`;

  const fragment = document.createDocumentFragment();

  render(html`${itemsArray.map(item =>
    html`<a href=${hostResolver(item.url)}>
    ${item.type !== 'stream' ?
        listItem(item) :
        streamItem(item)}
    </a>`
  )}`, fragment);

  return fragment;
}

export function superClick(e: Event) {
  e.preventDefault();
  const elem = e.target as HTMLElement;

  if (elem.matches('stream-item')) {
    const eld = elem.dataset;
    if (elem.classList.contains('delete')) {
      const anchor = elem.parentElement as HTMLAnchorElement;
      const div = anchor.parentElement as HTMLDivElement;
      const details = div.parentElement as HTMLDetailsElement;
      removeFromCollection(details.id, eld.id as string);
      return;
    }
    superModal.showModal();
    history.pushState({}, '', '#');
    const smd = superModal.dataset;
    smd.id = eld.id
    smd.title = eld.title;
    smd.author = eld.author;
    smd.channelUrl = eld.channel_url;
    smd.duration = eld.duration;
  }

  if (elem.matches('list-item')) {
    const url = elem.getAttribute('url') as string;
    fetchList(
      elem.getAttribute('type') === 'playlist' ?
        url.replace('?list=', 's/') :
        url
    );
    // data binding for open channel action
    listContainer.dataset.url = url;
  }
}
