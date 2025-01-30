import { author, img, miniPlayer, playButton, title, ytifyIcon } from '../lib/dom';
import { goTo } from '../lib/utils';
import { store } from '../lib/store';

let imgMem: HTMLImageElement | '' = img;

if (!store.loadImage) {
  img.remove();
  imgMem = '';
}


miniPlayer.addEventListener('click', (e) => {
  e.preventDefault();
  if (!(<HTMLElement>e.target).matches('button'))
    goTo('/');
});
const mptext = document.getElementById('mptext') as HTMLDivElement;


export function miniPlayerRoutingHandler(inHome: boolean, header: DOMTokenList) {

  if (inHome) {
    header.add('hide');
    document.getElementById('upperLayer')!.prepend(imgMem);
    document.getElementById('meta')!.prepend(title, author);
    document.getElementById('playerControls')!.insertBefore(playButton, document.getElementById('seekFwdButton'));
    document.getElementById('playerSelectors')!.appendChild(ytifyIcon);
  }
  else if (header.contains('hide')) {
    header.remove('hide');
    miniPlayer.prepend(imgMem);
    mptext.append(title, author);
    miniPlayer.lastElementChild!.append(mptext, playButton);
    document.getElementById('ytifyIconContainer')!.prepend(ytifyIcon);
  }

}
