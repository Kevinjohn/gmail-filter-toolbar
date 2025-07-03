import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      /* ONE real entry stops the error */
      input: { background: 'src/modules/background.js', contentScript: 'src/contentScript.js' },
      /* keep the default file-naming */
      output: { entryFileNames: '[name].js' }
    },

    copyPublicDir: false
  },

  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'src/manifest.json',     dest: '.' },
        
        { src: 'src/styles.css',        dest: '.' },
        { src: 'src/colours.css',      dest: '.' },
        { src: 'src/options.html',      dest: '.' },
        { src: 'src/icons',             dest: '.' },
        { src: 'src/_locales',          dest: '.' }, // if present
        { src: 'assets/fonts',          dest: '.' }
      ]
    })
  ]
});
