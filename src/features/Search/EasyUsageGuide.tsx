import { For } from "solid-js";
import { t } from "@stores";

const FEATURES: {
  icon: string;
  title: TranslationKeys;
  desc: TranslationKeys;
}[] = [
  {
    icon: "ri-search-2-line",
    title: "guide_search_title",
    desc: "guide_search_desc",
  },
  {
    icon: "ri-order-play-fill",
    title: "guide_queue_title",
    desc: "guide_queue_desc",
  },
  {
    icon: "ri-draggable",
    title: "guide_order_title",
    desc: "guide_order_desc",
  },
  {
    icon: "ri-user-3-line",
    title: "guide_group_title",
    desc: "guide_group_desc",
  },
  {
    icon: "ri-radio-line",
    title: "guide_radio_title",
    desc: "guide_radio_desc",
  },
  {
    icon: "ri-compass-3-line",
    title: "guide_similar_title",
    desc: "guide_similar_desc",
  },
  {
    icon: "ri-archive-stack-line",
    title: "guide_library_title",
    desc: "guide_library_desc",
  },
  {
    icon: "ri-compass-3-fill",
    title: "guide_discovery_title",
    desc: "guide_discovery_desc",
  },
  {
    icon: "ri-calendar-schedule-line",
    title: "guide_listen_later_title",
    desc: "guide_listen_later_desc",
  },
  {
    icon: "ri-checkbox-multiple-fill",
    title: "guide_mark_title",
    desc: "guide_mark_desc",
  },
  {
    icon: "ri-link",
    title: "guide_share_collection_title",
    desc: "guide_share_collection_desc",
  },
  {
    icon: "ri-share-forward-line",
    title: "guide_share_title",
    desc: "guide_share_desc",
  },
  {
    icon: "ri-import-line",
    title: "guide_import_title",
    desc: "guide_import_desc",
  },
  {
    icon: "ri-thunderstorms-fill",
    title: "guide_offline_title",
    desc: "guide_offline_desc",
  },
  {
    icon: "ri-music-2-line",
    title: "guide_lyrics_title",
    desc: "guide_lyrics_desc",
  },
  {
    icon: "ri-signpost-line",
    title: "guide_progress_title",
    desc: "guide_progress_desc",
  },
  {
    icon: "ri-video-line",
    title: "guide_video_title",
    desc: "guide_video_desc",
  },
  {
    icon: "ri-cloud-fill",
    title: "guide_sync_title",
    desc: "guide_sync_desc",
  },
];

const SHORTCUTS: { keys: string[]; label: TranslationKeys }[] = [
  { keys: ["Space"], label: "guide_shortcut_play_pause" },
  { keys: ["←"], label: "guide_shortcut_seek_backward" },
  { keys: ["→"], label: "guide_shortcut_seek_forward" },
  { keys: ["Shift+→", "Shift+N", "]"], label: "guide_shortcut_next" },
  { keys: ["Shift+←", "Shift+P", "["], label: "guide_shortcut_previous" },
  { keys: ["↑"], label: "guide_shortcut_volume_up" },
  { keys: ["↓"], label: "guide_shortcut_volume_down" },
  { keys: ["M"], label: "guide_shortcut_mute" },
  { keys: ["1"], label: "nav_queue" },
  { keys: ["2"], label: "nav_search" },
  { keys: ["3"], label: "nav_library" },
  { keys: ["/"], label: "guide_shortcut_focus_search" },
];

export default function () {
  return (
    <div class="usageGuide">
      <ul class="guideFeatures">
        <For each={FEATURES}>
          {(feature) => (
            <li>
              <i class={feature.icon}></i>
              <b>{t(feature.title)}</b>
              <span>{t(feature.desc)}</span>
            </li>
          )}
        </For>
      </ul>

      <p class="guideTitle">{t("guide_shortcuts_title")}</p>

      <ul class="guideShortcuts">
        <For each={SHORTCUTS}>
          {(shortcut) => (
            <li>
              <span class="guideKeys">
                <For each={shortcut.keys}>{(key) => <kbd>{key}</kbd>}</For>
              </span>
              <span>{t(shortcut.label)}</span>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
