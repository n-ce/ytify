import ToggleSwitch from './ToggleSwitch.tsx';
import { Selector } from '../../components/Selector.tsx';
import { config, quickSwitch, setConfig } from '../../lib/utils';
import { t } from '../../lib/stores';

export default function() {
  let head!: HTMLElement;
  return (
    <div>
      <b class="hide" ref={head} onclick={() => head.classList.toggle('hide')}>
        {t('settings_playback')}
      </b>

      <Selector
        label='settings_audio_quality'
        id='qualityPreference'
        onchange={async (e) => {
          setConfig('quality', e.target.value as 'low' | 'medium' | 'high');
          quickSwitch();
        }}
        value={config.quality}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Selector>

      <ToggleSwitch
        id="prefetchSwitch"
        name='settings_prefetch'
        checked={Boolean(config.prefetch)}
        onclick={() => {
          setConfig('prefetch', !config.prefetch);
        }}
      />


      <Selector
        label='settings_codec_preference'
        id='codecPreference'
        onchange={async (e) => {
          setConfig('codec', e.target.value as 'opus' | 'any' | 'aac');
          quickSwitch();
        }}
        value={config.codec}
      >
        <option value="opus">Opus</option>
        <option value="aac">AAC</option>
        <option value="any">Any</option>
      </Selector>

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
        id="enforceProxySwitch"
        name='settings_always_proxy_streams'
        checked={config.enforceProxy}
        onclick={() => {
          setConfig('enforceProxy', !config.enforceProxy);
          quickSwitch();
        }}
      />

      <ToggleSwitch
        id="jioSaavnSwitch"
        name='settings_jiosaavn'
        checked={config.jiosaavn}
        onclick={() => {
          setConfig('jiosaavn', !config.jiosaavn);
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
    </div>
  );
}
