import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// WHY: Each browser requires different manifest fields:
// - Chrome/Edge: Standard MV3 with service_worker
// - Firefox: browser_specific_settings.gecko.id, dual background script declaration
// - Safari: No CSP (handled by Xcode), open_in_tab options
// We maintain separate manifests and output directories to support all browsers from a single codebase.
// Default to Chrome build when BROWSER env var is not set.
const browser = process.env.BROWSER || 'chrome';

const manifestMap = {
  chrome: 'src/manifest.json',
  firefox: 'src/manifest.firefox.json',
  safari: 'src/manifest.safari.json',
};

const manifestFile = manifestMap[browser] || manifestMap.chrome;
const outDir = `dist/${browser}`;

export default defineConfig({
  build: {
    outDir: outDir,
    emptyOutDir: true,

    rollupOptions: {
      input: browser === 'safari'
        // WHY: Safari doesn't support dynamic imports in content scripts.
        // Build contentScript as single IIFE bundle. Background is copied statically.
        ? { contentScript: 'src/contentScript.js' }
        : { background: 'src/modules/background.js', contentScript: 'src/contentScript.js' },
      output: browser === 'safari'
        ? {
            entryFileNames: '[name].js',
            format: 'iife',
            inlineDynamicImports: true,
          }
        : {
            entryFileNames: '[name].js',
            chunkFileNames: 'assets/[name]-[hash].js',
          },
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
        { src: 'src/modules/storage.js', dest: 'modules' },
        // Safari: background.js built as static copy since it's simple and avoids IIFE multi-entry issues
        ...(browser === 'safari' ? [{ src: 'src/modules/background.js', dest: '.', rename: 'background.js' }] : []),
        { src: 'src/icons',             dest: '.' },
        { src: 'src/_locales',          dest: '.' }, // if present
        { src: 'src/assets/fonts',          dest: '.' }
      ]
    })
  ]
});
