// src/hooks/useDebounce.ts

import { useState, useEffect, useRef, useCallback } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export const useDebounceValue = useDebounce

export interface DebouncedCallbackOptions {
  leading?: boolean
  maxWait?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flush: () => ReturnType<T> | undefined
  isPending: () => boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  wait: number = 300,
  options: DebouncedCallbackOptions = {},
): DebouncedFunction<T> {
  const { leading = false, maxWait } = options

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastInvokeTimeRef = useRef<number | null>(null)
  const lastArgsRef = useRef<Parameters<T> | null>(null)
  const pendingRef = useRef<boolean>(false)
  const fnRef = useRef<T>(fn)

  // Keep fnRef up to date without triggering re-renders
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const invoke = useCallback((): ReturnType<T> | undefined => {
    const args = lastArgsRef.current || ([] as unknown as Parameters<T>)
    lastArgsRef.current = null
    lastInvokeTimeRef.current = Date.now()
    // 🔥 PERBAIKAN: Jangan ubah pendingRef.current = false di sini!
    // Biarkan timer yang mematikannya agar debounce tetap mengunci input baru.
    return fnRef.current(...args)
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    lastArgsRef.current = null
    pendingRef.current = false
    lastInvokeTimeRef.current = null
  }, [])

  const flush = useCallback(() => {
    if (pendingRef.current && lastArgsRef.current) {
      const result = invoke()
      cancel()
      return result
    }
    cancel()
    return undefined
  }, [cancel, invoke])

  const isPending = useCallback(() => pendingRef.current, [])

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      const isFirstCall = !pendingRef.current

      lastArgsRef.current = args
      pendingRef.current = true

      // 1. Leading edge call
      if (leading && isFirstCall) {
        lastInvokeTimeRef.current = now
        invoke()
        
        // Setup cooldown timer
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          pendingRef.current = false
          // If called again during cooldown, trigger trailing
          if (lastArgsRef.current) invoke()
        }, wait)
        return
      }

      // 2. MaxWait logic
      if (maxWait !== undefined && lastInvokeTimeRef.current !== null) {
        if (now - lastInvokeTimeRef.current >= maxWait) {
          if (timerRef.current) clearTimeout(timerRef.current)
          invoke()
          lastInvokeTimeRef.current = now
        }
      }

      // 3. Normal trailing debounce
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        pendingRef.current = false
        if (lastArgsRef.current) invoke()
      }, wait)
    },
    [wait, leading, maxWait, cancel, invoke],
  )

  // Cleanup on unmount
  useEffect(() => cancel, [cancel])

  const result = debounced as DebouncedFunction<T>
  result.cancel = cancel
  result.flush = flush
  result.isPending = isPending
  
  return result
}
