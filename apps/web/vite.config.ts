import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor-react'
          }

          if (id.includes('node_modules/react-router')) {
            return 'vendor-router'
          }

          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n'
          }

          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }

          if (id.includes('/src/services/')) {
            return 'services'
          }

          if (id.includes('/src/data/')) {
            return 'content-data'
          }

          return undefined
        },
      },
    },
  },
})
