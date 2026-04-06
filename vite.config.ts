import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'     
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'  
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression' 
import path from 'path'

export default defineConfig(({ mode }) => ({
 base: mode === 'gh-pages' ? '/Six-Sigma-Room/' : '/',
  plugins: [
    react(),
    
    tsconfigPaths(), 
    
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Six Sigma War Room',
        short_name: 'σ War Room',  
        description: 'DMAIC Intelligence Platform — Six Sigma Black Belt Analytics',
        theme_color: '#050A0F',
        background_color: '#050A0F',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [ 
          { name: 'DMAIC Tracker', url: '/app?tab=dmaic', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'FMEA Scorer',   url: '/app?tab=fmea',  icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'SPC Charts',     url: '/app?tab=spc',   icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',      
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
    
    mode === 'production' && viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    mode === 'production' && viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    
    process.env.ANALYZE === 'true' && visualizer({ open: true, filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
    
  ].filter(Boolean) as PluginOption[],
  
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  
  build: {
    target: 'ES2022',     
    sourcemap: mode === 'development' ? 'inline' : false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
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
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    minify: 'esbuild',
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
    exclude: [],
    force: false,
  },
  
  server: {
    port: 3000,
    strictPort: false,
    open: true,     
    hmr: {
      overlay: true, 
    },
    // Proxy API jika perlu (contoh)
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

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
}))
