import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the build runs from any folder (artifact preview, GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
  },
})
