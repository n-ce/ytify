import '../stylesheets/style.css';
import { img, params, pipedInstances } from './utils';
import api from './api';
import nav from './nav';
import theme from './theme';
import search from './search';
import streamItem from '../components/streamItem';
import channelItem from '../components/channelItem';
import playlistItem from '../components/playlistItem';
import toggleSwitch from '../components/toggleSwitch';


const stealthContainer = document.getElementById('stealth');
const stealthAnchor = <HTMLAnchorElement>document.getElementById('/stealth');


api(() => {
  if (params.has('e')) {
    location.replace(params.get('e') || '/');
    return;
  }
  nav();
  theme();
  search(itemsLoader);
  streamItem();
  playlistItem();
  channelItem();
  toggleSwitch();
});



function loadGroup(group: string) {
  fetch(pipedInstances.value + group)
    .then(res => res.json())
    .then(group => group.relatedStreams)
    .then(streams => itemsLoader(streams))
    .then(fragment => {
      if (!stealthContainer) return;
      stealthContainer.innerHTML = '';
      stealthContainer.appendChild(fragment);
      stealthAnchor.click();
    })
    .catch(err => {
      /*
        if (pipedInstances.selectedIndex < pipedInstances.length - 1) {
          pipedInstances.selectedIndex++;
          loadGroup(group);
          return;
        }
        alert(err)*/
      console.log(err)
    })
}


type item = 'title' | 'name' | 'uploaderName' | 'description' | 'thumbnail' | 'type' | 'url' | 'views' | 'duration' | 'uploadedDate' | 'uploaderAvatar' | 'videos' | 'subscribers';

function createStreamItem(stream: Record<item, string>) {
  const streamItem = document.createElement('stream-item');
  streamItem.textContent = stream.title;
  streamItem.dataset.author = stream.uploaderName;
  streamItem.dataset.thumbnail = stream.thumbnail;
  streamItem.dataset.views = stream.views;
  streamItem.dataset.duration = stream.duration;
  streamItem.dataset.uploaded = stream.uploadedDate || '';
  streamItem.dataset.avatar = stream.uploaderAvatar || '';
  streamItem.addEventListener('click', () => {
    img.src = stream.thumbnail;
  })
  return streamItem;
}


function createPlaylistItem(playlist: Record<item, string>) {

  const playlistItem = document.createElement('playlist-item');
  playlistItem.textContent = playlist.name;
  playlistItem.dataset.length = playlist.videos;
  playlistItem.dataset.author = playlist.uploaderName;
  playlistItem.dataset.thumbnail = playlist.thumbnail;
  playlistItem.addEventListener('click', () => {
    loadGroup(playlist.url.replace('?list=', 's/'));
  })
  return playlistItem;
}

function createChannelItem(channel: Record<item, string>) {
  const channelItem = document.createElement('channel-item');
  channelItem.textContent = channel.name;
  channelItem.dataset.thumbnail = channel.thumbnail;
  channelItem.dataset.description = channel.description;
  channelItem.dataset.subscribers = channel.subscribers;
  channelItem.addEventListener('click', () => {
    loadGroup(channel.url);
  })

  return channelItem;
}

function itemsLoader(itemsArray: Record<item, string>[]): DocumentFragment {

  const fragment = document.createDocumentFragment();

  for (const item of itemsArray) {

    const type = item.type === 'stream' ? createStreamItem(item) : item.type === 'playlist' ? createPlaylistItem(item) : createChannelItem(item);


    fragment.appendChild(type);
  }

  return fragment;
}


const favButton = document.getElementById('favButton')?.nextElementSibling;
const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton?.addEventListener('click', () => {
  favButton.classList.replace(icons[0], icons[1]);
  icons.reverse();
})