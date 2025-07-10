import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        background: 'src/modules/background.js',
        contentScript: 'src/contentScript.js'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks: (id) => {
          // Force everything to be included in the main entry files
          return null;
        }
      }
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
        { src: 'src/options.css',       dest: '.' },
        { src: 'src/modules/options.js', dest: 'modules' },
        { src: 'src/modules/constants.js', dest: 'modules' },
        { src: 'src/icons',             dest: '.' },
        { src: 'src/_locales',          dest: '.' }, // if present
        { src: 'src/assets/fonts',          dest: '.' }
      ]
    })
  ]
});
