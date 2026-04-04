// src/pages/AITriage.tsx
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useConfigStore } from '@/lib/config'
import { useFeedback } from '@/services/feedback'
import { aiCircuit } from '@/lib/resilience'
import { aiCallLimiter } from '@/lib/security'
import { Section, Panel } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'

interface TriageResult { priority: string; color: string; sigma: number; dpmo: number; recommendation: string; actions: string[] }

export default function AITriage() {
  const { company } = useAppStore()
  const { config }  = useConfigStore()
  const toast       = useFeedback()
  const [problem, setProblem]  = useState('')
  const [context, setContext]  = useState('')
  const [result,  setResult]   = useState<TriageResult | null>(null)
  const [loading, setLoading]  = useState(false)
  const [history, setHistory]  = useState<{ problem:string; result:TriageResult }[]>([])

  const analyze = useCallback(async () => {
    if (!problem.trim()) { toast.error('Required','Describe the problem first'); return }
    if (!aiCallLimiter.check()) { toast.warning('Rate limit','Too many requests. Wait a moment.'); return }
    setLoading(true)
    try {
      const res = await aiCircuit.call(async () => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({
            model:'claude-sonnet-4-20250514',
            max_tokens:800,
            messages:[{
              role:'user',
              content:`You are a Six Sigma Black Belt AI assistant for ${company.name} (${company.industry}).
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
        return JSON.parse(text.replace(/```json|```/g,'').trim()) as TriageResult
      }, () => ({
        priority:'MEDIUM', sigma:3, dpmo:66807, color:T.yellow,
        recommendation:'AI temporarily unavailable. Based on your inputs, review process parameters and apply DMAIC.',
        actions:['Define problem scope','Measure current performance','Analyze data for patterns','Implement quick wins']
      }))

      const colors: Record<string,string> = { CRITICAL:T.red, HIGH:T.yellow, MEDIUM:T.orange, LOW:T.green }
      const final = { ...res, color: colors[res.priority] ?? T.cyan }
      setResult(final)
      setHistory(h => [{ problem, result:final }, ...h.slice(0,4)])
      toast.success('Analysis complete')
    } catch (e) {
      toast.error('Analysis failed', (e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [problem, context, company, toast])

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section subtitle="Module 9 — AI-Powered" title="AI Triage Simulator" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1rem' }}>
        <Panel>
          <Section subtitle="Input" title="Problem Description" />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div>
              <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>What is the problem?</label>
              <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={4}
                placeholder={`e.g. Resolution time exceeds ${company.usl} ${company.processUnit} for 20% of cases this week`}
                style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.8rem', padding:'0.6rem 0.75rem', resize:'vertical' }} />
            </div>
            <div>
              <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>Additional Context (optional)</label>
              <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
                placeholder="Recent changes, affected segment, data points…"
                style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.8rem', padding:'0.6rem 0.75rem', resize:'vertical' }} />
            </div>
            <Button variant="primary" loading={loading} onClick={analyze} hapticStyle="heavy" size="md">
              {loading ? 'Analyzing…' : '◎ AI Triage Analysis'}
            </Button>
            <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.52rem' }}>
              {aiCallLimiter.remaining()} AI calls remaining this minute
            </div>
          </div>
        </Panel>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={result.recommendation} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}>
              <Panel style={{ borderLeft:`3px solid ${result.color}` }}>
                <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1rem' }}>
                  <span style={{ background:`${result.color}15`, border:`1px solid ${result.color}44`, borderRadius:4, color:result.color, fontFamily:T.mono, fontSize:'0.6rem', fontWeight:700, padding:'0.25rem 0.65rem' }}>
                    {result.priority} PRIORITY
                  </span>
                  <span style={{ color:result.color, fontFamily:T.mono, fontSize:'0.65rem' }}>σ{result.sigma} · {result.dpmo} DPMO</span>
                </div>
                <p style={{ color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.82rem', lineHeight:1.7, margin:'0 0 1rem' }}>{result.recommendation}</p>
                <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'0.5rem' }}>Recommended Actions</div>
                <ol style={{ margin:0, paddingLeft:'1.25rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {result.actions.map((a,i) => (
                    <li key={i} style={{ color:T.textMid, fontFamily:'DM Sans, sans-serif', fontSize:'0.78rem' }}>{a}</li>
                  ))}
                </ol>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {history.length > 0 && (
        <Panel>
          <Section subtitle="History" title="Recent Analyses" />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {history.map((h,i) => (
              <button key={i} onClick={() => setResult(h.result)}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:'0.6rem 0.85rem', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                <div style={{ color:h.result.color, fontFamily:T.mono, fontSize:'0.58rem', marginBottom:'0.2rem' }}>{h.result.priority} PRIORITY</div>
                <div style={{ color:T.textMid, fontFamily:'DM Sans, sans-serif', fontSize:'0.75rem' }}>{h.problem.slice(0,80)}{h.problem.length>80?'…':''}</div>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </motion.div>
  )
}
