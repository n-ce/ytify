import { getSaved } from "../lib/store";
import { i18n, removeSaved, save } from "../lib/utils";


export default function(): {
  name: string,
  callback: (arg0: Event) => void
}[] {
  if (getSaved('kidsMode_Navigation Settings'))
    toggle('/settings');
  if (getSaved('kidsMode_Navigation Search'))
    toggle('/search');
  if (getSaved('kidsMode_Navigation Library'))
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
      name: 'Watch On Button',
      callback: e => lsHandler(e.target?.id)
    },
    {
      name: 'View Channel/Artist Button',
      callback: e => lsHandler(e.target?.id)
    },
    {
      name: 'Start Radio Button',
      callback: e => lsHandler(e.target?.id)
    }
  ];
}



const lsHandler = (id: string | undefined) => id ?
  getSaved(id) ?
    removeSaved(id) :
    save(id, 'hidden')
  : undefined;

function toggle(part: string, e: Event | undefined = undefined) {

  const id = e?.target?.id;
  if (id) {
    const askpin = prompt(i18n('settings_pin_prompt'));
    if (!askpin) return e?.preventDefault();
    if (getSaved('kidsMode') !== askpin) {
      e?.preventDefault();
      return alert(i18n('settings_pin_incorrect'))
    }
    lsHandler(id);
  }

  const elem = document.getElementById(part)!;
  const elm = part.includes('r.') ? elem.nextElementSibling : elem;

  elm?.classList.toggle('hide');
}


