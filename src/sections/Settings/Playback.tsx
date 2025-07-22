import ToggleSwitch from './ToggleSwitch.tsx';
import { setState, state } from '../../lib/store.ts';
import { i18n, notify, quickSwitch } from '../../lib/utils.ts';
import { Selector } from '../../components/Selector.tsx';

export default function() {
  return (
    <div>
      <b>
        <i class="ri-play-large-line"></i>
        <p>{i18n('settings_playback')}</p>
      </b>

      <Selector
        label='settings_audio_quality'
        id='qualityPreference'
        onchange={async (e) => {
          setState('quality', e.target.value as 'low' | 'medium' | 'high');
          quickSwitch();
        }}
        onmount={async (target) => {
          target.value = state.quality || 'medium';
        }}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Selector>

      <ToggleSwitch
        id="prefetchSwitch"
        name='settings_prefetch'
        checked={Boolean(state.prefetch)}
        onclick={() => {
          setState('prefetch', !state.prefetch);
        }}
      />

      {!state.HLS ? (
        <>
          <Selector
            label='settings_codec_preference'
            id='codecPreference'
            onchange={async (e) => {
              setState('codec', e.target.value as 'opus' | 'any' | 'aac');
              quickSwitch();
            }}
            onmount={async (target) => {
              target.value = state.codec;
            }}
          >
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
            <option value="any">Any</option>
          </Selector>

          <ToggleSwitch
            id="stableVolumeSwitch"
            name='settings_stable_volume'
            checked={Boolean(state.stableVolume)}
            onclick={() => {
              setState('stableVolume', !state.stableVolume);
              quickSwitch();
            }}
          />

          <ToggleSwitch
            id="enforcePipedSwitch"
            name='settings_enforce_piped'
            checked={state.enforcePiped}
            onclick={() => {
              setState('enforcePiped', !state.enforcePiped);
              quickSwitch();
            }}
          />

          <ToggleSwitch
            id="enforceProxySwitch"
            name='settings_always_proxy_streams'
            checked={state.enforceProxy}
            onclick={() => {
              setState('enforceProxy', !state.enforceProxy);
              quickSwitch();
            }}
          />
        </>
      ) : (
        <></>
      )}

      <ToggleSwitch
        id="HLS_Switch"
        name='settings_hls'
        checked={state.HLS}
        onclick={() => {
          setState('HLS', !state.HLS);
          notify(i18n('settings_reload'));
        }}
      />

      <ToggleSwitch
        id="jioSaavnSwitch"
        name='settings_jiosaavn'
        checked={state.jiosaavn}
        onclick={() => {
          setState('jiosaavn', !state.jiosaavn);
        }}
      />

      <ToggleSwitch
        id="watchModeSwitch"
        name='settings_watchmode'
        checked={Boolean(state.watchMode)}
        onclick={() => {
          setState('watchMode',
            state.watchMode ?
              '' : '144p'
          );
        }}
      />
    </div>
  );
}
