import { queuelist, upcomingBtn } from "../lib/dom";
import player from "../lib/player";
import { $ } from "../lib/utils";

const queueArray: string[] = [];

const [clearQBtn, shuffleQBtn, removeQBtn, filterG10Btn] = <HTMLCollectionOf<HTMLButtonElement>>(<HTMLSpanElement>document.getElementById('queuetools')).children;

export const firstItemInQueue = () => <HTMLElement>queuelist.firstElementChild;

export function appendToQueuelist(data: DOMStringMap, prepend: boolean = false) {
  if (!data.id) return;

  if (queueArray.includes(data.id)) return;

  if (filterG10Btn.classList.contains('filter'))
    if (isLongerThan10Min(<string>data.duration))
      return;

  if (firstItemInQueue()?.matches('h1')) firstItemInQueue().remove();

  if (removeQBtn.classList.contains('delete')) removeQBtn.click();

  prepend ?
    queueArray.unshift(data.id) :
    queueArray.push(data.id);

  const queueItem = $('stream-item');
  queueItem.dataset.title = <string>data.title;
  queueItem.dataset.author = data.author;
  queueItem.dataset.duration = data.duration;
  queueItem.dataset.id = data.id;

  prepend ?
    queuelist.prepend(queueItem) :
    queuelist.appendChild(queueItem);

  queuelist.dataset.array = '?a=' + queueArray.join('');
}

queuelist.addEventListener('click', e => {
  const queueItem = e.target as HTMLElement;
  if (!queueItem.matches('stream-item')) return;
  const id = queueItem.dataset.id || '';
  if (!queueItem.classList.contains('delete'))
    player(id);

  const index = queueArray.indexOf(id);
  queueArray.splice(index, 1);
  queuelist.children[index].remove();

  queuelist.dataset.array = '?a=' + queueArray.join('');
});


// clones any list items from the provided container to queue

export function listToQ(container: HTMLDivElement) {
  container.querySelectorAll('stream-item').forEach(item => {
    appendToQueuelist((<HTMLElement>item).dataset);
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
  queuelist.querySelectorAll('stream-item').forEach((el) =>
    el.classList.toggle('delete')
  );
  removeQBtn.classList.toggle('delete');
});




filterG10Btn.addEventListener('click', () => {

  filterG10Btn.classList.toggle('filter');

  queuelist.querySelectorAll('stream-item').forEach((el, index) => {
    const duration = (<HTMLElement>el).dataset.duration as string
    if (isLongerThan10Min(duration)) {
      queueArray.splice(index, 1);
      el.remove();
    }

  });
});

function isLongerThan10Min(duration: string) {
  const hhmmss = duration.split(':');
  return !(
    hhmmss.length === 2 &&
    parseInt(hhmmss[0]) < 10
  );
}
