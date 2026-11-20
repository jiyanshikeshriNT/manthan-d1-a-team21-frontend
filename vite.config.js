import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Dev only: same-origin /api calls are forwarded to Spring Boot, so no CORS setup is needed.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Node's fetch needs absolute URLs; jsdom's origin is http://localhost:3000.
    env: { VITE_API_BASE_URL: 'http://localhost:3000' },
  },
})
