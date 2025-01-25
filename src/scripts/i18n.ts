import { i18n } from "@lingui/core";
import { getSaved } from "../lib/store";

const lang = getSaved('language') || 'en';
const attributes = [
  '',
  '-label',
  '-aria-label',
  '-placeholder'
];
import(`../locales/${lang}.ts`)
  .then(({ messages }) => {

    i18n.load(lang, messages);
    i18n.activate(lang);


    attributes.forEach(attr => {

      const query = 'data-translation' + attr;

      document.querySelectorAll(`[${query}]`).forEach(el => {

        const translationKey = el.getAttribute(query);

        if (translationKey)
          if (attr) {
            el.removeAttribute(query);
            el.setAttribute(
              attr.substring(1),
              i18n._(translationKey)
            );
          }
          else el.textContent = i18n._(translationKey);

      });
    })

  })
