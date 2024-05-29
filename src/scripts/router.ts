import { audio, loadingScreen, queuelist, searchFilters, superInput, superModal } from "../lib/dom";
import { superCollectionLoader } from "../lib/libraryUtils";
import { fetchList, getSaved, params } from "../lib/utils";
import { miniPlayerRoutingHandler } from "./miniPlayer";
import { appendToQueuelist } from "./queue";

const nav = document.querySelector('nav') as HTMLDivElement;
const anchors = document.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
const sections = document.querySelectorAll('section') as NodeListOf<HTMLDivElement>;
const routes = ['/', '/upcoming', '/search', '/library', '/settings', '/list'];
const queueParam = params.get('a');


function upcomingInjector(param: string) {
  loadingScreen.showModal();

  fetch(`${location.origin}/upcoming?id=${param}`)
    .then(res => res.json())
    .then(data => {
      loadingScreen.close();
      for (const stream of data)
        appendToQueuelist(stream)
    })
}

if (queueParam)
  upcomingInjector(queueParam);

let prevPageIdx = routes.indexOf(location.pathname);

function showSection(id: string) {
  const routeIdx = routes.indexOf(id);
  miniPlayerRoutingHandler(id === '/', nav.parentElement!.classList);

  // Enables Reactivity to declare db modifications into UI
  if (id === '/library')
    superCollectionLoader(getSaved('defaultSuperCollection') || 'collections');

  sections[routeIdx].classList.add('view');
  anchors[routeIdx].classList.add('active');

  if (prevPageIdx !== routeIdx) {
    sections[prevPageIdx].classList.remove('view');
    anchors[prevPageIdx].classList.remove('active');
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
    const aParam = queuelist.dataset.array ? '?a=' + queuelist.dataset.array : '';
    const otherQuery = anchor.id === '/search' ? superInput.dataset.query || '' : anchor.id === '/upcoming' ? aParam : '';

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
    route = getSaved('startupTab') ? '/search' : '/library';
}

// necessary to use a click event 
(<HTMLAnchorElement>document.getElementById(route)).click();

// enables back button functionality

onpopstate = () =>
  superModal.open ?
    superModal.close() :
    showSection(location.pathname);



