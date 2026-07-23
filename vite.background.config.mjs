import { defineConfig } from 'vite';

const browser = process.env.BROWSER || 'chrome';

export default defineConfig({
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: {
      input: { background: 'src/modules/background.js' },
      output: {
        entryFileNames: 'background.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
