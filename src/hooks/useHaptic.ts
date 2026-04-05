// src/hooks/useHaptic.ts

import { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useConfigStore } from '@/lib/config'
import { haptic as baseHaptic } from '@/lib/utils'

function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

function safeTrigger(fn: () => void, enabled: boolean): void {
  if (!enabled || !isHapticSupported()) return
  try {
    fn()
  } catch {
    // Silently fail – haptics are non‑critical UX enhancement
  }
}

export function useHaptic() {
  const hapticsEnabled = useConfigStore(
    useShallow((state) => state.config.ui.hapticsEnabled),
  )

  // Memoized callbacks – each depends only on `hapticsEnabled`
  const light = useCallback(() => {
    safeTrigger(baseHaptic.light, hapticsEnabled)
  }, [hapticsEnabled])

  const medium = useCallback(() => {
    safeTrigger(baseHaptic.medium, hapticsEnabled)
  }, [hapticsEnabled])

  const heavy = useCallback(() => {
    safeTrigger(baseHaptic.heavy, hapticsEnabled)
  }, [hapticsEnabled])

  const success = useCallback(() => {
    safeTrigger(baseHaptic.success, hapticsEnabled)
  }, [hapticsEnabled])

  const error = useCallback(() => {
    safeTrigger(baseHaptic.error, hapticsEnabled)
  }, [hapticsEnabled])

  const warning = useCallback(() => {
    safeTrigger(baseHaptic.warning, hapticsEnabled)
  }, [hapticsEnabled])

  const impact = useCallback(
    (level: 'low' | 'medium' | 'high') => {
      if (!hapticsEnabled || !isHapticSupported()) return
      try {
        switch (level) {
          case 'low':
            baseHaptic.light()
            break
          case 'medium':
            baseHaptic.medium()
            break
          case 'high':
            baseHaptic.heavy()
            break
        }
      } catch {
        // silent fail
      }
    },
    [hapticsEnabled],
  )

  const notify = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info') => {
      if (!hapticsEnabled || !isHapticSupported()) return
      try {
        switch (type) {
          case 'success':
            baseHaptic.success()
            break
          case 'error':
            baseHaptic.error()
            break
          case 'warning':
            baseHaptic.warning()
            break
          case 'info':
            baseHaptic.light()
            break
        }
      } catch {
        // silent fail
      }
    },
    [hapticsEnabled],
  )

  /**
   * Execute a custom vibration pattern.
   * @param pattern - A single number (ms) or an array of alternating vibration/pause durations.
   * @example pattern([200, 100, 200]) // vibrate 200ms, pause 100ms, vibrate 200ms
   */
  const pattern = useCallback(
    (vibrationPattern: number | number[]) => {
      if (!hapticsEnabled || !isHapticSupported()) return
      try {
        navigator.vibrate(vibrationPattern)
      } catch {
        // silent fail
      }
    },
    [hapticsEnabled],
  )

  // Alias for clarity
  const vibrate = pattern

  // Memoize the entire return object to keep the hook stable across renders
  return useMemo(
    () => ({
      /** Whether haptic feedback is enabled in user config */
      enabled: hapticsEnabled,
      /** Whether the device supports vibration (navigator.vibrate) */
      isSupported: isHapticSupported(),

      // Basic intensity patterns
      light,
      medium,
      heavy,
      success,
      error,
      warning,

      // Smart helpers
      impact,
      notify,

      // Custom patterns
      pattern,
      vibrate, // alias
    }),
    [
      hapticsEnabled,
      light,
      medium,
      heavy,
      success,
      error,
      warning,
      impact,
      notify,
      pattern,
    ],
  )
                     }
