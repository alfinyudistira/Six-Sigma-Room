// ─── CENTRAL DATA ENGINE (SSOT CORE) ─────────────────────────────

import { store } from '@/store/store'
import { useAppStore } from '@/store/useAppStore'

export const dataEngine = {
  getState: () => ({
    redux: store.getState(),
    zustand: useAppStore.getState(),
  }),

  // unified selector
  select: <T>(selector: (s: ReturnType<typeof dataEngine.getState>) => T): T => {
    return selector(dataEngine.getState())
  },

  // unified update (future-proof)
  updateCompany: (data: Partial<ReturnType<typeof useAppStore.getState>['company']>) => {
    useAppStore.getState().setCompany(data)
  },
}
