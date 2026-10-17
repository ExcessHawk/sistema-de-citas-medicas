import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to the veloce-ts backend so the app is same-origin in
      // dev (no CORS needed). Production should set VITE_API_URL instead.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // La consola del portafolio arranca preguntando si la API vive, así que
      // /health también tiene que llegar al backend y no a la SPA.
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
