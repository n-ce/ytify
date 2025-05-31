import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import Selector from '../Selector';
import { i18n } from '../../scripts/i18n';
import { setState, state } from '../../lib/store';
import { notify, quickSwitch } from '../../lib/utils';

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
    checked: state.hq,
    handler: async () => {
      setState('hq', !state.hq);
      quickSwitch();
    }
  })}

      ${!state.HLS ? html`
        ${Selector({
    label: 'settings_codec_preference',
    id: 'codecPreference',
    handler: async (e) => {
      setState('codec', e.target.value);
      quickSwitch();
    },
    onmount: async (target) => {
      target.value = state.codec;
    },
    children: html`
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
            <option value="any">Any</option>
          `
  })}

        ${ToggleSwitch({
    id: "stableVolumeSwitch",
    name: 'settings_stable_volume',
    checked: Boolean(state.stableVolume),
    handler: () => {
      setState('stableVolume', !state.stableVolume);
      quickSwitch();
    }
  })}

        ${ToggleSwitch({
    id: "enforceProxySwitch",
    name: 'settings_always_proxy_streams',
    checked: state.enforceProxy,
    handler: () => {
      setState('enforceProxy', !state.enforceProxy);
      quickSwitch();
    }
  })}
      ` : html``}

      ${ToggleSwitch({
    id: "HLS_Switch",
    name: 'settings_hls',
    checked: state.HLS,
    handler: () => {
      setState('HLS', !state.HLS);
      notify(i18n('settings_reload'));
    }
  })}

      ${ToggleSwitch({
    id: "watchModeSwitch",
    name: 'settings_watchmode',
    checked: Boolean(state.watchMode),
    handler: () => {
      setState('watchMode',
        state.watchMode ?
          '' : '144p'
      );
    }
  })}
    </div>
  `;
}
