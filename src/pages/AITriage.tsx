import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAppStore } from '@/store/useAppStore'
import { useConfigStore } from '@/lib/config'
import { useFeedback } from '@/services/feedback'
import { aiCircuit } from '@/lib/resilience'
import { aiCallLimiter } from '@/lib/security'
import { useHaptic } from '@/hooks'

import { Section, Panel } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'
import { cn } from '@/lib/utils'

interface TriageResult { 
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  color: string
  sigma: number
  dpmo: number
  recommendation: string
  actions: string[] 
}

interface HistoryItem {
  id: string
  problem: string
  timestamp: number
  result: TriageResult
}

const PRIORITY_COLORS: Record<string, string> = { 
  CRITICAL: T.red, 
  HIGH: T.yellow, 
  MEDIUM: T.orange, 
  LOW: T.green 
}

export default function AITriage() {
  const { company } = useAppStore()
  const { config }  = useConfigStore()
  const toast       = useFeedback()
  const { heavy, notification } = useHaptic()

  const [problem, setProblem] = useState('')
  const [context, setContext] = useState('')
  const [result, setResult]   = useState<TriageResult | null>(null)
  
  // Advanced Loading State
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Initializing...')
  
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    if (!loading) return
    const phases = ['Connecting to Neural Net...', 'Analyzing Process Data...', 'Running Six Sigma Models...', 'Generating Action Plan...']
    let i = 0
    setLoadingText(phases[0])
    const interval = setInterval(() => {
      i = Math.min(i + 1, phases.length - 1)
      setLoadingText(phases[i])
    }, 800)
    return () => clearInterval(interval)
  }, [loading])

  const copyToClipboard = useCallback(async (res: TriageResult) => {
    try {
      const text = `[${res.priority} PRIORITY] Sigma: ${res.sigma} | DPMO: ${res.dpmo}\nRecommendation: ${res.recommendation}\nActions:\n${res.actions.map(a => `- ${a}`).join('\n')}`
      await navigator.clipboard.writeText(text)
      notification('success')
      toast.success('Copied to clipboard', 'Action plan ready to share.')
    } catch (err) {
      toast.error('Copy failed', 'Please try selecting the text manually.')
    }
  }, [notification, toast])

  // ─── AI ANALYSIS ENGINE ───────────────────────────────────────────────
  const analyze = useCallback(async () => {
    heavy() 

    if (!problem.trim()) { 
      toast.error('Required', 'Please describe the problem first to begin triage.')
      return 
    }
    if (!aiCallLimiter.check()) { 
      toast.warning('Rate limit active', 'Cooling down cognitive cores. Wait a moment.')
      return 
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await aiCircuit.call(async () => {
        // PERHATIAN: Di production sungguhan, fetch ke Anthropic sebaiknya lewat backend/API Route
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            messages: [{
              role: 'user',
              content: `You are a Six Sigma Black Belt AI assistant for ${company.name} (${company.industry}).
Process: ${company.processName} | Baseline: ${company.baselineMean}±${company.baselineStdDev} ${company.processUnit} | Target: ${company.target}

Problem: ${problem}
${context ? `Context: ${context}` : ''}

Respond ONLY with valid JSON (no markdown):
{
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "sigma": <estimated_current_sigma_1-6>,
  "dpmo": <estimated_dpmo>,
  "recommendation": "<one sentence recommendation>",
  "actions": ["<action 1>","<action 2>","<action 3>","<action 4>"]
}`
            }]
          })
        })
        const data = await response.json()
        const text = data.content?.[0]?.text ?? ''
        return JSON.parse(text.replace(/```json|```/g, '').trim()) as TriageResult
      }, () => ({
        // Fallback jika API gagal/terblokir CORS
        priority: 'MEDIUM', sigma: 3.1, dpmo: 54000, color: T.yellow,
        recommendation: 'AI uplink timeout. Local heuristic suggests immediate process parameter review.',
        actions: ['Define exact problem boundary', 'Measure current defect rate manually', 'Isolate affected sub-processes', 'Implement standard containment']
      }))

      // Styling & State Update
      const final: TriageResult = { ...res, color: PRIORITY_COLORS[res.priority] ?? T.cyan }
      
      // Artificial delay untuk memastikan UX membaca loading minimal 1 detik
      await new Promise(r => setTimeout(r, 600)) 

      setResult(final)
      setHistory(prev => [{ id: crypto.randomUUID(), problem, timestamp: Date.now(), result: final }, ...prev].slice(0, 5))
      
      notification('success') // Haptic sukses
      toast.success('Analysis Complete', `Severity: ${final.priority}`)
    } catch (e) {
      toast.error('Neural Net Error', (e as Error).message)
      notification('error')
    } finally {
      setLoading(false)
    }
  }, [problem, context, company, toast, heavy, notification])

  // ─── RENDER ───────────────────────────────────────────────────────────
  return (
    <motion.div 
      {...(config.ui.animationsEnabled ? { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } } : {})}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <Section subtitle="Module 9 — AI-Powered" title="AI Triage Simulator" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* INPUT PANEL */}
        <Panel className="flex flex-col gap-5 border border-border/40 hover:border-border transition-colors">
          <Section subtitle="Telemetry Input" title="Problem Description" color={T.cyan} />
          
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-[0.6rem] font-mono text-ink-dim uppercase tracking-widest font-semibold ml-1">
                Primary Symptom
              </label>
              <textarea 
                value={problem} 
                onChange={e => setProblem(e.target.value)} 
                rows={4}
                className="w-full bg-bg border border-border rounded-lg text-ink font-sans text-sm p-3 focus:ring-1 focus:border-cyan transition-all resize-y custom-scrollbar"
                placeholder={`e.g. Resolution time exceeds ${company.target || 'target'} ${company.processUnit} for 20% of cases...`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.6rem] font-mono text-ink-dim uppercase tracking-widest font-semibold ml-1">
                Environmental Context (Optional)
              </label>
              <textarea 
                value={context} 
                onChange={e => setContext(e.target.value)} 
                rows={2}
                className="w-full bg-bg border border-border rounded-lg text-ink font-sans text-sm p-3 focus:ring-1 focus:border-cyan transition-all resize-y custom-scrollbar opacity-80 focus:opacity-100"
                placeholder="Recent parameter changes, affected user segments..."
              />
            </div>

            {/* ERROR FIX: hapticStyle dihapus dari komponen Button */}
            <Button 
              variant={loading ? "secondary" : "primary"} 
              loading={loading} 
              onClick={analyze} 
              size="md"
              className={cn("mt-2 transition-all duration-300", loading ? "border-cyan/50 text-cyan" : "")}
            >
              {loading ? loadingText : '◎ INITIATE TRIAGE SCAN'}
            </Button>
            
            <div className="flex justify-between items-center px-1">
              <div className="text-[0.55rem] font-mono text-ink-dim uppercase tracking-widest">
                API Core: {aiCallLimiter.remaining()} requests / min
              </div>
              {loading && (
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
              )}
            </div>
          </div>
        </Panel>

        {/* RESULTS PANEL */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div 
              key={result.recommendation} 
              initial={{ opacity: 0, x: 20, scale: 0.95 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Panel 
                className="relative overflow-hidden shadow-lg"
                style={{ borderLeft: `4px solid ${result.color}`, backgroundColor: `${result.color}05` }}
              >
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: result.color }} />

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex flex-col gap-1">
                    <span 
                      className="inline-flex items-center text-[0.65rem] font-mono font-bold px-2.5 py-1 rounded-sm border backdrop-blur-sm"
                      style={{ background: `${result.color}15`, borderColor: `${result.color}44`, color: result.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: result.color }} />
                      {result.priority} SEVERITY
                    </span>
                    <span className="text-[0.7rem] font-mono ml-1 mt-1" style={{ color: result.color }}>
                      Est. σ{result.sigma} · {numFormatter.format(result.dpmo)} DPMO
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => copyToClipboard(result)}
                    className="p-1.5 rounded hover:bg-border/50 text-ink-dim hover:text-ink transition-colors"
                    title="Copy Action Plan"
                  >
                    📋
                  </button>
                </div>

                <div className="relative z-10">
                  <p className="text-ink text-sm leading-relaxed mb-6 font-medium bg-bg/50 p-3 rounded-md border border-border/30">
                    "{result.recommendation}"
                  </p>

                  <div className="text-[0.6rem] font-mono text-ink-dim uppercase tracking-[0.15em] mb-3 ml-1 font-semibold">
                    Tactical Action Plan
                  </div>
                  <ol className="m-0 pl-0 flex flex-col gap-2">
                    {result.actions.map((action, i) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="flex items-start gap-3 text-sm text-ink-mid"
                      >
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-panel border border-border/60 text-[0.6rem] font-mono text-ink-dim mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </motion.li>
                    ))}
                  </ol>
                </div>
              </Panel>
            </motion.div>
          ) : (
             <Panel className="flex flex-col items-center justify-center h-full min-h-[300px] border-dashed border-2 border-border/30 opacity-60">
                <span className="text-4xl mb-3 opacity-30 grayscale">🧠</span>
                <span className="font-mono text-xs text-ink-dim uppercase tracking-widest text-center">
                  Neural engine idle.<br/>Awaiting triage parameters.
                </span>
             </Panel>
          )}
        </AnimatePresence>
      </div>

      {/* HISTORY PANEL */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Panel className="border border-border/20">
            <Section subtitle="Log Data" title="Recent Triage History" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => {
                    setResult(item.result)
                    heavy()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="flex flex-col text-left bg-panel hover:bg-border/20 border border-border/50 rounded-lg p-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span 
                      className="text-[0.6rem] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ color: item.result.color, backgroundColor: `${item.result.color}10` }}
                    >
                      {item.result.priority}
                    </span>
                    <span className="text-[0.55rem] font-mono text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="text-xs text-ink/80 font-sans line-clamp-2 leading-relaxed">
                    {item.problem}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </motion.div>
      )}
    </motion.div>
  )
}

const numFormatter = new Intl.NumberFormat('en-US')
