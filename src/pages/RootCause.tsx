// src/pages/RootCause.tsx
/**
 * ============================================================================
 * ROOT CAUSE ANALYZER — FISHBONE (ISHIKAWA) & 5-WHY
 * ============================================================================
 */

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'

import { useAppDispatch, useAppSelector } from '@/store/store'
import {
  addRootCauseNode,
  deleteRootCauseNode,
  toggleNodeVerified,
  rootCauseSelectors, // 🔥 PERBAIKAN 1: Import selector untuk EntityState
  type RootCauseNode,
} from '@/store/moduleSlice'

import { useModulePersist, useHaptic } from '@/hooks'
import { feedback } from '@/lib/feedback' // 🔥 PERBAIKAN 2: Gunakan singleton feedback
import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { tokens as T } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   CONSTANTS & CONFIG
   -------------------------------------------------------------------------- */
const ISHIKAWA_CATEGORIES = ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment'] as const

const CAT_COLORS: Record<string, string> = {
  Man: T.cyan,
  Machine: T.yellow,
  Method: T.green,
  Material: T.orange,
  Measurement: '#9B8EC4', // Custom color for distinct visualization
  Environment: T.red,
}

/* --------------------------------------------------------------------------
   NODE ITEM COMPONENT (Di-ekstrak ke luar agar tidak re-render terus)
   -------------------------------------------------------------------------- */
interface NodeItemProps {
  node: RootCauseNode
  allNodes: RootCauseNode[]
  depth?: number
  onVerify: (id: string) => void
  onAddWhy: (id: string) => void
  onDelete: (id: string) => void
}

