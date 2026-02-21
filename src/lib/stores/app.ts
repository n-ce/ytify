import { config } from "../utils/config";
import { createStore } from "solid-js/store";

const nl = navigator.language.slice(0, 2);
const initLocale = config.language || (Locales.includes(nl) ? nl : 'en');
const storeInit: {
  useSaavn: boolean,
  api: string,
  updater?: () => void,
  actionsMenu?: TrackItem & { albumId?: string },
  snackbar?: string,
  syncState?: SyncState,
  locale: string,
  translations: Record<TranslationKeys, string> | {}
} = {
  api: Backend[Math.floor(Math.random() * Backend.length)],
  useSaavn: true,
  locale: initLocale,
  translations: {},
};

export const [store, setStore] = createStore(storeInit);


export function t(key: TranslationKeys, value: string = ''): string {

  const translations = store.translations as Record<TranslationKeys, string>;
  const translatedString = translations[key] || key as string;
  return value ? translatedString.replace('$', value) : translatedString;
}

export async function updateLang() {

  document.documentElement.lang = store.locale;

  const json = await import(`../../locales/${store.locale}.json`)

  setStore('translations', json.default);
  return true;

}

