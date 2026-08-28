import { onMount, createEffect, For, createSignal, Show } from "solid-js";
import "./Settings.css";
import { setNavStore, t, setStore, updateLang, closeSubView } from "@stores";
import { Selector } from "@components/Selector.tsx";
import {
  config,
  setConfig,
  themer,
  quickSwitch,
  deleteCollection,
  getCollection,
  PanelRatio,
  applyPanelRatio,
} from "@utils";
import Dropdown from "./Dropdown";
import About from "../Search/About";

export default function () {
  let settingsSection!: HTMLDivElement;
  const isPWA = matchMedia("(display-mode: standalone)").matches;

  onMount(() => {
    setNavStore("settings", "ref", settingsSection);
    settingsSection.scrollIntoView();
  });

  createEffect(updateLang);

  const Toggle = (props: {
    name: string;
    checked: boolean;
    onclick: (e: MouseEvent) => void;
  }) => {
    const [checked, setChecked] = createSignal(props.checked);

    return (
      <span
        role="checkbox"
        aria-checked={checked()}
        tabindex="0"
        onclick={(e) => {
          props.onclick(e);
          setChecked(props.checked);
        }}
        onkeydown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            props.onclick(e as unknown as MouseEvent);
            setChecked(!props.checked);
          }
        }}
      >
        <label>{t(props.name as TranslationKeys)}</label>
        <i class={checked() ? "ri-toggle-fill" : "ri-toggle-line"}></i>
      </span>
    );
  };

  return (
    <section ref={settingsSection} class="settingsSection">
      <header>
        <p>ytify {Build}</p>
        <i
          aria-label={t("close")}
          class="ri-close-large-line"
          onclick={closeSubView}
        ></i>
        <Dropdown />
      </header>
      <div>
        {/* App Settings */}
        <Selector
          label="settings_language"
          id="languageSelector"
          onchange={(e) => {
            setConfig("language", e.target.value);
            setStore("locale", e.target.value);
            setStore("snackbar", t("settings_reload"));
          }}
          value={document.documentElement.lang}
        >
          <For each={Locales}>
            {(item) => (
              <option value={item}>
                {new Intl.DisplayNames(document.documentElement.lang, {
                  type: "language",
                }).of(item)}
              </option>
            )}
          </For>
        </Selector>

        <Show when={isPWA}>
          <Selector
            id="shareAction"
            label="settings_pwa_share_action"
            onchange={(e) => {
              setConfig(
                "shareAction",
                e.target.value as "play" | "watch" | "download",
              );
            }}
            value={config.shareAction}
          >
            <option value="play">{t("player_play_button")}</option>
            <option value="watch">{t("settings_pwa_watch")}</option>
            <option value="download">{t("actions_menu_download")}</option>
          </Selector>
        </Show>

        {/* Playback Settings */}
        <Selector
          label="settings_audio_quality"
          id="qualityPreference"
          onchange={async (e) => {
            setConfig(
              "quality",
              e.target.value as "worst" | "low" | "medium" | "high",
            );
            quickSwitch();
          }}
          value={config.quality}
        >
          <option value="worst">{t("settings_quality_worst")}</option>
          <option value="low">{t("settings_quality_low")}</option>
          <option value="medium">{t("settings_quality_medium")}</option>
          <option value="high">{t("settings_quality_high")}</option>
        </Selector>

        <Toggle
          name="settings_stable_volume"
          checked={Boolean(config.stableVolume)}
          onclick={() => {
            setConfig("stableVolume", !config.stableVolume);
            quickSwitch();
          }}
        />

        <Toggle
          name="settings_watchmode"
          checked={Boolean(config.watchMode)}
          onclick={() => {
            setConfig("watchMode", config.watchMode ? "" : "144p");
          }}
        />

        {/* Library Settings */}
        <Toggle
          name="settings_store_history"
          checked={config.history}
          onclick={() => {
            let configVal = !config.history;
            if (!configVal) {
              const db = getCollection("history") || [];
              const count = db.length;
              if (confirm(t("settings_clear_history", count.toString()))) {
                deleteCollection("history");
                configVal = false;
              } else return;
            }
            setConfig("history", configVal);
          }}
        />

        {/* Search Settings */}
        <Toggle
          name="settings_link_capturing"
          checked={config.searchBarLinkCapture}
          onclick={() => {
            setConfig("searchBarLinkCapture", !config.searchBarLinkCapture);
          }}
        />

        <Toggle
          name="settings_display_suggestions"
          checked={config.searchSuggestions}
          onclick={() => {
            setConfig("searchSuggestions", !config.searchSuggestions);
            setStore("snackbar", t("settings_reload"));
          }}
        />

        <Toggle
          name="settings_save_recent_searches"
          checked={config.saveRecentSearches}
          onclick={() => {
            setConfig("saveRecentSearches", !config.saveRecentSearches);
          }}
        />

        {/* Personalize Settings */}
        <Toggle
          name="settings_load_images"
          checked={config.loadImage}
          onclick={() => {
            setConfig("loadImage", !config.loadImage);
            setStore("snackbar", t("settings_reload"));
          }}
        />

        <Selector
          label="settings_panel_ratio"
          onchange={(e) => {
            const val = e.target.value as PanelRatio;
            applyPanelRatio(val);
            setConfig("panelRatio", val);
          }}
          id="panelRatioSelector"
          value={config.panelRatio || "2:5"}
        >
          <option value="1:1">1:1 (Equal)</option>
          <option value="2:3">2:3 (Compact Player)</option>
          <option value="3:4">3:4 (Narrow Player)</option>
          <option value="1:2">1:2 (Slim Player)</option>
          <option value="2:5">2:5 (Ultra Slim)</option>
        </Selector>

        <Selector
          label="settings_theming_scheme"
          id="themeSelector"
          onchange={(e) => {
            themer();
            setConfig("theme", e.target.value as "auto" | "light" | "dark");
          }}
          value={config.theme}
        >
          <option value="auto" selected>
            {t("settings_theming_scheme_system")}
          </option>
          <option value="light">{t("settings_theming_scheme_light")}</option>
          <option value="dark">{t("settings_theming_scheme_dark")}</option>
        </Selector>

        <About />
      </div>
      <br />
      <br />
    </section>
  );
}
