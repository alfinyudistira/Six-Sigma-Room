// src/pages/FMEAScorer.tsx
/**
 * ============================================================================
 * FMEA SCORER — FAILURE MODE & EFFECTS ANALYSIS
 * ============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

import { useAppDispatch, useAppSelector } from '@/store/store'
import {
  addFMEARow,
  updateFMEARow,
  deleteFMEARow,
  fmeaSelectors,
  type FMEARow,
} from '@/store/moduleSlice'

import { useConfigStore, getRpnSeverity } from '@/lib/config'
import { calcRPN } from '@/lib/sigma'
import { feedback } from '@/lib/feedback'
import { useModulePersist, useHaptic } from '@/hooks'

import { Section, Panel, SimpleBarChart, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, Slider, Textarea } from '@/components/ui/Input'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV, cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   ENGINE LOGIC
   -------------------------------------------------------------------------- */
function computeFMEAStats(rows: FMEARow[], config: any) {
  // Perbaikan: Safety check untuk objek config.fmea
  const fmeaCfg = config?.fmea || { criticalRpn: 200, highRpn: 100 }
  
  if (!rows.length) return { critical: 0, high: 0, avg: 0, max: 0, closed: 0 }

  const total = rows.length
  const critical = rows.filter((r) => r.rpn >= fmeaCfg.criticalRpn).length
  const high = rows.filter((r) => r.rpn >= fmeaCfg.highRpn && r.rpn < fmeaCfg.criticalRpn).length

  const avg = rows.reduce((a, r) => a + r.rpn, 0) / total
  const max = Math.max(...rows.map((r) => r.rpn))
  const closed = rows.filter((r) => r.status === 'closed').length

  return { critical, high, avg, max, closed }
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function FMEAScorer() {
  const dispatch = useAppDispatch()
  const rows = useAppSelector(fmeaSelectors.selectAll)
  const rawState = useAppSelector((s) => s.modules.fmea)
  useModulePersist('fmea_rows', rawState)

  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  // ─── STATE ─────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rpn', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [draft, setDraft] = useState<Omit<FMEARow, 'id'>>({
    process: '',
    failureMode: '',
    effect: '',
    cause: '',
    severity: 5,
    occurrence: 5,
    detection: 5,
    rpn: 125,
    action: '',
    owner: '',
    dueDate: '',
    status: 'open',
  })

  // ─── DERIVED ───────────────────────────────────────────────────────────
  const stats = useMemo(() => computeFMEAStats(rows, config), [rows, config])

  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.rpn - a.rpn)
      .slice(0, 10)
      .map((r) => ({
        name: r.failureMode || 'Unknown',
        rpn: r.rpn,
      }))
  }, [rows])

  // ─── ACTIONS ───────────────────────────────────────────────────────────
  const openNew = useCallback(() => {
    light()
    setDraft({
      process: '', failureMode: '', effect: '', cause: '',
      severity: 5, occurrence: 5, detection: 5, rpn: 125,
      action: '', owner: '', dueDate: '', status: 'open',
    })
    setEditId(null)
    setModalOpen(true)
  }, [light])

  const openEdit = useCallback((r: FMEARow) => {
    light()
    const { id, ...rest } = r
    setDraft(rest)
    setEditId(id)
    setModalOpen(true)
  }, [light])

  const handleFieldChange = useCallback((k: keyof typeof draft, v: any) => {
    setDraft((prev) => {
      const next = { ...prev, [k]: v }
      if (['severity', 'occurrence', 'detection'].includes(k)) {
        next.rpn = calcRPN(next.severity, next.occurrence, next.detection)
      }
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    if (!draft.failureMode.trim()) {
      feedback.notifyError('Failure Mode is required')
      return
    }

    medium()
    if (editId) {
      dispatch(updateFMEARow({ ...draft, id: editId }))
      feedback.notifySuccess('FMEA row updated')
    } else {
      dispatch(addFMEARow({ ...draft, id: crypto.randomUUID() }))
      feedback.notifySuccess('FMEA row added')
    }

    success()
    setModalOpen(false)
    setEditId(null)
  }, [draft, editId, dispatch, medium, success])

  const handleDelete = useCallback((id: string) => {
    medium()
    dispatch(deleteFMEARow(id))
    feedback.notifySuccess('Row deleted')
  }, [dispatch, medium])

  const handleExport = useCallback(() => {
    light()
    // Perbaikan: Casting rows ke any[] agar diterima oleh downloadCSV
    const exportData = rows as any[]
    const ok = downloadCSV(exportData, 'fmea-export.csv')
    if (ok) feedback.notifySuccess('Exported to CSV')
  }, [rows, light])

  // ─── COLUMNS ───────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<FMEARow>[]>(
    () => [
      { accessorKey: 'process', header: 'Process', cell: (i) => i.getValue() || '-' },
      {
        accessorKey: 'failureMode',
        header: 'Failure Mode',
        cell: (info) => (
          <div className="font-bold text-ink max-w-[200px] truncate" title={info.getValue<string>()}>
            {info.getValue<string>()}
          </div>
        ),
      },
      {
        accessorKey: 'rpn',
        header: 'RPN',
        cell: (info) => {
          const val = info.getValue<number>()
          const sev = getRpnSeverity(val, config)
          return (
            <div className="font-mono text-sm font-bold" style={{ color: sev.color }}>
              {val}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const val = info.getValue<FMEARow['status']>()
          return <Badge label={val} color={val === 'closed' ? 'green' : val === 'in-progress' ? 'cyan' : 'yellow'} />
        },
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex items-center justify-end gap-2">
            <Button size="xs" variant="ghost" onClick={() => openEdit(info.row.original)}>
              Edit
            </Button>
            <ConfirmButton
              label="✕"
              variant="danger"
              size="xs"
              message="Delete row?"
              onConfirm={() => handleDelete(info.row.original.id)}
            />
          </div>
        ),
      },
    ],
    [config, openEdit, handleDelete]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // ─── RENDER ────────────────────────────────────────────────────────────
  // Perbaikan: Gunakan boolean false untuk animasi jika disabled (menghindari undefined)
  const animProps = config.ui.animationsEnabled 
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
    : { initial: false, animate: false }

  return (
    <motion.div
      {...animProps}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      <Section
        subtitle="Module 4 — Risk Analysis"
        title="FMEA Scorer"
        action={
          <div className="flex gap-2">
            <Button variant="outline" icon="↓" onClick={handleExport}>
              Export
            </Button>
            <Button variant="primary" icon="+" onClick={openNew}>
              Add Row
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KPICard label="Total Risks" value={rows.length} color={T.cyan} />
        <KPICard label="Critical" value={stats.critical} color={T.red} />
        <KPICard label="High" value={stats.high} color={T.orange} />
        <KPICard label="Avg RPN" value={stats.avg.toFixed(1)} color={T.yellow} />
        <KPICard label="Closed" value={stats.closed} color={T.green} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-4">
          <Section subtitle="Top 10" title="Highest RPN" color={T.red} />
          <SimpleBarChart
            data={chartData}
            xKey="name"
            bars={[{ key: 'rpn', color: T.red, label: 'RPN Score' }]}
            height={280}
            referenceLines={[
              { value: (config as any).fmea?.criticalRpn || 200, color: T.red, label: 'Critical' },
              { value: (config as any).fmea?.highRpn || 100, color: T.orange, label: 'High' }
            ]}
          />
        </Panel>

        <Panel className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">FMEA Register</h3>
            <Input
              placeholder="Search..."
              value={globalFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
              className="w-48"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface text-ink-dim border-b border-border">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((col) => (
                      <th
                        key={col.id}
                        onClick={col.column.getToggleSortingHandler()}
                        className={cn('p-3 font-semibold uppercase tracking-wider', col.column.getCanSort() && 'cursor-pointer hover:text-cyan')}
                      >
                        {flexRender(col.column.columnDef.header, col.getContext())}
                        {{ asc: ' ▲', desc: ' ▼' }[col.column.getIsSorted() as string] ?? ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border/50">
                <AnimatePresence>
                  {table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="p-8 text-center text-ink-dim">
                        No FMEA data found.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit FMEA' : 'New FMEA'} subtitle="RISK REGISTER" maxWidth={720}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input label="Process Step" value={draft.process} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('process', e.target.value)} />
            <Input label="Failure Mode" value={draft.failureMode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('failureMode', e.target.value)} required />
            <Textarea label="Effect" value={draft.effect} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('effect', e.target.value)} rows={2} />
            <Textarea label="Cause" value={draft.cause} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('cause', e.target.value)} rows={2} />
          </div>

          <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <span className="font-mono text-sm font-bold uppercase text-ink-dim">Risk Priority Number</span>
              <span className="font-mono text-3xl font-black" style={{ color: getRpnSeverity(draft.rpn, config).color }}>
                {draft.rpn}
              </span>
            </div>

            <Slider
              label="Severity (1-10)"
              value={draft.severity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('severity', Number(e.target.value))}
              min={1} max={10}
              valueLabel={draft.severity.toString()}
            />
            <Slider
              label="Occurrence (1-10)"
              value={draft.occurrence}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('occurrence', Number(e.target.value))}
              min={1} max={10}
              valueLabel={draft.occurrence.toString()}
            />
            <Slider
              label="Detection (1-10)"
              value={draft.detection}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('detection', Number(e.target.value))}
              min={1} max={10}
              valueLabel={draft.detection.toString()}
            />
            
            <Select
              label="Status"
              value={draft.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFieldChange('status', e.target.value as FMEARow['status'])}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Add to Register'}</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
