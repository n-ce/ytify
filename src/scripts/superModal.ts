import { addToPlaylist, playNow, queueNext, queuelist, startRadio, superModal } from "../lib/dom";
import player from "../lib/player";
import { similarStreamsCollector } from "../lib/utils";

export const streamHistory: string[] = [];

let oneOff = true;
superModal.addEventListener('click', () => {
  if (oneOff) {
    (<HTMLHeadingElement>queuelist.firstElementChild).remove();
    oneOff = !oneOff;
  }
  superModal.classList.toggle('hide');
});


playNow.addEventListener('click', () => {
  player(superModal.dataset.id);
});

export const queueArray: string[] = [];



queueNext.addEventListener('click', () => {
  appendToQueuelist(superModal.dataset);
})



export const appendToQueuelist = (data: DOMStringMap, prepend: boolean = false) => {
  queueArray.push(data.id || '');

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
  prepend ?
    queuelist.prepend(listItem) :
    queuelist.appendChild(listItem);
}





startRadio.addEventListener('click', () => {
  player(superModal.dataset.id);

  similarStreamsCollector(
    superModal.dataset.title,
    superModal.dataset.author
  )
    .then(data => {
      if (!data) throw new Error('No data');
      const [relatives, relativesData] = data;
      if (!relatives) throw new Error('No Relatives Found');

      for (const id of relatives)
        if (id !== superModal.dataset.id && !streamHistory.includes(id) && !queueArray.includes(id))
          appendToQueuelist(relativesData[id]);
    })
    .catch(_ => alert(_))
})

addToPlaylist.addEventListener('click', () => {
  superModal.classList.toggle('hide');
});
