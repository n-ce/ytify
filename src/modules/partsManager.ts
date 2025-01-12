import { getSaved } from "../lib/store";
import { removeSaved, save } from "../lib/utils";


export const partsManager = (): {
  name: string,
  callback: (arg0: Event) => void
}[] => {
  if (getSaved('kidsMode_Settings'))
    toggle('/settings');
  if (getSaved('kidsMode_Search'))
    toggle('/search');
  if (getSaved('kidsMode_Library'))
    toggle('/library');
  if (getSaved('kidsMode_Reserved Collections'))
    toggle('collections');
  if (getSaved('kidsMode_Featured Playlists'))
    toggle('r.featured');
  if (getSaved('kidsMode_For You'))
    toggle('r.for_you');
  if (getSaved('kidsMode_Subscription Feed'))
    toggle('r.feed');
  if (getSaved('kidsMode_Channels'))
    toggle('r.channels');
  if (getSaved('kidsMode_Albums'))
    toggle('r.albums');
  if (getSaved('kidsMode_Artists'))
    toggle('r.artists');
  if (getSaved('kidsMode_Playlists'))
    toggle('r.playlists');
  if (getSaved('kidsMode_Collections'))
    toggle('r.collections');
  if (getSaved('kidsMode_Watch On YouTube Button'))
    toggle('woytBtn');

  return [
    {
      name: 'Navigation Settings',
      callback: e => toggle('/settings', e)
    },
    {
      name: 'Navigation Search',
      callback: e => toggle('/search', e)
    },
    {
      name: 'Navigation Library',
      callback: e => toggle('/library', e)
    },
    {
      name: 'Reserved Collections',
      callback: e => toggle('collections', e)
    },
    {
      name: 'Featured Playlists',
      callback: e => toggle('r.featured', e)
    },
    {
      name: 'For You',
      callback: e => toggle('r.for_you', e)
    },
    {
      name: 'Subscription Feed',
      callback: e => toggle('r.feed', e)
    },
    {
      name: 'Channels',
      callback: e => toggle('r.channels', e)
    },
    {
      name: 'Artists',
      callback: e => toggle('r.artists', e)
    },
    {
      name: 'Albums',
      callback: e => toggle('r.albums', e)
    },
    {
      name: 'Playlists',
      callback: e => toggle('r.playlists', e)
    },
    {
      name: 'Collections',
      callback: e => toggle('r.collections', e)
    },
    {
      name: 'Watch On YouTube Button',
      callback: e => toggle('woytBtn', e)
    }


  ];
}

function toggle(part: string, e: Event | undefined = undefined) {
  // @ts-ignore
  const id = e?.target?.id;
  if (id) {
    const askpin = prompt('Enter PIN');
    if (!askpin) return e?.preventDefault();
    if (getSaved('kidsMode') !== askpin) {
      e?.preventDefault();
      return alert('Incorrect PIN entered.')
    }
    getSaved(id) ?
      removeSaved(id) :
      save(id, 'hidden');
  }
  const elem = document.getElementById(part)!;
  const elm = part.includes('r.') ? elem.nextElementSibling : elem;

  elm?.classList.toggle('hide');
}

function button(part: string, e: Event | undefined = undefined) {

}


/*
          < option value = "viewOnYTBtn" > Open Playlist in YouTube Button </option>
            < option value = "actionsMenu3" > Start Radio Button </option>
              < option value = "actionsMenu5" > View Channel Button </option>
                < option value = "actionsMenu6" > Watch on YouTube Button </option>
*/
