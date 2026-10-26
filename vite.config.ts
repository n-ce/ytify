import { defineConfig, PluginOption } from "vite";
import solidPlugin from "vite-plugin-solid";
import { VitePWA } from "vite-plugin-pwa";
import autoprefixer from "autoprefixer";
import postcssJitProps from "postcss-jit-props";
import OpenProps from "open-props";
import { resolve } from "path";
import { readdirSync, readFileSync } from "fs";
import path from "path";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "./package.json"), "utf-8"),
);

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH || "/",
  define: {
    Locales: readdirSync(resolve(import.meta.dirname, "./src/locales")).map(
      (file) => file.slice(0, 2),
    ),
    Build: JSON.stringify("v" + pkg.version),
  },
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "@stores": path.resolve(import.meta.dirname, "./src/store.ts"),
      "@config": path.resolve(import.meta.dirname, "./src/config.ts"),
      "@modules": path.resolve(import.meta.dirname, "./src/modules"),
      "@utils": path.resolve(import.meta.dirname, "./src/utils.ts"),
      "@components": path.resolve(import.meta.dirname, "./src/components"),
      "@features": path.resolve(import.meta.dirname, "./src/features"),
    },
  },
  plugins: [
    solidPlugin(),
    apiMiddleware(command === "serve"),
    VitePWA({
      manifest: {
        short_name: "Ytify",
        name: "Listen with ytify",
        description:
          "32kb/s to 128kb/s youtube audio streaming website. Copy a youtube video link and listen to it as an audio totally free.",
        icons: [
          {
            src: "logo192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any maskable",
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any maskable",
          },
          {
            src: "monochrome.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "monochrome",
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "44x44",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "History",
            url: "/?collection=history",
            icons: [
              {
                src: "memories-fill.png",
                sizes: "192x192",
              },
            ],
          },
          {
            name: "Favorites",
            url: "/?collection=favorites",
            icons: [
              {
                src: "heart-fill.png",
                sizes: "192x192",
              },
            ],
          },
          {
            name: "Listen Later",
            url: "/?collection=listenLater",
            icons: [
              {
                src: "calendar-schedule-fill.png",
                sizes: "192x192",
              },
            ],
          },
        ],
        scope: "/",
        start_url: "/",
        display: "standalone",
        launch_handler: {
          client_mode: "focus-existing",
        },
        theme_color: "black",
        background_color: "black",
        share_target: {
          action: "/",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
      },
      disable: command !== "build",
      includeAssets: ["*.woff2", "ytify_banner.webp"],
    }),
  ],
  css: {
    postcss: {
      plugins: [autoprefixer(), postcssJitProps(OpenProps)],
    },
  },
}));

const apiMiddleware = (serve: boolean): PluginOption =>
  serve
    ? {
        name: "api-middleware",
        configureServer(server) {
          const endpoints = [
            "album",
            "artist",
            "catalog",
            "channel",
            "cron",
            "fix-metadata",
            "gallery",
            "playlist",
            "recommend",
            "search",
            "search-suggestions",
            "similar",
            "stream-gate",
            "subfeed",
            "sync",
            "syncHash",
            "hash",
            "library",
          ];
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url || "", "http://localhost");
            const path = url.pathname
              .replace(/^\/api\//, "")
              .replace(/^\//, "");

            const isKnownEndpoint =
              endpoints.some(
                (ep) => path === ep || path.startsWith(`${ep}/`),
              ) || req.url?.startsWith("/api/");

            if (isKnownEndpoint) {
              const { createLocalAdapter } = await server.ssrLoadModule(
                "./src/backend/localAdapter.ts",
              );
              const adapter = createLocalAdapter();
              return adapter(req, res);
            } else {
              next();
            }
          });
        },
      }
    : [];
