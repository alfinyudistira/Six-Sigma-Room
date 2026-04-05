// src/hooks/useOnboarding.ts

import { useEffect, useState, useCallback, useRef } from 'react'
import { retrieve, persist, type RetrieveFn, type PersistFn } from '@/lib/storage'
import { feedback } from '@/lib/feedback'

const ONBOARDING_BASE_KEY = 'seen_onboarding'
const ONBOARDING_VERSION = 2 // ⬅️ BUMP THIS WHEN ONBOARDING CHANGES
const STORAGE_KEY = `${ONBOARDING_BASE_KEY}_v${ONBOARDING_VERSION}` as const

interface OnboardingState {
  seen: boolean
  version: number
}

export interface UseOnboardingOptions {
  notifyOnFirstTime?: boolean
  storage?: {
    retrieve?: RetrieveFn
    persist?: PersistFn
  }
}

export function useOnboarding(options: UseOnboardingOptions = {}) {
  const { notifyOnFirstTime = false, storage } = options

  const retrieveFn = storage?.retrieve ?? retrieve
  const persistFn = storage?.persist ?? persist

  const [firstTime, setFirstTime] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const log = useCallback((...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log('%c[onboarding]', 'color: #00D4FF; font-weight: bold', ...args)
    }
  }, [])

  const markAsSeen = useCallback(async () => {
    try {
      const payload: OnboardingState = { seen: true, version: ONBOARDING_VERSION }
      await persistFn(STORAGE_KEY, payload, Infinity)

      if (mountedRef.current) setFirstTime(false)
      log('✅ Completed onboarding (v' + ONBOARDING_VERSION + ')')
    } catch (err) {
      console.warn('[onboarding] markAsSeen failed', err)
    }
  }, [persistFn, log])

  const resetOnboarding = useCallback(async () => {
    try {
      const payload: OnboardingState = { seen: false, version: 0 }
      await persistFn(STORAGE_KEY, payload, Infinity)

      if (mountedRef.current) setFirstTime(true)
      log('🔄 Reset onboarding → first-time user')
    } catch (err) {
      console.warn('[onboarding] resetOnboarding failed', err)
    }
  }, [persistFn, log])

  const forceShowOnboarding = useCallback(async () => {
    if (!import.meta.env.DEV) return
    await resetOnboarding()
  }, [resetOnboarding])

  useEffect(() => {
    mountedRef.current = true
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const check = async () => {
      try {
        const stored = await retrieveFn<OnboardingState | boolean>(
          STORAGE_KEY,
          { signal: abortController.signal },
        )

        if (abortController.signal.aborted) return

        let isFirst = true

        if (typeof stored === 'object' && stored !== null && 'seen' in stored && 'version' in stored) {
          isFirst = !stored.seen || stored.version !== ONBOARDING_VERSION
        } else if (typeof stored === 'boolean') {
          isFirst = stored !== true
        }

        if (mountedRef.current) {
          setFirstTime(isFirst)
          setIsLoading(false)

          if (isFirst) {
            log('👋 First-time or outdated onboarding detected (v' + ONBOARDING_VERSION + ')')
            if (notifyOnFirstTime) {
              try {
                // 🔥 PERBAIKAN 2: Panggil menggunakan objek `feedback`
                feedback.notifyInfo('Selamat datang! Mari kita setup workspace kamu.', { duration: 6000 })
              } catch {
                // silent fail
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        if (mountedRef.current) {
          setFirstTime(true)
          setIsLoading(false)
        }
        console.warn('[onboarding] Failed to retrieve state', err)
      }
    }

    void check()

    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [retrieveFn, notifyOnFirstTime, log])

  const debug = useCallback(async () => {
    if (!import.meta.env.DEV) return
    try {
      const raw = await retrieveFn(STORAGE_KEY)
      console.log('[onboarding debug]', raw)
    } catch (err) {
      console.warn('[onboarding debug] failed', err)
    }
  }, [retrieveFn])

  return {
    firstTime,
    isLoading,
    markAsSeen,
    resetOnboarding,
    forceShowOnboarding,
    debug,
    _meta: { key: STORAGE_KEY, version: ONBOARDING_VERSION },
  } as const
}
