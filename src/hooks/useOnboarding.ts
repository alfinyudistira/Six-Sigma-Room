import { useEffect, useState } from 'react'

export function useOnboarding() {
  const [firstTime, setFirstTime] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('seen_onboarding')

    if (!seen) {
      setFirstTime(true)
      localStorage.setItem('seen_onboarding', '1')
    }
  }, [])

  return { firstTime }
}
