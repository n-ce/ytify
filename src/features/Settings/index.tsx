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

  const handleFormSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const myForm = event.target as HTMLFormElement;
    const formData = new FormData(myForm);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData as any).toString(),
    })
      .then(() => {
        alert("Feedback submitted successfully!");
        (document.getElementById('feedback-dialog') as HTMLDialogElement).close();
      })
      .catch((error) => alert(error));
  };

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
        <form
          name="feedback"
          method="post"
          data-netlify="true"
          onsubmit={handleFormSubmit}
        >
          <input type="hidden" name="form-name" value="feedback" />
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
