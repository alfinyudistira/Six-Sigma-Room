import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'      // 🔥 SWC 20x lebih cepat dari Babel
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'   // 🔥 path alias tanpa manual
import { visualizer } from 'rollup-plugin-visualizer' // 🔥 analisis bundle
import viteCompression from 'vite-plugin-compression' // 🔥 gzip/brotli
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(), // SWC version
    
    tsconfigPaths(), // otomatis baca paths dari tsconfig.json
    
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Six Sigma War Room',
        short_name: 'σ War Room',        // dari B, lebih ikonik
        description: 'DMAIC Intelligence Platform — Six Sigma Black Belt Analytics',
        theme_color: '#050A0F',
        background_color: '#050A0F',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [  // dari A (B tidak punya)
          { name: 'DMAIC Tracker', url: '/app?tab=dmaic', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'FMEA Scorer',   url: '/app?tab=fmea',  icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'SPC Charts',     url: '/app?tab=spc',   icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',        // 🔥 top tier: SPA routing offline
        navigateFallbackDenylist: [/^\/api/, /^\/_/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
    
    // 🔥 Kompresi Gzip + Brotli (production only)
    mode === 'production' && viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    mode === 'production' && viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    
    // 🔥 Bundle analyzer (gunakan perintah `npm run build -- --analyze`)
    process.env.ANALYZE === 'true' && visualizer({ open: true, filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
    
  ].filter(Boolean) as PluginOption[],
  
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }, // fallback jika tsconfigPaths tidak jalan
  },
  
  build: {
    target: 'ES2022',           // dari A
    sourcemap: mode === 'development' ? 'inline' : false, // lebih aman
    chunkSizeWarningLimit: 1000, // 🔥 naikkan limit biar tidak false warning
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 🔥 manualChunks lebih cerdas (fungsi, bukan objek statis)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) 
              return 'react-vendor'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('recharts') || id.includes('d3')) return 'charts'
            if (id.includes('@tanstack/react-query')) return 'query'
            if (id.includes('@tanstack/react-table')) return 'table'
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) 
              return 'forms'
            if (id.includes('zustand') || id.includes('@reduxjs') || id.includes('react-redux')) 
              return 'state'
            if (id.includes('idb-keyval') || id.includes('fuse.js') || id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge'))
              return 'utils'
            if (id.includes('axios')) return 'http'
            if (id.includes('sonner')) return 'toast'
            return 'vendor'
          }
        },
        // 🔥 hash yang stabil
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // 🔥 Tambahan: minify dengan terser (default esbuild cukup, tapi bisa custom)
    minify: 'esbuild',
    // 🔥 Treeshaking lebih agresif
    treeshake: 'recommended',
  },
  
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      'framer-motion', 'recharts',
      '@tanstack/react-query', '@tanstack/react-table',
      'zustand', 'react-hook-form', 'zod', 'idb-keyval',
      'date-fns', 'clsx', 'tailwind-merge', 'axios', 'sonner',
    ],
    exclude: [], // tidak ada yang perlu di-exclude
    // 🔥 Force optimize ulang jika perlu
    force: false,
  },
  
  server: {
    port: 3000,
    strictPort: false, // jika 3000 dipakai, coba 3001
    open: true,        // buka browser otomatis
    hmr: {
      overlay: true,   // tampilkan error di layar
    },
    // 🔥 Proxy API jika perlu (contoh)
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  
  preview: {
    port: 4173,
    strictPort: false,
    open: true,
  },
  
  // 🔥 Environment variables yang akan di-expose ke client
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  
  // 🔥 CSS optimasi
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
}))
