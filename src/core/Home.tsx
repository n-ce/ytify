import { createSignal, onMount } from 'solid-js';
import { i18n } from '../scripts/i18n';
import About from '../components/About';
import Hub from '../components/Hub';
import './home.css';

export default function(_: {
  settings: () => void,
  search: () => void,
  ref: (el: HTMLElement) => void;
}) {

  const [item, setItem] = createSignal('');
  let homeRef!: HTMLElement;
  onMount(() => {
    _.ref(homeRef);
  });

  return (
    <section ref={homeRef}>

      <header>
        <p>Home </p>
        <i id="syncNow" class="ri-cloud-fill"></i>
        <i
          id="searchToggle"
          class="ri-search-2-line"
          onclick={_.search}
        ></i>
        <details>
          <summary><i class="ri-more-2-fill"></i></summary>
          <ul>
            <li
              id="settingsHandler"
              onclick={_.settings}
            >
              <i class="ri-settings-line"></i> Settings
            </li>

            <li>
              <label id="importBtn" for="upload_ytify">
                <i class="ri-import-line"></i>&nbsp;{i18n('library_import')}
              </label>
              <input type="file" id="upload_ytify" onchange={() => ''} />
            </li>
            <li id="exportBtn" onclick={() => ''}>
              <i class="ri-export-line"></i>&nbsp;{i18n('library_export')}

            </li>
            <li id="cleanLibraryBtn" onclick={() => ''}>
              <i class="ri-delete-bin-2-line"></i>&nbsp;{i18n('library_clean')}
            </li>
            <li id="importPipedBtn" onclick={async () => {
              (await import('../modules/importPipedPlaylists')).default();
            }
            }>
              <i class="ri-download-cloud-line"></i>&nbsp;{i18n('settings_import_from_piped')}
            </li>
            <li>
              <label id="importSongshiftBtn" for="upload_songshift">
                <i class="ri-refresh-line"></i>&nbsp;Import From Songshift
              </label>
              <input type="file" id="upload_songshift" onchange={async (e) => (await import('../modules/importSongshiftStreams')).default(e.target.files![0])} />
            </li>
          </ul>
        </details>
      </header>


      <div id="catalogueSelector"

        onclick={e => {
          const input = e.target as HTMLInputElement;
          if (input.matches('input'))
            setItem(input.value);

        }}
      >
        <input type="radio" id="r.hub" name="superCollectionChips" value="hub" />
        <label for="r.hub">Hub</label>
        <input type="radio" id="r.collections" name="superCollectionChips" value="collections" />
        <label data-translation="library_collections" for="r.collections">Collections</label>
        <input type="radio" id="r.playlists" name="superCollectionChips" value="playlists" />
        <label data-translation="library_playlists" for="r.playlists">Playlists</label>
        <input type="radio" id="r.albums" name="superCollectionChips" value="albums" />
        <label data-translation="library_albums" for="r.albums">Albums</label>
        <input type="radio" id="r.artists" name="superCollectionChips" value="artists" />
        <label data-translation="library_artists" for="r.artists">Artists</label>
        <input type="radio" id="r.channels" name="superCollectionChips" value="channels" />
        <label data-translation="library_channels" for="r.channels">Channels</label>

        <input type="radio" id="r.about" name="superCollectionChips" checked value="" />
        <label for="r.about">About</label>
      </div>


      <div id="catalogue">
        {item() === 'hub' ?
          <Hub />
          :
          <About />
        }
      </div>
    </section >
  )
}
