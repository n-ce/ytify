/*
import { getSaved } from "../lib/utils";

const library = <HTMLElement>document.getElementById('library');



export const library_history = [];


const collections: string[] = [];


function historyUpdater(){
  const data = JSON.parse(getSaved(
    'history')||'');
  const dom = document.getElementById('library:history');
  for(const stream of data){
    
      }
  
}


export function addToPlaylist(name: string, item: HTMLElement) {

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


*/