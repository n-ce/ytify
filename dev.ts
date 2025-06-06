import { PluginOption } from 'vite'
import eruda from 'eruda'

export const injectEruda = (enabled: boolean): PluginOption => ({
  name: 'inject-eruda',
  apply: 'serve',
  transformIndexHtml() {
    if (enabled) {
      return [
        {
          tag: 'script',
          children: eruda.init().toString(),
          injectTo: 'head-prepend'
        }
      ]
    }
    return []
  }
})
