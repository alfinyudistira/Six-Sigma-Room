// src/hooks/useHaptic.ts
import { useCallback } from 'react'
import { haptic } from '@/lib/utils'

export function useHaptic() {
  return {
    light:   useCallback(() => haptic.light(),   []),
    medium:  useCallback(() => haptic.medium(),  []),
    heavy:   useCallback(() => haptic.heavy(),   []),
    success: useCallback(() => haptic.success(), []),
    error:   useCallback(() => haptic.error(),   []),
    warning: useCallback(() => haptic.warning(), []),
  }
}
