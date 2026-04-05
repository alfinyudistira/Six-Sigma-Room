// src/components/onboarding/Onboarding.tsx
// ─── Onboarding / Discoverability Layer ───────────────────────────────────────

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '@/lib/utils'
import { useOnboarding } from '@/hooks'
import { tokens } from '@/lib/tokens'

// ─── Step definitions ─────────────────────────────────────────────────────────
interface OnboardingStep {
  id: string
  title: string
  body: string
  targetSelector?: string | undefined
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | undefined
  action?: string | undefined
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to DMAIC War Room',
    body: "A professional Six Sigma analytics platform. Built for Black Belts, usable by anyone. Let's take a 60-second tour.",
    position: 'center',
    action: 'Start Tour',
  },
  {
    id: 'company',
    title: '⚡ Set Up Your Company',
    body: 'Click the company badge in the header to configure your organization — process name, spec limits, currency, and more. Every module adapts automatically.',
    targetSelector: '[data-onboarding="company-badge"]',
    position: 'bottom',
    action: 'Got it',
  },
  {
    id: 'navigation',
    title: '◈ Navigate Modules',
    body: 'Use the tab bar to switch between modules. Each module is independent but shares your company data. Press 1–9 on your keyboard for quick switching.',
    targetSelector: '[role="navigation"]',
    position: 'bottom',
    action: 'Next',
  },
  {
    id: 'overview',
    title: 'σ Start with Overview',
    body: 'The Overview module shows your current sigma level, DPMO, Ppk, and COPQ at a glance. All values update automatically when you change your company settings.',
    position: 'center',
    action: 'Next',
  },
  {
    id: 'demo',
    title: '◈ Pulse Digital Demo',
    body: 'You\'re currently viewing demo data from "Pulse Digital" — a fictional tech support company. Replace it with your own data via the Company Setup.',
    position: 'center',
    action: 'Next',
  },
  {
    id: 'done',
    title: "🚀 You're Ready",
    body: 'Explore all 11 modules — from FMEA risk scoring to SPC charts and AI-powered triage. Your data is saved locally and never leaves your device.',
    position: 'center',
    action: 'Get Started',
  },
]

// ─── Spotlight highlight ───────────────────────────────────────────────────────
// Perbaikan 2: Samakan tipe data prop selector dengan interface OnboardingStep
function Spotlight({ selector }: { selector?: string | undefined }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }
    const timer = setTimeout(() => {
      const el = document.querySelector(selector)
      if (el) {
        setRect(el.getBoundingClientRect())
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [selector])

  if (!rect) return null

  const pad = 8
  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none',
        background: 'rgba(0,0,0,0.6)',
        WebkitMaskImage: `radial-gradient(ellipse ${rect.width + pad * 2}px ${rect.height + pad * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 100%, black 100%)`,
        maskImage: `radial-gradient(ellipse ${rect.width + pad * 2}px ${rect.height + pad * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 100%, black 100%)`,
      }}
    />,
    document.body,
  )
}

// ─── Main onboarding overlay ──────────────────────────────────────────────────
export function OnboardingOverlay() {
  const { firstTime, isLoading, markAsSeen } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(0)

  if (isLoading || !firstTime) return null

  const step = STEPS[currentStep]
  if (!step) return null

  const isLast = currentStep === STEPS.length - 1
  const isCenter = !step.targetSelector || step.position === 'center'

  const next = () => {
    haptic.light()
    if (isLast) {
      markAsSeen()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const skip = () => {
    haptic.light()
    markAsSeen()
  }

  return createPortal(
    <>
      <Spotlight selector={step.targetSelector} />

      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99991 }}
        onClick={skip}
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -6 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          style={{
            position: 'fixed',
            ...(isCenter
              ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
              : { bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }),
            zIndex: 99992,
            background: '#080E14',
            border: '1px solid #1A3A5C',
            borderRadius: 12,
            padding: '1.5rem',
            maxWidth: 400,
            width: 'calc(100vw - 2rem)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.1)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStep ? 16 : 6, height: 6, borderRadius: 3,
                    background: i === currentStep ? (tokens as any).cyan : i < currentStep ? (tokens as any).green : '#112233',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <button
              onClick={skip}
              style={{
                background: 'transparent', border: 'none', color: '#4A6785',
                fontFamily: 'Space Mono, monospace', fontSize: '0.58rem',
                cursor: 'pointer', letterSpacing: '0.08em',
              }}
            >
              SKIP TOUR
            </button>
          </div>

          <h2
            id="onboarding-title"
            style={{ color: '#E2EEF9', fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.6rem' }}
          >
            {step.title}
          </h2>
          <p style={{ color: '#7A99B8', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', lineHeight: 1.7, margin: '0 0 1.25rem' }}>
            {step.body}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <motion.button
              onClick={next}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,156,0.1))',
                border: '1px solid rgba(0,212,255,0.4)',
                color: '#E2EEF9', padding: '0.5rem 1.25rem', borderRadius: 6,
                fontFamily: 'Space Mono, monospace', fontSize: '0.68rem',
                letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              {step.action ?? 'Next'} {!isLast && '→'}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body,
  )
}
