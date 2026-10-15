import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      strategies: 'injectManifest',

      srcDir: 'src',
      filename: 'sw.ts',

      // public/manifest.webmanifest is the single canonical manifest.
      manifest: false,

      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,avif,jpg,jpeg}',
        ],
      },

      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr:
      process.env.DISABLE_HMR !==
      'true'
        ? true
        : false,
    watch:
      process.env.DISABLE_HMR ===
      'true'
        ? null
        : {},
  },
});