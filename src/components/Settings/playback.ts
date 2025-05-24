import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import Selector from '../Selector';
import { i18n } from '../../scripts/i18n';
import { getSaved, store } from '../../lib/store';
import { quickSwitch, removeSaved, save } from '../../lib/utils';

export default function() {
  return html`
    <div>
      <b>
        <i class="ri-play-large-line"></i>
        <p>${i18n('settings_playback')}</p>
      </b>

      ${ToggleSwitch({
    id: "qualitySwitch",
    name: 'settings_hq_audio',
    checked: getSaved('hq') === 'true',
    handler: async () => {
      if (getSaved('hq'))
        removeSaved('hq');
      else
        save('hq', 'true');

      store.player.hq = !store.player.hq;

      quickSwitch();
    }
  })}

      ${!store.player.hls.on ? html`
        ${Selector({
    label: 'settings_codec_preference',
    id: 'codecPreference',
    handler: async (e) => {
      const i = e.target.selectedIndex;
      if (i)
        save('codec', String(i))
      else
        removeSaved('codec');

      store.player.codec = e.target.value as 'any';
      quickSwitch();
    },
    onmount: async (target) => {
      const codecSaved = getSaved('codec');
      target.selectedIndex = codecSaved ?
        parseInt(codecSaved) :
        ((await store.player.supportsOpus) ? 0 : 1);

      store.player.codec = target.value as 'any';
    },
    children: html`
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
            <option value="">Any</option>
          `
  })}

        ${ToggleSwitch({
    id: "stableVolumeSwitch",
    name: 'settings_stable_volume',
    checked: getSaved('stableVolume') === 'true',
    handler: () => {
      const _ = 'stableVolume';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, 'true');
      quickSwitch();
    }
  })}

        ${ToggleSwitch({
    id: "enforceProxySwitch",
    name: 'settings_always_proxy_streams',
    checked: getSaved('enforceProxy') === 'true',
    handler: () => {
      const _ = 'enforceProxy';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, 'true');
      quickSwitch();
    }
  })}
      ` : html``}

      ${ToggleSwitch({
    id: "HLS_Switch",
    name: 'settings_hls',
    checked: getSaved('HLS') === 'true',
    handler: () => {
      if (getSaved('HLS'))
        removeSaved('HLS');
      else
        save('HLS', 'true');
      location.reload();
    }
  })}

      ${ToggleSwitch({
    id: "watchModeSwitch",
    name: 'settings_watchmode',
    checked: Boolean(getSaved('watchMode')),
    handler: () => {
      const _ = 'watchMode';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, '144p');
    }
  })}
    </div>
  `;
}
