// src/hooks/useURLState.ts
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type TabId } from '@/store/useAppStore'

export function useURLState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { setActiveTab } = useAppStore()

  const syncFromURL = useCallback(() => {
    const tab = searchParams.get('tab') as TabId | null
    if (tab) setActiveTab(tab)
  }, [searchParams, setActiveTab])

  const pushTab = useCallback((tab: TabId) => {
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  return { syncFromURL, pushTab }
}
