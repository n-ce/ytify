import { clearQBtn, queuelist, removeQBtn, shuffleQBtn } from "../lib/dom";
import player from "../lib/player";

const queueArray: string[] = [];

export const firstItemInQueue = () => <HTMLElement>queuelist.firstElementChild;

export function appendToQueuelist(data: DOMStringMap, prepend: boolean = false) {
  if (!data.id) return;

  if (queueArray.includes(data.id)) return;

  queueArray.push(data.id);

  const listItem = document.createElement('stream-item');
  listItem.textContent = data.title || '';
  listItem.dataset.author = data.author;
  listItem.dataset.thumbnail = data.thumbnail;
  listItem.dataset.duration = data.duration;
  listItem.dataset.id = data.id;

  listItem.addEventListener('click', () => {
    const id = listItem.dataset.id || '';
    if (!listItem.classList.contains('delete'))
      player(id);
    const index = queueArray.indexOf(id);
    queueArray.splice(index, 1);
    queuelist.children[index].remove();
  });

  prepend ?
    queuelist.prepend(listItem) :
    queuelist.appendChild(listItem);
}




clearQBtn.addEventListener('click', () => {
  queueArray.length = 0;
  queuelist.innerHTML = '';
});

shuffleQBtn.addEventListener('click', () => {
  const original = queueArray.slice(0);
  for (let i = queueArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = queueArray[i];
    queueArray[i] = queueArray[j];
    queueArray[j] = temp;
  }
  for (const item of queueArray)
    queuelist.appendChild(queuelist.children[original.indexOf(item)]);

});

removeQBtn.addEventListener('click', () => {

  queuelist.querySelectorAll('stream-item').forEach((el) => {
    el.classList.toggle('delete');
  })
  removeQBtn.classList.toggle('delete')
});