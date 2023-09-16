import { playNow, queueNext, queuelist, superModal } from "../lib/dom";
import player from "../lib/player";


superModal.addEventListener('click', () => {
  superModal.classList.toggle('hide');
});


playNow.addEventListener('click', () => {
  player(playNow.dataset.id || '');

});

const queueArray: string[] = [];


let oneOff = true;

queueNext.addEventListener('click', () => {
  if (oneOff) {
    (<HTMLHeadingElement>queuelist.firstElementChild).remove();
    oneOff = !oneOff;
  }
  queueArray.push(queueNext.dataset.id || '');
  appendToQueuelist();
})


const appendToQueuelist = () => {
  const data = queueNext.dataset;
  const listItem = document.createElement('stream-item');
  listItem.textContent = data.title || '';
  listItem.dataset.author = data.author;
  listItem.dataset.thumbnail = data.thumbnail;
  listItem.dataset.duration = data.duration;
  listItem.dataset.id = data.id;

  listItem.addEventListener('click', () => {
    const id = listItem.dataset.id || '';
    player(id);
    const index = queueArray.indexOf(id);
    queueArray.splice(index, 1);
    queuelist.children[index].remove();
  });
  queuelist.appendChild(listItem);
}