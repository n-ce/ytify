import { favButton, favIcon, playButton, audio } from "./dom";
import { params, store } from "./store";
import { setMetaData } from "../modules/setMetadata";
import { getDB } from "./libraryUtils";

export default async function player(id: string | null = '') {

  if (!id) return;

  playButton.classList.replace(playButton.className, 'ri-loader-3-line');


  await fetch(store.downloadAPI, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://youtu.be/' + id,
      downloadMode: 'audio',
      audioFormat: store.downloadFormat
    })
  })
    .then(_ => _.json())
    .then(_ => {
      audio.src = _.url;
    });


  await setMetaData({
    id: id,
    title: store.actionsMenu.title,
    author: store.actionsMenu.author
    ,
    duration: store.actionsMenu.duration,
    channelUrl: store.actionsMenu.channelUrl
  });


  params.set('s', id);

  if (location.pathname === '/')
    history.replaceState({}, '', location.origin + '?s=' + params.get('s'));



  // favbutton reset
  if (favButton.checked) {
    favButton.checked = false;
    favIcon.classList.remove('ri-heart-fill');
  }

  // favbutton set
  if (getDB().favorites?.hasOwnProperty(id)) {
    favButton.checked = true;
    favIcon.classList.add('ri-heart-fill');
  }



}
