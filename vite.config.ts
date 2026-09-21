import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const REVOKED_ANON_KEY = 'sb_publishable_Qh8k6f0pMdQfwNb4_nhWIA_rn1XVwkg';
const PRODUCTION_ANON_KEY = 'sb_publishable_HtIrApOSgOzN-Y2QBUR0Gw_t4i0510w';

if (!process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY === REVOKED_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = PRODUCTION_ANON_KEY;
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      (!process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY === REVOKED_ANON_KEY)
        ? PRODUCTION_ANON_KEY
        : process.env.VITE_SUPABASE_ANON_KEY
    ),
  },
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      strategies: 'injectManifest',

      srcDir: 'src',
      filename: 'sw.ts',

      manifest: {
        name: 'Avelixa Portal',
        short_name: 'Avelixa',
        description:
          'Avelixa business portal for clients, operators, connectors, admins and owners.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait-primary',

        start_url: '/login',
        scope: '/',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,avif,jpg,jpeg}',
        ],
      },

      devOptions: {
        enabled: false,
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