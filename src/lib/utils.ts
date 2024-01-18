import { audio, canvas, context, img, listAnchor, listContainer, listSection, loadingScreen, openInYtBtn, pipedInstances, playAllBtn, saveListBtn, superModal, thumbnailProxies } from "./dom";


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

export const imgUrl = (id: string, res: string, proxy: string = thumbnailProxies.value) => `${proxy}/vi_webp/${id}/${res}.webp?host=i.ytimg.com`;

export const numFormatter = (num: number): string => Intl.NumberFormat('en', { notation: 'compact' }).format(num);

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

let api = 0;
export const loadMoreResults = async (urlComponent: string, token: string) =>
  fetch(pipedInstances.options[api].value + '/nextpage/' + urlComponent + 'nextpage=' + encodeURIComponent(token))
    .then(res => res.json())
    .catch(_ => {
      api++;
      pipedInstances.length === api ?
        notify(_.message) :
        loadMoreResults(urlComponent, token);
    });


export function setMetaData(
  id: string,
  streamName: string,
  authorName: string,
  authorUrl: string
) {

  if (!getSaved('img'))
    img.src = imgUrl(id, 'maxresdefault');

  img.alt = streamName;

  const title = <HTMLAnchorElement>document.getElementById('title');
  title.href = `https://youtube.com/watch?v=${id}`;
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
    // // Square Image Generator 
    const width = canvasImg.width;
    const height = canvasImg.height;
    const side = Math.min(width, height);
    canvas.width = side;
    canvas.height = side;
    // centre the selection
    const offsetX = (width - side) / 2;
    const offsetY = (height - side) / 2;
    context.drawImage(canvasImg, offsetX, offsetY, side, side, 0, 0, side, side);
    // // // // // // // // //

    const notifImg = getSaved('img') ? blankImage : canvas.toDataURL();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setPositionState();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: streamName,
        artist: authorName,
        artwork: [
          { src: notifImg, sizes: '96x96' },
          { src: notifImg, sizes: '128x128' },
          { src: notifImg, sizes: '192x192' },
          { src: notifImg, sizes: '256x256' },
          { src: notifImg, sizes: '384x384' },
          { src: notifImg, sizes: '512x512' },
        ]
      });
    }

  }
  canvasImg.crossOrigin = '';
  canvasImg.src = img.src;
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


export function createStreamItem(stream: StreamItem) {
  const id = stream.url.substring(9);
  const streamItem = $('stream-item');
  streamItem.dataset.id = id;
  streamItem.textContent = streamItem.dataset.title = stream.title;
  streamItem.dataset.author = stream.uploaderName;
  streamItem.dataset.channelUrl = stream.uploaderUrl;
  streamItem.dataset.views = stream.views > 0 ? numFormatter(stream.views) + ' views' : '';
  streamItem.dataset.duration = convertSStoHHMMSS(stream.duration);
  streamItem.dataset.uploaded = stream.uploadedDate || '';
  streamItem.dataset.avatar = stream.uploaderAvatar || '';
  streamItem.addEventListener('click', () => {
    superModal.showModal();
    history.pushState({}, '', '#');
    const _ = superModal.dataset;
    _.id = id;
    _.title = stream.title;
    _.author = stream.uploaderName;
    _.channelUrl = stream.uploaderUrl;
    _.duration = streamItem.dataset.duration;
  })
  return streamItem;
}

export function fetchList(url: string, mix = false) {

  loadingScreen.showModal();

  fetch(pipedInstances.value + url)
    .then(res => res.json())
    .then(group => {
      listContainer.innerHTML = '';
      listContainer.appendChild(itemsLoader(group.relatedStreams));
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
          const data = await loadMoreResults(url.substring(1) + '?', token);
          listContainer.appendChild(itemsLoader(data.relatedStreams));
          return data.nextpage;
        });

      openInYtBtn.innerHTML = '<i class="ri-youtube-line"></i> ' + group.name;
      saveListBtn.innerHTML = `<i class="ri-stack-line"></i> ${url.includes('channel') ? 'Subscribe' : 'Save'}`;

      if (mix) playAllBtn.click();
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


function createListItem(list: StreamItem) {
  const listItem = $('list-item');
  listItem.textContent = list.name;
  listItem.dataset.thumbnail = list.thumbnail;
  listItem.dataset.uploaderData = list.description || list.uploaderName || '';

  listItem.dataset.stats = list.subscribers > 0 ? numFormatter(list.subscribers) + ' subscribers' : list.videos > 0 ? list.videos + ' streams' : '';

  listItem.addEventListener('click', () => {
    fetchList(
      list.type === 'playlist' ?
        list.url.replace('?list=', 's/') :
        list.url
    );
    // data binding for open channel action
    listContainer.dataset.url = list.url;
  });
  return listItem;
}



export function itemsLoader(itemsArray: StreamItem[]): DocumentFragment {
  if (!itemsArray.length)
    throw new Error('No Data Found');
  const fragment = document.createDocumentFragment();

  for (const item of itemsArray)
    fragment.appendChild(
      item.type !== 'stream' ?
        createListItem(item) :
        createStreamItem(item)
    );

  return fragment;
}
