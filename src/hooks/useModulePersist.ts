// src/hooks/useModulePersist.ts

import { useEffect, useRef, useCallback } from 'react'
import { persist } from '@/lib/storage'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export interface UseModulePersistOptions<T> {
  debounceMs?: number
  enabled?: boolean
  serializer?: (value: T) => string
  flushOnUnmount?: boolean
  onError?: (error: unknown) => void
}

/* --------------------------------------------------------------------------
   HOOK
   -------------------------------------------------------------------------- */
export function useModulePersist<T>(
  key: string,
  value: T,
  options: UseModulePersistOptions<T> = {},
) {
  const {
    debounceMs = 800,
    enabled = true,
    serializer = JSON.stringify, // 🔥 Default langsung pakai JSON.stringify
    flushOnUnmount = true,
    onError,
  } = options

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedRef = useRef<string | null>(null)
  const latestValueRef = useRef<T>(value)

  // Selalu simpan referensi nilai terbaru untuk keperluan flush saat unmount
  latestValueRef.current = value

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const doPersist = useCallback(
    async (val: T, serializedVal: string) => {
      try {
        await persist(key, val)
        lastSerializedRef.current = serializedVal
      } catch (err) {
        onError?.(err)
      }
    },
    [key, onError],
  )

  const flush = useCallback(async () => {
    if (!enabled) return
    clearTimer()
    
    const val = latestValueRef.current
    try {
      const serialized = serializer(val)
      // Hanya simpan jika string-nya benar-benar berubah (Fast Shallow Equal)
      if (serialized !== lastSerializedRef.current) {
        await doPersist(val, serialized)
      }
    } catch (err) {
      onError?.(err)
    }
  }, [enabled, clearTimer, serializer, doPersist, onError])

  const cancel = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  // 🔥 PERBAIKAN: Effect Utama (Auto-Save)
  useEffect(() => {
    if (!enabled) return

    let serialized: string
    try {
      serialized = serializer(value)
    } catch {
      return // Abaikan jika gagal serialize (misal ada circular reference)
    }

    // Hindari penyimpanan ulang jika nilai tidak berubah
    if (serialized === lastSerializedRef.current) return

    clearTimer()
    
    // Jadwalkan auto-save
    timerRef.current = setTimeout(() => {
      void doPersist(value, serialized)
    }, debounceMs)

    return clearTimer
  // 🔥 PERBAIKAN: `value` SEKARANG ADA DI DEPENDENCY ARRAY!
  }, [value, enabled, debounceMs, serializer, doPersist, clearTimer])

  // Flush atau Cancel saat komponen di-Unmount (misal user pindah tab)
  useEffect(() => {
    return () => {
      if (flushOnUnmount) {
        void flush()
      } else {
        cancel()
      }
    }
  }, [flushOnUnmount, flush, cancel])

  return { flush, cancel }
}
