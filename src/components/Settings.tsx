import './Settings.css';
import { Show, onMount } from "solid-js";
import type { JSXElement } from "solid-js";
import { audio, img } from "../lib/dom";
import { getDB, saveDB } from "../lib/libraryUtils";
import player from "../lib/player";
import { $, getSaved, removeSaved, save, supportsOpus } from "../lib/utils";
import { pipedPlaylistsImporter } from "../scripts/library";
import { cssVar, themer } from "../scripts/theme";
import { store } from '../store';




function ToggleSwitch(props: {
  name: string
  id: string,
  checked: boolean,
  onClick: (e: Event) => void
}) {
  let target!: HTMLInputElement;

  return (
    <div class='toggleSwitch'>
      <label for={props.id}>
        {props.name}
      </label>
      <input
        ref={target}
        type='checkbox'
        id={props.id}
        checked={props.checked}
        onClick={props.onClick}
      />
      <span onClick={() => target.click()}></span>
    </div>
  );
}

function Selector(props: {
  label: string,
  id: string,
  onChange: (e: Event) => void,
  onMount: (target: HTMLSelectElement) => void,
  children: JSXElement
}) {
  let target!: HTMLSelectElement;
  onMount(() => props.onMount(target));

  return (
    <span>
      <label for={props.id}>
        {props.label}
      </label>
      <select
        id={props.id}
        onChange={props.onChange}
        ref={target}
      >{props.children}</select>
    </span>
  );
}


