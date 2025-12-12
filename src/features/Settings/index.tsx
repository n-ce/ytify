import { onMount } from "solid-js";
import './Settings.css';
import { closeFeature, setNavStore } from '@lib/stores';
import App from "./App";
import Playback from "./Playback";
import Library from "./Library";
import Personalize from "./Personalize";
import Search from "./Search";
import Dropdown from "./Dropdown";

export default function() {
  let settingsSection!: HTMLDivElement;

  onMount(() => {
    setNavStore('settings', 'ref', settingsSection);
    settingsSection.scrollIntoView();
  });

  return (
    <section
      ref={settingsSection}
      class="settingsSection"
    >
      <header>
        <p>ytify {Build}</p>
        <i
          aria-label="close"
          class="ri-close-large-line" onclick={() => closeFeature('settings')}></i>
        <Dropdown />
      </header>
      <div>
        <App />
        <Search />
        <Playback />
        <Library />
        <Personalize />
      </div>
      <br />
      <br />
      <dialog id="feedback-dialog">
        <form name="feedback" method="post" data-netlify="true">
          <p>
            <label>Feedback</label>
            <textarea name="message"></textarea>
          </p>
          <p>
            <button type="submit">Send</button>
            <button type="button" onclick={() => (document.getElementById('feedback-dialog') as HTMLDialogElement).close()}>Close</button>
          </p>
        </form>
      </dialog>
    </section >
  );
}
