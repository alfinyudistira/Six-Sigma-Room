// src/store/store.ts
/**
 * ============================================================================
 * REDUX STORE — CENTRAL STATE MANAGEMENT (SSOT)
 * ============================================================================
 */

import { configureStore, combineReducers, Middleware } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector, useStore } from 'react-redux'
import { enableMapSet } from 'immer'

// Enable Map and Set support in Immer
enableMapSet()

// ─── Reducers ─────────────────────────────────────────────────────
import moduleReducer from './moduleSlice'

const rootReducer = combineReducers({
  modules: moduleReducer,
})

/* --------------------------------------------------------------------------
   CUSTOM MIDDLEWARES (Top Tier dari A, disesuaikan ke Vite)
   -------------------------------------------------------------------------- */

/**
 * Performance monitoring middleware
 */
const performanceMiddleware: Middleware = (storeApi) => (next) => (action: any) => {
  if (!import.meta.env.DEV) return next(action)

  const startTime = performance.now()
  const result = next(action)
  const duration = performance.now() - startTime

  if (duration > 16) { // > 1 frame at 60fps
    console.warn(`[Redux] ⚠️ Slow action: ${action.type} (${duration.toFixed(2)}ms)`)
  }
  return result
}

/**
 * Error handling middleware
 */
const errorMiddleware: Middleware = () => (next) => (action) => {
  try {
    return next(action)
  } catch (error) {
    console.error('🚨 [Redux Error]:', error)
    console.error('Action:', action)
    throw error
  }
}

/* --------------------------------------------------------------------------
   STORE CONFIGURATION
   -------------------------------------------------------------------------- */

export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['modules/load/fulfilled', 'modules/save/fulfilled'],
        ignoredPaths: ['modules.currentData', 'modules.tempCache'],
      },
      immutableCheck: { warnAfter: 32 },
    }).concat(performanceMiddleware, errorMiddleware)

    return middleware
  },

  devTools: import.meta.env.DEV
    ? {
        name: 'Sigma War Room — Redux',
        trace: true,
        traceLimit: 50,
      }
    : false,
})

/* --------------------------------------------------------------------------
   TYPES & TYPED HOOKS
   -------------------------------------------------------------------------- */
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
export const useAppStore = () => useStore<RootState>()

/* --------------------------------------------------------------------------
   UTILITIES & SELECTORS
   -------------------------------------------------------------------------- */
export const selectModules = (state: RootState) => state.modules
export const getState = store.getState
export const dispatch = store.dispatch

/**
 * Reset global Redux state
 */
export function resetStore(): void {
  store.dispatch({ type: 'app/reset' })
}

// Export alias untuk konsistensi dataEngine
export type { RootState as ReduxRootState }
