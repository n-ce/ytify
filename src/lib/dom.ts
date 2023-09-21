
export const img = <HTMLImageElement>document.querySelector('img');

export const pipedInstances = <HTMLSelectElement>document.getElementById('pipedInstances');

export const superInput = <HTMLInputElement>document.getElementById('superInput');

export const playButton = <HTMLButtonElement>document.getElementById('playButton');

export const audio = <HTMLAudioElement>document.querySelector('audio');

export const bitrateSelector = <HTMLSelectElement>document.getElementById('bitrateSelector');

export const suggestions = <HTMLUListElement>document.getElementById('suggestions');

export const suggestionsSwitch = <HTMLSelectElement>document.getElementById('suggestionsSwitch');

export const superModal = <HTMLDivElement>document.getElementById('superModal');


export const [playNow, queueNext, addToPlaylist, startRadio] = <HTMLCollectionOf<HTMLLIElement>>(<HTMLUListElement>superModal.firstElementChild).children;

export const queuelist = <HTMLElement>document.getElementById('upcoming');

export const author = <HTMLAnchorElement>document.getElementById('author');
export const listItemsContainer = <HTMLElement>document.getElementById('>');

export const listItemsAnchor = <HTMLAnchorElement>document.getElementById('/>');
