import { defineConfig, PluginOption, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';
import autoprefixer from 'autoprefixer';
import postcssJitProps from 'postcss-jit-props';
import OpenProps from 'open-props';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import path from 'path';

// Backend URLs per environment
const BACKEND_URLS = {
  production: ['https://api.music.ml4-lab.com'],
  development: ['https://api.ytify.ml4-lab.com', 'https://ytify-zeta.vercel.app'],
};

// Eruda injector for development debugging
const injectEruda = (serve: boolean): PluginOption | PluginOption[] => serve ? ({
  name: 'erudaInjector',
  transformIndexHtml: html => ({
    html,
    tags: [
      {
        tag: 'script',
        attrs: { src: '/node_modules/eruda/eruda' },
        injectTo: 'body-prepend'
      },
      {
        tag: 'script',
        injectTo: 'body-prepend',
        children: 'eruda.init()'
      }
    ]
  })
}) : [];

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const ENV = env.YTIFY_ENV || mode || 'development';
  const isProduction = ENV === 'production';

  return {
    base: env.VITE_BASE_PATH || '/',
    define: {
      Locales: readdirSync(resolve(__dirname, './src/locales')).map(file => file.slice(0, 2)),
      Build: JSON.stringify('v' + require('./package.json').version),
      Backend: JSON.stringify(BACKEND_URLS[ENV as keyof typeof BACKEND_URLS] || BACKEND_URLS.development),
      __DEV__: JSON.stringify(!isProduction),
      __ENV__: JSON.stringify(ENV),
      __ENABLE_EXPERIMENTAL__: JSON.stringify(env.VITE_ENABLE_EXPERIMENTAL === 'true'),
      __ENABLE_SPOTIFY__: JSON.stringify(env.VITE_ENABLE_SPOTIFY === 'true'),
      __ENABLE_DEEZER__: JSON.stringify(env.VITE_ENABLE_DEEZER === 'true'),
      __ENABLE_SOUNDCLOUD__: JSON.stringify(env.VITE_ENABLE_SOUNDCLOUD === 'true'),
    },
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@lib': path.resolve(__dirname, './src/lib'),
      },
    },
    plugins: [
      solidPlugin(),
      injectEruda(command === 'serve'),
      VitePWA({
        manifest: {
          short_name: isProduction ? 'ML4 Music' : 'ML4 Dev',
          name: isProduction ? 'ML4 Music Player' : 'ML4 Music [DEV]',
          description: isProduction 
            ? 'Premium music streaming by ML4-Lab. Stream audio from YouTube, Spotify, Deezer and more.'
            : 'Development version of ML4 Music with experimental features.',
          icons: [
            {
              src: 'logo192.png',
              type: 'image/png',
              sizes: '192x192',
              purpose: 'any maskable'
            },
            {
              src: 'logo512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any maskable'
            },
            {
              src: 'monochrome.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'monochrome'
            },
            {
              src: 'logo512.png',
              type: 'image/png',
              sizes: '44x44',
              purpose: 'any'
            }
          ],
          shortcuts: [
            {
              name: 'History',
              url: '/?collection=history',
              icons: [{ src: 'memories-fill.png', sizes: '192x192' }]
            },
            {
              name: 'Favorites',
              url: '/?collection=favorites',
              icons: [{ src: 'heart-fill.png', sizes: '192x192' }]
            },
            {
              name: 'Listen Later',
              url: '/?collection=listenLater',
              icons: [{ src: 'calendar-schedule-fill.png', sizes: '192x192' }]
            }
          ],
          start_url: '/',
          display: 'standalone',
          theme_color: 'black',
          background_color: 'black',
          share_target: {
            action: '/',
            method: 'GET',
            params: { title: 'title', text: 'text', url: 'url' }
          }
        },
        // Use custom service worker with advanced caching strategies
        strategies: 'injectManifest',
        srcDir: 'src/lib/workers',
        filename: 'sw-custom.ts',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB max file size
          globPatterns: ['**/*.{js,css,html,woff2,webp,png,svg,ico}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
        disable: command !== 'build',
        includeAssets: ['*.woff2', 'ytify_banner.webp']
      })
    ],
    css: {
      postcss: {
        plugins: [
          autoprefixer(),
          postcssJitProps(OpenProps)
        ]
      }
    }
  };
});
