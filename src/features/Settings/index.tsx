import { onMount } from "solid-js";
import './Settings.css';
import App from "./App";
import Playback from "./Playback";
import Library from "./Library";
import Personalize from "./Personalize";
import Parental from "./Parental";
import { closeFeature, openFeature } from '../../lib/stores';
import Search from "./Search";
import Dropdown from "./Dropdown";

export default function() {
  let settingsSection!: HTMLDivElement;

  onMount(() => {
    openFeature('settings', settingsSection);
  });



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

    </section>
  );
}
