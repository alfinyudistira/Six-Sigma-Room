// src/hooks/useKeyboardNav.ts
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type TabId } from '@/store/useAppStore'
import { haptic } from '@/lib/utils'

const KEY_TAB_MAP: Record<string, TabId> = {
  '1': 'overview', '2': 'sigma',    '3': 'dmaic', '4': 'fmea',
  '5': 'copq',     '6': 'spc',      '7': 'pareto', '8': 'rootcause',
  '9': 'triage',   '0': 'universal', '-': 'ops', '=': 'settings',
}

export function useKeyboardNav() {
  const { setActiveTab, setShowApp, setShowCompanySetup, showCompanySetup } = useAppStore()
  const [, setSearchParams] = useSearchParams()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in a form field
      const tag = (e.target as HTMLElement).tagName
      const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
        (e.target as HTMLElement).isContentEditable
      if (isEditing) return
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const tabId = KEY_TAB_MAP[e.key]
      if (tabId && !e.repeat) {
        haptic.light()
        setActiveTab(tabId)
        setSearchParams({ tab: tabId }, { replace: true })
        return
      }

      if (e.key === 'Escape') {
        haptic.light()
        if (showCompanySetup) setShowCompanySetup(false)
        else setShowApp(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showCompanySetup, setActiveTab, setShowApp, setShowCompanySetup, setSearchParams])
}
