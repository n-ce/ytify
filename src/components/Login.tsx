import { createSignal, onMount, Show } from "solid-js";
import { setConfig } from "@lib/utils/config";
import { setStore } from "@lib/stores";

export default function() {
  const [email, setEmail] = createSignal("");
  const [pw, setPw] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  let dialogRef!: HTMLDialogElement;

  onMount(() => {
    dialogRef.showModal();
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (loading()) return;
    if (!email() || !pw()) return;

    setLoading(true);
    setStore("snackbar", "Verifying credentials...");

    fetch("/hash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email(), password: pw() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorMessage = await res.text();
          throw new Error(errorMessage);
        }
        return res.text();
      })
      .then((hash) => {
        setConfig("dbsync", hash);
        setStore("snackbar", "Syncing library...");

        import("@lib/modules/cloudSync").then(({ runSync }) => {
          runSync(hash)
            .then((result) => {
              setStore("snackbar", result.message);
              if (result.success) {
                dialogRef.close();
                dialogRef.remove();
              }
            })
            .finally(() => {
              setLoading(false);
            });
        });
      })
      .catch((error) => {
        setStore("snackbar", "Authentication failed: " + error.message);
        setLoading(false);
      });
  };

  return (
    <dialog ref={dialogRef} class="displayer">
      <form onsubmit={handleSubmit}>
        <h4>Sync your library to the cloud</h4>
        <input
          oninput={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Enter Email"
          required
          autofocus
          disabled={loading()}
        />
        <input
          oninput={(e) => setPw(e.target.value)}
          type="password"
          placeholder="Enter Password"
          required
          disabled={!email() || loading()}
        />
        <span>
          <Show when={email() && pw()}>
            <button type="submit" disabled={loading()}>
              {loading() ? "Syncing..." : "Enable Sync"}
            </button>
          </Show>
          <button
            type="button"
            onclick={() => {
              dialogRef.close();
              dialogRef.remove();
            }}
            class="ri-close-large-line"
            aria-label="Cancel"
            disabled={loading()}
          ></button>
        </span>
      </form>
    </dialog>
  );
}
