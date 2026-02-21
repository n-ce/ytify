import { createSignal, onMount, Show } from "solid-js";
import { setConfig } from "@utils";
import { setStore, t } from "@stores";

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
    setStore("snackbar", t("login_verifying"));

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
        setStore("snackbar", t("login_syncing"));

        import("@modules/cloudSync").then(({ runSync }) => {
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
        setStore("snackbar", t("login_auth_failed") + error.message);
        setLoading(false);
      });
  };

  return (
    <dialog ref={dialogRef} class="displayer">
      <form onsubmit={handleSubmit}>
        <h4>{t("login_title")}</h4>
        <input
          oninput={(e) => setEmail(e.target.value)}
          type="email"
          placeholder={t("login_email_placeholder")}
          required
          autofocus
          disabled={loading()}
        />
        <input
          oninput={(e) => setPw(e.target.value)}
          type="password"
          placeholder={t("login_pw_placeholder")}
          required
          disabled={!email() || loading()}
        />
        <span>
          <Show when={email() && pw()}>
            <button type="submit" disabled={loading()}>
              {loading() ? t("login_syncing_btn") : t("login_enable_sync")}
            </button>
          </Show>
          <button
            type="button"
            onclick={() => {
              dialogRef.close();
              dialogRef.remove();
            }}
            class="ri-close-large-line"
            aria-label={t("login_cancel")}
            disabled={loading()}
          ></button>
        </span>
      </form>
    </dialog>
  );
}
