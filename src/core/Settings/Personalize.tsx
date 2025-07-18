import ToggleSwitch from './ToggleSwitch.tsx';
import { Selector } from '../../components/Selector.tsx';
import { setState, state } from '../../lib/store.ts';
import { notify, i18n } from '../../lib/utils.ts';
import { cssVar, themer } from '../../lib/visualUtils.ts';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-t-shirt-2-line"></i>
        <p>{i18n('settings_interface')}</p>
      </b>

      <ToggleSwitch
        id='imgLoadSwitch'
        name='settings_load_images'
        checked={state.loadImage}
        onclick={() => {
          setState('loadImage', !state.loadImage);
          notify(i18n('settings_reload'));
        }}
      />

      <Selector
        label='settings_roundness'
        id='roundnessChanger'
        onchange={(e) => {
          cssVar('--roundness', e.target.value);
          setState('roundness', e.target.value);
        }}
        onmount={(target) => {
          if (state.roundness)
            target.value = state.roundness || '0.4rem';
        }}
      >
        <option value="none">{i18n('settings_roundness_none')}</option>
        <option value="0.2rem">{i18n('settings_roundness_lighter')}</option>
        <option value="0.4rem" selected>{i18n('settings_roundness_light')}</option>
        <option value="0.6rem">{i18n('settings_roundness_heavy')}</option>
        <option value="0.9rem">{i18n('settings_roundness_heavier')}</option>
      </Selector>

      <ToggleSwitch
        id="custom_theme"
        name='settings_use_custom_color'
        checked={Boolean(state.customColor)}
        onclick={(e) => {
          let colorString = '';

          if (!state.customColor) {
            const rgbText = i18n('settings_custom_color_prompt');
            const str = prompt(rgbText, '174,174,174');
            if (str)
              colorString = str;
            else (e as Event).preventDefault();
          }
          setState('customColor', colorString);
          themer();
        }}
      />

      <Selector
        label='settings_theming_scheme'
        id='themeSelector'
        onchange={(e) => {
          themer();
          setState('theme', e.target.value);
        }}
        onmount={(target) => {
          target.value = state.theme || 'auto';
        }}
      >
        <optgroup label={i18n('settings_theming_scheme_dynamic')}>
          <option value="auto" selected>{i18n('settings_theming_scheme_system')}</option>
          <option value="light">{i18n('settings_theming_scheme_light')}</option>
          <option value="dark">{i18n('settings_theming_scheme_dark')}</option>
        </optgroup>
        <optgroup label={i18n('settings_theming_scheme_hc')}>
          <option value="auto-hc">{i18n('settings_theming_scheme_hc_system')}</option>
          <option value="white">{i18n('settings_theming_scheme_white')}</option>
          <option value="black">{i18n('settings_theming_scheme_black')}</option>
        </optgroup>
      </Selector>
    </div>
  );
}
