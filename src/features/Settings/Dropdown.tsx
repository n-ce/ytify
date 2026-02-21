import { t } from '@stores';

export default function Dropdown() {

  async function clearCache(e: Event) {
    await self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
    await navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });

    if (e?.type === 'click') location.reload();
  }


  function exportSettings() {
    const link = document.createElement('a');
    link.download = 'ytify_settings.json';
    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(localStorage.getItem('config') || '{}')}`;
    link.click();
  }

  async function importSettings(e: Event) {
    e.preventDefault();
    const newSettings = await (
      (e.target as HTMLInputElement).files as FileList
    )[0].text();

    if (confirm(t('settings_import_prompt')))
      localStorage.setItem('config', newSettings);
  }

  return (
    <details>
      <summary><i
        aria-label={t('settings_more_options')}
        class="ri-more-2-fill"
      ></i></summary>
      <ul>
        <li onclick={clearCache}>
          <i class="ri-delete-bin-2-line"></i>&nbsp;{t('settings_clear_cache')}
        </li>
        <li onclick={() => {
          localStorage.removeItem('config');
          location.reload();
        }}>
          <i class="ri-refresh-line"></i>&nbsp;{t('settings_restore')}
        </li>
        <li onclick={exportSettings}>
          <i class="ri-export-line"></i>&nbsp;{t('settings_export')}
        </li>
        <li>
          <label for="importSettingsBtn">
            <i class="ri-import-line"></i>&nbsp;{t('settings_import')}
          </label>
          <input
            type="file"
            id="importSettingsBtn"
            style="display:none"
            onchange={importSettings}
          />
        </li>
      </ul>
    </details>
  );
}

