import ToggleSwitch from './ToggleSwitch.tsx';
import { Selector } from '@components/Selector.tsx';
import { setStore, t } from '@lib/stores';
import { config, cssVar, setConfig, themer } from '@lib/utils';

export default function() {

  return (
    <>
      <ToggleSwitch
        id='imgLoadSwitch'
        name='settings_load_images'
        checked={config.loadImage}
        onclick={() => {
          setConfig('loadImage', !config.loadImage);
          setStore('snackbar', t('settings_reload'));
        }}
      />

      <Selector
        label='settings_landscape_sections'
        onchange={(e) => {
          const { value } = e.target;
          cssVar('--landscapeSections', value);
          setConfig('landscapeSections', e.target.value);
        }}
        id='sls'
        value={config.landscapeSections}
      >
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3" selected>3</option>
      </Selector>

      <Selector
        label='settings_roundness'
        id='roundnessChanger'
        onchange={(e) => {
          cssVar('--roundness', e.target.value);
          setConfig('roundness', e.target.value);
        }}
        value={config.roundness}
      >
        <option value="none">{t('settings_roundness_none')}</option>
        <option value="0.2rem">{t('settings_roundness_lighter')}</option>
        <option value="0.4rem" selected>{t('settings_roundness_light')}</option>
        <option value="0.6rem">{t('settings_roundness_heavy')}</option>
        <option value="0.9rem">{t('settings_roundness_heavier')}</option>
      </Selector>

      <Selector
        label='settings_theming_scheme'
        id='themeSelector'
        onchange={(e) => {
          themer();
          setConfig('theme', e.target.value as 'auto' | 'light' | 'dark');
        }}
        value={config.theme}
      >
        <option value="auto" selected>{t('settings_theming_scheme_system')}</option>
        <option value="light">{t('settings_theming_scheme_light')}</option>
        <option value="dark">{t('settings_theming_scheme_dark')}</option>
      </Selector>
    </>
  );
}
