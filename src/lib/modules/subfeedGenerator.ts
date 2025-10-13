import { setListStore, setStore } from "@lib/stores";
import { getLists } from "@lib/utils";

export default async function(preview?: string) {

  setListStore('isLoading', true);
  const api = 'https://js-ruddy-rho.vercel.app';
  const endpoint = '/api/feed/channels=';
  const channels = getLists('channels');
  const list = [];

  for (const id in channels) {
    if (!channels[id].name.startsWith('Artist'))
      list.push(id);
  }


  return fetch(api + endpoint + list.join(',') + preview)
    .then(res => res.json())
    .then(data => {
      if (!data.length)
        throw new Error(data.message);
      return data?.filter((i: { duration: number }) => i.duration > 90);

    })
    .catch(e => {
      setStore('snackbar', e.message || 'Error');
      return [];
    })
    .finally(() => {
      setListStore('isLoading', true);
    });

}
