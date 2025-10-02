import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Determine which manifest and output directory to use based on environment variable
const browser = process.env.BROWSER || 'chrome';
const manifestFile = browser === 'firefox'
  ? 'src/manifest.firefox.json'
  : 'src/manifest.json';
const outDir = browser === 'firefox' ? 'dist/firefox' : 'dist/chrome';

export default defineConfig({
  build: {
    outDir: outDir,
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
        // Use dynamic manifest based on browser target
        { src: manifestFile, dest: '.', rename: 'manifest.json' },
        
        { src: 'src/styles.css',        dest: '.' },
        { src: 'src/colours.css',      dest: '.' },
        { src: 'src/options.html',      dest: '.' },
        { src: 'src/options.css',       dest: '.' },
        { src: 'src/modules/options.js', dest: 'modules' },
        { src: 'src/modules/constants.js', dest: 'modules' },
        { src: 'src/modules/theme.js', dest: 'modules' },
        { src: 'src/icons',             dest: '.' },
        { src: 'src/_locales',          dest: '.' }, // if present
        { src: 'src/assets/fonts',          dest: '.' }
      ]
    })
  ]
});
