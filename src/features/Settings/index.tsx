import { onMount } from "solid-js";
import './Settings.css';
import App from "./App";
import Playback from "./Playback";
import Library from "./Library";
import Personalize from "./Personalize";
import Parental from "./Parental";
import { closeFeature, openFeature, t } from '../../lib/stores';
import Search from "./Search";
import Dropdown from "./Dropdown";

export default function() {
  let settingsSection!: HTMLDivElement;

  onMount(() => {
    openFeature('settings', settingsSection);
  });

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
        <Dropdown />
      </header>

      <App />
      <Search />
      <Playback />
      <Library />
      <Personalize />
      <Parental />

      <div>

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
        </form>
      </div>
    </section>
  );
}
