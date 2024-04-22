export const img = <HTMLImageElement>document.getElementById('img');

export const canvas = <HTMLCanvasElement>document.querySelector('canvas');

export const context = <CanvasRenderingContext2D>canvas.getContext('2d');

export const instanceSelector = <HTMLSelectElement>document.getElementById('instances');

export const superInput = <HTMLInputElement>document.getElementById('superInput');

export const searchFilters = <HTMLSelectElement>document.getElementById('searchFilters');

export const playButton = <HTMLButtonElement>document.getElementById('playButton');

export const audio = <HTMLAudioElement>document.querySelector('audio');

export const superModal = <HTMLDialogElement>document.getElementById('superModal');

export const upcomingBtn = <HTMLAnchorElement>document.getElementById('/upcoming');

export const queuelist = <HTMLElement>document.getElementById('queuelist');

export const listSection = <HTMLDivElement>document.getElementById('list');

export const listContainer = <HTMLDivElement>document.getElementById('playlist');

export const listAnchor = <HTMLAnchorElement>document.getElementById('/list');

export const favButton = <HTMLInputElement>document.getElementById('favButton');

export const favIcon = <HTMLLabelElement>favButton.nextElementSibling;

export const [playAllBtn, enqueueBtn, saveListBtn, openInYtBtn] = <HTMLCollectionOf<HTMLButtonElement>>(<HTMLSpanElement>document.getElementById('listTools')).children;

export const loadingScreen = <HTMLDialogElement>document.getElementById('loadingScreen');
loadingScreen.addEventListener('click', () => loadingScreen.close());

export const subtitleTrack = <HTMLTrackElement>audio.firstElementChild;

export const subtitleContainer = <HTMLDivElement>document.getElementById('subtitleContainer');

export const subtitleSelector = <HTMLSelectElement>document.getElementById('subtitleSelector');
