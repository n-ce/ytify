import { store } from "../lib/store";

const unified_instances = [
  ['ggtyler.dev', '🇺🇸', 'piapi', 'iv', 'hpapi'],
  ['reallyaweso.me', '🇦🇹', 'pipedapi', 'invidious', 'musicapi'],
  ['adminforge.de', '🇩🇪', 'pipedapi', 'invidious', 'musicapi'],
  ['projectsegfau.lt', '🇺🇸', 'pipedapi.us', 'inv.us', 'hyperpipebackend.us'],
  ['projectsegfau.lt', '🇪🇺', 'api.piped', 'invidious', 'hyperpipebackend.eu'],
  ['lunar.icu', '🇩🇪', 'piped-api', 'invidious', 'hyperpipe-api'],
  ['darkness.services', '🇺🇸', 'pipedapi', 'invidious', 'hyperpipeapi'],
  ['projectsegfau.lt', '🇮🇳', 'pipedapi.in', 'inv.in', 'hyperpipebackend.in']
];

unified_instances.map((v: string[]) => {
  const [name, flag, pi, iv, hp] = v;
  store.api.list.push({
    name: `${name} ${flag}`,
    piped: `https://${pi}.${name}`,
    invidious: `https://${iv}.${name}`,
    hyperpipe: `https://${hp}.${name}`
  })
});



