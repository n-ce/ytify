import { listContainer, loadingScreen, subscribeListBtn } from "../lib/dom";
import { getThumbIdFromLink } from "../lib/imageUtils";
import { addListToCollection, createCollection, saveDB, toCollection } from "../lib/libraryUtils";
import { store } from "../lib/store";
import { i18n, notify } from "../lib/utils";

export function subscribeList(db: Library) {
  const l = store.list;
  const state = [' Subscribe', ' Subscribed'];
  const dom = subscribeListBtn.firstElementChild as HTMLParagraphElement;
  const domState = dom.dataset.state as ' Subscribe' | ' Subscribed';

  if (domState === state[1]) {
    delete db[l.type][l.id];
    state.reverse();
  }
  else {
    const dataset: List & { uploader?: string } = {
      id: l.id,
      name: l.name,
      thumbnail: getThumbIdFromLink(l.thumbnail)
    };

    if (l.type === 'playlists')
      dataset.uploader = l.uploader;

    toCollection(l.type, dataset, db);
  }
  dom.dataset.state = state[1];
  saveDB(db, 'subscribe');
}

export function importList() {

  const listTitle = prompt(i18n('list_set_title'), store.list.name);

  if (!listTitle) return;

  createCollection(listTitle);

  const list: { [index: string]: DOMStringMap } = {};
  listContainer
    .querySelectorAll('.streamItem')
    .forEach(_ => {
      const sender = (<HTMLElement>_).dataset;
      const sid = <string>sender.id;
      list[sid] = {
        'id': sender.id,
        'title': sender.title,
        'author': sender.author,
        'duration': sender.duration,
        'channelUrl': sender.channel_url
      };
    });

  addListToCollection(listTitle, list);
  notify(i18n('list_imported', listTitle));
}

export function shareCollection(data: Collection) {

  loadingScreen.showModal();

  fetch(location.origin + '/blob', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(res => res.text())
    .then(_ => {
      const type = "text/plain";
      const blob = new Blob([_], { type });
      const link = [new ClipboardItem({ [type]: blob })];
      navigator.clipboard.write(link);
    })
    .catch(() => {
      alert('failed');
    })
    .finally(() => loadingScreen.close());

}


