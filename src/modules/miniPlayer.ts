import { author, img, miniPlayer, playButton, title } from '../lib/dom';
import { goTo } from '../lib/utils';
import { state } from '../lib/store';

let imgMem: HTMLImageElement | '' = img;

if (!state.loadImage) {
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
  }
  else if (header.contains('hide')) {
    header.remove('hide');
    miniPlayer.prepend(imgMem);
    mptext.append(title, author);
    miniPlayer.lastElementChild!.append(mptext, playButton);
  }

}
