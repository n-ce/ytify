import { getSaved, removeSaved, save } from "../lib/utils";
import { queuelist, upcomingBtn } from "../lib/dom";
import player from "../lib/player";
import StreamItem from "../components/StreamItem";
import { render } from "solid-js/web";
// import Sortable from "sortablejs";

const queueArray: string[] = [];

const [
  clearQBtn,
  shuffleQBtn,
  removeQBtn,
  filterMusicBtn,
  filterLT10Btn,
  autoQueueBtn
] = (<HTMLSpanElement>document.getElementById('queuetools')).children as HTMLCollectionOf<HTMLButtonElement>;

export const firstItemInQueue = () => <HTMLElement>queuelist.firstElementChild;

export function appendToQueuelist(data: DOMStringMap, prepend: boolean = false) {
  if (!data.id) return;

  if (queueArray.includes(data.id)) return;

  if (filterLT10Btn.classList.contains('filter'))
    if (isLongerThan10Min(<string>data.duration))
      return;

  if (firstItemInQueue()?.matches('h1')) firstItemInQueue().remove();

  if (removeQBtn.classList.contains('delete')) removeQBtn.click();

  prepend ?
    queueArray.unshift(data.id) :
    queueArray.push(data.id);

  const imgLoad = getSaved('img') ? false : true;
  const imgLoadStyle = getSaved('lazyImg') ? 'lazy' : 'eager';

  const fragment = document.createDocumentFragment();

  render(() => StreamItem(
    data.id as string,
    '',
    data.title as string,
    data.author as string,
    data.duration as string,
    '',
    '', '', imgLoad, imgLoadStyle
  ), fragment);

  prepend ?
    queuelist.prepend(fragment) :
    queuelist.appendChild(fragment);

}


//new Sortable(queuelist, {});

queuelist.addEventListener('dblclick', e => {
  const queueItem = e.target as HTMLElement;
  if (!queueItem.matches('stream-item')) return;
  const id = queueItem.dataset.id || '';
  if (queueItem.classList.contains('delete')) {
    const trashHistory = sessionStorage.getItem('trashHistory');
    sessionStorage.setItem('trashHistory', trashHistory + id);
  } else player(id);

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
  upcomingBtn.click();
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
    save('autoQueue', 'off') :
    removeSaved('autoQueue');
  autoQueueBtn.classList.toggle('checked');
});


if (localStorage.getItem('autoQueue') === 'off')
  autoQueueBtn.classList.remove('checked');


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
      const array = queueArray.join('');
      queuelist.dataset.array = array;

      if (location.pathname === '/upcoming') {
        history.replaceState({}, '',
          location.pathname + (
            array ?
              `?a=${array}` : ''
          )
        );
      }
    }
  }
}).observe(queuelist, { childList: true });


filterMusicBtn.addEventListener('click', () => {
  console.log(true)
});
