import { i18n } from "./i18n.ts";

export function translateHTML() {
    document.querySelectorAll("[data-translation]").forEach((el) => {
        const translationKey = el.getAttribute("data-translation");
        if (translationKey) {
            el.textContent = i18n._(translationKey);
        }
    });
    document.querySelectorAll("[data-translation-label]").forEach((el) => {
        const translationKey = el.getAttribute("data-translation-label");
        if (translationKey) {
            el.setAttribute("label", i18n._(translationKey));
        }
    });
    document.querySelectorAll("[data-translation-aria-label]").forEach((el) => {
        const translationKey = el.getAttribute("data-translation-aria-label");
        if (translationKey) {
            el.setAttribute("aria-label", i18n._(translationKey));
        }
    });
    document.querySelectorAll("[data-translation-placeholder]").forEach((el) => {
        const translationKey = el.getAttribute("data-translation-placeholder");
        if (translationKey) {
            el.setAttribute("placeholder", i18n._(translationKey));
        }
    });
}

export function changeLanguage(lang: string) {
    i18n.activate(lang);
    localStorage.setItem("language", lang);
    // workaround for not automatically translating the contents of options
    location.reload();
    translateHTML();
}
