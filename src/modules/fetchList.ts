import { listBtnsContainer, listContainer, listSection, listTitle, loadingScreen, openInYtBtn, playAllBtn, subscribeListBtn } from "../lib/dom";
import { getDB, saveDB } from "../lib/libraryUtils";
import { errorHandler, getApi, goTo, notify, superClick } from "../lib/utils";
import { store } from "../lib/store";
import { render } from "uhtml";
import ItemsLoader from "../components/ItemsLoader";
import { i18n } from "../scripts/i18n";


export default async function fetchList(
  url: string | undefined,
  mix = false
) {

  if (!url)
    return notify(i18n('fetchlist_url_null'));

  loadingScreen.showModal();

  let listData: StreamItem[] = [];
  const useHyperpipe = !mix && (store.actionsMenu.author.endsWith(' - Topic') || store.list.name.startsWith('Artist'));

  if (useHyperpipe) {
    url = await getPlaylistIdFromArtist(url) || '';

    if (!url) {
      loadingScreen.close();
      return;
    }
  }

  const api = getApi('piped');
  const type = url.includes('channel') ? 'channel' : 'playlist';
  const musicEnforcer = url.includes('OLAK5uy');
  const group = await fetch(api + url)
    .then(res => res.json())
    .then(data => {
      if ('error' in data)
        throw data;
      else return data;
    })
    .catch(err => {
      if (err.message === 'Could not get playlistData')
        notify(i18n('fetchlist_error'));
      else if (err.message === 'Got error: "The playlist does not exist."') {
        notify(i18n('fetchlist_nonexistent'));
        const db = getDB();
        delete db.playlists[url.slice(11)];
        saveDB(db);
      }
      else errorHandler(
        mix ? 'No Mixes Found' : err.message,
        () => fetchList(url, mix)
      )
    })
    .finally(() => loadingScreen.close());

  if (!group?.relatedStreams?.length)
    return;

  if (listContainer.classList.contains('reverse'))
    listContainer.classList.remove('reverse');

  if (musicEnforcer)
    group.relatedStreams = group.relatedStreams.map(
      (item: StreamItem) => {
        if (!item.uploaderName.endsWith(' - Topic'))
          item.uploaderName += ' - Topic';
        return item;
      }
    );

  const filterOutMembersOnly = (streams: StreamItem[]) =>
    (type === 'channel' && streams.length) ? // hide members-only streams
      streams.filter((s: StreamItem) => s.views !== -1) :
      streams;

  listData = filterOutMembersOnly(group.relatedStreams);

  render(listContainer, ItemsLoader(listData));

  if (location.pathname !== '/list')
    goTo('/list');
  listSection.scrollTo(0, 0);

  const tokens = [group.nextpage];

  function setObserver(callback: () => Promise<string>) {
    new IntersectionObserver((entries, observer) =>
      entries.forEach(async e => {
        if (e.isIntersecting) {

          const token = await callback();
          observer.disconnect();
          if (!token || tokens.indexOf(token) !== -1) return;
          tokens.push(token);
          setObserver(callback);
        }
      }))
      .observe(listContainer.children[listContainer.childElementCount - 3]);
  }
  if (!mix && group.nextpage)
    setObserver(async () => {
      const data = await fetch(
        api + '/nextpage/' +
        url.substring(1) + '?nextpage=' + encodeURIComponent(tokens[tokens.length - 1])
      )
        .then(res => res.json())
        .catch(e => console.log(e));
      if (!data) return;
      const existingItems: string[] = [];
      listContainer.querySelectorAll('.streamItem').forEach((v) => {
        existingItems.push((v as HTMLElement).dataset.id as string);
      });


      data.relatedStreams = data.relatedStreams.filter(
        (item: StreamItem) => !existingItems.includes(
          item.url.slice(-11))
      );

      if (musicEnforcer)
        data.relatedStreams = data.relatedStreams.map(
          (item: StreamItem) => {
            if (!item.uploaderName.endsWith(' - Topic'))
              item.uploaderName += ' - Topic';
            return item;
          }
        );

      listData = listData.concat(filterOutMembersOnly(data.relatedStreams));
      render(listContainer, ItemsLoader(listData));
      return data.nextpage || '';
    });


  listBtnsContainer.className = type;

  (openInYtBtn.firstElementChild as HTMLParagraphElement)
    .dataset.state = ' ' + group.name;


  if (!useHyperpipe) {
    store.list.name = group.name;
    store.list.url = url;
    store.list.id = url.slice(type === 'playlist' ? 11 : 9);
    store.list.thumbnail = store.list.thumbnail || group.avatarUrl || group.thumbnail || group.relatedStreams[0].thumbnail;
    store.list.type = type + 's';
  }

  listTitle.textContent = store.list.name;
  const db = Object(getDB());


  (subscribeListBtn.firstElementChild as HTMLParagraphElement)
    .dataset.state = db.hasOwnProperty(store.list.type) && db[store.list.type].hasOwnProperty(store.list.id) ? ' Subscribed' : ' Subscribe';


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

const getPlaylistIdFromArtist = (id: string, index = 0): Promise<string> =>
  fetch(store.api.hyperpipe[index] + id)
    .then(res => res.json())
    .then(data => {
      if (!('playlistId' in data))
        throw new Error('No Playlist Id found.');
      store.list.id = id.slice(9);
      store.list.type = 'channels';
      store.list.thumbnail = store.list.thumbnail || '/a-' + data.thumbnails[0]?.url?.split('/a-')[1]?.split('=')[0];
      return '/playlists/' + data.playlistId;
    })
    .catch(async err => {
      if (index + 1 === store.api.hyperpipe.length)
        return await getPlaylistIdFromArtist(id, index);
      notify(err.message);
      return '';
    })
