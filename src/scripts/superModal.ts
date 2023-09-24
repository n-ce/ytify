import { clearQBtn, pipedInstances, superModal } from "../lib/dom";
import player from "../lib/player";
import { Item, convertSStoHHMMSS } from "../lib/utils";
import { appendToQueuelist, firstItemInQueue } from "./queue";

const [playNow, queueNext, atpContainer, startRadio] = <HTMLCollectionOf<HTMLLIElement>>(<HTMLUListElement>superModal.firstElementChild).children;



superModal.addEventListener('click', e => {
  const el = <HTMLElement>e.target;
  if (!el.matches('#psc') && !el.matches('select'))
    superModal.classList.toggle('hide');
});


playNow.addEventListener('click', () => {
  player(superModal.dataset.id);
});



let removeH1 = true;

queueNext.addEventListener('click', () => {
  if (removeH1) {
    firstItemInQueue().remove();
    removeH1 = !removeH1;
  }
  appendToQueuelist(superModal.dataset);
});



function upcomingIcon(loaded = false) {
  let [a, b] = ['ri-skip-forward-line', 'ri-loader-3-line'];
  if (loaded) [a, b] = [b, a];
  (<HTMLElement>(<HTMLAnchorElement>document.getElementById('/upcoming')).firstElementChild).classList.replace(a, b);
}

async function fetchMix(id: string, apiIndexB = 0) {

  await fetch(pipedInstances.options[apiIndexB].value + '/playlists/' + id)
    .then(res => res.json())
    .then(data => {
      if (!data.relatedStreams)
        throw new Error('No streams for mix');
      for (const stream of data.relatedStreams) {
        appendToQueuelist({
          id: stream.url.slice(9),
          title: stream.title,
          thumbnail: stream.thumbnail,
          author: stream.uploaderName,
          duration: convertSStoHHMMSS(stream.duration)
        })
      }
    }).catch(e => {
      if (apiIndexB < pipedInstances.length - 1)
        return fetchMix(id, apiIndexB + 1);
      alert(e.message);
    });
}


function radio(_: Event, apiIndex: number = 0) {

  upcomingIcon();

  const api = pipedInstances.options[apiIndex].value;
  const knownError = 'Sorry no radios are available for this stream right now.';

  fetch(api + '/streams/' + superModal.dataset.id)
    .then(res => res.json())
    .then(data => data.relatedStreams)
    .then(relatives => relatives.filter((r: Item) => r.playlistType === 'MIX_STREAM' && r.type === 'playlist'))
    .then(async mixes => {
      if (!mixes.length) {
        if (apiIndex < pipedInstances.length - 1)
          return radio(_, apiIndex + 1);
        throw new Error(knownError);
      }
      clearQBtn.click();

      for await (const mix of mixes)
        await fetchMix(mix.url.slice(-13))

      firstItemInQueue().click();
      upcomingIcon(true);
    })
    .catch(err => {
      if (err.message === knownError)
        alert(err.message);
      upcomingIcon(true);
    })

}


startRadio.addEventListener('click', radio);


const atpSelector = <HTMLSelectElement>atpContainer.firstElementChild;

atpSelector.addEventListener('change', () => {
  superModal.classList.toggle('hide');
});


