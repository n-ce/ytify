import { defineConfig, PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';
import autoprefixer from 'autoprefixer';
import postcssJitProps from 'postcss-jit-props';
import OpenProps from 'open-props';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import path from 'path';


export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    Locales: readdirSync(resolve(__dirname, './src/locales')).map(file => file.slice(0, 2)),
    Build: JSON.stringify('v' + require('./package.json').version),
    Backend: JSON.stringify([
      'https://ytify-zeta.vercel.app',
    ]),
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
        "short_name": "Ytify",
        "name": "Listen with ytify",
        "description": "32kb/s to 128kb/s youtube audio streaming website. Copy a youtube video link and listen to it as an audio totally free.",
        "icons": [
          {
            "src": "logo192.png",
            "type": "image/png",
            "sizes": "192x192",
            "purpose": "any maskable"
          },
          {
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "any maskable"
          },
          {
            "src": "monochrome.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "monochrome"
          },
          {
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "44x44",
            "purpose": "any"
          }
        ],
        "shortcuts": [
          {
            "name": "History",
            "url": "/?collection=history",
            "icons": [
              {
                "src": "memories-fill.png",
                "sizes": "192x192",
              }]
          },
          {
            "name": "Favorites",
            "url": "/?collection=favorites",
            "icons": [
              {
                "src": "heart-fill.png",
                "sizes": "192x192",
              }]
          },
          {
            "name": "Listen Later",
            "url": "/?collection=listenLater",
            "icons": [
              {
                "src": "calendar-schedule-fill.png",
                "sizes": "192x192",
              }]
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "theme_color": "black",
        "background_color": "black",
        "share_target": {
          "action": "/",
          "method": "GET",
          "params": {
            "title": "title",
            "text": "text",
            "url": "url"
          }
        }
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
}));


const injectEruda = (serve: boolean) => serve ? (<PluginOption>{
  name: 'erudaInjector',
  transformIndexHtml: html => ({
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          src: '/node_modules/eruda/eruda'
        },
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


