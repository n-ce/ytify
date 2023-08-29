import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa'

import type { PluginOption } from 'vite'

// Set to false to disable eruda during development
const eruda = true;

const erudaInjector: PluginOption = {
  name: 'erudaInjector',
  transformIndexHtml: html => {
    return {
      html,
      tags: [
        {
          tag: 'script',
          attrs: {
            src: '/node_modules/eruda/eruda'
          },
          injectTo: 'body'
        }, {
          tag: 'script',
          injectTo: 'body',
          children: 'eruda.init()'
        }
      ]
    }
  }
}

export default defineConfig(({ command }) => {
  return {
    plugins: (eruda && command === 'serve') ? [erudaInjector, VitePWA({ registerType: 'autoUpdate' })] : [],
  }
});
