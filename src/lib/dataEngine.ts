// src/lib/dataEngine.ts

import { store } from '@/store/store'
import { useAppStore } from '@/store/useAppStore'

type ReduxState = ReturnType<typeof store.getState>
type ZustandState = ReturnType<typeof useAppStore.getState>

export interface GlobalState {
  redux: ReduxState
  zustand: ZustandState
}

type Selector<T> = (state: GlobalState) => T

const createSnapshot = (): GlobalState => ({
  redux: store.getState(),
  zustand: useAppStore.getState(),
})

const selectorCache = new WeakMap<Function, unknown>()

function runSelectorWithCache<T>(selector: Selector<T>, state: GlobalState): T {
  if (selectorCache.has(selector)) {
    return selectorCache.get(selector) as T
  }
  const result = selector(state)
  if (typeof result !== 'object' || result === null || Object.isFrozen(result)) {
    selectorCache.set(selector, result)
  }
  return result
}

export const dataEngine = Object.freeze({
  getState: createSnapshot,
  select: <T>(selector: Selector<T>): T => {
    const state = createSnapshot()
    if (import.meta.env.DEV) {
      const start = performance.now()
      const result = runSelectorWithCache(selector, state)
      const duration = performance.now() - start
      if (duration > 2) {
        console.warn(
          `[dataEngine] ⚠️ Slow selector took ${duration.toFixed(2)}ms`,
          selector.toString().slice(0, 100)
        )
      }
      return result
    }
    return runSelectorWithCache(selector, state)
  },

  updateZustand: <K extends keyof ZustandState>(
    key: K,
    updater: Partial<ZustandState[K]> | ((prev: ZustandState[K]) => ZustandState[K])
  ): void => {
    const setter = useAppStore.getState()[key as keyof ZustandState]
    if (typeof setter === 'function') {
      ;(setter as any)(updater)
    } else {
      console.error(`[dataEngine] updateZustand: "${String(key)}" bukan setter function`)
    }
  },

  dispatchRedux: store.dispatch,

  actions: {
    company: {
      update: (data: Partial<ZustandState['company']>) => {
        useAppStore.getState().setCompany(data)
      },
      reset: () => {
        useAppStore.getState().resetCompany()
      },
    },
  },

  updateCompany: (data: Partial<ZustandState['company']>) => {
    dataEngine.actions.company.update(data)
  },

  subscribe: (
    listener: (current: GlobalState, previous: GlobalState) => void,
    options?: { fireImmediately?: boolean }
  ): (() => void) => {
    let lastState = createSnapshot()

    const emit = () => {
      const current = createSnapshot()
      listener(current, lastState)
      lastState = current
    }

    const unsubRedux = store.subscribe(emit)
    const unsubZustand = useAppStore.subscribe(emit)

    if (options?.fireImmediately) {
      emit()
    }

    return () => {
      unsubRedux()
      unsubZustand()
    }
  },

  batch: (fn: () => void): void => {
    fn()
  },

  resetAll: (): void => {
    store.dispatch({ type: 'RESET_ALL' }) // handle di root reducer kamu
    const zustandState = useAppStore.getState()
    if (typeof zustandState.reset === 'function') {
      zustandState.reset()
    } else {
      console.warn('[dataEngine] Zustand store tidak memiliki method reset()')
    }
    console.log('%c[dataEngine] ✅ All stores reset', 'color:#00FF9C;font-weight:bold')
  },

  getRawStores: () => ({
    redux: store,
    zustand: useAppStore,
  }),
} as const)

export const selectRedux = <T>(selector: (state: ReduxState) => T): T =>
  dataEngine.select((s) => selector(s.redux))

export const selectZustand = <T>(selector: (state: ZustandState) => T): T =>
  dataEngine.select((s) => selector(s.zustand))

export type { ReduxState, ZustandState, GlobalState }
