import { i18n } from "@lingui/core";
import { messages as enMessages } from "../locales/en/messages";
import { messages as plMessages } from "../locales/pl/messages";

i18n.load({
    en: enMessages,
    pl: plMessages,
});

i18n.activate(localStorage.getItem("language") || "en");

export { i18n };
