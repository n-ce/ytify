import { html } from 'uhtml';
import ToggleSwitch from './ToggleSwitch';
import Selector from '../Selector';
import { i18n } from '../../scripts/i18n';
import { getSaved, store } from '../../lib/store';
import { removeSaved, save } from '../../lib/utils';
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
    checked: store.loadImage,
    handler: () => {
      const _ = 'imgLoad';
      if (getSaved(_))
        removeSaved(_);
      else
        save(_, 'off');
      location.reload();
    }
  })}

      ${Selector({
    label: 'settings_roundness',
    id: 'roundnessChanger',
    handler: (e) => {
      cssVar('--roundness', e.target.value);
      if (e.target.value === '0.4rem')
        removeSaved('roundness');
      else
        save('roundness', e.target.value);
    },
    onmount: (target) => {
      if (getSaved('roundness'))
        target.value = getSaved('roundness') || '0.4rem';
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
    checked: getSaved('custom_theme') !== null,
    handler: e => {
      const _ = 'custom_theme';
      const colorString = getSaved(_);

      if (colorString) removeSaved(_);
      else {
        const rgbText = i18n('settings_custom_color_prompt');
        const str = prompt(rgbText, '174,174,174');
        if (str)
          save(_, str)
        else
          e.preventDefault();
      }
      themer();
    }
  })}

      ${Selector({
    label: 'settings_theming_scheme',
    id: 'themeSelector',
    handler: (e) => {
      themer();
      if (e.target.value === 'auto')
        removeSaved('theme');
      else
        save('theme', e.target.value);
    },
    onmount: (target) => {
      target.value = (getSaved('theme')) || 'auto';
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
