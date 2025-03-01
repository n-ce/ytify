import { goTo, i18n, notify, removeSaved, save } from "../lib/utils";
import { queuelist } from "../lib/dom";
import player from "../lib/player";
import StreamItem from "../components/StreamItem";
import { render } from "solid-js/web";
import { store, getSaved } from "../lib/store";
import Sortable, { type SortableEvent } from 'sortablejs';

const [
  clearQBtn,
  shuffleQBtn,
  removeQBtn,
  filterLT10Btn,
  allowDuplicatesBtn,
  enqueueRelatedStreamsBtn
] = (<HTMLSpanElement>document.getElementById('queuetools')).children as HTMLCollectionOf<HTMLButtonElement>;

export const firstItemInQueue = () => <HTMLElement>queuelist.firstElementChild;

export function appendToQueuelist(data: DOMStringMap | CollectionItem, prepend: boolean = false) {
  if (!data.id) return;

  const { queue } = store;

  if (!allowDuplicatesBtn.classList.contains('redup'))
    if (queue.includes(data.id))
      return;

  if (filterLT10Btn.classList.contains('filter_lt10'))
    if (isLongerThan10Min(<string>data.duration))
      return;

  if (firstItemInQueue()?.matches('h1')) firstItemInQueue().remove();

  if (removeQBtn.classList.contains('delete'))
    removeQBtn.click();

  if (prepend)
    queue.unshift(data.id);
  else
    queue.push(data.id);


  const fragment = document.createDocumentFragment();

  render(() => StreamItem({
    id: data.id || '',
    title: data.title || '',
    author: data.author || '',
    duration: data.duration || '',
    draggable: true
  }), fragment);

  if (prepend)
    queuelist.prepend(fragment);
  else
    queuelist.appendChild(fragment);

}


queuelist.addEventListener('click', e => {

  e.preventDefault();

  const queueItem = e.target as HTMLAnchorElement & { dataset: CollectionItem };
  if (!queueItem.classList.contains('streamItem')) return;
  const id = queueItem.dataset.id || '';

  function addToTrash() {
    const current = sessionStorage.getItem('trashHistory') || '';
    if (!current?.includes(id))
      sessionStorage.setItem('trashHistory', current + id);
  }

  if (queueItem.classList.contains('delete'))
    addToTrash();
  else player(id);

  const index = store.queue.indexOf(id);

  store.queue.splice(index, 1);
  queuelist.children[index].remove();
});


// clones any list items from the provided container to queue

export function listToQ(container: HTMLDivElement) {
  const items = container.querySelectorAll('.streamItem') as NodeListOf<HTMLElement>;
  items.forEach(item => {
    appendToQueuelist(item.dataset);
  });
  goTo('/upcoming');
}

export function clearQ() {
  store.queue.length = 0;
  queuelist.innerHTML = '';
}

clearQBtn.addEventListener('click', clearQ);

shuffleQBtn.addEventListener('click', () => {

  for (let i = queuelist.children.length; i >= 0; i--)
    queuelist.appendChild(queuelist.children[Math.random() * i | 0]);

  store.queue.length = 0;

  for (const item of queuelist.children)
    store.queue.push((<HTMLElement>item).dataset.id || '');

});

removeQBtn.addEventListener('click', () => {
  queuelist.querySelectorAll('.streamItem').forEach(el => {
    el.classList.toggle('delete')
  });
  removeQBtn.classList.toggle('delete');
});

const actions: [HTMLButtonElement, string, string][] = [
  [filterLT10Btn, 'filterLT10', 'filter_lt10'],
  [enqueueRelatedStreamsBtn, 'enqueueRelatedStreams', 'checked'],
  [allowDuplicatesBtn, 'allowDuplicates', 'redup']
];

actions.forEach(_ => {
  const [btn, ls, clss] = _;

  btn.addEventListener('click', () => {

    if (btn.classList.contains(clss))
      removeSaved(ls);
    else
      save(ls, 'on');

    btn.classList.toggle(clss);

    if (ls === 'filterLT10')
      filterLT10();
    else
      notify(i18n('upcoming_change'));
  });

  if (getSaved(ls) === 'on')
    btn.className = clss;
});


function filterLT10() {
  // Prevent Queue Conflicts
  if (removeQBtn.classList.contains('delete'))
    removeQBtn.click();

  const items = queuelist.querySelectorAll('.streamItem') as NodeListOf<HTMLElement>;
  items.forEach(el => {
    const duration = el.dataset.duration as string
    if (!isLongerThan10Min(duration))
      return;
    el.classList.add('delete');
    el.click()

  });
}


function isLongerThan10Min(duration: string) {
  const hhmmss = duration.split(':');
  return !(
    hhmmss.length === 2 &&
    parseInt(hhmmss[0]) < 10
  );
}

new Sortable(queuelist, {
  handle: '.ri-draggable',
  onUpdate(e: SortableEvent) {
    if (e.oldIndex == null || e.newIndex == null) return;
    const queueArray = store.queue;
    queueArray.splice(e.newIndex, 0, queueArray.splice(e.oldIndex, 1)[0]);
  }
});
