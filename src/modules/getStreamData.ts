import { store } from "../lib/store";

export function getData(id: string) {
  /*
  If HLS
  use full instance list
  else 
  use unified instance list
  > Get HLS/AudioStreams from Piped
  if not available
  > Get AudioStreams from Invidious
  */

  async function fetchDataFromPiped(
    api: string,
    index: number
  ) {
    if (index > noOfUnifiedInstances)
      return await fetch(`${api}/streams/${id}`)
        .then(res => res.json())
        .then(data => {
          if ('audioStreams' in data)
            return data;
          else throw new Error(data.message);
        });
    else throw new Error();
  }

  const a = store.api;
  const noOfUnifiedInstances = a[store.player.HLS ? 'piped' : 'invidious'].length;

  return Promise
    .any(store.api.piped.map(fetchDataFromPiped))

}


