import { goTo, removeSaved, save } from "../lib/utils";
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
  enqueueRelatedStreamsBtn,
  allowDuplicatesBtn
] = (<HTMLSpanElement>document.getElementById('queuetools')).children as HTMLCollectionOf<HTMLButtonElement>;

export const firstItemInQueue = () => <HTMLElement>queuelist.firstElementChild;

export function appendToQueuelist(data: DOMStringMap | CollectionItem, prepend: boolean = false) {
  if (!data.id) return;

  if (!allowDuplicatesBtn.classList.contains('redup'))
    if (store.queue.includes(data.id))
      return;

  if (filterLT10Btn.classList.contains('filter'))
    if (isLongerThan10Min(<string>data.duration))
      return;

  if (firstItemInQueue()?.matches('h1')) firstItemInQueue().remove();

  if (removeQBtn.classList.contains('delete'))
    removeQBtn.click();

  prepend ?
    store.queue.unshift(data.id) :
    store.queue.push(data.id);


  const fragment = document.createDocumentFragment();

  render(() => StreamItem({
    id: data.id || '',
    title: data.title || '',
    author: data.author || '',
    duration: data.duration || '',
    draggable: true
  }), fragment);

  prepend ?
    queuelist.prepend(fragment) :
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

  queueItem.classList.contains('delete') ?
    addToTrash() :
    player(id);

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




filterLT10Btn.addEventListener('click', () => {

  filterLT10Btn.classList.toggle('filter');
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
});


enqueueRelatedStreamsBtn.addEventListener('click', () => {
  enqueueRelatedStreamsBtn.classList.contains('checked') ?
    removeSaved('enqueueRelatedStreams') :
    save('enqueueRelatedStreams', 'on');
  enqueueRelatedStreamsBtn.classList.toggle('checked');
});

if (getSaved('enqueueRelatedStreams') === 'on')
  enqueueRelatedStreamsBtn.className = 'checked';



allowDuplicatesBtn.addEventListener('click', () => {
  allowDuplicatesBtn.classList.contains('redup') ?
    removeSaved('allowDuplicates') :
    save('allowDuplicates', 'true');
  allowDuplicatesBtn.classList.toggle('redup');
});

if (getSaved('allowDuplicates') === 'true')
  allowDuplicatesBtn.className = 'redup';



function isLongerThan10Min(duration: string) {
  const hhmmss = duration.split(':');
  return !(
    hhmmss.length === 2 &&
    parseInt(hhmmss[0]) < 10
  );
}

// queuelist mutation observer

new MutationObserver(m => {
  for (const mutation of m) {
    if (mutation.type === "childList") {
      const query = store.queue.join('');
      store.upcomingQuery = query;

      if (location.pathname === '/upcoming') {
        history.replaceState({}, '',
          location.pathname + (
            query ?
              `?a=${query}` : ''
          )
        );
      }
    }
  }
}).observe(queuelist, { childList: true });


new Sortable(queuelist, {
  handle: '.ri-draggable',
  onUpdate(e: SortableEvent) {
    if (e.oldIndex == null || e.newIndex == null) return;
    const queueArray = store.queue;
    queueArray.splice(e.newIndex, 0, queueArray.splice(e.oldIndex, 1)[0]);
  }
});
