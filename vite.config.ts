import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Six Sigma War Room',
        short_name: 'SigmaWR',
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
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          'motion':          ['framer-motion'],
          'charts':          ['recharts'],
          'query':           ['@tanstack/react-query'],
          'table':           ['@tanstack/react-table'],
          'forms':           ['react-hook-form', 'zod', '@hookform/resolvers'],
          'state':           ['zustand', '@reduxjs/toolkit', 'react-redux'],
          'utils':           ['idb-keyval', 'fuse.js', 'date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    target: 'ES2022',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'recharts'],
  },
})
