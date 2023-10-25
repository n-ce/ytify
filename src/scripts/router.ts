import { audio, superInput, superModal } from "../lib/dom";
import { params } from "../lib/utils";


const anchors = document.querySelectorAll('nav a');
const sections = document.querySelectorAll('section');

function showSection(id: string) {
  sections.forEach((section, index) => {
    if (id === '/') id += 'home';
    if (section.id === id.substring(1)) {
      section.classList.add('view');
      anchors[index].classList.add('active');
    } else {
      section.classList.remove('view');
      anchors[index].classList.remove('active');
    }

  })
}

for (const anchor of anchors) {
  anchor.addEventListener('click', _ => {
    _.preventDefault();

    if (anchor.id !== location.pathname) {

      history.pushState({}, '',
        anchor.id + ((params.has('s') && anchor.id === '/') ? ('?s=' + params.get('s')) : anchor.id === '/search' ? superInput.dataset.query || '' : '')
      );
      document.title = (anchor.id === '/' ?
        (audio.dataset.title ? audio.dataset.title : 'Home')
        :
        (<HTMLParagraphElement>anchor.lastElementChild).textContent || '') + ' - ytify';
    }
    // ↑↑ bad coding habit ↑↑
    showSection(anchor.id);
  })
}

// load section if name found in address else load home


(<HTMLAnchorElement>document.getElementById(['/upcoming', '/search', '/related', '/library', '/settings'].find(_ => (params.has('e') ? params.get('e') : location.pathname) === _) || '/')).click();


// enables back button functionality

addEventListener('popstate', () => {
  superModal.open ?
    superModal.close() :
    showSection(location.pathname);
});
