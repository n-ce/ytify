import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import Selector from '../Selector';
import { i18n } from '../../scripts/i18n';
import { setState, state } from '../../lib/store';
import { cssVar, themer } from '../../scripts/theme';

export default function() {
  return html`
    <div>
      <b>
        <i class="ri-t-shirt-2-line"></i>
        <p>${i18n('settings_interface')}</p>
      </b>

      ${ToggleSwitch({
    id: 'imgLoadSwitch',
    name: 'settings_load_images',
    checked: state.loadImage,
    handler: () => {
      setState('loadImage', !state.loadImage);
      location.reload();
    }
  })}

      ${Selector({
    label: 'settings_roundness',
    id: 'roundnessChanger',
    handler: (e) => {
      cssVar('--roundness', e.target.value);
      setState('roundness', e.target.value);
    },
    onmount: (target) => {
      if (state.roundness)
        target.value = state.roundness || '0.4rem';
    },
    children: html`
          <option value="none">${i18n('settings_roundness_none')}</option>
          <option value="0.2rem">${i18n('settings_roundness_lighter')}</option>
          <option value="0.4rem" selected>${i18n('settings_roundness_light')}</option>
          <option value="0.6rem">${i18n('settings_roundness_heavy')}</option>
          <option value="0.9rem">${i18n('settings_roundness_heavier')}</option>
        `
  })}

      ${ToggleSwitch({
    id: "custom_theme",
    name: 'settings_use_custom_color',
    checked: Boolean(state.customTheme),
    handler: e => {
      let colorString = '';

      if (!state.customTheme) {
        const rgbText = i18n('settings_custom_color_prompt');
        const str = prompt(rgbText, '174,174,174');
        if (str)
          colorString = str;
        else
          e.preventDefault();
      }
      setState('customTheme', colorString);
      themer();
    }
  })}

      ${Selector({
    label: 'settings_theming_scheme',
    id: 'themeSelector',
    handler: (e) => {
      themer();
      setState('theme', e.target.value);
    },
    onmount: (target) => {
      target.value = state.theme || 'auto';
    },
    children: html`
          <optgroup label=${i18n('settings_theming_scheme_dynamic')}>
            <option value="auto" selected>${i18n('settings_theming_scheme_system')}</option>
            <option value="light">${i18n('settings_theming_scheme_light')}</option>
            <option value="dark">${i18n('settings_theming_scheme_dark')}</option>
          </optgroup>
          <optgroup label=${i18n('settings_theming_scheme_hc')}>
            <option value="auto-hc">${i18n('settings_theming_scheme_hc_system')}</option>
            <option value="white">${i18n('settings_theming_scheme_white')}</option>
            <option value="black">${i18n('settings_theming_scheme_black')}</option>
          </optgroup>
        `
  })}

    </div>
  `;
}
