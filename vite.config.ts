import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA()
  ],
  preview: {
    allowedHosts: 'all'
  }
})
