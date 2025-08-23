import { config, setConfig } from "../utils";
import { t } from '../stores';

export default function(): {
  name: string,
  callback: (arg0: Event & { target: HTMLElement }) => void
}[] {
  if (!config['part Navigation Library'])
    toggle('/library');
  if (!config['part Reserved Collections'])
    toggle('collections');
  if (!config['part Featured Playlists'])
    toggle('r.featured');
  if (!config['part For You'])
    toggle('r.for_you');
  if (!config['part Subscription Feed'])
    toggle('r.feed');
  if (!config['part Channels'])
    toggle('r.channels');
  if (!config['part Albums'])
    toggle('r.albums');
  if (!config['part Artists'])
    toggle('r.artists');
  if (!config['part Playlists'])
    toggle('r.playlists');
  if (!config['part Collections'])
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
  const configKey = id as keyof typeof config;
  setConfig(configKey, !config[configKey]);
}

function toggle(part: string, e: Event & { target: HTMLElement } | undefined = undefined) {
  const id = e?.target?.id;
  if (id) {
    const askpin = prompt(t('settings_pin_prompt'));
    if (!askpin) return e?.preventDefault();
    if (config.partsManagerPIN !== askpin) {
      e?.preventDefault();
      return alert(t('settings_pin_incorrect'));
    }
    lsHandler(id);
  }

  const elem = document.getElementById(part)!;
  const elm = part.includes('r.') ? elem.nextElementSibling : elem;

  elm?.classList.toggle('hide');
}
