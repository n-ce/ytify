import { defineConfig, PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import autoprefixer from 'autoprefixer';
import solidPlugin from 'vite-plugin-solid';


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



export default defineConfig(({ command }) => ({
  define: {
    Version: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    injectEruda(command === 'serve'),
    solidPlugin(),
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
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "44x44",
            "purpose": "any"
          }
        ],
        "shortcuts": [
          {
            "name": "History",
            "url": "/list?collection=history"
          },
          {
            "name": "Favorites",
            "url": "/list?collection=favorites"
          },
          {
            "name": "Discover",
            "url": "/list?collection=discover"
          },
          {
            "name": "Listen Later",
            "url": "/list?collection=listenLater"
          },
          {
            "name": "Library",
            "url": "/library"
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "theme_color": "white",
        "background_color": "white",
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
      plugins: [autoprefixer()]
    }
  }
}));
