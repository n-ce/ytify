import { audio, loadingScreen, searchFilters, superInput, superModal, ytifyIcon } from "../lib/dom";
import { fetchCollection, superCollectionLoader } from "../lib/libraryUtils";
import { fetchList, getSaved, params } from "../lib/utils";
import { store } from "../store";
import { miniPlayerRoutingHandler } from "./miniPlayer";
import { appendToQueuelist } from "./queue";

const nav = document.querySelector('nav') as HTMLDivElement;
const anchors = document.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
const sections = document.querySelectorAll('section') as NodeListOf<HTMLDivElement>;
const routes = ['/', '/upcoming', '/search', '/library', '/settings', '/list'];
const queueParam = params.get('a');


export function upcomingInjector(param: string) {
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
    superCollectionLoader(getSaved('defaultSuperCollection') as 'feed' || 'collections');

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
    const homeTitle = audio.dataset.title || 'Home';
    document.title = (
      inHome ? homeTitle : routeName
    ) + ' - ytify';
  }
  showSection(anchor.id);
});


// load section if name found in address else load library
let route;
const errorParam = params.get('e');
if (errorParam) {
  if (errorParam.includes('?')) {
    const _ = errorParam.split('?');
    route = _[0];
    const query = encodeURI(_[1]);
    if (route === '/list')
      query.startsWith('shareId') ?
        fetchCollection('', query.split('=')[1]) :
        fetchList('/' + query.split('=').join('/'));
    if (route === '/search') {
      const x = new URLSearchParams(query);
      superInput.value = x.get('q') || '';
      searchFilters.value = x.get('f') || 'all';
    }
    if (route === '/upcoming')
      upcomingInjector(query.slice(2))

  }
  else route = errorParam;
}
else {
  route = routes.find(route => location.pathname === route) || '/';
  const hasStreamQuery = params.has('s') || params.has('url') || params.has('text');
  if (route === '/' && !hasStreamQuery)
    route = getSaved('startupTab') ? '/library' : '/search';
}

// necessary to use a click event 
const goHome = () => (<HTMLAnchorElement>document.getElementById(route)).click();
goHome();
ytifyIcon.addEventListener('click', goHome);

// enables back button functionality

onpopstate = () =>
  superModal.open ?
    superModal.close() :
    showSection(location.pathname);


