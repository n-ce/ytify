import { img as imgX, miniPlayer, playButton, title, ytifyIcon } from '../lib/dom';
import { goTo } from '../lib/utils';
import { store } from '../store';

let img: HTMLImageElement | '' = imgX;

if (store.loadImage === 'off') {
  imgX.remove();
  img = '';
}


miniPlayer.addEventListener('click', (e) => {
  e.preventDefault();
  if (!(<HTMLElement>e.target).matches('button'))
    goTo('/');
});


export function miniPlayerRoutingHandler(inHome: boolean, header: DOMTokenList) {

  if (inHome) {
    header.add('hide');
    document.getElementById('upperLayer')!.prepend(img);
    document.getElementById('meta')!.prepend(title);
    document.getElementById('playerControls')!.insertBefore(playButton, document.getElementById('seekFwdButton'));
    document.getElementById('selectors')!.appendChild(ytifyIcon);
  }
  else if (header.contains('hide')) {
    header.remove('hide');
    miniPlayer.prepend(img);
    miniPlayer.lastElementChild!.append(title, playButton);
    document.getElementById('ytifyIconContainer')!.prepend(ytifyIcon);
  }

}
