import { onMount } from "solid-js";
import './settings.css';

export default function(_: {
  feedback: HTMLElement,
  close: () => void
}) {
  let settingsSection!: HTMLDivElement;


  onMount(() => {
    settingsSection.appendChild(_.feedback);
    settingsSection.scrollIntoView({
      behavior: 'smooth'
    });
  })

  return (
    <section
      ref={settingsSection}
      id="settingsSection"
    >
      <header>
        <p>Settings</p>
        <i class="ri-close-large-line" onclick={_.close}></i>

        <details>
          <summary><i class="ri-more-2-fill"></i></summary>
          <ul>

            <button data-translation="settings_feedback_submit" type="submit">Submit Feedback</button>

            <button data-translation="settings_clear_cache" id="clearCacheBtn" type="button">Clear Caches</button>

            <button data-translation="settings_restore" id="restoreSettingsBtn" type="button">Restore Settings</button>

            <button data-translation="settings_export" id="exportSettingsBtn" type="button">Export Settings</button>
            <button type="button">
              <label data-translation="settings_import" for="importSettingsBtn" style="cursor:pointer">Import
                Settings</label>
              <input type="file" id="importSettingsBtn" class="hide" />
            </button>
          </ul>
        </details>
      </header>
    </section>
  );
}
