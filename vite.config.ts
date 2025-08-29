import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    // Generate manifest for PWA
    manifest: true,
    rollupOptions: {
      // Ensure service worker is copied to dist
      input: {
        main: './index.html',
        sw: './public/sw.js'
      }
    }
  },
  server: {
    // Enable HTTPS for PWA testing (optional)
    // https: true,
    host: true, // Allow external connections
    port: 3000
  }
})
