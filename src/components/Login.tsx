import { createSignal, onMount, Show } from "solid-js";
import { setConfig } from "@lib/utils/config";
import { setStore, t } from "@lib/stores";
import { signInWithGoogle } from "@lib/modules/googleAuth";
import './Login.css';

export default function() {
  const [email, setEmail] = createSignal("");
  const [pw, setPw] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [showEmailForm, setShowEmailForm] = createSignal(false);
  let dialogRef!: HTMLDialogElement;

  onMount(() => {
    dialogRef.showModal();
  });

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    if (loading()) return;
    setLoading(true);
    setStore("snackbar", "Connecting to Google...");

    try {
      const { hash, user } = await signInWithGoogle();

      setConfig("dbsync", hash);
      localStorage.setItem('sync_email', user.email);
      localStorage.setItem('sync_provider', 'google');

      setStore("snackbar", t("login_syncing"));

      const { runSync } = await import("@lib/modules/cloudSync");
      const result = await runSync(hash);

      setStore("snackbar", result.message);
      if (result.success) {
        dialogRef.close();
        dialogRef.remove();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStore("snackbar", "Google sign-in failed: " + message);
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Handler
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
        localStorage.setItem('sync_email', email());
        localStorage.setItem('sync_provider', 'email');
        setStore("snackbar", t("login_syncing"));

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
        setStore("snackbar", t("login_auth_failed") + error.message);
        setLoading(false);
      });
  };

  const closeDialog = () => {
    dialogRef.close();
    dialogRef.remove();
  };

  return (
    <dialog ref={dialogRef} class="displayer auth-dialog">
      <div class="auth-container">
        {/* Header */}
        <div class="auth-header">
          <h4>{t("login_title")}</h4>
          <p class="auth-description">
            Sync your library across devices. Your playlists and favorites will be securely saved.
          </p>
        </div>

        {/* Auth Methods */}
        <div class="auth-methods">
          {/* Google Sign-In Button */}
          <button
            type="button"
            class="google-signin-btn"
            onclick={handleGoogleSignIn}
            disabled={loading()}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div class="auth-divider">
            <span>or</span>
          </div>

          {/* Email Toggle */}
          <Show when={!showEmailForm()}>
            <button
              type="button"
              class="email-toggle"
              onclick={() => setShowEmailForm(true)}
            >
              <i class="ri-mail-line"></i>
              Use email instead
            </button>
          </Show>

          {/* Email Form */}
          <Show when={showEmailForm()}>
            <form onsubmit={handleSubmit} class="email-form">
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
              <Show when={email() && pw()}>
                <button type="submit" class="submit-btn" disabled={loading()}>
                  {loading() ? t("login_syncing_btn") : t("login_enable_sync")}
                </button>
              </Show>
            </form>
          </Show>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onclick={closeDialog}
          class="auth-close ri-close-large-line"
          aria-label={t("login_cancel")}
          disabled={loading()}
        ></button>
      </div>
    </dialog>
  );
}
