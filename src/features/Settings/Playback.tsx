import ToggleSwitch from './ToggleSwitch.tsx';
import { Selector } from '@components/Selector.tsx';
import { config, quickSwitch, setConfig } from '@lib/utils';
import { t } from '@lib/stores';

export default function() {
  return (
    <>
      <Selector
        label='settings_audio_quality'
        id='qualityPreference'
        onchange={async (e) => {
          setConfig('quality', e.target.value as 'worst' | 'low' | 'medium' | 'high' | 'lossless');
          quickSwitch();
        }}
        value={config.quality}
      >
        <option value="worst">{t('settings_quality_worst')}</option>
        <option value="low">{t('settings_quality_low')}</option>
        <option value="medium">{t('settings_quality_medium')}</option>
        <option value="high">{t('settings_quality_high')}</option>
        <option value="lossless" disabled>{t('settings_quality_lossless')}</option>
      </Selector>

      <ToggleSwitch
        id="prefetchSwitch"
        name='settings_prefetch'
        checked={Boolean(config.prefetch)}
        onclick={() => {
          setConfig('prefetch', !config.prefetch);
        }}
      />


      <ToggleSwitch
        id="stableVolumeSwitch"
        name='settings_stable_volume'
        checked={Boolean(config.stableVolume)}
        onclick={() => {
          setConfig('stableVolume', !config.stableVolume);
          quickSwitch();
        }}
      />

      <ToggleSwitch
        id="watchModeSwitch"
        name='settings_watchmode'
        checked={Boolean(config.watchMode)}
        onclick={() => {
          setConfig('watchMode',
            config.watchMode ?
              '' : '144p'
          );
        }}
      />
    </>
  );
}
