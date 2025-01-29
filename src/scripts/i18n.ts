import { getSaved } from "../lib/store";
import i18next from "i18next";
import I18NextHttpBackend from "i18next-http-backend";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";

const locale = getSaved("language") || "en";
const attributes = [
  '',
  '-label',
  '-aria-label',
  '-placeholder'
];

i18next
    .use(I18NextHttpBackend)
    .use(I18nextBrowserLanguageDetector)
    .init({
      fallbackLng: "en",
      lng: locale,
      debug: true,
      interpolation: { escapeValue: false },
      backend: { loadPath: "/locales/{{lng}}.json" }
    })
    .then(() => {
      attributes.forEach(attributeHandler);
    });

function attributeHandler(attr: string) {
  const query = "data-translation" + attr;

  document.querySelectorAll(`[${query}]`).forEach(el => {
    const translationKey = el.getAttribute(query);

    if (translationKey) {
      if (attr) {
        el.removeAttribute(query);
        el.setAttribute(attr.substring(1), i18next.t(translationKey));
      } else {
        el.textContent = i18next.t(translationKey);
      }
    }
  });
}



