export const img = <HTMLImageElement>document.getElementById('img');

export const title = <HTMLAnchorElement>document.getElementById('title');

export const progress = <HTMLInputElement>document.getElementById('progress');

export const miniPlayer = <HTMLDivElement>document.getElementById('miniPlayer');

export const canvas = new OffscreenCanvas(512, 512);

export const context = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d');

export const superInput = <HTMLInputElement>document.getElementById('superInput');

export const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');

export const playButton = <HTMLButtonElement>document.getElementById('playButton');

export const audio = <HTMLAudioElement>document.querySelector('audio');

export const instanceSelector = document.getElementById('instanceSelector') as HTMLSelectElement;

export const superModal = <HTMLDialogElement>document.getElementById('superModal');

export const upcomingBtn = <HTMLAnchorElement>document.getElementById('/upcoming');

export const queuelist = <HTMLElement>document.getElementById('queuelist');

export const listSection = <HTMLDivElement>document.getElementById('list');

export const listContainer = <HTMLDivElement>document.getElementById('playlist');

export const listAnchor = <HTMLAnchorElement>document.getElementById('/list');

export const favButton = <HTMLInputElement>document.getElementById('favButton');

export const favIcon = <HTMLLabelElement>favButton.nextElementSibling;

export const listBtnsContainer = <HTMLSpanElement>document.getElementById('listTools');

export const [playAllBtn, enqueueBtn, importListBtn, subscribeListBtn, openInYtBtn, clearListBtn, removeFromListBtn, deleteCollectionBtn, renameCollectionBtn, shareCollectionButton] = <HTMLCollectionOf<HTMLButtonElement>>listBtnsContainer.children;

export const loadingScreen = <HTMLDialogElement>document.getElementById('loadingScreen');
loadingScreen.addEventListener('click', () => loadingScreen.close());

export const subtitleTrack = <HTMLTrackElement>audio.firstElementChild;

export const subtitleContainer = <HTMLDivElement>document.getElementById('subtitleContainer');

export const subtitleSelector = <HTMLSelectElement>document.getElementById('subtitleSelector');

export const superCollectionSelector = document.getElementById('superCollectionSelector') as HTMLSelectElement;
