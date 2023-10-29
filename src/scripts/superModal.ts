import { atpSelector, listContainer, pipedInstances, superModal, upcomingBtn } from "../lib/dom";
import player from "../lib/player";
import { $, convertSStoHHMMSS, fetchList } from "../lib/utils";
import { addToCollection, createPlaylist } from "./library";
import { appendToQueuelist, clearQ, firstItemInQueue } from "./queue";

const superModalList = <HTMLUListElement>superModal.firstElementChild;

const [playNow, enqueue, _, startRadio, downloadBtn, openChannelBtn] = <HTMLCollectionOf<HTMLLIElement>>superModalList.children;


superModal.addEventListener('click', () => {
  superModal.close();
  history.back();
});

superModalList.onclick = _ => _.stopPropagation();

playNow.addEventListener('click', () => {
  player(superModal.dataset.id);
  superModal.click();
});

enqueue.addEventListener('click', () => {
  if (firstItemInQueue()?.matches('h1'))
    firstItemInQueue().remove();
  appendToQueuelist(superModal.dataset);
  superModal.click();
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



startRadio.addEventListener('click', async () => {
  superModal.click();

  upcomingBtn.firstElementChild?.classList.replace('ri-skip-forward-line', 'ri-loader-3-line');

  fetchList('/playlists/RD' + superModal.dataset.id, true);

  upcomingBtn.firstElementChild?.classList.replace('ri-loader-3-line', 'ri-skip-forward-line');

});



atpSelector.addEventListener('change', () => {
  let title;
  if (!atpSelector.value) return;
  if (atpSelector.value === '+pl') {
    title = prompt('Playlist Title')
    if (title)
      createPlaylist(title);
  }
  else title = atpSelector.value;

  if (title)
    addToCollection(title, superModal.dataset);
  superModal.click();
  atpSelector.selectedIndex = 0;
});


downloadBtn.addEventListener('click', () => {
  const provider = 'https://co.wuk.sh/api/json';
  const streamUrl = 'https://youtu.be/' + superModal.dataset.id;
  fetch(provider, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: streamUrl,
      isAudioOnly: true
    })
  })
    .then(_ => _.json())
    .then(_ => {
      const anchor = $('a');
      anchor.href = _.url;
      anchor.click();
    })
    .catch(_ => alert(_))
    .finally(() => superModal.click());
});



openChannelBtn.addEventListener('click', () => {
  // data binding for save list & open in yt btn
  (<HTMLButtonElement>document.getElementById('openInYT')).innerHTML = '<i class="ri-youtube-line"></i> ' + <string>superModal.dataset.author;
  listContainer.dataset.url = superModal.dataset.channelUrl;
  fetchList(<string>superModal.dataset.channelUrl);
  superModal.click();
})