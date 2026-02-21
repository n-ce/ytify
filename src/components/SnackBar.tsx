import { onMount } from "solid-js";
import { setStore, store } from "@stores";

export default function() {
  let snackbar!: HTMLParagraphElement;

  onMount(() => {
    setTimeout(() => {
      if (snackbar.textContent === store.snackbar)
        setStore('snackbar', undefined);
    }, 7000);
  });

  return (
    <p
      ref={snackbar}
      style={{
        'position': 'absolute',
        'z-index': 9,
        'bottom': '10dvmin',
        'left': '10dvmin',
        'max-width': '90dvmin',
        'padding': 'var(--size-1) var(--size-2)',
        'background-color': 'var(--bg)',
        'color': 'var(--text)',
        'border': 'var(--border)',
        'border-radius': 'var(--roundness)',
        'animation': 'var(--animation-fade-out) forwards, var(--animation-slide-out-down)',
        'animation-timing-function': 'var(--ease-elastic-in-out-3)',
        'animation-duration': '1s'
      }}
      onclick={() => {
        setStore('snackbar', undefined);
      }}
      textContent={store.snackbar}
    ></p>
  );
}
