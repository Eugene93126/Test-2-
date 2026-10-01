import { defineConfig } from 'vite'

// Dev server for the offline city renderer. Not part of the app build.
export default defineConfig({
  root: __dirname,
  server: { port: 5199, strictPort: true },
})
