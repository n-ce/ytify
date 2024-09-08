import { listContainer, subscribeListBtn } from "../lib/dom";
import { getThumbIdFromLink } from "../lib/imageUtils";
import { addListToCollection, createCollection, saveDB, toCollection } from "../lib/libraryUtils";
import { store } from "../lib/store";
import { notify } from "../lib/utils";

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
  saveDB(db);
}

export function importList() {

  const listTitle = prompt('Set Title', store.list.name);

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
  notify(listTitle + ' has been imported to your collections.');
}


export function shareCollection(shareId: string) {
  const text = location.origin + location.pathname + '?si=' + shareId;
  const type = "text/plain";
  const blob = new Blob([text], { type });
  const data = [new ClipboardItem({ [type]: blob })];
  navigator.clipboard.write(data);

}

