import { Show } from "solid-js";
import { config } from "@utils";
import { store, navStore, t, openSubView } from "@stores";
import Dropdown from "@features/Library/Dropdown";

export default function HeaderActions() {
  return (
    <>
      <div class="right-group">
        <Show when={config.dbsync}>
          <i
            id="syncNow"
            classList={{
              "ri-cloud-fill": store.syncState === "synced",
              "ri-loader-3-line loading-spinner":
                store.syncState === "syncing",
              "ri-cloud-off-fill":
                store.syncState === "dirty" || store.syncState === "error",
              error: store.syncState === "error",
            }}
            aria-label={
              store.syncState === "dirty" || store.syncState === "error"
                ? "Save to Cloud"
                : store.syncState === "synced"
                  ? "Import from Cloud"
                  : "Syncing"
            }
            onclick={() => {
              import("@modules/cloudSync").then(({ runSync }) => {
                runSync(config.dbsync);
              });
            }}
          ></i>
        </Show>
        <Show when={navStore.active !== "settings"}>
          <i
            class="ri-settings-line"
            aria-label={t("nav_settings")}
            onclick={() => openSubView("settings")}
          ></i>
        </Show>
      </div>

      <Dropdown />
    </>
  );
}