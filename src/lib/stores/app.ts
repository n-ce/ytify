import { config } from "../utils/config";
import { createStore } from "solid-js/store";

const nl = navigator.language.slice(0, 2);
const initLocale = config.language || (Locales.includes(nl) ? nl : 'en');

const getAllottedInstance = () => {
  if (import.meta.env.DEV) return { url: '', loc: 'Local' };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let url = "https://ytify-zeta.vercel.app";
  let loc = "Virginia, USA";

  // 1. ASIA & OCEANIA (Render - Singapore)
  if (["Asia", "Indian", "Pacific", "Australia"].some(r => tz.includes(r))) {
    url = "https://ytify-2nx7.onrender.com";
    loc = "Singapore, Asia";
  }
  // 2. EUROPE & AFRICA
  else if (tz.includes("Europe") || tz.includes("Africa")) {
    // Western Europe (Spain, France, UK, Ireland)
    if (["Paris", "Madrid", "London", "Dublin", "Lisbon"].some(c => tz.includes(c))) {
      url = "https://ytify-legacy.vercel.app"; /* CHANGE TO A CDG1 VERCEL INSTANCE IN FUTURE*/
      loc = "Paris, France";
    } else {
      // Central/Eastern Europe (Poland, Germany, Romania, Bulgaria)
      url = "https://ytify-legacy.vercel.app";
      loc = "Germany, Europe";
    }
  }
  // 3. AMERICAS
  else if (tz.includes("America")) {
    // West Coast (Zeabur - California)
    if (["Los_Angeles", "Vancouver", "Tijuana", "Phoenix"].some(c => tz.includes(c))) {
      url = "https://ytify-zeta.vercel.app"; /* CHANGE TO A SFO1 INSTANCE IN FUTURE*/
      loc = "California, USA";
    }
    // Midwest / Central (Netlify - Ohio)
    else if (["Chicago", "Winnipeg", "Mexico_City", "Denver", "Detroit"].some(c => tz.includes(c))) {
      url = "";
      loc = "Ohio, USA";
    }
  }

  return { url, loc };
};

const instance = getAllottedInstance();

const storeInit: {
  useSaavn: boolean,
  api: string,
  instanceLocation: string,
  updater?: () => void,
  actionsMenu?: TrackItem & { albumId?: string },
  snackbar?: string,
  syncState?: SyncState,
  locale: string,
  translations: Record<TranslationKeys, string> | {}
} = {
  api: instance.url,
  instanceLocation: instance.loc,
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

