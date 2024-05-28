import { img as imgX, miniPlayer, playButton, progress, title } from '../lib/dom';
import { getSaved } from '../lib/utils';

const home = document.getElementById('home') as HTMLDivElement;
let img: HTMLImageElement | '' = imgX;

if (getSaved('imgLoad') === 'off') {
  imgX.remove();
  img = '';
}


miniPlayer.addEventListener('click', (e) => {
  e.preventDefault();

  if (!(<HTMLElement>e.target).matches('button'))
    document.getElementById('/')!.click();
})

export function miniPlayerRoutingHandler(inHome: boolean, header: DOMTokenList) {

  const metadata =
    document.getElementById('metadata') as HTMLElement;
  const pc = document.getElementById('playerControls') as HTMLElement;
  const sp = pc.previousElementSibling as HTMLElement;
  const seekFwd = document.getElementById('seekFwdButton') as HTMLElement;

  if (inHome) {
    header.add('hide');
    home.prepend(img);
    metadata.prepend(title);
    pc.insertBefore(playButton, seekFwd);
    sp.insertBefore(progress, sp.lastElementChild);
  }
  else if (header.contains('hide')) {
    header.remove('hide');
    miniPlayer.prepend(progress, img);
    miniPlayer.lastElementChild!.append(title, playButton);


  }

}
