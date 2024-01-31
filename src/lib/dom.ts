export const img = <HTMLImageElement>document.querySelector('img');

export const canvas = <HTMLCanvasElement>document.querySelector('canvas');

export const context = <CanvasRenderingContext2D>canvas.getContext('2d');

export const pipedInstances = <HTMLSelectElement>document.getElementById('pipedInstances');

export const invidiousInstances = <HTMLSelectElement>document.getElementById('invidiousInstances');

export const thumbnailProxies = <HTMLSelectElement>document.getElementById('thumbnailProxies');

export const superInput = <HTMLInputElement>document.getElementById('superInput');

export const playButton = <HTMLButtonElement>document.getElementById('playButton');

export const audio = <HTMLAudioElement>document.querySelector('audio');

export const bitrateSelector = <HTMLSelectElement>document.getElementById('bitrateSelector');

export const suggestions = <HTMLUListElement>document.getElementById('suggestions');

export const suggestionsSwitch = <HTMLSelectElement>document.getElementById('suggestionsSwitch');

export const superModal = <HTMLDialogElement>document.getElementById('superModal');

export const upcomingBtn = <HTMLAnchorElement>document.getElementById('/upcoming');

export const queuelist = <HTMLElement>document.getElementById('queuelist');

export const listSection = <HTMLDivElement>document.getElementById('list');

export const listContainer = <HTMLDivElement>document.getElementById('playlist');

export const listAnchor = <HTMLAnchorElement>document.getElementById('/list');

export const favButton = <HTMLInputElement>document.getElementById('favButton');

export const favIcon = <HTMLLabelElement>favButton.nextElementSibling;

export const [playAllBtn, enqueueBtn, saveListBtn, openInYtBtn] = <HTMLCollectionOf<HTMLButtonElement>>(<HTMLSpanElement>document.getElementById('listTools')).children;

export const discoverSwitch = <HTMLSelectElement>document.getElementById('discoverSwitch');

export const loadingScreen = <HTMLDialogElement>document.getElementById('loadingScreen');
loadingScreen.addEventListener('click', () => loadingScreen.close());

