import { createStore } from 'solid-js/store';
import { config } from '@lib/utils';

type TranslationStore = {
  locale: string;
  translations: Record<TranslationKeys, string> | {}
};

const nl = navigator.language.slice(0, 2);
const initLocale = config.language || (Locales.includes(nl) ? nl : 'en');

export const [i18nStore, setI18nStore] = createStore<TranslationStore>({
  locale: initLocale,
  translations: {},
});


export function t(key: TranslationKeys, value: string = ''): string {

  const translations = i18nStore.translations as Record<TranslationKeys, string>;
  const translatedString = translations[key] || key as string;
  return value ? translatedString.replace('$', value) : translatedString;
}

export async function updateLang() {

  document.documentElement.lang = i18nStore.locale;

  const json = await import(`../../locales/${i18nStore.locale}.json`)

  setI18nStore('translations', json.default);
  return true;

}

