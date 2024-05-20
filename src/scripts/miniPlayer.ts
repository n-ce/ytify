import { img, miniPlayer, playButton, title } from '../lib/dom';

const home = document.getElementById('home') as HTMLDivElement;


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


  }
  else if (mpcl.contains('hide')) {
    mpcl.remove('hide');
    miniPlayer.prepend(img);
    miniPlayer.lastElementChild!.append(title, playButton);


  }

}
