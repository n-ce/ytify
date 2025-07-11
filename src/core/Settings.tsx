import { onMount } from "solid-js";

export default function(_: {
  close: () => void
}) {
  let settingsSection!: HTMLDivElement;
  onMount(() => {
    console.log(true);
    settingsSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  })

  return (
    <section
      ref={settingsSection}
    >
      <p onclick={_.close}>close settings</p>
    </section>
  );
}
