import { superModal } from "../lib/dom";
import { createPlaylist, addToCollection } from "../lib/libraryUtils";

import { $, fetchList, notify } from "../lib/utils";
import { appendToQueuelist } from "./queue";

const superModalList = <HTMLUListElement>superModal.firstElementChild;

const [playNext, enqueue, li_atps, startRadio, downloadBtn, openChannelBtn] = <HTMLCollectionOf<HTMLLIElement>>superModalList.children;

export const atpSelector = <HTMLSelectElement>li_atps.lastElementChild;


superModal.addEventListener('click', () => {
  superModal.close();
  history.back();
});

superModalList.onclick = _ => _.stopPropagation();

playNext.addEventListener('click', () => {
  appendToQueuelist(superModal.dataset, true);
  superModal.click();
});


enqueue.addEventListener('click', () => {
  appendToQueuelist(superModal.dataset);
  superModal.click();
});

startRadio.addEventListener('click', async () => {
  superModal.click();
  fetchList('/playlists/RD' + superModal.dataset.id, true);
});



atpSelector.addEventListener('change', () => {
  let title;
  if (!atpSelector.value) return;
  if (atpSelector.value === '+pl') {
    title = prompt('Playlist Title')?.trim();

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
  superModal.click();
  const provider = 'https://co.wuk.sh/api/json';
  const streamUrl = 'https://youtu.be/' + superModal.dataset.id;
  fetch(provider, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: streamUrl,
      isAudioOnly: true,
      filenamePattern: 'basic'
    })
  })
    .then(_ => _.json())
    .then(_ => {
      const anchor = $('a');
      anchor.href = _.url;
      anchor.click();
    })
    .catch(_ => notify(_))
});



openChannelBtn.addEventListener('click', () => {
  // data binding for save list & open in yt btn
  const smd = superModal.dataset;
  (<HTMLButtonElement>document.getElementById('viewOnYTBtn')).innerHTML = '<i class="ri-external-link-line"></i> ' + <string>smd.author;

  fetchList(smd.channelUrl || smd.channel_url);
  superModal.click();
})
