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

  if (!(e.target as HTMLButtonElement).matches('button'))
    document.getElementById('/')!.click();
})

export function miniPlayerRoutingHandler(inHome: boolean, mpcl = miniPlayer.classList) {

  if (inHome) {
    mpcl.add('hide');
    home.prepend(img);
    document.getElementById('metadata')!.prepend(title);
    document.getElementById('playerControls')!.insertBefore(playButton, document.getElementById('seekFwdButton'))
    const pc = document.getElementById('playerControls')!;

    pc.insertBefore(playButton, document.getElementById('seekFwdButton'));
    const sp = pc.previousElementSibling!
    sp.insertBefore(progress, sp.lastElementChild);



  }
  else if (mpcl.contains('hide')) {
    mpcl.remove('hide');
    miniPlayer.prepend(progress, img);
    miniPlayer.lastElementChild!.append(title, playButton);


  }

}