export default function Settings() {

  return (
    <>
      <div>
        <b id="ytifyIconContainer">
          <p>ytify {Version}</p>
        </b>

        <span id='isc'>
          <label for='instanceSelector'>Instance</label>
        </span>

        <Selector
          id='linkHost'
          label='Links Host'
          onChange={(e) => {
            const lh = e.target as HTMLSelectElement;
            lh.selectedIndex === 0 ?
              removeSaved('linkHost') :
              save('linkHost', lh.value);
            location.reload();

          }}
          onMount={(target) => {
            const savedLinkHost = getSaved('linkHost');
            if (savedLinkHost)
              target.value = savedLinkHost;
          }}
        >

          <option value="https://youtube.com">YouTube</option>
          <option value="https://ytify.netlify.app">ytify</option>
          <option value="https://piped.video">Piped</option>
          <option value="https://yewtu.be">Invidious</option>
        </Selector>

        <Selector
          label='Image Loading'
          id='imgLoad'
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
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

      </div>

      <div>
        <b>
          <i class="ri-search-2-line"></i>
          <p>Search</p>
        </b>
        <ToggleSwitch
          id="defaultFilterSongs"
          name='Songs as Default Filter'
          checked={getSaved('searchFilter') === 'music_songs'}
          onClick={() => {
            getSaved('searchFilter') ?
              removeSaved('searchFilter') :
              save('searchFilter', 'music_songs');
            location.assign('/search');
          }}
        />
        <ToggleSwitch
          id="suggestionsSwitch"
          name='Display Suggestions'
          checked={getSaved('searchSuggestions') !== 'off'}
          onClick={() => {
            getSaved('searchSuggestions') ?
              removeSaved('searchSuggestions') :
              save('searchSuggestions', 'off');
            location.reload();
          }}
        />
      </div>

      <div>
        <b>
          <i class="ri-play-large-line"></i>
          <p>Playback</p>
        </b>

        <Show when={!store.player.HLS}>

          <ToggleSwitch
            id="qualitySwitch"
            name='Highest Quality Audio'
            checked={getSaved('hq') === 'true'}
            onClick={async () => {
              getSaved('hq') ?
                removeSaved('hq') :
                save('hq', 'true');

              const timeOfSwitch = audio.currentTime;
              await player(audio.dataset.id);
              audio.currentTime = timeOfSwitch;

            }}
          />

          <Selector
            label='Codec Preference'
            id='codecPreference'
            onChange={async (e) => {

              const i = (e.target as HTMLSelectElement).selectedIndex;
              i ?
                save('codec', String(i)) :
                removeSaved('codec');

              if (audio.dataset.playbackState === 'playing')
                audio.pause();
              const timeOfSwitch = audio.currentTime;
              await player(audio.dataset.id);
              audio.currentTime = timeOfSwitch;
            }}
            onMount={(target) => {
              const codecSaved = getSaved('codec');
              setTimeout(async () => {
                target.selectedIndex = codecSaved ?
                  parseInt(codecSaved) :
                  (await supportsOpus() ? 0 : 1)
              });
            }}
          >
            <option value="opus">Opus</option>
            <option value="aac">AAC</option>
            <option value="">Any</option>
          </Selector>

          <ToggleSwitch
            id="enforceProxySwitch"
            name='Proxy Non-Music Streams'
            checked={getSaved('enforceProxy') === 'true'}
            onClick={() => {
              getSaved('enforceProxy') ?
                removeSaved('enforceProxy') :
                save('enforceProxy', 'true');
            }}
          />
        </Show>

        <ToggleSwitch
          id="HLS_Switch"
          name='HLS / Live Streaming'
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
            getSaved('startupTab') ?
              removeSaved('startupTab') :
              save('startupTab', '/library')
          }}
        />
        <ToggleSwitch
          id='discoverSwitch'
          name='Store Discoveries'
          checked={getSaved('discover') !== 'off'}
          onClick={(e: Event) => {
            const discoverSwitch = e.target as HTMLInputElement;
            if (discoverSwitch.checked)
              removeSaved('discover');
            else {
              const db = getDB();
              if (confirm(`This will clear your existing ${Object.keys(db.discover).length || 0} discoveries, continue?`)) {
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
          onClick={(e) => {
            const historySwitch = e.target as HTMLInputElement;
            if (historySwitch.checked)
              removeSaved('history');
            else {
              const db = getDB();
              if (confirm(`This will clear ${Object.keys(db.history).length || 0} items from your history, continue?`)) {
                delete db.history;
                saveDB(db);
                save('history', 'off')
              } else e.preventDefault();
            }

          }}
        />
        <p onClick={pipedPlaylistsImporter}>Import Playlists from Piped</p>

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
            const rc = e.target as HTMLSelectElement;
            cssVar('--roundness', rc.value);
            rc.value === '2vmin' ?
              removeSaved('roundness') :
              save('roundness', rc.value)
          }}
          onMount={(target) => {
            if (getSaved('roundness')) {
              target.value = getSaved('roundness') || '2vmin';
              cssVar('--roundness', target.value);
            }
          }}
        >
          <option value="none">None</option>
          <option value="1vmin">Light</option>
          <option value="2vmin" selected>Medium</option>
          <option value="4vmin">Heavy</option>
        </Selector>

        <Selector
          label='Theming Scheme'
          id='themeSelector'
          onChange={(e) => {
            const ts = e.target as HTMLSelectElement;
            themer();
            ts.value === 'auto' ?
              removeSaved('theme') :
              save('theme', ts.value);
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
          {/*
          <optgroup label="Community">

            <option value="sepia">Sepia</option>
            <option value="whatsapp">Whatsapp</option>
            <option value="sun">Sun</option>
            <option value="hide_seek">Hide & Seek</option>
          </optgroup>
          */}
        </Selector>

        <p onClick={
          () => {
            document.fullscreenElement ?
              document.exitFullscreen() :
              document.documentElement.requestFullscreen();
          }
        }>Toggle Fullscreen</p>
      </div>

    </>
  );
}



function clearCache() {
  self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
  navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });
  location.reload();
}

function restoreSettings() {
  const temp = getSaved('library');
  localStorage.clear();

  if (temp)
    save('library', temp);

  location.reload();
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
if (location.search === '?reset') {
  history.replaceState({}, '', location.pathname);
  clearCache();
  restoreSettings();
}




document.getElementById('clearCacheBtn')!.addEventListener('click', clearCache);
document.getElementById('restoreSettingsBtn')!.addEventListener('click', restoreSettings);
document.getElementById('exportSettingsBtn')!.addEventListener('click', exportSettings);
document.getElementById('importSettingsBtn')!.addEventListener('change', importSettings);
