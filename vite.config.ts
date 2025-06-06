import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [VitePWA()],
  preview: {
    allowedHosts: [
      'ytify-cm77.onrender.com',  // Your specific Render domain
      'localhost'                 // Keep localhost for development
    ],
    host: true,                   // Allow all hosts in development
    port: process.env.PORT || 4173 // Use Render's PORT or default
  },
  server: {
    host: true,                    // Allow external access
    port: process.env.PORT || 5173  // Different port for dev server
  }
})
