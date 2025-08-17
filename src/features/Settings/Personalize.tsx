import ToggleSwitch from './ToggleSwitch.tsx';
import { Selector } from '../../components/Selector.tsx';
import { openDialog, t } from '../../lib/stores';
import { config, cssVar, setConfig, themer } from '../../lib/utils';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-t-shirt-2-line"></i>
        <p>{t('settings_interface')}</p>
      </b>

      <ToggleSwitch
        id='imgLoadSwitch'
        name='settings_load_images'
        checked={config.loadImage}
        onclick={() => {
          setConfig('loadImage', !config.loadImage);
          openDialog('snackbar', t('settings_reload'));
        }}
      />

      <Selector
        label='settings_font'
        id='fontChanger'
        onchange={(e) => {
          const { value } = e.target;
          cssVar('--font', `var(--font-${value})`);
          setConfig('font', e.target.value);
        }}
        onmount={(target) => {
          const { font } = config;

          if (font)
            target.value = font;
        }}
      >
        <option value="system-ui">System UI</option>
        <option value="rounded-sans">Rounded Sans</option>
        <option value="antique">Antique</option>
        <option value="handwritten">Handwritten</option>
        <option value="monospace-slab-serif">Monospace Slab Serif</option>
        <option value="monospace-code">Monospace Code</option>
        <option value="industrial">Industrial</option>
      </Selector>

      <Selector
        label='settings_roundness'
        id='roundnessChanger'
        onchange={(e) => {
          cssVar('--roundness', e.target.value);
          setConfig('roundness', e.target.value);
        }}
        onmount={(target) => {
          if (config.roundness)
            target.value = config.roundness || '0.4rem';
        }}
      >
        <option value="none">{t('settings_roundness_none')}</option>
        <option value="0.2rem">{t('settings_roundness_lighter')}</option>
        <option value="0.4rem" selected>{t('settings_roundness_light')}</option>
        <option value="0.6rem">{t('settings_roundness_heavy')}</option>
        <option value="0.9rem">{t('settings_roundness_heavier')}</option>
      </Selector>

      <ToggleSwitch
        id="custom_theme"
        name='settings_use_custom_color'
        checked={Boolean(config.customColor)}
        onclick={(e) => {
          let colorString = '';

          if (!config.customColor) {
            const rgbText = t('settings_custom_color_prompt');
            const str = prompt(rgbText, '174,174,174');
            if (str)
              colorString = str;
            else (e as Event).preventDefault();
          }
          setConfig('customColor', colorString);
          themer();
        }}
      />

      <Selector
        label='settings_theming_scheme'
        id='themeSelector'
        onchange={(e) => {
          themer();
          setConfig('theme', e.target.value);
        }}
        onmount={(target) => {
          target.value = config.theme || 'auto';
        }}
      >
        <optgroup label={t('settings_theming_scheme_dynamic')}>
          <option value="auto" selected>{t('settings_theming_scheme_system')}</option>
          <option value="light">{t('settings_theming_scheme_light')}</option>
          <option value="dark">{t('settings_theming_scheme_dark')}</option>
        </optgroup>
        <optgroup label={t('settings_theming_scheme_hc')}>
          <option value="auto-hc">{t('settings_theming_scheme_hc_system')}</option>
          <option value="white">{t('settings_theming_scheme_white')}</option>
          <option value="black">{t('settings_theming_scheme_black')}</option>
        </optgroup>
      </Selector>
    </div>
  );
}
