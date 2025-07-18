export const img = <HTMLImageElement>document.getElementById('img');

export const title = <HTMLAnchorElement>document.getElementById('title');

export const author = <HTMLParagraphElement>document.getElementById('author');

export const progress = <HTMLInputElement>document.getElementById('progress');

export const miniPlayer = <HTMLDivElement>document.getElementById('miniPlayer');

export const superInput = <HTMLInputElement>document.getElementById('superInput');

export const searchlist = <HTMLDivElement>document.getElementById('searchlist');

export const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');

export const playButton = <HTMLButtonElement>document.getElementById('playButton');

export const audio = <HTMLAudioElement>document.querySelector('audio');

export const queuelist = <HTMLElement>document.getElementById('queuelist');

export const listSection = <HTMLDivElement>document.getElementById('list');

export const listContainer = <HTMLDivElement>document.getElementById('listContainer');

export const listAnchor = <HTMLAnchorElement>document.getElementById('/list');

export const favButton = <HTMLInputElement>document.getElementById('favButton');


export const listTitle = <HTMLSpanElement>document.getElementById('listTitle');

export const listBtnsContainer = <HTMLSpanElement>document.getElementById('listTools');

export const loadingScreen = <HTMLDialogElement>document.getElementById('loadingScreen');
loadingScreen.addEventListener('click', () => loadingScreen.close());

export const qualityView = document.getElementById('qualityView') as HTMLParagraphElement;

export const superCollectionSelector = document.getElementById('superCollectionSelector') as HTMLDivElement;

export const superCollectionList = document.getElementById('superCollectionList') as HTMLDivElement;

export const settingsContainer = document.getElementById('settings') as HTMLDialogElement;
