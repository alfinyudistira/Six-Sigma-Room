// src/pages/Hero.tsx
/**
 * ============================================================================
 * HERO — LANDING PAGE / SPLASH SCREEN
 * ============================================================================
 */

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

import { useAppStore } from '@/store/useAppStore'
// 🔥 PERBAIKAN 1: Import dari barrel hooks
import { useHaptic } from '@/hooks'
import { tokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   FEATURES DATA
   -------------------------------------------------------------------------- */
const FEATURES = [
  { icon: 'σ', label: 'Sigma Calculator', desc: 'Ppk, DPMO, Cp, Yield' },
  { icon: '⊕', label: 'DMAIC Tracker', desc: '5-phase execution system' },
  { icon: '⚠', label: 'FMEA Scorer', desc: 'Risk prioritization (RPN)' },
  { icon: '$', label: 'COPQ Engine', desc: 'Cost of poor quality' },
  { icon: '~', label: 'SPC Charts', desc: 'Control charts + WE rules' },
  { icon: '▌', label: 'Pareto Builder', desc: '80/20 root cause analysis' },
] as const

/* --------------------------------------------------------------------------
   ANIMATION VARIANTS
   -------------------------------------------------------------------------- */
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

/* --------------------------------------------------------------------------
   FEATURE CARD COMPONENT
   -------------------------------------------------------------------------- */
function FeatureCard({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group relative overflow-hidden rounded-xl p-5 transition-all duration-300',
        'border bg-panel/40 backdrop-blur-md cursor-default'
      )}
      style={{ borderColor: `${tokens.borderHi}66` }} // 40% opacity hex
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(to top, ${tokens.cyan}1A, transparent, transparent)`
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-3 text-3xl font-mono" style={{ color: tokens.cyan }}>{icon}</div>
        <div className="font-display text-sm font-bold tracking-wide" style={{ color: tokens.text }}>{label}</div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-widest opacity-60" style={{ color: tokens.textDim }}>{desc}</div>
      </div>
    </motion.div>
  )
}

/* --------------------------------------------------------------------------
   MAIN HERO COMPONENT
   -------------------------------------------------------------------------- */
export default function Hero() {
  // 🔥 PERBAIKAN 2: Optimasi dengan useShallow
  const { setShowApp, setShowCompanySetup } = useAppStore(
    useShallow((s) => ({
      setShowApp: s.setShowApp,
      setShowCompanySetup: s.setShowCompanySetup,
    }))
  )
  
  const { light, success } = useHaptic()

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleLaunch = useCallback(() => {
    success()
    setShowApp(true)
  }, [success, setShowApp])

  const handleConfigure = useCallback(() => {
    light()
    setShowApp(true)
    setShowCompanySetup(true)
  }, [light, setShowApp, setShowCompanySetup])

  const features = useMemo(() => FEATURES, [])

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16"
      style={{ backgroundColor: tokens.bg }}
    >
      {/* ─── BACKGROUND EFFECTS ─────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(${tokens.border} 1px, transparent 1px),
            linear-gradient(90deg, ${tokens.border} 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ backgroundColor: `${tokens.cyan}1A` }} // 10% opacity hex
        aria-hidden="true"
      />

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-5xl text-center"
      >
        {/* Top Badge */}
        <motion.div variants={item} className="mb-8 flex justify-center">
          <div 
            className="inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em]"
            style={{ 
              borderColor: `${tokens.cyan}4D`, 
              backgroundColor: `${tokens.cyan}1A`, 
              color: tokens.cyan 
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full shadow-[0_0_8px_rgba(0,255,156,0.8)]" style={{ backgroundColor: tokens.green }} />
            SYSTEM ONLINE
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={item}
          className="font-display text-6xl font-black leading-[0.9] tracking-tighter sm:text-7xl md:text-8xl lg:text-[10rem]"
          style={{ color: tokens.text }}
        >
          DMAIC
          <span 
            className="block text-transparent bg-clip-text"
            style={{ 
              backgroundImage: `linear-gradient(to right, ${tokens.cyan}, ${tokens.green})` 
            }}
          >
            WAR ROOM
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl font-mono text-xs leading-relaxed tracking-widest sm:text-sm md:text-base opacity-70"
          style={{ color: tokens.textMid }}
        >
          ANALYZE. IMPROVE. CONTROL.
          <br className="hidden sm:block" />
          YOUR COMMAND CENTER FOR PROCESS EXCELLENCE.
        </motion.p>

        {/* Call to Action */}
        <motion.div
          variants={item}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLaunch}
            className="w-full sm:w-auto rounded-lg border-2 px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-all duration-300"
            style={{ 
              borderColor: tokens.cyan, 
              backgroundColor: `${tokens.cyan}1A`, 
              color: tokens.cyan,
              boxShadow: `0 0 20px ${tokens.cyan}33`
            }}
          >
            Launch Platform
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfigure}
            className="w-full sm:w-auto rounded-lg border-2 px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest transition-all duration-300"
            style={{ 
              borderColor: tokens.border, 
              color: tokens.textDim 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.cyan;
              e.currentTarget.style.color = tokens.cyan;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.border;
              e.currentTarget.style.color = tokens.textDim;
            }}
          >
            Configure Profile
          </motion.button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={container}
          className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6"
        >
          {features.map((f) => (
            <FeatureCard key={f.label} {...f} />
          ))}
        </motion.div>

        {/* Footer Note */}
        <motion.div
          variants={item}
          className="mt-16 font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-40"
          style={{ color: tokens.textDim }}
        >
          LOCAL-FIRST DATA ARCHITECTURE · PWA READY
        </motion.div>
      </motion.div>
    </main>
  )
}
