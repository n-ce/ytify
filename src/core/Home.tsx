import { i18n } from '../scripts/i18n';

export default function(_: {
  settings: () => void
}) {
  return (
    <section>

      <header>
        <p>Home</p>
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


      <div id="catalogueSelector">
        <input type="radio" id="r.for_you" name="superCollectionChips" value="for_you" />
        <label for="r.for_you">About</label>
        <input type="radio" id="r.featured" name="superCollectionChips" value="featured" />
        <label for="r.featured">Hub</label>
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

        <input type="radio" id="r.feed" name="superCollectionChips" value="feed" />
        <label data-translation="library_feed" for="r.feed">Subscription Feed</label>


      </div>
      <div id="catalogue">
        <li><a data-translation="settings_changelog" href="https://github.com/n-ce/ytify/wiki/changelog"
          target="_blank">Changelog</a></li>
        <li><a href="https://github.com/n-ce/ytify" target="_blank">Github</a></li>
        <li><a href="https://t.me/ytifytg" target="_blank">Telegram</a></li>
        <li><a href="https://matrix.to/#/#ytify:matrix.org" target="_blank">Matrix</a></li>
      </div>
    </section>
  )
}
