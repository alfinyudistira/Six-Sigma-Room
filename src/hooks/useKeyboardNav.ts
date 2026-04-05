// src/hooks/useKeyboardNav.ts

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore, type TabId } from '@/store/useAppStore'
import { useHaptic } from '@/hooks/useHaptic'
import { useShallow } from 'zustand/react/shallow'

const DEFAULT_KEY_TAB_MAP: Record<string, TabId> = {
  '1': 'overview', '2': 'sigma', '3': 'dmaic', '4': 'fmea',
  '5': 'copq', '6': 'spc', '7': 'pareto', '8': 'rootcause',
  '9': 'triage', '0': 'universal', '-': 'ops', '=': 'settings',
} as const

export interface KeyboardNavOptions {
  enabled?: boolean
  keyMap?: Record<string, TabId>
  hapticFeedback?: boolean
  preventDefault?: boolean
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export function useKeyboardNav(options: KeyboardNavOptions = {}) {
  const {
    enabled = true,
    keyMap = DEFAULT_KEY_TAB_MAP,
    hapticFeedback = true,
    preventDefault = true,
  } = options

  const { setActiveTab, setShowApp, setShowCompanySetup, showCompanySetup } = useAppStore(
    useShallow((state) => ({
      setActiveTab: state.setActiveTab,
      setShowApp: state.setShowApp,
      setShowCompanySetup: state.setShowCompanySetup,
      showCompanySetup: state.showCompanySetup,
    })),
  )

  const [, setSearchParams] = useSearchParams()
  const { light: hapticLight } = useHaptic()

  const keyMapRef = useRef(keyMap)
  const hapticEnabledRef = useRef(hapticFeedback)
  const showCompanySetupRef = useRef(showCompanySetup)

  useEffect(() => { keyMapRef.current = keyMap }, [keyMap])
  useEffect(() => { hapticEnabledRef.current = hapticFeedback }, [hapticFeedback])
  useEffect(() => { showCompanySetupRef.current = showCompanySetup }, [showCompanySetup])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const mappedTab = keyMapRef.current[event.key]

      // --- Tab navigation ---
      if (mappedTab && !event.repeat) {
        if (preventDefault) {
          event.preventDefault()
          event.stopPropagation()
        }

        if (hapticEnabledRef.current) {
          try { hapticLight() } catch { /* ignore */ }
        }

        // Fungsi setter Zustand & React Router tidak butuh ref, aman dipanggil langsung
        setActiveTab(mappedTab)
        setSearchParams({ tab: mappedTab }, { replace: true })
        return
      }

      // --- Escape key ---
      if (event.key === 'Escape') {
        if (preventDefault) {
          event.preventDefault()
          event.stopPropagation()
        }

        if (hapticEnabledRef.current) {
          try { hapticLight() } catch { /* ignore */ }
        }

        if (showCompanySetupRef.current) {
          setShowCompanySetup(false)
        } else {
          setShowApp(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyDown)
    
  // Setter stabil tidak perlu masuk array, tapi kita patuh linter
  }, [enabled, preventDefault, hapticLight, setActiveTab, setSearchParams, setShowApp, setShowCompanySetup])
}
