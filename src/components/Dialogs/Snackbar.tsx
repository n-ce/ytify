import { onMount } from "solid-js";
import { closeDialog } from "../../lib/stores";
import './Snackbar.css';

export default function(_: { text: string }) {

  onMount(() => {
    setTimeout(closeDialog, 1e7);
  });

  return (
    <dialog class="snackbar" onclick={closeDialog}>
      <p>
        ${_.text}
      </p>
    </dialog>
  )
}
