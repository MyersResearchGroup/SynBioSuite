import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from '@honkhonk/vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svgr(), react()],
  server: {
    port: 3001,
  },
  build: {
    target: 'es2022', // Support top-level await
  },
})
