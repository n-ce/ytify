import './Settings.css';
import { createSignal, For, onMount, Show } from "solid-js";
import { audio, img } from "../lib/dom";
import { $, quickSwitch, removeSaved, save } from "../lib/utils";
import { getSaved, params, store } from '../lib/store';
import { cssVar, themer } from "../scripts/theme";
import { getDB, saveDB } from '../lib/libraryUtils';
import { i18n } from '@lingui/core';


function ToggleSwitch(_: ToggleSwitch) {
  let target!: HTMLInputElement;

  return (
    <div class='toggleSwitch'>
      <label for={_.id}>
        {_.name}
      </label>
      <input
        ref={target}
        type='checkbox'
        id={_.id}
        checked={_.checked}
        onClick={_.onClick}
      />
      <span onClick={() => target.click()}></span>
    </div>
  );
}

export function Selector(_: Selector) {
  let target!: HTMLSelectElement;
  onMount(() => _.onMount(target));

  return (
    <span>
      <label for={_.id}>
        {_.label}
      </label>
      <select
        id={_.id}
        onChange={_.onChange}
        ref={target}
      >{_.children}</select>
    </span>
  );
}


export default function() {

  // kids mode signal

  const [getParts, setParts] = createSignal([] as {
    name: string,
    callback: (arg0: Event) => void
  }[]);

  onMount(async () => {
    if (getSaved('kidsMode')) {
      const pm = await import('../modules/partsManager');
      setParts(pm.partsManager);
    }
  });

  return (
    <>
      <div>
        <b id="ytifyIconContainer">
          <p>ytify {Version}</p>
        </b>

        <ToggleSwitch
          id='customInstanceSwitch'
          name={i18n._('settings_custom_instance')}
          checked={Boolean(getSaved('custom_instance_2'))}
          onClick={() => {
            const _ = 'custom_instance_2';
            if (getSaved(_))
              removeSaved(_);
            else {
              const pi = prompt(i18n._('settings_enter_piped_api'), 'https://pipedapi.kavin.rocks');
              const iv = prompt(i18n._('settings_enter_invidious_api'), 'https://iv.ggtyler.dev');

              if (pi && iv)
                save(_, pi + ',' + iv);
            }
            location.reload();

          }}
        />


        <Selector
          label={i18n._('settings_language')}
          id='languageSelector'
          onChange={(e) => {
            const lang = e.target.value;
            lang === 'en' ?
              removeSaved('language') :
              save('language', lang);
            location.reload();
          }}
          onMount={(target) => {
            target.value = getSaved("language") || "en";
          }}
        >
          <option value="en">English</option>
          <option value="pl">Polski</option>
          <option value="hi">Hindi</option>
        </Selector>

        <Selector
          id='linkHost'
          label={i18n._('settings_links_host')}
          onChange={(e) => {
            e.target.selectedIndex === 0 ?
              removeSaved('linkHost') :
              save('linkHost', e.target.value);
            location.reload();

          }}
          onMount={(target) => {
            const savedLinkHost = getSaved('linkHost');
            if (savedLinkHost)
              target.value = savedLinkHost;
          }}
        >

          <option value="https://ytify.us.kg">ytify</option>
          <option value="https://youtube.com">YouTube</option>
          <option value="https://piped.video">Piped</option>
          <option value="https://yewtu.be">Invidious</option>
          <option value="https://viewtube.io">ViewTube</option>
        </Selector>

        <Selector
          label={i18n._('settings_image_loading')}
          id='imgLoad'
          onChange={(e) => {
            const val = e.target.value;
            val === 'eager' ?
              removeSaved('imgLoad') :
              save('imgLoad', val);
            location.reload();
          }}
          onMount={(target) => {
            if (location.pathname !== '/')
              themer();

            const savedImgLoad = getSaved('imgLoad');
            if (savedImgLoad)
              target.value = savedImgLoad;

            if (target.value === 'off') {
              img.remove();
              themer();
            }
            else audio.addEventListener('loadstart', themer);
          }}
        >
          <option value="eager">{i18n._('settings_image_eager')}</option>
          <option value="lazy">{i18n._('settings_image_lazy')}</option>
          <option value="off">{i18n._('settings_image_off')}</option>
        </Selector>

        <Selector
          id='downloadFormatSelector'
          label={i18n._('settings_download_format')}
          onChange={(e) => {
            store.downloadFormat = e.target.value as 'opus';
            store.downloadFormat === 'opus' ?
              removeSaved('dlFormat') :
              save('dlFormat', store.downloadFormat);
          }}
          onMount={(target) => {

            const savedDownloadFormat = getSaved('dlFormat');
            if (savedDownloadFormat)
              target.value =
                store.downloadFormat =
                savedDownloadFormat as 'opus';

          }}

        >
          <option value='opus'>{i18n._('settings_opus_recommended')}</option>
          <option value='mp3'>MP3</option>
          <option value='wav'>WAV</option>
          <option value='ogg'>OGG</option>
        </Selector>


        <Selector
          id='shareAction'
          label={i18n._('settings_pwa_share_action')}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'play')
              removeSaved('shareAction');
            else {
              save('shareAction', val);
            }
          }}
          onMount={(target) => {
            const val = getSaved('shareAction');
            if (val)
              target.value = val;
          }}
        >
          <option value='play'>{i18n._('settings_pwa_play')}</option>
          <option value='dl'>{i18n._('settings_pwa_download')}</option>
          <option value='ask'>{i18n._('settings_pwa_always_ask')}</option>
        </Selector>

        <ToggleSwitch
          id='woswitch'
          name={i18n._('settings_watch_ytify')}
          checked={Boolean(getSaved('watchOnYtify'))}
          onClick={() => {
            const _ = 'watchOnYtify';
            getSaved(_) ?
              removeSaved(_) :
              save(_, 'true');
          }}
        />

      </div>

      <div>
        <b>
          <i class="ri-search-2-line"></i>
          <p>{i18n._('settings_search')}</p>
        </b>
        <ToggleSwitch
          id="defaultFilterSongs"
          name={i18n._('settings_set_songs_as_default_filter')}
          checked={getSaved('searchFilter') === 'music_songs'}
          onClick={() => {
            const _ = 'searchFilter';
            getSaved(_) ?
              removeSaved(_) :
              save(_, 'music_songs');
            location.assign('/search');
          }}
        />
        <ToggleSwitch
          id="suggestionsSwitch"
          name={i18n._('settings_display_suggestions')}
          checked={getSaved('searchSuggestions') !== 'off'}
          onClick={() => {
            const _ = 'searchSuggestions';
            getSaved(_) ?
              removeSaved(_) :
              save(_, 'off');
            location.reload();
          }}
        />

      </div>


      <div>
        <b>
          <i class="ri-play-large-line"></i>
          <p>{i18n._('settings_playback')}</p>
        </b>


        <ToggleSwitch
          id="qualitySwitch"
          name={i18n._('settings_hq_audio')}
          checked={getSaved('hq') === 'true'}
          onClick={async () => {
            getSaved('hq') ?
              removeSaved('hq') :
              save('hq', 'true');

            store.player.hq = !store.player.hq;

            quickSwitch();
          }}
        />

        <Show when={!getSaved('HLS')}>

          <Selector
            label={i18n._('settings_codec_preference')}
            id='codecPreference'
            onChange={async (e) => {

              const i = e.target.selectedIndex;
              i ?
                save('codec', String(i)) :
                removeSaved('codec');

              store.player.codec = e.target.value as 'any';
              quickSwitch();

            }}
            onMount={async (target) => {
              const codecSaved = getSaved('codec');
              target.selectedIndex = codecSaved ?
                parseInt(codecSaved) :
                ((await store.player.supportsOpus) ? 0 : 1)

              store.player.codec = target.value as 'any';
            }}
          >
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
            <option value="">Any</option>
          </Selector>

          <ToggleSwitch
            id="stableVolumeSwitch"
            name={i18n._('settings_stable_volume')}
            checked={getSaved('stableVolume') === 'true'}
            onClick={() => {
              const _ = 'stableVolume';
              getSaved(_) ?
                removeSaved(_) :
                save(_, 'true');
              quickSwitch();
            }}
          />

          <ToggleSwitch
            id="enforceProxySwitch"
            name={i18n._('settings_always_proxy_streams')}
            checked={getSaved('enforceProxy') === 'true'}
            onClick={() => {
              const _ = 'enforceProxy';
              getSaved(_) ?
                removeSaved(_) :
                save(_, 'true');
              quickSwitch();
            }}
          />

        </Show>

        <ToggleSwitch
          id="HLS_Switch"
          name={i18n._('settings_hls')}
          checked={getSaved('HLS') === 'true'}
          onClick={() => {
            getSaved('HLS') ?
              removeSaved('HLS') :
              save('HLS', 'true');
            location.reload();
          }}

        />

      </div>

      <div>
        <b>
          <i class="ri-stack-line"></i>
          <p>{i18n._('settings_library')}</p>
        </b>


        <ToggleSwitch
          id="startupTab"
          name={i18n._('settings_set_as_default_tab')}
          checked={getSaved('startupTab') === '/library'}
          onClick={() => {
            const _ = 'startupTab';
            getSaved(_) ?
              removeSaved(_) :
              save(_, '/library')
          }}
        />
        <ToggleSwitch
          id='discoverSwitch'
          name={i18n._('settings_store_discoveries')}
          checked={getSaved('discover') !== 'off'}
          onClick={e => {
            if (e.target.checked)
              removeSaved('discover');
            else {
              const db = getDB();
              if (confirm(i18n._("settings_clear_discoveries", { count: Object.keys(db.discover || {}).length || 0 }))) {
                delete db.discover;
                saveDB(db);
                save('discover', 'off');
              }
              else e.preventDefault();

            }
          }}
        />

        <ToggleSwitch
          id='historySwitch'
          name={i18n._('settings_store_history')}
          checked={getSaved('history') !== 'off'}
          onClick={e => {
            if (e.target.checked)
              removeSaved('history');
            else {
              const db = getDB();
              if (confirm(i18n._("settings_clear_history", { count: Object.keys(db.discover || {}).length || 0 }))) {
                delete db.history;
                saveDB(db);
                save('history', 'off')
              } else e.preventDefault();
            }

          }}
        />

        <p onClick={() => {
          import('../modules/importPipedPlaylists')
            .then(mod => {
              mod.pipedPlaylistsImporter()
            })
        }}>{i18n._('settings_import_from_piped')}</p>

      </div>

      <div>
        <b>
          <i class="ri-t-shirt-2-line"></i>
          <p>{i18n._('settings_interface')}</p>
        </b>

        <Selector
          label={i18n._('settings_roundness')}
          id='roundnessChanger'
          onChange={(e) => {
            cssVar('--roundness', e.target.value);
            e.target.value === '0.4rem' ?
              removeSaved('roundness') :
              save('roundness', e.target.value)
          }}
          onMount={(target) => {
            if (getSaved('roundness')) {
              target.value = getSaved('roundness') || '0.4rem';
              cssVar('--roundness', target.value);
            }
          }}
        >
          <option value="none">{i18n._('settings_roundness_none')}</option>
          <option value="0.2rem">{i18n._('settings_roundness_lighter')}</option>
          <option value="0.4rem" selected>{i18n._('settings_roundness_light')}</option>
          <option value="0.6rem">{i18n._('settings_roundness_heavy')}</option>
          <option value="0.9rem">{i18n._('settings_roundness_heavier')}</option>
        </Selector>


        <ToggleSwitch
          id="custom_theme"
          name={i18n._('settings_use_custom_color')}
          checked={getSaved('custom_theme') !== null}
          onClick={e => {
            const _ = 'custom_theme';
            const colorString = getSaved(_);
            if (colorString)
              removeSaved(_);
            else {
              const rgbText = i18n._('settings_custom_color_prompt');
              const str = prompt(rgbText, '174,174,174');
              str ?
                save(_, str) :
                e.preventDefault();
            }
            themer();
          }}

        />


        <Selector
          label={i18n._('settings_theming_scheme')}
          id='themeSelector'
          onChange={(e) => {
            themer();
            e.target.value === 'auto' ?
              removeSaved('theme') :
              save('theme', e.target.value);
          }}
          onMount={(target) => {
            target.value = (getSaved('theme') as 'light' | 'dark') || 'auto';
          }}
        >
          <optgroup label={i18n._('settings_theming_scheme_dynamic')}>
            <option value="auto" selected>{i18n._('settings_theming_scheme_system')}</option>
            <option value="light">{i18n._('settings_theming_scheme_light')}</option>
            <option value="dark">{i18n._('settings_theming_scheme_dark')}</option>
          </optgroup>
          <optgroup label={i18n._('settings_theming_scheme_hc')}>
            <option value="auto-hc">{i18n._('settings_theming_scheme_hc_system')}</option>
            <option value="white">{i18n._('settings_theming_scheme_white')}</option>
            <option value="black">{i18n._('settings_theming_scheme_black')}</option>
          </optgroup>
        </Selector>

        <p onClick={
          () => {
            document.fullscreenElement ?
              document.exitFullscreen() :
              document.documentElement.requestFullscreen();
          }
        }>{i18n._('settings_fullscreen')}</p>
      </div>



      <div>
        <b>
          <i class="ri-parent-line"></i>
          <p>{i18n._('settings_parental_controls')}</p>
        </b>

        <ToggleSwitch
          id="kidsSwitch"
          name={i18n._('settings_pin_toggle')}
          checked={Boolean(getSaved('kidsMode'))}
          onClick={e => {
            const savedPin = getSaved('kidsMode');
            if (savedPin) {
              if (prompt('Enter PIN to disable parental controls :') === savedPin) {
                const len = localStorage.length;
                for (let i = 0; i <= len; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('kidsMode'))
                    removeSaved(key);
                }
                location.reload();
              } else {
                alert(i18n._('settings_pin_incorrect'));
                e.preventDefault();
              }
              return;
            }
            const pin = prompt(i18n._('settings_pin_message'));
            if (pin) {
              save('kidsMode', pin);
              location.reload();
            }
            else e.preventDefault();
          }}

        />

        <For each={getParts()}>
          {item => (
            <ToggleSwitch
              id={'kidsMode_' + item.name}
              name={item.name}
              checked={!getSaved('kidsMode_' + item.name)}
              onClick={item.callback}

            />
          )}
        </For>


      </div>



    </>
  );
}



