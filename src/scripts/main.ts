import '../stylesheets/style.css';
import './api';
import './router';
import './theme';
import './search';
import './library';
import './miscEvents';
import './audioEvents';
import './queue';
import './superModal';
import '../components/streamItem';
import '../components/listItem';
import '../components/toggleSwitch';
import { blankImage, getSaved, idFromURL, params } from '../lib/utils';
import player from '../lib/player';
import { img } from '../lib/dom';


const streamQuery = params.get('s') || idFromURL(params.get('url')) || idFromURL(params.get('text'));


streamQuery ? player(streamQuery) : img.src = getSaved('img') ? blankImage : '/ytify_thumbnail_min.webp';


const favButton = <HTMLElement>(<HTMLButtonElement>document.getElementById('favButton')).nextElementSibling;
const icons = ['ri-heart-line', 'ri-heart-fill'];
favButton.addEventListener('click', () => {
  favButton.classList.replace(icons[0], icons[1]);
  icons.reverse();
})


