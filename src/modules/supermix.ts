import { listBtnsContainer, listContainer, listSection, loadingScreen } from "../lib/dom";
import { store } from "../lib/store";
import { convertSStoHHMMSS, getApi, goTo, renderDataIntoFragment } from "../lib/utils";

export default async function(ids: string[]) {

  loadingScreen.showModal();

  const randomInstance = () => getApi('piped',
    Math.floor(Math.random() * store.api.piped.length)
  );

  const fetcher = (id: string): Promise<Piped> => fetch(randomInstance() + '/playlists/RD' + id)
    .then(res => res.json())
    .catch(() => fetcher(id))

  const data = await Promise.all(ids.map(id => fetcher(id)
    .then(data => data.relatedStreams)
    .then(rs => rs
      .filter(s => !ids.includes(s.url.substring(9)))
      .map(s => ({
        id: s.url.substring(9),
        title: s.title,
        author: s.uploaderName,
        channelUrl: s.uploaderUrl,
        duration: convertSStoHHMMSS(s.duration)
      })))
    .finally(() => loadingScreen.close())
  ));

  const map: {
    [index: string]: CollectionItem & { count?: number }
  } = {};

  data.flat().forEach(obj => {
    const key = obj.id;
    key in map ?
      map[key].count!++ :
      map[key] = { ...obj, count: 1 };
  });


  store.list.id = 'supermix';
  listBtnsContainer.className = 'supermix';

  const fragment = document.createDocumentFragment();
  renderDataIntoFragment(map, fragment);

  if (!fragment) return;

  listContainer.innerHTML = '';
  listContainer.appendChild(fragment);
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

