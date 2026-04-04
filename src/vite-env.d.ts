declare const __APP_VERSION__: string;

type Optional<T> = T | undefined;
type URLString = `http${string}`;
type BooleanString = 'true' | 'false';
type AppEnvMode = 'development' | 'staging' | 'production' | 'test';

interface ImportMetaEnv {
  // ===== CORE APP =====
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_ENV?: AppEnvMode;

  // ===== DEPLOYMENT & URLS =====
  readonly VITE_VERCEL_URL?: Optional<string>;
  readonly VITE_PUBLIC_URL?: Optional<URLString>;
  readonly VITE_API_BASE_URL?: Optional<URLString>;
  readonly VITE_REALTIME_URL?: Optional<URLString>;

  // ===== PERFORMANCE & BEHAVIOR =====
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_ENABLE_ANALYTICS?: BooleanString;
  readonly VITE_ENABLE_PWA?: BooleanString;
  readonly VITE_ENABLE_DEBUG?: BooleanString;
  readonly VITE_ENABLE_MOCK?: BooleanString;

  // ===== UI / THEMING =====
  readonly VITE_DEFAULT_THEME?: 'dark' | 'light' | 'system';

  // ===== ANALYTICS / MONITORING =====
  readonly VITE_GA_ID?: string;
  readonly VITE_SENTRY_DSN?: Optional<URLString>;

  // ===== BUILD INFO (Bawaan Vite) =====
  readonly MODE: 'development' | 'production' | 'test';
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
