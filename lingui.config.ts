import { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
    locales: ["en", "pl"],
    sourceLocale: "en",
    catalogs: [
        {
            path: "src/locales/{locale}",
            include: ["src"],
        },
    ],
};

export default config;
