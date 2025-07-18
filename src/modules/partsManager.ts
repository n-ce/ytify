import { setState, state } from "../lib/store";
import { i18n } from "../lib/utils";

export default function(): {
  name: string,
  callback: (arg0: Event & { target: HTMLElement }) => void
}[] {
  if (!state['part Navigation Library'])
    toggle('/library');
  if (!state['part Reserved Collections'])
    toggle('collections');
  if (!state['part Featured Playlists'])
    toggle('r.featured');
  if (!state['part For You'])
    toggle('r.for_you');
  if (!state['part Subscription Feed'])
    toggle('r.feed');
  if (!state['part Channels'])
    toggle('r.channels');
  if (!state['part Albums'])
    toggle('r.albums');
  if (!state['part Artists'])
    toggle('r.artists');
  if (!state['part Playlists'])
    toggle('r.playlists');
  if (!state['part Collections'])
    toggle('r.collections');

  return [
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
      name: 'Watch On',
      callback: e => lsHandler(e.target?.id)
    },
    {
      name: 'View Author',
      callback: e => lsHandler(e.target?.id)
    },
    {
      name: 'Start Radio',
      callback: e => lsHandler(e.target?.id)
    }
  ];
}

function lsHandler(id: string | undefined) {
  if (!id) return;
  const stateKey = id as keyof typeof state;
  setState(stateKey, !state[stateKey]);
}

function toggle(part: string, e: Event & { target: HTMLElement } | undefined = undefined) {
  const id = e?.target?.id;
  if (id) {
    const askpin = prompt(i18n('settings_pin_prompt'));
    if (!askpin) return e?.preventDefault();
    if (state.partsManagerPIN !== askpin) {
      e?.preventDefault();
      return alert(i18n('settings_pin_incorrect'));
    }
    lsHandler(id);
  }

  const elem = document.getElementById(part)!;
  const elm = part.includes('r.') ? elem.nextElementSibling : elem;

  elm?.classList.toggle('hide');
}
