import { For, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "@stores";
import {
  librarySections,
  setLibrarySection,
  LibrarySectionKey,
} from "@utils";

interface SectionConfigItem {
  key: LibrarySectionKey;
  label: TranslationKeys;
  icon: string;
}

const SECTIONS: SectionConfigItem[] = [
  { key: "subfeed", label: "hub_subfeed", icon: "ri-tv-line" },
  { key: "gallery", label: "hub_gallery", icon: "ri-user-heart-line" },
  {
    key: "listenLater",
    label: "library_listen_later",
    icon: "ri-calendar-schedule-fill",
  },
  { key: "history", label: "library_history", icon: "ri-memories-fill" },
  { key: "favorites", label: "library_favorites", icon: "ri-heart-fill" },
  { key: "liked", label: "library_liked", icon: "ri-thumb-up-fill" },
  {
    key: "frequentlyPlayed",
    label: "hub_frequently_played",
    icon: "ri-bar-chart-2-fill",
  },
  { key: "discovery", label: "hub_discovery", icon: "ri-compass-3-fill" },
];

export default function ConfigureModal(props: { close: () => void }) {
  let dialogRef!: HTMLDialogElement;

  onMount(() => {
    dialogRef?.showModal();
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (!dialogRef) return;
    const rect = dialogRef.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!isInDialog) {
      dialogRef.close();
    }
  };

  return (
    <Portal>
      <dialog
        ref={dialogRef}
        class="displayer configure-library-modal"
        onclick={handleBackdropClick}
        onclose={props.close}
      >
        <div class="configure-modal-header">
          <h4>{t("library_configure")}</h4>
          <button
            type="button"
            class="ri-close-large-line"
            onclick={() => {
              dialogRef?.close();
            }}
            aria-label={t("close")}
          ></button>
        </div>

        <div class="configure-modal-list">
          <For each={SECTIONS}>
            {(item) => {
              const isChecked = () => librarySections()[item.key];
              return (
                <div
                  class="configure-item"
                  role="checkbox"
                  aria-checked={isChecked()}
                  tabindex="0"
                  onclick={() => setLibrarySection(item.key, !isChecked())}
                  onkeydown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setLibrarySection(item.key, !isChecked());
                    }
                  }}
                >
                  <span class="configure-item-label">
                    <i class={item.icon}></i>
                    {t(item.label)}
                  </span>
                  <i
                    class={
                      isChecked()
                        ? "ri-toggle-fill toggle-on"
                        : "ri-toggle-line toggle-off"
                    }
                  ></i>
                </div>
              );
            }}
          </For>
        </div>
      </dialog>
    </Portal>
  );
}
