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
      // WHY: Content scripts are loaded as classic scripts in ALL browsers — "type": "module"
      // in content_scripts is silently ignored by Chrome and unsupported by Firefox/Safari.
      // Only background service workers (Chrome) support ES modules, but Rollup can't mix
      // IIFE and ESM output formats in a single build with multiple entries.
      // Solution: build only contentScript as a self-contained IIFE bundle, and copy
      // background.js as a static file. Chrome's service worker loads it as ESM via the
      // manifest's "type": "module". Firefox/Safari load it as a background script.
      input: { contentScript: 'src/contentScript.js' },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        inlineDynamicImports: true,
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
        // WHY: background.js is copied statically (not bundled) because contentScript is the
        // only Rollup entry point (IIFE format). background.js imports './storage.js', so
        // storage.js must also exist at the root level alongside it.
        { src: 'src/modules/background.js', dest: '.', rename: 'background.js' },
        { src: 'src/modules/storage.js', dest: '.' },
        { src: 'src/icons',             dest: '.' },
        { src: 'src/_locales',          dest: '.' },
        { src: 'src/assets/fonts',          dest: '.' }
      ]
    })
  ]
});
