import '../stylesheets/style.css';
import './api';
import './nav';
import './theme';
import './search';
import './miscEvents';
import './audioEvents';
import './superModal';
import '../components/streamItem';
import '../components/channelItem';
import '../components/playlistItem';
import '../components/toggleSwitch';
import { params } from '../lib/utils';
import player from '../lib/player';


if (params.has('e'))
  location.replace(params.get('e') || '/');
if (params.has('s'))
  player(params.get('s'));





const favButton = document.getElementById('favButton')?.nextElementSibling;
const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton?.addEventListener('click', () => {
  favButton.classList.replace(icons[0], icons[1]);
  icons.reverse();
})


