// src/pages/Hero.tsx
import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { haptic } from '@/lib/utils'

const FEATURES = [
  { icon: 'σ', label: 'Sigma Calculator', desc: 'Ppk, DPMO, Cp, Yield' },
  { icon: '⊕', label: 'DMAIC Tracker',    desc: '5-phase task management' },
  { icon: '⚠', label: 'FMEA Scorer',      desc: 'RPN risk prioritization' },
  { icon: '$', label: 'COPQ Engine',       desc: 'Cost of poor quality' },
  { icon: '~', label: 'SPC Charts',        desc: 'I-MR + Western Electric' },
  { icon: '▌', label: 'Pareto Builder',   desc: '80/20 root analysis' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function Hero() {
  const { setShowApp, setShowCompanySetup } = useAppStore()

  const enter = useCallback(() => {
    haptic.success()
    setShowApp(true)
  }, [setShowApp])

  return (
    <div style={{
      minHeight: '100vh', background: '#050A0F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', position: 'relative', overflow: 'hidden',
    }}>

      {/* SVG background gradient + grid */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#050A0F" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#112233" strokeWidth="0.5" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#hero-glow)" />
      </svg>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ position: 'relative', zIndex: 1, maxWidth: 780, width: '100%', textAlign: 'center' }}
      >
        {/* Eyebrow */}
        <motion.div variants={item}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 999, padding: '0.3rem 1rem', marginBottom: '2rem',
            color: '#00D4FF', fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
            letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF9C', boxShadow: '0 0 8px #00FF9C', flexShrink: 0 }} />
            Six Sigma Black Belt Platform
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1 variants={item} style={{
          fontFamily: 'Syne, sans-serif', fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          fontWeight: 800, lineHeight: 1, margin: '0 0 1rem',
          letterSpacing: '-0.03em', color: '#E2EEF9',
        }}>
          DMAIC
          <span style={{
            display: 'block',
            background: 'linear-gradient(135deg, #00D4FF 0%, #00FF9C 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            WAR ROOM
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={item} style={{
          color: '#7A99B8', fontFamily: 'DM Sans, sans-serif', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
          maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.7,
        }}>
          End-to-end process improvement intelligence. From sigma calculations
          to live ops monitoring — built for Black Belts, readable by everyone.
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={item} style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <motion.button
            onClick={enter}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,212,255,0.25)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,156,0.1))',
              border: '1px solid rgba(0,212,255,0.4)',
              color: '#E2EEF9', padding: '0.85rem 2rem',
              fontFamily: 'Space Mono, monospace', fontSize: '0.75rem',
              letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 8,
              transition: 'all 0.2s',
            }}
          >
            ⚡ LAUNCH PLATFORM
          </motion.button>
          <motion.button
            onClick={() => { haptic.light(); setShowApp(true); setShowCompanySetup(true) }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'transparent', border: '1px solid #1A3A5C',
              color: '#7A99B8', padding: '0.85rem 1.5rem',
              fontFamily: 'Space Mono, monospace', fontSize: '0.75rem',
              letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 8,
              transition: 'all 0.2s',
            }}
          >
            ◈ Configure Company
          </motion.button>
        </motion.div>

        {/* Feature grid */}
        <motion.div variants={container} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
        }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              variants={item}
              whileHover={{ y: -2, borderColor: 'rgba(0,212,255,0.3)' }}
              style={{
                background: '#080E14', border: '1px solid #112233',
                borderRadius: 10, padding: '1rem',
                textAlign: 'left', transition: 'all 0.2s',
                cursor: 'default',
              }}
            >
              <div style={{ color: '#00D4FF', fontSize: '1.2rem', marginBottom: '0.4rem', fontFamily: 'Space Mono' }}>{f.icon}</div>
              <div style={{ color: '#E2EEF9', fontFamily: 'Syne, sans-serif', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>{f.label}</div>
              <div style={{ color: '#4A6785', fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem' }}>{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom label */}
        <motion.div variants={item} style={{ marginTop: '2.5rem', color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.1em' }}>
          PWA · OFFLINE READY · NO SERVER · YOUR DATA STAYS LOCAL
        </motion.div>
      </motion.div>
    </div>
  )
}
