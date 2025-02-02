import { getSaved } from '../lib/store';

const nl = navigator.language.slice(0, 2);
const locale = getSaved('language') || (Locales.includes(nl) ? nl : 'en');
document.documentElement.lang = locale;

const attributes = [
  '',
  '-label',
  '-aria-label',
  '-placeholder'
];

let json: Record<TranslationKeys, string> | undefined;

import(`../locales/${locale}.json`)
  .then(_ => {
    json = _.default;
    attributes.forEach(attributeHandler);
  });

function attributeHandler(attr: string) {

  const query = 'data-translation' + attr;

  document.querySelectorAll(`[${query}]`).forEach(el => {
    const translationKey = el.getAttribute(query) as TranslationKeys;

    if (!translationKey || !json) return;

    const translationVal = json[translationKey] || translationKey;

    if (attr) {
      el.removeAttribute(query);
      el.setAttribute(
        attr.substring(1),
        translationVal
      );
    }
    else el.textContent = translationVal;
  });
}

export { json };

