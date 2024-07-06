import { defineConfig, PluginOption } from 'vite';
import autoprefixer from 'autoprefixer';


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
  plugins: [injectEruda(command === 'serve')],
  css: {
    postcss: {
      plugins: [autoprefixer()]
    }
  }
}));
