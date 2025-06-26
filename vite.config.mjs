import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        manifest: resolve('src/manifest.json')
      },
      output: {
        entryFileNames: '[name].js'
      }
    },
    copyPublicDir: false
  },
  publicDir: 'src'
})
