import { img as imgX, miniPlayer, playButton, title } from '../lib/dom';
import { store } from '../store';

let img: HTMLImageElement | '' = imgX;

if (store.loadImage === 'off') {
  imgX.remove();
  img = '';
}


miniPlayer.addEventListener('click', (e) => {
  e.preventDefault();

  if (!(<HTMLElement>e.target).matches('button'))
    document.getElementById('/')!.click();
})

export function miniPlayerRoutingHandler(inHome: boolean, header: DOMTokenList) {

  if (inHome) {
    header.add('hide');
    document.getElementById('upperLayer')!.prepend(img);
    document.getElementById('meta')!.prepend(title);
    document.getElementById('playerControls')!.insertBefore(playButton, document.getElementById('seekFwdButton'));
  }
  else if (header.contains('hide')) {
    header.remove('hide');
    miniPlayer.prepend(img);
    miniPlayer.lastElementChild!.append(title, playButton);
  }

}
