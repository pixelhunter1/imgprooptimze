import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

// Get version info
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const version = packageJson.version || '1.0.0'
const buildTimestamp = Date.now().toString()

// Get git hash if available
let buildHash = 'dev'
try {
  buildHash = execSync('git rev-parse HEAD').toString().trim()
} catch {
  // Fallback to timestamp-based hash if git is not available
  buildHash = buildTimestamp.slice(-8)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  define: {
    // Inject version info at build time
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(buildHash),
  },
  build: {
    // Generate manifest for PWA
    manifest: true,
    rollupOptions: {
      // Ensure service worker is copied to dist
      input: {
        main: './index.html',
        sw: './public/sw.js'
      },
      output: {
        // Add content hash to filenames for cache busting
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          // Special handling for certain file types
          if (!assetInfo.name) return `assets/[name]-[hash].[ext]`;

          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash].[ext]`;
          }

          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash].[ext]`;
          }

          return `assets/[name]-[hash].[ext]`;
        }
      }
    },
    // Ensure proper source maps for debugging
    sourcemap: true,
    // Optimize chunks
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true
  },
  server: {
    // Enable HTTPS for PWA testing (optional)
    // https: true,
    host: true, // Allow external connections
    port: 3000
  }
})
