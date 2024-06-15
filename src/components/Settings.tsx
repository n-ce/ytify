import './Settings.css';
import { onMount } from "solid-js";
import { audio, img } from "../lib/dom";
import { getDB, saveDB } from "../lib/libraryUtils";
import player from "../lib/player";
import { getSaved, removeSaved, save, supportsOpus } from "../lib/utils";
import { fetchInstances, instanceChange } from "../scripts/api";
import { pipedPlaylistsImporter } from "../scripts/library";
import { cssVar, themer } from "../scripts/theme";




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
  children: any
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
        <b>
          <svg xmlns="http://www.w3.org/2000/svg" version="1.0" viewBox="0 0 4172 4172" width="1.5rem" height="1.5rem"
            style="transform: scale(1.5);overflow:hidden;">

            <path fill="var(--text)"
              d="m1368 3037-55-10-23-6a369 369 0 0 1-57-19 552 552 0 0 1-266-246 437 437 0 0 1-31-74 590 590 0 0 1-18-245l5-25c7-35 21-77 35-105l9-19a522 522 0 0 1 679-236c1 5-1 77-3 91a1059 1059 0 0 1-24 119 274 274 0 0 1-19 53c-1 0-7-5-14-13-40-46-95-77-160-91a290 290 0 0 0-186 542 287 287 0 0 0 202 23c61-15 120-54 159-105a1108 1108 0 0 0 149-360 1296 1296 0 0 0 27-274 1164 1164 0 0 0-226-667 146 146 0 0 1-21-39l-4-9-4-11c-8-16-18-53-24-84-5-27-5-72 0-95 10-49 32-84 69-115 24-20 50-34 87-47a740 740 0 0 1 79-19c23-4 134-6 167-3a1364 1364 0 0 1 446 118l20 8 20 8 18 8a2232 2232 0 0 1 652 439 1008 1008 0 0 1 234 338c4 5 16 57 20 83 2 17 1 63-3 79-18 83-71 135-171 167-34 11-106 20-130 16-43-7-194-7-249 0-67 9-142 23-179 34l-34 10a974 974 0 0 0-94 33 1245 1245 0 0 0-170 84 1182 1182 0 0 0-405 414 529 529 0 0 1-347 244c-40 9-112 11-160 6zm1441-892 14-2c21-2 58-13 76-22 34-17 54-37 67-69 6-16 7-19 7-44 1-26 1-28-6-54-32-125-167-280-368-420-80-56-200-124-282-159l-26-12a1286 1286 0 0 0-124-47c-39-14-128-36-170-42l-18-3c-19-3-41-4-87-4-56 0-71 2-105 13-68 23-101 65-101 130a201 201 0 0 0 17 82c3 9 21 46 31 64 68 112 187 227 351 338a1827 1827 0 0 0 446 214 1084 1084 0 0 0 219 39c1 1 50-1 59-2z" />
          </svg>
          <p>ytify 7.0.0 Beta</p>
        </b>
        <Selector
          id='instanceSelector'
          label='Instance'
          onChange={instanceChange}
          onMount={fetchInstances}
        >
          <option value='{
          "name":"Custom",
          "piped":"https://pipedapi.kavin.rocks",
          "image":"https://pipedproxy.r4fo.com",
          "invidious":"https://invidious.fdn.fr"
          }'>Custom</option>
        </Selector>

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
          checked={getSaved('searchFilter') === 'songs'}
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
          id='CodecPreference'
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
          id="HLS_Switch"
          name='HLS / Live Streaming'
          checked={getSaved('HLS') === 'true'}
          onClick={() => {
            getSaved('HLS') ?
              removeSaved('HLS') :
              save('HLS', 'true');
          }}

        />

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

        <Selector
          label='Loading Timeout'
          id='loadingTimeout'
          onChange={e => {
            const val = (e.target as HTMLSelectElement).value;

            val === '15' ?
              removeSaved('loadingTimeout') :
              save('loadingTimeout', val);
          }}
          onMount={target => {
            const val = getSaved('loadingTimeout');
            if (val) target.value = val;
          }}
        >
          <option value="15">15 seconds</option>
          <option value="30">30 seconds</option>
          <option value="0">Do not Timeout</option>
        </Selector>

      </div>

      <div>
        <b>
          <i class="ri-stack-line"></i>
          <p> Library</p>
        </b>
        <ToggleSwitch
          id="startupTab"
          name='Set as Default Tab'
          checked={getSaved('startupTab') === 'library'}
          onClick={() => {
            getSaved('startupTab') ?
              removeSaved('startupTab') :
              save('startupTab', 'library')
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


// emergency use
if (location.search === '?reset') {
  history.replaceState({}, '', location.pathname);
  clearCache();
  restoreSettings();
}

document.getElementById('clearCacheBtn')!.addEventListener('click', clearCache);
document.getElementById('restoreSettingsBtn')!.addEventListener('click', restoreSettings);

