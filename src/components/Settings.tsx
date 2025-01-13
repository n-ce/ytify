import './Settings.css';
import { For, Show, createSignal, onMount } from "solid-js";
import { audio, img } from "../lib/dom";
import { $, quickSwitch, removeSaved, save } from "../lib/utils";
import { store, getSaved, params } from '../lib/store';
import { cssVar, themer } from "../scripts/theme";
import { getDB, saveDB } from '../lib/libraryUtils';



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
    if (!getSaved('kidsMode')) return;
    const pm = await import('../modules/partsManager');
    setParts(pm.partsManager);
  });

  return (
    <>
      <div>
        <b id="ytifyIconContainer">
          <p>ytify {Version}</p>
        </b>

        <ToggleSwitch
          id='customInstanceSwitch'
          name='Use Custom Instance'
          checked={Boolean(getSaved('custom_instance_2'))}
          onClick={() => {
            const _ = 'custom_instance_2';
            if (getSaved(_))
              removeSaved(_);
            else {

              const pi = prompt('Enter Piped API URL :', 'https://pipedapi.kavin.rocks');
              const iv = prompt('Enter Invidious API URL :', 'https://invidious.fdn.fr');

              if (pi && iv)
                save(_, pi + ',' + iv);
            }
            location.reload();

          }}
        />

        <Selector
          id='linkHost'
          label='Links Host'
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
          label='Image Loading'
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
          <option value="eager">Eager</option>
          <option value="lazy">Lazy</option>
          <option value="off">Do not Load</option>
        </Selector>

        <Selector
          id='downloadFormatSelector'
          label='Download Format'
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
          <option value='opus'>Opus (Recommended)</option>
          <option value='mp3'>MP3</option>
          <option value='wav'>WAV</option>
          <option value='ogg'>OGG</option>
        </Selector>


        <Selector
          id='shareAction'
          label='PWA Share Action'
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
          <option value='play'>Play</option>
          <option value='dl'>Download</option>
          <option value='ask'>Always Ask</option>
        </Selector>

        <ToggleSwitch
          id='woytifySwitch'
          name='Watch on ytify'
          checked={Boolean(getSaved('watchOnYtify'))}
          onClick={() => {
            const _ = 'watchOnYtify';
            getSaved(_) ?
              removeSaved(_) :
              save(_, 'true');

            location.reload();
          }}
        />

      </div>

      <div>
        <b>
          <i class="ri-search-2-line"></i>
          <p>Search</p>
        </b>
        <ToggleSwitch
          id="defaultFilterSongs"
          name='Set Songs as Default Filter'
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
          name='Display Suggestions'
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
          <p>Playback</p>
        </b>


        <ToggleSwitch
          id="qualitySwitch"
          name='Highest Quality Audio'
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
            label='Codec Preference'
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
            id="enforceProxySwitch"
            name='Always Proxy Streams'
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
          name='HTTP Live Streaming'
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
          <p> Library</p>
        </b>


        <ToggleSwitch
          id="startupTab"
          name='Set as Default Tab'
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
          name='Store Discoveries'
          checked={getSaved('discover') !== 'off'}
          onClick={e => {
            if (e.target.checked)
              removeSaved('discover');
            else {
              const db = getDB();
              if (confirm(`This will clear your existing ${Object.keys(db.discover || {}).length || 0} discoveries, continue?`)) {
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
          name='Store History'
          checked={getSaved('history') !== 'off'}
          onClick={e => {
            if (e.target.checked)
              removeSaved('history');
            else {
              const db = getDB();
              if (confirm(`This will clear ${Object.keys(db.history || {}).length || 0} items from your history, continue?`)) {
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
        }}>Import Playlists from Piped</p>

      </div>

      <div>
        <b>
          <i class="ri-t-shirt-2-line"></i>
          <p>Interface</p>
        </b>

        <Selector
          label='Roundness'
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
          <option value="none">None</option>
          <option value="0.2rem">Lighter</option>
          <option value="0.4rem" selected>Light</option>
          <option value="0.6rem">Heavy</option>
          <option value="0.9rem">Heavier</option>
        </Selector>


        <ToggleSwitch
          id="custom_theme"
          name='Use Custom Color'
          checked={getSaved('custom_theme') !== null}
          onClick={e => {
            const _ = 'custom_theme';
            const colorString = getSaved(_);
            if (colorString)
              removeSaved(_);
            else {
              const str = prompt('Enter rgb in the format r,g,b', '174,174,174');
              str ?
                save(_, str) :
                e.preventDefault();
            }
            themer();
          }}

        />


        <Selector
          label='Theming Scheme'
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
          <optgroup label="Dynamic">
            <option value="auto" selected>System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </optgroup>
          <optgroup label="High Contrast">
            <option value="auto-hc">System</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </optgroup>
        </Selector>

        <p onClick={
          () => {
            document.fullscreenElement ?
              document.exitFullscreen() :
              document.documentElement.requestFullscreen();
          }
        }>Toggle Fullscreen</p>
      </div>



      <div>
        <b>
          <i class="ri-parent-line"></i>
          <p>Parental Controls</p>
        </b>

        <ToggleSwitch
          id="kidsSwitch"
          name='Set Up'
          checked={Boolean(getSaved('kidsMode'))}
          onClick={e => {
            const savedPin = getSaved('kidsMode');
            if (savedPin) {
              if (prompt('Enter PIN to disable') === savedPin) {
                removeSaved('kidsMode');
                location.reload();
              } else {
                alert('Incorrect PIN!');
                e.preventDefault();
              }
              return;
            }

            const pin = prompt('PIN is required to setup parental controls, after which the app will reload to integrate the blocking functionalities.');
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
              checked={!Boolean(getSaved('kidsMode_' + item.name))}
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
