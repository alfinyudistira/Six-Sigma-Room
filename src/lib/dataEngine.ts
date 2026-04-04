import { store } from '@/store/store'
import { useAppStore } from '@/store/useAppStore'

const getCombinedState = () => ({
  redux: store.getState(),
  zustand: useAppStore.getState(),
})

export const dataEngine = {
  getState: getCombinedState,
  
  select: <T>(selector: (s: ReturnType<typeof getCombinedState>) => T): T => {
    return selector(getCombinedState())
  },
  
  updateCompany: (data: Partial<ReturnType<typeof useAppStore.getState>['company']>) => {
    useAppStore.getState().setCompany(data)
  }
}
