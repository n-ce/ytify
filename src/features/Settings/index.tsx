import { onMount, createEffect, For } from "solid-js";
import './Settings.css';
import { closeFeature, setNavStore, t, setStore, setI18nStore, updateLang } from '@lib/stores';
import { Selector } from '@components/Selector.tsx';
import { config, setConfig, drawer, setDrawer, cssVar, themer, quickSwitch, deleteCollection, getCollection } from '@lib/utils';
import Dropdown from "./Dropdown";
import ToggleSwitch from "./ToggleSwitch";

export default function() {
  let settingsSection!: HTMLDivElement;

  onMount(() => {
    setNavStore('settings', 'ref', settingsSection);
    settingsSection.scrollIntoView();
  });

  createEffect(updateLang);

  return (
    <section
      ref={settingsSection}
      class="settingsSection"
    >
      <header>
        <p>ytify {Build}</p>
        <i
          aria-label={t('close')}
          class="ri-close-large-line" onclick={() => closeFeature('settings')}></i>
        <Dropdown />
      </header>
      <div>
        {/* App Settings */}
        <Selector
          label='settings_language'
          id='languageSelector'
          onchange={(e) => {
            setConfig('language', e.target.value);
            setI18nStore('locale', e.target.value);
            setStore('snackbar', t('settings_reload'));
          }}
          value={document.documentElement.lang}
        >
          <For each={Locales}>
            {(item) => (
              <option value={item}>{new Intl.DisplayNames(document.documentElement.lang, { type: 'language' }).of(item)}</option>
            )}
          </For>
        </Selector>

        <Selector
          id='shareAction'
          label='settings_pwa_share_action'
          onchange={(e) => {
            setConfig('shareAction', e.target.value as 'play' | 'watch' | 'download');
          }}
          value={config.shareAction}
        >
          <option value='play'>{t('player_play_button')}</option>
          <option value='watch'>{t('settings_pwa_watch')}</option>
          <option value='dl'>{t('actions_menu_download')}</option>
        </Selector>

        {/* Playback Settings */}
        <Selector
          label='settings_audio_quality'
          id='qualityPreference'
          onchange={async (e) => {
            setConfig('quality', e.target.value as 'worst' | 'low' | 'medium' | 'high');
            quickSwitch();
          }}
          value={config.quality}
        >
          <option value="worst">{t('settings_quality_worst')}</option>
          <option value="low">{t('settings_quality_low')}</option>
          <option value="medium">{t('settings_quality_medium')}</option>
          <option value="high">{t('settings_quality_high')}</option>
        </Selector>

        <ToggleSwitch
          id="stableVolumeSwitch"
          name='settings_stable_volume'
          checked={Boolean(config.stableVolume)}
          onclick={() => {
            setConfig('stableVolume', !config.stableVolume);
            quickSwitch();
          }}
        />

        <ToggleSwitch
          id="watchModeSwitch"
          name='settings_watchmode'
          checked={Boolean(config.watchMode)}
          onclick={() => {
            setConfig('watchMode',
              config.watchMode ?
                '' : '144p'
            );
          }}
        />

        {/* Library Settings */}
        <ToggleSwitch
          id='discoverSwitch'
          name='settings_store_discoveries'
          checked={config.discover}
          onclick={(e) => {
            let configVal = (e.target as HTMLInputElement).checked;
            if (!configVal) {
              const count = drawer.discovery?.length || 0;
              if (confirm(t("settings_clear_discoveries", count.toString()))) {
                setDrawer('discovery', []);
                configVal = false;
              }
              else e.preventDefault();
            }
            setConfig('discover', configVal);
          }}
        />

        <ToggleSwitch
          id='historySwitch'
          name='settings_store_history'
          checked={config.history}
          onclick={(e) => {
            let configVal = (e.target as HTMLInputElement).checked;
            if (!configVal) {
              const db = getCollection('history') || [];
              const count = db.length;
              if (confirm(t("settings_clear_history", count.toString()))) {
                deleteCollection('history');
                configVal = false;
              } else e.preventDefault();
            }
            setConfig('history', configVal);
          }}
        />


        {/* Search Settings */}
        <ToggleSwitch
          id="LinkCaptureSwitch"
          name='settings_link_capturing'
          checked={config.searchBarLinkCapture}
          onclick={() => {
            setConfig('searchBarLinkCapture', !config.searchBarLinkCapture);
          }}
        />

        <ToggleSwitch
          id="suggestionsSwitch"
          name='settings_display_suggestions'
          checked={config.searchSuggestions}
          onclick={() => {
            setConfig('searchSuggestions', !config.searchSuggestions);
            setStore('snackbar', t('settings_reload'));
          }}
        />

        <ToggleSwitch
          id="saveRecentSearchesSwitch"
          name='settings_save_recent_searches'
          checked={config.saveRecentSearches}
          onclick={() => {
            setConfig('saveRecentSearches', !config.saveRecentSearches);
          }}
        />

        {/* Personalize Settings */}
        <ToggleSwitch
          id='imgLoadSwitch'
          name='settings_load_images'
          checked={config.loadImage}
          onclick={() => {
            setConfig('loadImage', !config.loadImage);
            setStore('snackbar', t('settings_reload'));
          }}
        />

        <Selector
          label='settings_landscape_sections'
          onchange={(e) => {
            const { value } = e.target;
            cssVar('--landscapeSections', value);
            setConfig('landscapeSections', e.target.value);
          }}
          id='sls'
          value={config.landscapeSections}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3" selected>3</option>
        </Selector>

        <Selector
          label='settings_roundness'
          id='roundnessChanger'
          onchange={(e) => {
            cssVar('--roundness', e.target.value);
            setConfig('roundness', e.target.value);
          }}
          value={config.roundness}
        >
          <option value="none">{t('settings_roundness_none')}</option>
          <option value="0.2rem">{t('settings_roundness_lighter')}</option>
          <option value="0.4rem" selected>{t('settings_roundness_light')}</option>
          <option value="0.6rem">{t('settings_roundness_heavy')}</option>
          <option value="0.9rem">{t('settings_roundness_heavier')}</option>
        </Selector>

        <Selector
          label='settings_theming_scheme'
          id='themeSelector'
          onchange={(e) => {
            themer();
            setConfig('theme', e.target.value as 'auto' | 'light' | 'dark');
          }}
          value={config.theme}
        >
          <option value="auto" selected>{t('settings_theming_scheme_system')}</option>
          <option value="light">{t('settings_theming_scheme_light')}</option>
          <option value="dark">{t('settings_theming_scheme_dark')}</option>
        </Selector>
      </div>
      <br />
      <br />
    </section >
  );
}
