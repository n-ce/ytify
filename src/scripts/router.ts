import { actionsMenu, searchFilters, superInput, ytifyIcon } from "../lib/dom";
import { goTo } from "../lib/utils";
import { getSaved, params, store } from "../lib/store";
import { miniPlayerRoutingHandler } from "../modules/miniPlayer";
import fetchList from "../modules/fetchList";
import { fetchCollection } from "../lib/libraryUtils";

const nav = document.querySelector('nav') as HTMLDivElement;
const anchors = document.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
const sections = document.querySelectorAll('section') as NodeListOf<HTMLDivElement>;
const routes = ['/', '/upcoming', '/search', '/library', '/settings', '/list'];

let prevPageIdx = routes.indexOf(location.pathname);

function showSection(id: string) {
  const routeIdx = routes.indexOf(id);
  miniPlayerRoutingHandler(id === '/', nav.parentElement!.classList);

  sections[routeIdx].classList.add('view');
  const a = anchors[routeIdx];
  a.classList.add('active');
  const ai = a.firstElementChild!.classList;
  if (ai.length)
    ai.replace(ai[0], ai[0].replace('line', 'fill'));

  if (prevPageIdx !== routeIdx) {
    sections[prevPageIdx].classList.remove('view');
    const ap = anchors[prevPageIdx];
    ap.classList.remove('active');
    const aip = ap.firstElementChild!.classList;
    if (aip.length)
      aip.replace(aip[0], aip[0].replace('fill', 'line'));

  }
  prevPageIdx = routeIdx;
}


nav.addEventListener('click', (e: Event) => {
  e.preventDefault();

  const anchor = e.target as HTMLAnchorElement;

  if (!anchor.matches('a')) return;

  const inHome = anchor.id === '/';

  if (anchor.id !== location.pathname) {
    const sParamInHome = params.has('s') && inHome;
    const sParam = '?s=' + params.get('s');
    const otherQuery = anchor.id === '/search' ? store.searchQuery : '';

    history.pushState({}, '',
      anchor.id + (
        sParamInHome ? sParam : otherQuery
      )
    );

    const routeName = anchor.lastElementChild?.textContent;
    const homeTitle = store.stream.title || 'Home';

    document.title = (
      inHome ? homeTitle : routeName
    ) + ' - ytify';

  }
  showSection(anchor.id);
});


// load section if name found in address else load library
let route: Routes | string;
const errorParam = params.get('e');

if (errorParam) {

  if (errorParam.includes('?')) {

    const _ = errorParam.split('?');
    route = _[0] as Routes;
    const query = encodeURI(_[1]);

    if (route === '/list')
      query.startsWith('si') ?
        fetchCollection(query.split('=')[1], true) :
        query.startsWith('supermix') ?

          import('../modules/supermix').then(mod => mod.default(query.split('=')[1].split(' '))) :
          fetchList('/' + query.split('=').join('/'));


    if (route === '/search') {
      const x = new URLSearchParams(query);
      superInput.value = x.get('q') || '';
      searchFilters.value = x.get('f') || 'all';
      superInput.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
    }

  }
  else route = errorParam;
}
else {

  route = routes.find(route => location.pathname === route) || '/';

  const hasStreamQuery = params.has('s') || params.has('url') || params.has('text');

  if (route === '/' && !hasStreamQuery && !params.has('reset'))
    route = getSaved('startupTab') || '/search';

}

// necessary to use a click event 

goTo(route as Routes);

ytifyIcon.addEventListener('click', () => {
  goTo(getSaved('startupTab') as '/' || '/search');
});

// enables back button functionality

onpopstate = function() {

  if (actionsMenu.open) {
    actionsMenu.close();
    return;
  }

  if (
    !store.list.id &&
    location.pathname === '/list'
  ) {

    const param = location.search
      .substring(1)
      .split('=');

    if (param[0] === 'collection')
      fetchCollection(param[1]);

    if (param[0] === 'list')
      fetchList('/' + param.join('/'));

  }

  showSection(location.pathname);


}


