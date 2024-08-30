import { goTo, removeSaved, save } from "../lib/utils";
import { queuelist } from "../lib/dom";
import player from "../lib/player";
import StreamItem from "../components/StreamItem";
import { render } from "solid-js/web";
import { store, getSaved } from "../lib/store";

const queueArray = store.queue.array;
const [
  clearQBtn,
  shuffleQBtn,
  removeQBtn,
  filterLT10Btn,
  autoQueueBtn
] = (<HTMLSpanElement>document.getElementById('queuetools')).children as HTMLCollectionOf<HTMLButtonElement>;

export const firstItemInQueue = () => <HTMLElement>queuelist.firstElementChild;

export function appendToQueuelist(data: DOMStringMap | CollectionItem, prepend: boolean = false) {
  if (!data.id) return;

  if (queueArray.includes(data.id)) return;

  if (filterLT10Btn.classList.contains('filter'))
    if (isLongerThan10Min(<string>data.duration))
      return;

  if (firstItemInQueue()?.matches('h1')) firstItemInQueue().remove();

  if (removeQBtn.classList.contains('delete'))
    removeQBtn.click();

  prepend ?
    queueArray.unshift(data.id) :
    queueArray.push(data.id);


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

  const queueItem = e.target as HTMLAnchorElement;
  if (!queueItem.classList.contains('streamItem')) return;
  const id = queueItem.dataset.id || '';
  queueItem.classList.contains('delete') ?
    sessionStorage.setItem(
      'trashHistory',
      sessionStorage.getItem('trashHistory') + id
    ) : player(id);

  const index = queueArray.indexOf(id);


  queueArray.splice(index, 1);

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
  queueArray.length = 0;
  queuelist.innerHTML = '';
}

clearQBtn.addEventListener('click', clearQ);

shuffleQBtn.addEventListener('click', () => {

  for (let i = queuelist.children.length; i >= 0; i--)
    queuelist.appendChild(queuelist.children[Math.random() * i | 0]);

  queueArray.length = 0;

  for (const item of queuelist.children)
    queueArray.push((<HTMLElement>item).dataset.id || '');

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


autoQueueBtn.addEventListener('click', () => {
  autoQueueBtn.classList.contains('checked') ?
    removeSaved('autoQueue') :
    save('autoQueue', 'on');
  autoQueueBtn.classList.toggle('checked');
});

if (getSaved('autoQueue') === 'on')
  autoQueueBtn.className = 'checked';


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
      const query = queueArray.join('');
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
