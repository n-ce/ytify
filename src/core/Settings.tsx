import { onMount } from "solid-js";
import './settings.css';

export default function(_: {
  close: () => void
}) {
  let settingsSection!: HTMLDivElement;
  onMount(() => {
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

      </header>
    </section>
  );
}
