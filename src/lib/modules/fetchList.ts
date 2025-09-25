import { getDB, saveDB } from "../utils/library";
import { getApi } from "../utils";
import { store, setListStore, setStore, t, listStore } from "../stores";

const streamToCollectionItem = (stream: StreamItem): CollectionItem => ({
  id: stream.videoId,
  title: stream.title,
  author: stream.uploaderName,
  duration: stream.duration.toString(),
  channelUrl: stream.uploaderUrl,
});

export default async function fetchList(
  url: string | undefined,
  mix = false
) {

  if (!url)
    return setStore('snackbar', t('fetchlist_url_null'));

  setListStore('isLoading', true);

  const useHyperpipe = !mix && (store.actionsMenu.author.endsWith(' - Topic') || listStore.name.startsWith('Artist'));

  if (useHyperpipe) {
    url = await getPlaylistIdFromArtist(url) || '';

    if (!url) {
      setListStore('isLoading', false);
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
        setStore('snackbar', t('fetchlist_error'));
      else if (err.message === 'Got error: "The playlist does not exist."') {
        setStore('snackbar', t('fetchlist_nonexistent'));
        const db = getDB();
        if (db.playlists)
          delete db.playlists[url.slice(11)];
        saveDB(db);
      }
      else setStore('snackbar', mix ? 'No Mixes Found' : err.message)
      setListStore('isLoading', false);
    })

  if (!group?.relatedStreams?.length)
    return;

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

  const listData = filterOutMembersOnly(group.relatedStreams).map(streamToCollectionItem);
  setListStore('list', listData);

  if (location.pathname !== '/list')
    history.pushState({}, '', '/list');

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
      .observe(document.querySelector('#listContainer')!.children[document.querySelector('#listContainer')!.childElementCount - 3]);
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
      document.querySelector('#listContainer')!.querySelectorAll('.streamItem').forEach((v) => {
        existingItems.push((v as HTMLElement).dataset.id as string);
      });


      data.relatedStreams = data.relatedStreams.filter(
        (item: StreamItem) => !existingItems.includes(
          item.url.slice(-11))
      );

      const newListData = filterOutMembersOnly(data.relatedStreams).map(streamToCollectionItem);
      setListStore('list', l => [...l, ...newListData]);
      return data.nextpage || '';
    });


  if (!useHyperpipe) {
    setListStore('name', group.name);
    setListStore('url', url);
    setListStore('id', url.slice(type === 'playlist' ? 11 : 9));
    setListStore('thumbnail', listStore.thumbnail || group.avatarUrl || group.thumbnail || group.relatedStreams[0].thumbnail);
    setListStore('type', type);
  }

  if (mix) { // playAllBtn.click();
  } else {
    // replace string for youtube playlist link support
    setListStore('url', url.replace('ts/', 't?list='));
    document.title = group.name + ' - ytify';

    history.replaceState({}, '',
      location.origin + location.pathname +
      '?' + url
        .split('/')
        .join('=')
        .substring(1)
    );
  }
  setListStore('isLoading', false);
}


const getPlaylistIdFromArtist = (id: string): Promise<string> =>
  fetch('/artists/' + id)
    .then(res => res.json())
    .then(data => {
      if (!('playlistId' in data))
        throw new Error('No Playlist Id found.');
      setListStore('id', id.slice(9));
      setListStore('type', 'channel');
      setListStore('thumbnail', listStore.thumbnail || '/a-' + data.thumbnails[0]?.url?.split('/a-')[1]?.split('=')[0]);
      return '/playlists/' + data.playlistId;
    })
    .catch(err => {
      setStore('snackbar', err.message);
      return '';
    })
