import { pipedInstances, superModal } from "../lib/dom";
import player from "../lib/player";
import { convertSStoHHMMSS } from "../lib/utils";
import { appendToQueuelist, clearQ, firstItemInQueue } from "./queue";

const [playNow, enqueue, atpContainer, startRadio, downloadBtn, openChannelBtn] = <HTMLCollectionOf<HTMLLIElement>>(<HTMLUListElement>superModal.firstElementChild).children;



superModal.addEventListener('click', _ => {
  if ((<HTMLDivElement>_.target).matches('#superModal'))
    superModal.classList.toggle('hide');
});


playNow.addEventListener('click', () => {
  player(superModal.dataset.id);

  superModal.classList.toggle('hide');
});



enqueue.addEventListener('click', () => {
  if (firstItemInQueue().matches('h1'))
    firstItemInQueue().remove();
  appendToQueuelist(superModal.dataset);
  superModal.classList.toggle('hide');
});



async function fetchMix(id: string, api = 0) {
  const knownError = 'No Radios could be found.';
  await fetch(pipedInstances.options[api].value + '/playlists/' + id)
    .then(res => res.json())
    .then(data => {
      if (!data.relatedStreams)
        throw new Error(knownError);

      clearQ();

      for (const stream of data.relatedStreams)
        appendToQueuelist({
          id: stream.url.slice(9),
          title: stream.title,
          thumbnail: stream.thumbnail,
          author: stream.uploaderName,
          duration: convertSStoHHMMSS(stream.duration)
        });

      firstItemInQueue().click();
    })
    .catch(e => {
      if (api < pipedInstances.length - 1)
        return fetchMix(id, api + 1);
      e.message === knownError ? alert(e) : console.error(e);
    });
}


const upcomingIcon = <HTMLElement>(<HTMLAnchorElement>document.getElementById('/upcoming')).firstElementChild;

startRadio.addEventListener('click', async () => {

  upcomingIcon.classList.replace('ri-skip-forward-line', 'ri-loader-3-line');

  await fetchMix('RD' + superModal.dataset.id)

  upcomingIcon.classList.replace('ri-loader-3-line', 'ri-skip-forward-line');

  superModal.classList.toggle('hide');
});


const atpSelector = <HTMLSelectElement>atpContainer.lastElementChild;

atpContainer.addEventListener('click', () => {

})

atpSelector.addEventListener('change', () => {

});


const dlSelector = <HTMLSelectElement>document.getElementById('downloadSelector');


downloadBtn.addEventListener('click', () => {
  dlSelector.innerHTML = '<option>Fetching...</option>';

  fetch(pipedInstances.value + '/streams/' + superModal.dataset.id)
    .then(_ => _.json())
    .then(_ => _.audioStreams)
    .then(streams => {
      dlSelector.innerHTML = '<option value>Download</option';
      for (const stream of streams) {
        dlSelector.add(
          new Option(
            stream.quality +
            (stream.codec === 'opus' ? ' opus' : ' m4a'),
            stream.itag));
      }
    })
    .catch(() => dlSelector.innerHTML = '<option>Fetching Failed</option')
})


dlSelector.addEventListener('change', () => {
  const provider = 'https://projectlounge.pw/ytdl';
  const streamUrl = 'https://youtu.be/' + superModal.dataset.id;
  const itag = dlSelector.value;
  const link = provider + '/download?url=' + streamUrl + '&format=' + itag;

  if (itag)
    open(link);
})




openChannelBtn.addEventListener('click', () => {
  open('https://youtube.com' + superModal.dataset.channelUrl);
  superModal.classList.toggle('hide');
})