function NodeItem({ node, allNodes, depth = 0, onVerify, onAddWhy, onDelete }: NodeItemProps) {
  const children = allNodes.filter((n) => n.parentId === node.id)
  const color = node.category ? CAT_COLORS[node.category] ?? T.cyan : T.textMid

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }} className={cn(depth > 0 && "border-l border-border/50 pl-2")}>
      <div
        className="mb-1.5 flex items-center gap-2 rounded-lg border p-1.5 transition-all"
        style={{
          backgroundColor: node.verified ? `${T.green}1A` : 'transparent',
          borderColor: node.verified ? `${T.green}4D` : T.border,
        }}
      >
        <span
          className="shrink-0 font-mono text-[0.65rem] font-bold"
          style={{ color }}
        >
          {node.category ?? '↳'}
        </span>
        <span className="flex-1 font-sans text-xs" style={{ color: T.text }}>
          {node.text}
        </span>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100">
          <button
            onClick={() => onVerify(node.id)}
            className="rounded px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: node.verified ? T.green : 'transparent',
              borderColor: node.verified ? T.green : T.border,
              borderWidth: 1,
              color: node.verified ? T.bg : T.textDim,
            }}
          >
            {node.verified ? '✓ Verified' : 'Verify'}
          </button>
          <button
            onClick={() => onAddWhy(node.id)}
            className="rounded border border-cyan/30 bg-transparent px-1.5 py-0.5 font-mono text-[0.55rem] font-bold uppercase text-cyan transition-colors hover:bg-cyan/10"
            style={{ color: T.cyan }}
          >
            + Why
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="rounded border border-red/30 bg-transparent px-1.5 py-0.5 font-mono text-[0.55rem] font-bold text-red transition-colors hover:bg-red/10"
            style={{ color: T.red }}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Render anak-anaknya secara rekursif */}
      {children.map((c) => (
        <NodeItem
          key={c.id}
          node={c}
          allNodes={allNodes}
          depth={depth + 1}
          onVerify={onVerify}
          onAddWhy={onAddWhy}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function RootCause() {
  const dispatch = useAppDispatch()
  const { light, medium } = useHaptic()
  
  // 🔥 PERBAIKAN 3: Gunakan selector '.selectAll'
  const nodes = useAppSelector(rootCauseSelectors.selectAll)
  const rawState = useAppSelector(s => s.modules.rootCause)
  
  // Auto-save ke IndexedDB
  useModulePersist('rootcause_nodes', rawState)

  // ─── STATE ──────────────────────────────────────────────────────────────
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState<string>(ISHIKAWA_CATEGORIES[0])
  const [parent, setParent] = useState<string | null>(null)
  
  const [effect, setEffect] = useState('Problem Statement / Effect')
  const [editEffect, setEditEffect] = useState(false)

  // ─── DERIVED DATA ───────────────────────────────────────────────────────
  const rootNodes = useMemo(() => nodes.filter((n) => n.parentId === null), [nodes])
  const verifiedCount = useMemo(() => nodes.filter((n) => n.verified).length, [nodes])

  // ─── HANDLERS ───────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    if (!newText.trim()) {
      feedback.notifyWarning('Cause description is required')
      return
    }
    
    medium()
    dispatch(
      addRootCauseNode({
        id: `rc_${Date.now()}`,
        text: newText.trim(),
        parentId: parent,
        category: parent ? undefined : newCat, // Sub-cause (5-why) tidak punya kategori utama
        verified: false,
      })
    )
    
    setNewText('')
    setParent(null)
    feedback.notifySuccess('Cause added to diagram')
  }, [newText, parent, newCat, dispatch, medium])

  const handleVerify = useCallback((id: string) => {
    light()
    dispatch(toggleNodeVerified(id))
  }, [dispatch, light])

  const handleDelete = useCallback((id: string) => {
    medium()
    dispatch(deleteRootCauseNode(id))
  }, [dispatch, medium])

  const handleAddWhy = useCallback((id: string) => {
    light()
    setParent(id)
    // Scroll form into view (optional UX enhancement)
    document.getElementById('add-cause-form')?.scrollIntoView({ behavior: 'smooth' })
  }, [light])

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      <Section subtitle="Module 8 — Problem Solving" title="Root Cause Analyzer (Fishbone)" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Causes" value={nodes.length} color={T.cyan} />
        <KPICard label="Root Nodes" value={rootNodes.length} color={T.yellow} />
        <KPICard label="Verified Roots" value={verifiedCount} color={T.green} />
        <KPICard label="Unverified" value={nodes.length - verifiedCount} color={T.red} />
      </div>

      {/* Effect / Problem Statement Header */}
      <Panel
        className="flex items-center gap-4 border-l-4"
        style={{ borderColor: T.red, backgroundColor: `${T.red}0A` }}
      >
        <span className="shrink-0 font-mono text-[0.75rem] font-bold uppercase text-red" style={{ color: T.red }}>
          EFFECT:
        </span>
        {editEffect ? (
          <input
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            onBlur={() => setEditEffect(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditEffect(false)}
            autoFocus
            className="flex-1 rounded-md border bg-bg px-3 py-1.5 font-display text-sm font-bold text-ink focus:border-red focus:outline-none focus:ring-1 focus:ring-red/20"
            style={{ borderColor: T.border }}
          />
        ) : (
          <span
            onClick={() => setEditEffect(true)}
            className="flex-1 cursor-pointer border-b border-dashed border-border/50 font-display text-sm font-bold text-ink hover:text-red transition-colors"
          >
            {effect}
          </span>
        )}
      </Panel>

      {/* Ishikawa Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ISHIKAWA_CATEGORIES.map((cat) => {
          const catNodes = rootNodes.filter((n) => n.category === cat)
          const catColor = CAT_COLORS[cat]

          return (
            <Panel
              key={cat}
              className="flex flex-col gap-3 p-4"
              style={{ borderColor: `${catColor}40`, borderTopWidth: '3px' }}
            >
              <div className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: catColor }}>
                {cat}
              </div>
              
              <div className="flex flex-col gap-1">
                {catNodes.map((n) => (
                  <NodeItem
                    key={n.id}
                    node={n}
                    allNodes={nodes}
                    onVerify={handleVerify}
                    onAddWhy={handleAddWhy}
                    onDelete={handleDelete}
                  />
                ))}
                {catNodes.length === 0 && (
                  <div className="py-4 text-center font-mono text-[0.65rem] italic text-ink-dim/50">
                    No causes identified.
                  </div>
                )}
              </div>
            </Panel>
          )
        })}
      </div>

      {/* Add Cause Form */}
      <Panel id="add-cause-form" className="mt-4">
        <Section
          subtitle={parent ? '5-Why Drilldown' : 'Fishbone Branch'}
          title={parent ? 'Add Sub-cause (Why)' : 'Add Root Cause'}
          color={parent ? T.cyan : T.text}
        />

        {parent && (
          <div
            className="mb-4 flex items-center justify-between rounded-lg border px-4 py-2"
            style={{ backgroundColor: `${T.cyan}1A`, borderColor: `${T.cyan}40` }}
          >
            <span className="font-mono text-[0.65rem] font-bold" style={{ color: T.cyan }}>
              Adding child of: "{nodes.find((n) => n.id === parent)?.text}"
            </span>
            <button
              onClick={() => setParent(null)}
              className="font-mono text-[0.6rem] font-bold uppercase text-red hover:underline"
              style={{ color: T.red }}
            >
              ✕ Cancel 5-Why
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          {!parent && (
            <div className="w-full sm:w-48">
              <label className="mb-1.5 block font-mono text-[0.6rem] font-bold uppercase tracking-widest text-ink-dim">
                Category (6M)
              </label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full rounded-md border bg-bg px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1"
                style={{
                  borderColor: `${CAT_COLORS[newCat]}80`,
                  color: CAT_COLORS[newCat],
                }}
              >
                {ISHIKAWA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[240px]">
            <Input
              label="Cause Description"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
              placeholder="Why did this happen?"
            />
          </div>

          <Button variant="primary" onClick={handleAdd} haptic="medium" className="w-full sm:w-auto">
            {parent ? '+ Add Why' : '+ Add Cause'}
          </Button>
        </div>
      </Panel>
    </motion.div>
  )
}
