import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './library';
import './miscEvents';
import './audioEvents';
import './superModal';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';
import { blankImage, getSaved, params } from '../lib/utils';
import player from '../lib/player';
import { img } from '../lib/dom';


const streamQuery = params.get('s') || params.get('url') || params.get('text');

if (streamQuery) player(streamQuery);

img.src = getSaved('img') ? blankImage : '/ytify_thumbnail_min.webp';





const favButton = document.getElementById('favButton')?.nextElementSibling;
const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton?.addEventListener('click', () => {
  favButton.classList.replace(icons[0], icons[1]);
  icons.reverse();
})


