import { audio, superInput, superModal } from "../lib/dom";
import { params } from "../lib/utils";


const anchors = document.querySelectorAll('nav a');
const routes = ['/', '/upcoming', '/search', '/library', '/settings', '/list'];


function showSection(id: string) {
  routes.forEach((route, index) => {
    if (id === '/') id += 'home';
    if (route === '/') route += 'home';
    const section = <HTMLDivElement>document.getElementById(route.substring(1));

    if (route === id) {
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
        <string>(<HTMLParagraphElement>anchor.lastElementChild).textContent) + ' - ytify';
    }
    // ↑↑ bad coding habit ↑↑
    showSection(anchor.id);
  })
}

// load section if name found in address else load home
(<HTMLAnchorElement>document.getElementById(
  routes.find(route =>
    (params.has('e') ? params.get('e') : location.pathname) === route) || '/'
)).click();


// enables back button functionality

onpopstate = () =>
  superModal.open ?
    superModal.close() :
    showSection(location.pathname);
