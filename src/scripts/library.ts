import { favButton, favIcon } from "../lib/dom";
import { $, removeSaved } from "../lib/utils";
import { addToCollection, getDB, removeFromCollection, saveDB, toCollection } from "../lib/libraryUtils";
import { getSaved, store } from "../lib/store";
import { render, html } from "uhtml";
import { i18n } from "./i18n";


const libraryActions = document.getElementById('libraryActions');
const actionTemplate = html`
<li>
  <label id="importBtn" for="upload_ytify">
    <i class="ri-import-line"></i>&nbsp;${i18n('library_import')}
  </label>
  <input type="file" id="upload_ytify" @change=${importLibrary}/>
</li>
<li id="exportBtn" @click=${exportLibrary}>
  <i class="ri-export-line"></i>&nbsp;${i18n('library_export')}

</li>
<li id="cleanLibraryBtn" @click=${cleanLibrary}>
  <i class="ri-delete-bin-2-line"></i>&nbsp;${i18n('library_clean')}
</li>
<li id="importPipedBtn" @click=${async () => {
    (await import('../modules/importPipedPlaylists')).default();
  }
  }>
  <i class="ri-download-cloud-line"></i>&nbsp;${i18n('settings_import_from_piped')}
</li>
<li>
  <label id="importSongshiftBtn" for="upload_songshift">
    <i class="ri-refresh-line"></i>&nbsp;Import From Songshift
  </label>
  <input type="file" id="upload_songshift" @change=${async (e: FileEv) => (await import('../modules/importSongshiftStreams')).default(e.target.files[0])}/>
</li>
`;
render(libraryActions, actionTemplate);



async function importLibrary(e: FileEv) {
  const importBtn = e.target;
  const newDB = JSON.parse(await importBtn.files[0].text());
  const oldDB = getDB();
  if (!confirm(i18n('library_import_prompt'))) return;
  for (const collection in newDB) for (const item in newDB[collection])
    toCollection(collection, newDB[collection][item], oldDB)
  saveDB(oldDB);
  location.reload();
};

function exportLibrary() {
  const link = $('a');
  link.download = 'ytify_library.json';
  link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(getDB(), undefined, 2))}`;
  link.click();
};

function cleanLibrary() {
  const count = Object.values(getDB()).reduce((acc, collection) => acc + Object.keys(collection).length, 0);
  if (confirm(i18n('library_clean_prompt', count.toString()))) {
    removeSaved('library');
    location.reload();
  }
};

// favorites button & data

favButton.addEventListener('click', () => {
  if (!store.stream.id) return;

  if (favButton.checked)
    addToCollection('favorites', store.stream)
  else
    removeFromCollection('favorites', store.stream.id);

  favIcon.classList.toggle('ri-heart-fill');
});



const dbhash = getSaved('dbsync');
const syncBtn = document.getElementById('syncNow') as HTMLElement;

if (dbhash) import('../modules/cloudSync').then(mod => mod.default(dbhash, syncBtn));
else syncBtn.remove();
