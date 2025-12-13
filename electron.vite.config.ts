import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
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
  buildHash = buildTimestamp.slice(-8)
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    worker: {
      format: 'es'
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
      'import.meta.env.VITE_BUILD_HASH': JSON.stringify(buildHash)
    }
  }
})
