import { actionsMenu, loadingScreen, searchFilters, superInput, ytifyIcon } from "../lib/dom";
import { goTo } from "../lib/utils";
import { getSaved, params, store } from "../lib/store";
import { appendToQueuelist } from "./queue";
import { miniPlayerRoutingHandler } from "../modules/miniPlayer";
import fetchList from "../modules/fetchList";
import { fetchCollection, superCollectionLoader } from "../lib/libraryUtils";

const nav = document.querySelector('nav') as HTMLDivElement;
const anchors = document.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
const sections = document.querySelectorAll('section') as NodeListOf<HTMLDivElement>;
const routes = ['/', '/upcoming', '/search', '/library', '/settings', '/list'];
const queueParam = params.get('a');



function upcomingInjector(param: string) {
  loadingScreen.showModal();

  fetch(`${location.origin}/public?id=${param}`)
    .then(res => res.json())
    .then(data => {
      for (const stream of data)
        appendToQueuelist(stream)
    })
    .finally(() => loadingScreen.close());
}

if (queueParam)
  upcomingInjector(queueParam);

let prevPageIdx = routes.indexOf(location.pathname);

function showSection(id: string) {
  const routeIdx = routes.indexOf(id);
  miniPlayerRoutingHandler(id === '/', nav.parentElement!.classList);

  // Enables Reactivity to declare db modifications into UI
  if (id === '/library')
    superCollectionLoader(getSaved('defaultSuperCollection') as 'feed' || 'featured');

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
    const aParam = store.upcomingQuery ? '?a=' + store.upcomingQuery : '';
    const otherQuery = anchor.id === '/search' ? store.searchQuery : anchor.id === '/upcoming' ? aParam : '';

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
let route: string;
const errorParam = params.get('e');

if (errorParam) {

  if (errorParam.includes('?')) {

    const _ = errorParam.split('?');
    route = _[0];
    const query = encodeURI(_[1]);

    if (route === '/list')
      query.startsWith('si') ?
        fetchCollection('', query.split('=')[1]) :
        fetchList('/' + query.split('=').join('/'));


    if (route === '/search') {
      const x = new URLSearchParams(query);
      superInput.value = x.get('q') || '';
      searchFilters.value = x.get('f') || 'all';
      superInput.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
    }

    if (route === '/upcoming')
      upcomingInjector(query.slice(2));

  }
  else route = errorParam;
}
else {

  route = routes.find(route => location.pathname === route) || '/';

  const hasStreamQuery = params.has('s') || params.has('url') || params.has('text');

  if (route === '/' && !hasStreamQuery)
    route = getSaved('startupTab') || '/search';

}

// necessary to use a click event 

goTo(route);

ytifyIcon.addEventListener('click', () => {
  goTo(getSaved('startupTab') || '/search');
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

    location.search.includes('collection') ?
      fetchCollection(param[1]) :
      fetchList('/' + param.join('/'));
  }

  showSection(location.pathname);


}


