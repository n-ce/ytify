import { createEffect, For } from 'solid-js';
import { Selector } from '@components/Selector.tsx';
import { config, setConfig } from '@lib/utils/config.ts';
import { setStore, setI18nStore, t, updateLang } from '@lib/stores';

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
    </>
  );
}
