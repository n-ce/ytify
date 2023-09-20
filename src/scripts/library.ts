
const library = <HTMLElement>document.getElementById('library');


const collections: string[] = [];


function addToPlaylist(name: string, item: HTMLElement) {

  if (collections.includes(name)) {
    (<HTMLDetailsElement>document.getElementById('collection:' + name)).appendChild(item);
  }
  else {
    const details = document.createElement('details');
    details.id = 'collection:' + name;
    const summary = document.createElement('summary');
    summary.textContent = name;
    details.append(summary, item);
    library.appendChild(details);
  }
}


