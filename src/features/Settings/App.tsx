import { createEffect, For } from 'solid-js';
import { Selector } from '../../components/Selector.tsx';
import { config, setConfig } from '../../lib/utils/config.ts';
import { setStore, setI18nStore, t, updateLang } from '../../lib/stores';

export default function() {


  createEffect(updateLang);

  return (
    <>
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
        id='linkHost'
        label='settings_links_host'
        onchange={(e) => {
          const configVal = e.target.selectedIndex === 0 ? '' : e.target.value;
          setConfig('linkHost', configVal || location.origin);
          setConfig('linkHost', configVal);
          setStore('snackbar', t('settings_reload'));
        }}
        value={config.linkHost || location.origin}
      >
        <option value={location.origin}>ytify</option>
        <option value="https://youtube.com">YouTube</option>
        <option value="https://piped.video">Piped</option>
        <option value="https://inv.nadeko.net">Invidious</option>
      </Selector>

      <Selector
        id='downloadFormatSelector'
        label='settings_download_format'
        onchange={(e) => {
          setConfig('dlFormat', e.target.value as 'opus' | 'mp3' | 'wav' | 'ogg');
        }}
        value={config.dlFormat}
      >
        <option value='opus'>Opus</option>
        <option value='mp3'>MP3</option>
        <option value='wav'>WAV</option>
        <option value='ogg'>OGG</option>
      </Selector>

      <Selector
        id='shareAction'
        label='settings_pwa_share_action'
        onchange={(e) => {
          setConfig('shareAction', e.target.value as 'play' | 'watch' | 'download');
        }}
        value={config.shareAction}
      >
        <option value='play'>{t('settings_pwa_play')}</option>
        <option value='watch'>{t('settings_pwa_watch')}</option>
        <option value='dl'>{t('settings_pwa_download')}</option>
      </Selector>
    </>
  );
}
