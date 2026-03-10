import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — tiny, changes rarely, always cached
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // framer-motion is large (~100KB gzipped); isolate so it doesn't
          // bloat the app entry chunk
          'vendor-framer': ['framer-motion'],
          // Auth0 SDK — rarely changes, good cache candidate
          'vendor-auth': ['@auth0/auth0-react'],
          // Radix UI primitives used by ShadCN — large, stable
        },
      },
    },
  },
})