async function clearCache(_: Event | undefined = undefined) {
  await self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  await navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });

  if (_?.type === 'click') location.reload();
}

function restoreSettings(_: Event | undefined = undefined) {
  const temp = getSaved('library');
  localStorage.clear();

  if (temp) save('library', temp);

  if (_?.type === 'click') location.reload();
}

function extractSettings() {
  const keys: { [index: string]: string } = {};
  const len = localStorage.length;
  for (let i = 0; i < len; i++) {
    const key = localStorage.key(i) as string;
    if (key === 'library') continue;
    keys[key] = getSaved(key) as string;
  }
  return keys;
}

function exportSettings() {
  const link = $('a');
  link.download = 'ytify_settings.json';
  link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(extractSettings(), undefined, 2))}`;
  link.click();
}

async function importSettings(e: Event) {
  e.preventDefault();
  const newSettings = JSON.parse(
    await (
      (e.target as HTMLInputElement).files as FileList
    )[0].text()
  );

  if (confirm('This will merge your current settings with the imported settings, continue?')) {
    for (const key in newSettings)
      save(key, newSettings[key]);

    location.reload();
  }
}


// emergency use
if (params.has('reset')) {
  clearCache();
  restoreSettings();
  history.replaceState({}, '', location.pathname);
}


document.getElementById('clearCacheBtn')!.addEventListener('click', clearCache);
document.getElementById('restoreSettingsBtn')!.addEventListener('click', restoreSettings);
document.getElementById('exportSettingsBtn')!.addEventListener('click', exportSettings);
document.getElementById('importSettingsBtn')!.addEventListener('change', importSettings);
