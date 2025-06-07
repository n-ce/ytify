import { listBtnsContainer, listContainer, listSection, loadingScreen } from "../lib/dom";
import { renderCollection } from "../lib/libraryUtils";
import { store } from "../lib/store";
import { convertSStoHHMMSS, goTo } from "../lib/utils";

export default async function(ids: string[]) {

  let index = 0;
  const pi = store.api.piped.concat(store.player.hls.api);
  function instance() {
    if (index < pi.length - 1)
      index++;
    else index = 0;
    return pi[index];
  }

  const fetcher = (id: string): Promise<{
    url: string,
    title: string,
    uploaderName: string,
    uploaderUrl: string,
    duration: number
  }[]> => fetch(instance() + '/playlists/RD' + id)
    .then(res => res.json())
    .then(data => data.message === 'Could not get playlistData' ?
      [] : data.relatedStreams)
    .catch(() => [])

  loadingScreen.showModal();

  const data = await Promise.all(ids.map(fetcher));
  const map: {
    [index: string]: CollectionItem & { count?: number }
  } = {};

  data
    .flat()
    .map(s => ({
      id: s.url.substring(9),
      title: s.title,
      author: s.uploaderName,
      channelUrl: s.uploaderUrl,
      duration: convertSStoHHMMSS(s.duration)
    }))
    .forEach(obj => {
      const key = obj.id;
      if (!ids.includes(key))
        key in map ?
          map[key].count!++ :
          map[key] = { ...obj, count: 1 };
    });

  const mixArray = Object
    .values(map)
    .sort((a, b) => b.count! - a.count!)


  loadingScreen.close();
  store.list.id = 'supermix';
  listBtnsContainer.className = 'supermix';

  renderCollection(mixArray);

  const isReversed = listContainer.classList.contains('reverse');

  if (isReversed)
    listContainer.classList.remove('reverse');


  listBtnsContainer.className = 'supermix';

  if (location.pathname !== '/list')
    goTo('/list');

  listSection.scrollTo(0, 0);
  history.replaceState({}, '',
    location.origin + location.pathname + '?supermix=' + ids.join('+')
  );

  document.title = 'Supermix - ytify';
}

