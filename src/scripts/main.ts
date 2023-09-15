import '../stylesheets/style.css';
//import { pipedInstances } from './dom';
import { itemsLoader, params, } from './utils';
import api from './api';
import nav from './nav';
import theme from './theme';
import search from './search';
import player from './player';
import miscEvents from './miscEvents';
import audioEvents from './audioEvents';
import streamItem from '../components/streamItem';
import channelItem from '../components/channelItem';
import playlistItem from '../components/playlistItem';
import toggleSwitch from '../components/toggleSwitch';



api(() => {
  if (params.has('e')) {
    location.replace(params.get('e') || '/');
    return;
  }
  nav();
  theme();
  search(itemsLoader);
  miscEvents();
  audioEvents();
  streamItem();
  playlistItem();
  channelItem();
  toggleSwitch();
});


if (params.has('s'))
  player(params.get('s') || '');





const favButton = document.getElementById('favButton')?.nextElementSibling;
const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton?.addEventListener('click', () => {
  favButton.classList.replace(icons[0], icons[1]);
  icons.reverse();
})


