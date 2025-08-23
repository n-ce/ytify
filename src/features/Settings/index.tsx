import { onMount } from "solid-js";
import './Settings.css';
import App from "./App";
import Search from "./Search";
import Playback from "./Playback";
import Library from "./Library";
import Personalize from "./Personalize";
import Parental from "./Parental";
import { closeFeature, openFeature, t } from '../../lib/stores';

export default function() {
  let settingsSection!: HTMLDivElement;
  let actionsSection!: HTMLDivElement;
  ;

  onMount(() => {
    openFeature('settings', settingsSection);
  });


  async function clearCache(_: Event | undefined = undefined) {
    await self.caches.keys().then(s => { s.forEach(k => { self.caches.delete(k) }) });
    await navigator.serviceWorker.getRegistrations().then(s => { s.forEach(r => { r.unregister() }) });

    if (_?.type === 'click') location.reload();
  }


  function exportSettings() {
    const link = document.createElement('a');
    link.download = 'ytify_settings.json';
    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(localStorage.getItem('store') || '{}')}`;
    link.click();
  }

  async function importSettings(e: Event) {
    e.preventDefault();
    const newSettings = await (
      (e.target as HTMLInputElement).files as FileList
    )[0].text();

    if (confirm('This will overwrite your current settings with the imported settings, continue?'))
      localStorage.setItem('store', newSettings);
  }

  function submitFeedback(e: Event) {
    e.preventDefault();
    const myForm = e.target as HTMLFormElement;
    const formData = new FormData(myForm);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData as unknown as string).toString()
    })
      .then(() => console.log("/thank-you/"))
      .catch(error => alert(error));
  }


  return (
    <section
      ref={settingsSection}
      id="settingsSection"
    >
      <header>
        <p>Settings</p>
        <i class="ri-close-large-line" onclick={() => closeFeature('settings')}></i>
      </header>

      <App />
      <Search />
      <Playback />
      <Library />
      <Personalize />
      <Parental />

      <div ref={actionsSection}>

        <form
          data-netlify="true"
          name="feedback"
          method="post"
          onsubmit={submitFeedback}
        >
          <input type="hidden" name="form-name" value="feedback" />
          <textarea
            name="->"
            id="netlifyForm"
            placeholder={t('settings_feedback_placeholder')}
            required></textarea>

          <button type="submit">
            {t('settings_feedback_submit')}
          </button>

          <button
            type="button"
            onclick={clearCache}
          >
            {t('settings_clear_cache')}
          </button>

          <button
            type="button"
            onclick={() => {
              localStorage.removeItem('store');
              location.reload();
            }}>
            {t('settings_restore')}
          </button>

          <button
            type="button"
            onclick={exportSettings}
          >
            {t('settings_export')}
          </button>

          <button type="button">
            <label
              for="importSettingsBtn"
              style="cursor:pointer"
            >
              {t('settings_import')}</label>
            <input
              type="file"
              id="importSettingsBtn"
              style="display:none"
              onchange={importSettings}
            />
          </button>
        </form>
      </div>
    </section>
  );
}
