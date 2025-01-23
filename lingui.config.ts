import { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
    locales: ["en", "pl"],
    sourceLocale: "en",
    catalogs: [
        {
            path: "src/locales/{locale}/messages",
            include: ["src"],
        },
    ],
    format: "po",
};

export default config;
