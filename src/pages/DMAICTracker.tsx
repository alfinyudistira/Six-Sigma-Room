// src/pages/DMAICTracker.tsx
/**
 * ============================================================================
 * DMAIC TRACKER — TASK MANAGEMENT FOR DMAIC PHASES
 * ============================================================================
 */

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store/store'
import {
  addDMAICTask,
  updateDMAICTask,
  deleteDMAICTask,
  dmaicSelectors, // 🔥 PERBAIKAN 1: Import selector untuk EntityState
  type DMAICTask,
  type DMAICPhase,
} from '@/store/moduleSlice'
import { useAppStore } from '@/store/useAppStore'
import { useModulePersist } from '@/hooks'
import { feedback } from '@/lib/feedback'
import { useHaptic } from '@/hooks'
import { useConfigStore } from '@/lib/config'
import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { Modal, useModal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { tokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   CONSTANTS
   -------------------------------------------------------------------------- */
const PHASES: DMAICPhase[] = ['define', 'measure', 'analyze', 'improve', 'control']
const STATUS_OPTIONS: DMAICTask['status'][] = ['not-started', 'in-progress', 'complete', 'blocked']

const PHASE_LABELS: Record<DMAICPhase, string> = {
  define: 'Define',
  measure: 'Measure',
  analyze: 'Analyze',
  improve: 'Improve',
  control: 'Control',
}

const STATUS_LABELS: Record<DMAICTask['status'], string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  complete: 'Complete',
  blocked: 'Blocked',
}

/* --------------------------------------------------------------------------
   STATS COMPUTATION
   -------------------------------------------------------------------------- */
function computeStats(tasks: DMAICTask[]) {
  const total = tasks.length
  const complete = tasks.filter((t) => t.status === 'complete').length
  const blocked = tasks.filter((t) => t.status === 'blocked').length

  const phasePct = Object.fromEntries(
    PHASES.map((phase) => {
      const phaseTasks = tasks.filter((t) => t.phase === phase)
      const completed = phaseTasks.filter((t) => t.status === 'complete').length
      return [phase, phaseTasks.length ? Math.round((completed / phaseTasks.length) * 100) : 0]
    })
  )

  return {
    total,
    complete,
    blocked,
    pct: total ? Math.round((complete / total) * 100) : 0,
    phasePct,
  }
}

/* --------------------------------------------------------------------------
   TASK CARD COMPONENT
   -------------------------------------------------------------------------- */
function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: DMAICTask
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: DMAICTask['status']) => void
}) {
  const { light } = useHaptic()
  const statusColor = {
    complete: tokens.green,
    'in-progress': tokens.cyan,
    'not-started': tokens.textDim,
    blocked: tokens.red,
  }[task.status]

  return (
    <Panel className="p-4 transition-all hover:border-cyan/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-ink">{task.task}</span>
            <span className="rounded bg-bg px-2 py-0.5 text-[0.6rem] font-mono font-bold uppercase tracking-wider" style={{ color: statusColor }}>
              {STATUS_LABELS[task.status]}
            </span>
          </div>
          {task.notes && (
            <div className="mt-2 text-xs text-ink-dim line-clamp-2">{task.notes}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-[0.65rem] font-mono uppercase tracking-widest text-ink-dim">
            {task.owner && <span>👤 {task.owner}</span>}
            {task.dueDate && <span>📅 {task.dueDate}</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={task.status}
            onChange={(e) => {
              light()
              onStatusChange(e.target.value as DMAICTask['status'])
            }}
            className="rounded border border-border bg-bg px-2 py-1 font-mono text-[0.6rem] font-bold uppercase text-ink focus:border-cyan focus:outline-none"
            aria-label="Task status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button size="xs" variant="ghost" onClick={onEdit}>
            EDIT
          </Button>
          <ConfirmButton
            variant="danger"
            label="✕"
            size="sm"
            message="Delete this task?"
            onConfirm={onDelete}
          />
        </div>
      </div>
    </Panel>
  )
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function DMAICTracker() {
  const dispatch = useAppDispatch()
  
  // 🔥 PERBAIKAN 2: Gunakan selector '.selectAll' untuk mengekstrak array DMAICTask[] dari EntityState
  const tasks = useAppSelector(dmaicSelectors.selectAll)
  
  const company = useAppStore((s) => s.company)
  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  // Persist tasks (State aslinya tetap dari store.modules.dmaic)
  const rawState = useAppSelector((s) => s.modules.dmaic)
  useModulePersist('dmaic_tasks', rawState, { debounceMs: 800 })

  const [activePhase, setActivePhase] = useState<DMAICPhase | 'all'>('all')
  const { isOpen: modalOpen, open: openModal, close: closeModal } = useModal()
  const [editId, setEditId] = useState<string | null>(null)
  
  const [draft, setDraft] = useState<Omit<DMAICTask, 'id'>>({
    phase: 'define',
    task: '',
    owner: '',
    dueDate: '',
    status: 'not-started',
    notes: '',
  })

  const stats = useMemo(() => computeStats(tasks), [tasks])
  const filteredTasks = useMemo(
    () => (activePhase === 'all' ? tasks : tasks.filter((t) => t.phase === activePhase)),
    [tasks, activePhase]
  )
  const animated = config.ui.animationsEnabled

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    light()
    setDraft({
      phase: activePhase !== 'all' ? activePhase : 'define',
      task: '',
      owner: '',
      dueDate: '',
      status: 'not-started',
      notes: '',
    })
    setEditId(null)
    openModal()
  }, [light, openModal, activePhase])

  const openEdit = useCallback(
    (task: DMAICTask) => {
      light()
      const { id, ...rest } = task
      setDraft({
        phase: rest.phase,
        task: rest.task,
        owner: rest.owner || '',
        dueDate: rest.dueDate || '',
        status: rest.status,
        notes: rest.notes || '',
      })
      setEditId(id)
      openModal()
    },
    [light, openModal]
  )

  const handleSave = useCallback(() => {
    if (!draft.task.trim()) {
      feedback.notifyError('Task description required')
      return
    }
    medium()
    if (editId) {
      dispatch(updateDMAICTask({ ...draft, id: editId }))
      feedback.notifySuccess('Task updated')
    } else {
      dispatch(addDMAICTask({ ...draft, id: crypto.randomUUID() }))
      feedback.notifySuccess('Task added')
    }
    success()
    closeModal()
    setEditId(null)
  }, [draft, editId, dispatch, medium, success, closeModal])

  const handleDelete = useCallback(
    (id: string) => {
      medium()
      dispatch(deleteDMAICTask(id))
      feedback.notifySuccess('Task deleted')
    },
    [dispatch, medium]
  )

  const handleStatusChange = useCallback(
    (task: DMAICTask, newStatus: DMAICTask['status']) => {
      light()
      dispatch(updateDMAICTask({ ...task, status: newStatus }))
    },
    [dispatch, light]
  )

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      {/* Header */}
      <Section
        subtitle="Module 3 — Project Management"
        title={`DMAIC Tracker — ${company.processName || 'Process Improvement'}`}
        action={
          <Button variant="primary" onClick={openCreate} icon="+">
            Add Task
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Tasks" value={stats.total} color={tokens.cyan} />
        <KPICard label="Completed" value={stats.complete} color={tokens.green} />
        <KPICard label="Blocked" value={stats.blocked} color={tokens.red} />
        <KPICard label="Progress" value={`${stats.pct}%`} color={tokens.yellow} />
      </div>

      {/* Phase Filter Buttons */}
      <div className="flex flex-wrap gap-2 rounded-lg bg-panel p-2 border border-border">
        <button
          onClick={() => setActivePhase('all')}
          className={cn(
            'rounded-md px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all',
            activePhase === 'all'
              ? 'bg-cyan text-bg'
              : 'text-ink-dim hover:bg-white/5 hover:text-ink'
          )}
          style={activePhase === 'all' ? { backgroundColor: tokens.cyan, color: tokens.bg } : {}}
        >
          All Phases
        </button>
        {PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(activePhase === phase ? 'all' : phase)}
            className={cn(
              'rounded-md px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all',
              activePhase === phase
                ? 'bg-cyan text-bg'
                : 'text-ink-dim hover:bg-white/5 hover:text-ink'
            )}
            style={activePhase === phase ? { backgroundColor: tokens.cyan, color: tokens.bg } : {}}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={animated ? { opacity: 0, scale: 0.98 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={animated ? { opacity: 0, scale: 0.98 } : false}
              transition={{ duration: 0.2 }}
            >
              <TaskCard
                task={task}
                onEdit={() => openEdit(task)}
                onDelete={() => handleDelete(task.id)}
                onStatusChange={(status) => handleStatusChange(task, status)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredTasks.length === 0 && (
          <div className="py-16 text-center">
            <div className="font-mono text-4xl opacity-20 mb-4 text-cyan">∅</div>
            <div className="text-ink-dim font-mono text-sm uppercase tracking-widest font-bold">
              No tasks in this phase
            </div>
            <div className="text-xs text-ink-dim/50 mt-2">Click "Add Task" to get started</div>
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editId ? 'Edit Task' : 'New Task'}
        subtitle="DMAIC PHASE"
        maxWidth={560}
      >
        <div className="flex flex-col gap-5">
          <Select
            label="Phase"
            value={draft.phase}
            onChange={(e) => setDraft((d) => ({ ...d, phase: e.target.value as DMAICPhase }))}
            options={PHASES.map((p) => ({ value: p, label: PHASE_LABELS[p] }))}
          />
          <Input
            label="Task Description"
            value={draft.task}
            onChange={(e) => setDraft((d) => ({ ...d, task: e.target.value }))}
            placeholder="e.g., Define project charter"
            required
          />
          <Textarea
            label="Notes"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Additional details..."
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Owner"
              value={draft.owner}
              onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
              placeholder="Assignee name"
            />
            <Input
              label="Due Date"
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editId ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
