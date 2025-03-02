import './Settings.css';
import { createSignal, For, onMount, Show } from "solid-js";
import { $, i18n, quickSwitch, removeSaved, save } from "../lib/utils";
import { getSaved, params, store } from '../lib/store';
import { cssVar, themer } from "../scripts/theme";
import { getDB, saveDB } from '../lib/libraryUtils';


function ToggleSwitch(_: ToggleSwitch) {
  let target!: HTMLInputElement;

  return (
    <div class='toggleSwitch'>
      <label for={_.id}>
        {i18n(_.name as TranslationKeys)}
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
        {i18n(_.label as TranslationKeys)}
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
      setParts(pm.default);
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
          name='settings_custom_instance'
          checked={Boolean(getSaved('custom_instance'))}
          onClick={() => {
            const _ = 'custom_instance';
            if (getSaved(_)) removeSaved(_);
            else {
              const pi = prompt(i18n('settings_enter_piped_api'), 'https://pipedapi.kavin.rocks');
              const iv = prompt(i18n('settings_enter_invidious_api'), 'https://iv.ggtyler.dev');
              const useIv = confirm('Use Invidious For Playback?');

              if (pi && iv)
                save(_, pi + ',' + iv + ',' + useIv);
            }
            location.reload();

          }}
        />


        <Selector
          label='settings_language'
          id='languageSelector'
          onChange={(e) => {
            const lang = e.target.value;
            if (lang === 'en')
              removeSaved('language');
            else
              save('language', lang);
            location.reload();
          }}
          onMount={(target) => {
            target.value = document.documentElement.lang;
          }}
        >
          <For each={Locales}>
            {(item) =>
              <option value={item}>{new Intl.DisplayNames(document.documentElement.lang, { type: 'language' }).of(item)}</option>
            }
          </For>
        </Selector>

        <Selector
          id='linkHost'
          label='settings_links_host'
          onChange={(e) => {
            if (e.target.selectedIndex === 0)
              removeSaved('linkHost');
            else
              save('linkHost', e.target.value);
            location.reload();

          }}
          onMount={(target) => {
            const savedLinkHost = getSaved('linkHost');
            if (savedLinkHost)
              target.value = savedLinkHost;
          }}
        >
          <option value="https://ytify.pp.ua">ytify</option>
          <option value="https://youtube.com">YouTube</option>
          <option value="https://piped.video">Piped</option>
          <option value="https://inv.nadeko.net">Invidious</option>
          <option value="https://viewtube.io">ViewTube</option>
        </Selector>


        <Selector
          id='downloadFormatSelector'
          label='settings_download_format'
          onChange={(e) => {
            store.downloadFormat = e.target.value as 'opus';
            if (store.downloadFormat === 'opus')
              removeSaved('dlFormat');
            else
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
          <option value='opus'>Opus</option>
          <option value='mp3'>MP3</option>
          <option value='wav'>WAV</option>
          <option value='ogg'>OGG</option>
        </Selector>


        <Selector
          id='shareAction'
          label='settings_pwa_share_action'
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
          <option value='play'>{i18n('settings_pwa_play')}</option>
          <option value='dl'>{i18n('settings_pwa_download')}</option>
          <option value='ask'>{i18n('settings_pwa_always_ask')}</option>
        </Selector>

      </div>

      <div>

        <b>
          <i class="ri-search-2-line"></i>
          <p>{i18n('settings_search')}</p>
        </b>

        <ToggleSwitch
          id="defaultFilterSongs"
          name='settings_set_songs_as_default_filter'
          checked={getSaved('searchFilter') === 'music_songs'}
          onClick={() => {
            const _ = 'searchFilter';
            if (getSaved(_))
              removeSaved(_);
            else
              save(_, 'music_songs');
            location.assign('/search');
          }}
        />

        <ToggleSwitch
          id="suggestionsSwitch"
          name='settings_display_suggestions'
          checked={getSaved('searchSuggestions') !== 'off'}
          onClick={() => {
            const _ = 'searchSuggestions';
            if (getSaved(_))
              removeSaved(_);
            else
              save(_, 'off');
            location.reload();
          }}
        />

      </div>


      <div>

        <b>
          <i class="ri-play-large-line"></i>
          <p>{i18n('settings_playback')}</p>
        </b>

        <ToggleSwitch
          id="qualitySwitch"
          name='settings_hq_audio'
          checked={getSaved('hq') === 'true'}
          onClick={async () => {
            if (getSaved('hq'))
              removeSaved('hq');
            else
              save('hq', 'true');

            store.player.hq = !store.player.hq;

            quickSwitch();
          }}
        />

        <Show when={!store.player.hls.on}>

          <Selector
            label='settings_codec_preference'
            id='codecPreference'
            onChange={async (e) => {

              const i = e.target.selectedIndex;
              if (i)
                save('codec', String(i))
              else
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
            name='settings_stable_volume'
            checked={getSaved('stableVolume') === 'true'}
            onClick={() => {
              const _ = 'stableVolume';
              if (getSaved(_))
                removeSaved(_);
              else
                save(_, 'true');
              quickSwitch();
            }}
          />

          <ToggleSwitch
            id="enforceProxySwitch"
            name='settings_always_proxy_streams'
            checked={getSaved('enforceProxy') === 'true'}
            onClick={() => {
              const _ = 'enforceProxy';
              if (getSaved(_))
                removeSaved(_);
              else
                save(_, 'true');
              quickSwitch();
            }}
          />

        </Show>

        <ToggleSwitch
          id="HLS_Switch"
          name='settings_hls'
          checked={getSaved('HLS') === 'true'}
          onClick={() => {
            if (getSaved('HLS'))
              removeSaved('HLS');
            else
              save('HLS', 'true');
            location.reload();
          }}
        />

        <ToggleSwitch
          id="watchModeSwitch"
          name='settings_watchmode'
          checked={Boolean(getSaved('watchMode'))}
          onClick={() => {
            const _ = 'watchMode';
            if (getSaved(_))
              removeSaved(_);
            else
              save(_, '144p');
          }}
        />

      </div>

      <div>

        <b>
          <i class="ri-stack-line"></i>
          <p>{i18n('settings_library')}</p>
        </b>

        <ToggleSwitch
          id="startupTab"
          name='settings_set_as_default_tab'
          checked={getSaved('startupTab') === '/library'}
          onClick={() => {
            const _ = 'startupTab';
            if (getSaved(_))
              removeSaved(_);
            else
              save(_, '/library')
          }}
        />

        <ToggleSwitch
          id="dbsync"
          name='settings_library_sync'
          checked={Boolean(getSaved('dbsync'))}
          onClick={e => {
            const _ = 'dbsync';
            if (getSaved(_)) removeSaved(_);
            else {

              function hashCreator(text: string) {
                const msgBuffer = new TextEncoder().encode(text);
                crypto.subtle.digest('SHA-256', msgBuffer)
                  .then(hashBuffer => {
                    const hash = Array
                      .from(new Uint8Array(hashBuffer))
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join('');
                    save(_, hash);
                    location.reload();
                  });
              }

              const termsAccepted = confirm('Data will be automatically deleted after one week of inactivity.\nytify is not responsible for data loss.\n\nI Understand');
              if (termsAccepted) {
                const username = prompt('Enter Username :');
                if (username) {
                  const password = prompt('Enter Password :');
                  const confirmpw = prompt('Confirm Password :');
                  if (password && password === confirmpw)
                    hashCreator(username + password);
                  else alert('Incorrect Information!');
                }
              }
              e.preventDefault();
            };
          }
          }
        />

        <ToggleSwitch
          id='discoverSwitch'
          name='settings_store_discoveries'
          checked={getSaved('discover') !== 'off'}
          onClick={e => {
            if (e.target.checked)
              removeSaved('discover');
            else {
              const db = getDB();
              const count = Object.keys(db.discover || {}).length || 0;
              if (confirm(i18n("settings_clear_discoveries", count.toString()))) {
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
          name='settings_store_history'
          checked={getSaved('history') !== 'off'}
          onClick={e => {
            if (e.target.checked)
              removeSaved('history');
            else {
              const db = getDB();
              const count = Object.keys(db.discover || {}).length || 0;
              if (confirm(i18n("settings_clear_history", count.toString()))) {
                delete db.history;
                saveDB(db);
                save('history', 'off')
              } else e.preventDefault();
            }
          }}
        />

        <p onClick={() => {
          import('../modules/importPipedPlaylists')
            .then(mod => mod.default())
        }}>{i18n('settings_import_from_piped')}</p>


      </div>

      <div>

        <b>
          <i class="ri-t-shirt-2-line"></i>
          <p>{i18n('settings_interface')}</p>
        </b>

        <ToggleSwitch
          id='imgLoadSwitch'
          name='settings_load_images'
          checked={store.loadImage}
          onClick={() => {
            const _ = 'imgLoad';
            if (getSaved(_))
              removeSaved(_);
            else
              save(_, 'off');
            location.reload();
          }}
        />

        <Selector
          label='settings_roundness'
          id='roundnessChanger'
          onChange={(e) => {
            cssVar('--roundness', e.target.value);
            if (e.target.value === '0.4rem')
              removeSaved('roundness')
            else
              save('roundness', e.target.value)
          }}
          onMount={(target) => {
            if (getSaved('roundness')) {
              target.value = getSaved('roundness') || '0.4rem';
              cssVar('--roundness', target.value);
            }
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
          checked={getSaved('custom_theme') !== null}
          onClick={e => {
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
          }}
        />

        <Selector
          label='settings_theming_scheme'
          id='themeSelector'
          onChange={(e) => {
            themer();
            if (e.target.value === 'auto')
              removeSaved('theme');
            else
              save('theme', e.target.value);
          }}
          onMount={(target) => {
            target.value = (getSaved('theme') as 'light' | 'dark') || 'auto';
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

        <p onClick={function() {
          if (document.fullscreenElement)
            document.exitFullscreen();
          else
            document.documentElement.requestFullscreen();
        }}>{i18n('settings_fullscreen')}</p>

      </div>


      <div>

        <b>
          <i class="ri-parent-line"></i>
          <p>{i18n('settings_parental_controls')}</p>
        </b>

        <ToggleSwitch
          id="kidsSwitch"
          name='settings_pin_toggle'
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
                alert(i18n('settings_pin_incorrect'));
                e.preventDefault();
              }
              return;
            }
            const pin = prompt(i18n('settings_pin_message'));
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
              name={item.name as TranslationKeys}
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
