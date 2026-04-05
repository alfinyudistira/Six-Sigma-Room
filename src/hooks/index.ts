// src/hooks/index.ts

export { useCurrency } from './useCurrency'
export { useHaptic } from './useHaptic'
export { useKeyboardNav } from './useKeyboardNav'
export { useOnboarding } from './useOnboarding'

export { useDebounce, useDebouncedCallback, useDebounceValue } from './useDebounce'
export { useModulePersist } from './useModulePersist'

export { useURLState } from './useURLState'

export {
  useRealtime,
  useRealtimeEvent,
  useRealtimeSelector,
} from '@/providers/RealtimeProvider'

export { useI18n } from '@/providers/I18nProvider'

export type {
  DebouncedFunction,
  DebouncedCallbackOptions,
} from './useDebounce'

export type {
  UseModulePersistOptions,
} from './useModulePersist'

export type {
  KeyboardNavOptions,
} from './useKeyboardNav'

export type {
  UseOnboardingOptions,
} from './useOnboarding'

if (import.meta.env.DEV) {
  console.log(
    '%c[hooks] 📦 Barrel exports ready — useCurrency, useDebounce, useOnboarding, useRealtime, useI18n, …',
    'color: #00D4FF',
  )
}
