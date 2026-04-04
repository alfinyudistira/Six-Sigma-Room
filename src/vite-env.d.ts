/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_VERCEL_URL?: string
  readonly VITE_REALTIME_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
