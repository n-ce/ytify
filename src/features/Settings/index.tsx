import { onMount } from "solid-js";
import './Settings.css';
import { closeFeature, openFeature } from '@lib/stores';
import App from "./App";
import Playback from "./Playback";
import Library from "./Library";
import Personalize from "./Personalize";
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
      class="settingsSection"
    >
      <header>
        <p>ytify {Build}</p>
        <i class="ri-close-large-line" onclick={() => closeFeature('settings')}></i>
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
    </section >
  );
}
