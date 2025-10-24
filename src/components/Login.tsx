import { createSignal, onMount } from "solid-js";
import { setConfig } from "@lib/utils/config";

export default function() {

  const [email, setEmail] = createSignal('');
  const [pw, setPw] = createSignal('');
  let z!: HTMLDialogElement;
  onMount(() => {
    z.showModal();
  })
  return (
    <dialog ref={z} class="displayer">
      <h4>Sync your library to the cloud</h4>
      <input
        oninput={(e) => setEmail(e.target.value)}
        type="email" placeholder="Enter Email" required autofocus />
      <input
        oninput={(e) => setPw(e.target.value)}
        type="password" placeholder="Enter Password" required disabled={!Boolean(email())} />
      <span>
        <button onclick={() => {

          fetch("/cs/hash", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email(), password: pw() }),
          })
            .then(async res => {
              if (!res.ok) {
                const errorMessage = await res.text();
                throw new Error(errorMessage);
              }
              return res.text(); // Expect plain text hash
            })
            .then(hash => {
              setConfig('dbsync', hash);
            })
            .catch(error => {
              console.error("Email validation failed:", error);
            });
        }}>Get Access</button>
        <button onclick={() => {
          z.close();
          z.remove();
        }} class="ri-close-large-line">
        </button>
      </span>
    </dialog>
  );
}
