// src/hooks/useURLState.ts
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type TabId } from '@/store/useAppStore'

const VALID_TABS: Set<string> = new Set([
  'overview', 'sigma', 'dmaic', 'fmea', 'copq',
  'spc', 'pareto', 'rootcause', 'triage', 'universal', 'ops', 'settings'
])

export function useURLState() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const setActiveTab = useAppStore((state) => state.setActiveTab)

  const syncFromURL = useCallback(() => {
    const tab = searchParams.get('tab')
    
    if (tab && VALID_TABS.has(tab)) {
      setActiveTab(tab as TabId)
    }
  }, [searchParams, setActiveTab])

  const pushTab = useCallback((tab: TabId) => {
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  return { syncFromURL, pushTab }
}
