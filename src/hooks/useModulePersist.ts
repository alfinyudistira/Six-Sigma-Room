// src/hooks/useModulePersist.ts
import { useEffect, useRef } from 'react'
import { persist } from '@/lib/storage'

export function useModulePersist<T>(key: string, value: T, debounceMs = 800) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void persist(key, value)
    }, debounceMs)
    return () => clearTimeout(timerRef.current)
  }, [key, value, debounceMs])
}
