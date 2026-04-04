// src/hooks/useCurrency.ts
import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { createCurrencyFmt } from '@/lib/utils'

export function useCurrency() {
  const currency = useAppStore(s => s.company.currency)
  return useMemo(() => createCurrencyFmt(currency), [currency])
}
