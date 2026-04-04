// src/pages/FMEAScorer.tsx
import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addFMEARow, updateFMEARow, deleteFMEARow, type FMEARow } from '@/store/moduleSlice'
import { useConfigStore, getRpnSeverity } from '@/lib/config'
import { calcRPN } from '@/lib/sigma'
import { useFeedback } from '@/services/feedback'
import { useModulePersist } from '@/hooks/hooks'
import { Section, Panel, SimpleBarChart, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'

const BLANK_ROW: Omit<FMEARow, 'id'> = {
  process: '', failureMode: '', effect: '', cause: '',
  severity: 5, occurrence: 5, detection: 5, rpn: 125,
  action: '', owner: '', dueDate: '', status: 'open',
}

const STATUS_COLOR: Record<FMEARow['status'], string> = {
  'open': T.red, 'in-progress': T.yellow, 'closed': T.green,
}

export default function FMEAScorer() {
  const dispatch   = useAppDispatch()
  const rows       = useAppSelector(s => s.modules.fmea)
  const { config } = useConfigStore()
  const toast      = useFeedback()

  const [sorting, setSorting]     = useState<SortingState>([{ id: 'rpn', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [editRow, setEditRow]     = useState<FMEARow | null>(null)
  const [isNew, setIsNew]         = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [draft, setDraft]         = useState<Omit<FMEARow, 'id'>>(BLANK_ROW)

  // Auto-persist to IndexedDB
  useModulePersist('fmea_rows', rows)

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!rows.length) return { critical: 0, high: 0, avgRpn: 0, maxRpn: 0, closed: 0 }
    const critical = rows.filter(r => r.rpn >= config.rpn.critical).length
    const high     = rows.filter(r => r.rpn >= config.rpn.high && r.rpn < config.rpn.critical).length
    const avgRpn   = rows.reduce((a, r) => a + r.rpn, 0) / rows.length
    const maxRpn   = Math.max(...rows.map(r => r.rpn))
    const closed   = rows.filter(r => r.status === 'closed').length
    return { critical, high, avgRpn, maxRpn, closed }
  }, [rows, config.rpn])

  const chartData = useMemo(() =>
    rows.slice(0, 10)
      .sort((a, b) => b.rpn - a.rpn)
      .map(r => ({ name: r.failureMode.slice(0, 16) || 'Unnamed', rpn: r.rpn })),
  [rows])

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<FMEARow>[]>(() => [
    { accessorKey: 'process',     header: 'Process',      size: 110 },
    { accessorKey: 'failureMode', header: 'Failure Mode', size: 130 },
    { accessorKey: 'effect',      header: 'Effect',       size: 120 },
    { accessorKey: 'severity',    header: 'S',            size: 50,
      cell: i => <span style={{ color: i.getValue<number>() >= 8 ? T.red : T.text }}>{i.getValue<number>()}</span> },
    { accessorKey: 'occurrence',  header: 'O',            size: 50,
      cell: i => <span style={{ color: i.getValue<number>() >= 8 ? T.red : T.text }}>{i.getValue<number>()}</span> },
    { accessorKey: 'detection',   header: 'D',            size: 50,
      cell: i => <span style={{ color: i.getValue<number>() >= 8 ? T.red : T.text }}>{i.getValue<number>()}</span> },
    { accessorKey: 'rpn',         header: 'RPN',          size: 70,
      cell: i => {
        const v = i.getValue<number>()
        const s = getRpnSeverity(v, config)
        return <span style={{ color: s.color, fontWeight: 700 }}>{v}</span>
      } },
    { accessorKey: 'status',      header: 'Status',       size: 90,
      cell: i => {
        const v = i.getValue<FMEARow['status']>()
        return <Badge label={v} color={v === 'closed' ? 'green' : v === 'in-progress' ? 'yellow' : 'red'} />
      } },
    { accessorKey: 'owner',       header: 'Owner',        size: 90 },
    { id: 'actions', header: '', size: 80,
      cell: i => (
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button onClick={() => openEdit(i.row.original)}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, color: T.cyan, padding: '0.2rem 0.4rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.55rem' }}>
            Edit
          </button>
          <ConfirmButton variant="danger" label="Del" confirmLabel="Yes"
            message="Delete this row?"
            onConfirm={() => { dispatch(deleteFMEARow(i.row.original.id)); toast.success('Row deleted') }} />
        </div>
      ) },
  ], [config, dispatch, toast])

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

  // ── Form handlers ──────────────────────────────────────────────────────────
  const openNew = () => {
    setDraft(BLANK_ROW); setIsNew(true); setEditRow(null); setShowForm(true)
  }
  const openEdit = (row: FMEARow) => {
    const { id, ...rest } = row; setDraft(rest); setEditRow(row); setIsNew(false); setShowForm(true)
  }

  const setField = useCallback(<K extends keyof typeof BLANK_ROW>(k: K, v: typeof BLANK_ROW[K]) => {
    setDraft(d => {
      const next = { ...d, [k]: v }
      if (['severity','occurrence','detection'].includes(k as string)) {
        next.rpn = calcRPN(
          k === 'severity'   ? v as number : next.severity,
          k === 'occurrence' ? v as number : next.occurrence,
          k === 'detection'  ? v as number : next.detection,
        )
      }
      return next
    })
  }, [])

  const save = () => {
    if (!draft.process || !draft.failureMode) { toast.error('Required', 'Process and Failure Mode are required'); return }
    if (isNew) {
      dispatch(addFMEARow({ ...draft, id: `fmea_${Date.now()}` }))
      toast.success('Row added', `RPN: ${draft.rpn}`)
    } else if (editRow) {
      dispatch(updateFMEARow({ ...draft, id: editRow.id }))
      toast.success('Row updated')
    }
    setShowForm(false)
  }

  const exportCSV = () => { downloadCSV(rows, 'fmea-export.csv'); toast.success('Exported') }

  const ratingInput = (field: 'severity' | 'occurrence' | 'detection', label: string) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
        <span style={{ color: draft[field] >= 8 ? T.red : draft[field] >= 5 ? T.yellow : T.green, fontFamily: T.mono, fontSize: '0.72rem', fontWeight: 700 }}>{draft[field]}/10</span>
      </div>
      <input type="range" min={1} max={10} value={draft[field]}
        onChange={e => setField(field, +e.target.value)}
        style={{ width: '100%', accentColor: draft[field] >= 8 ? T.red : draft[field] >= 5 ? T.yellow : T.green }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: T.textDim, fontFamily: T.mono, fontSize: '0.5rem' }}>
        <span>1 Low</span><span>10 High</span>
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <Section
        subtitle="Module 4 — Risk Management"
        title="Failure Mode & Effects Analysis"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button size="xs" variant="ghost" onClick={exportCSV}>↓ CSV</Button>
            <Button size="sm" variant="primary" onClick={openNew} hapticStyle="medium">+ Add Row</Button>
          </div>
        }
      />

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <KPICard label="Total Failure Modes" value={rows.length} color={T.cyan} icon="≡" />
        <KPICard label="Critical RPN ≥200" value={stats.critical} color={T.red} icon="⚠" />
        <KPICard label="High RPN ≥100" value={stats.high} color={T.yellow} icon="!" />
        <KPICard label="Avg RPN" value={stats.avgRpn.toFixed(0)} color={T.orange} icon="σ" />
        <KPICard label="Max RPN" value={stats.maxRpn} color={stats.maxRpn >= config.rpn.critical ? T.red : T.yellow} icon="▲" />
        <KPICard label="Closed Actions" value={`${stats.closed}/${rows.length}`} color={T.green} icon="✓" />
      </div>

      {/* ── Chart ── */}
      {rows.length > 0 && (
        <Panel>
          <Section subtitle="Top Risk" title="RPN by Failure Mode" />
          <SimpleBarChart data={chartData} xKey="name"
            bars={[{ key: 'rpn', color: T.red, label: 'RPN' }]}
            referenceLines={[
              { value: config.rpn.critical, color: T.red,    label: 'Critical' },
              { value: config.rpn.high,     color: T.yellow, label: 'High' },
            ]}
          />
        </Panel>
      )}

      {/* ── Filter bar ── */}
      <Panel style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            placeholder="🔍 Filter failure modes, owners, processes…"
            aria-label="Filter FMEA table"
            style={{ flex: 1, minWidth: 200, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: T.mono, fontSize: '0.7rem', padding: '0.4rem 0.7rem' }}
          />
          <HelpTooltip title="FMEA — Failure Mode & Effects Analysis" description="RPN = Severity × Occurrence × Detection. RPN ≥ 200 = Critical, must act immediately. Sort any column by clicking the header." />
        </div>
      </Panel>

      {/* ── Table ── */}
      <Panel style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: T.textDim, fontFamily: T.mono, fontSize: '0.7rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠</div>
            No failure modes yet. Click <strong style={{ color: T.cyan }}>+ Add Row</strong> to start your FMEA.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.mono, fontSize: '0.62rem' }}
              role="grid" aria-label="FMEA table">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id}
                        onClick={h.column.getToggleSortingHandler()}
                        style={{
                          padding: '0.6rem 0.75rem', textAlign: 'left',
                          color: T.textDim, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                          borderBottom: `1px solid ${T.border}`, cursor: h.column.getCanSort() ? 'pointer' : 'default',
                          background: T.bg, userSelect: 'none', whiteSpace: 'nowrap',
                        }}
                        aria-sort={h.column.getIsSorted() === 'asc' ? 'ascending' : h.column.getIsSorted() === 'desc' ? 'descending' : 'none'}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' ? ' ▲' : h.column.getIsSorted() === 'desc' ? ' ▼' : ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, i) => (
                  <tr key={row.id}
                    style={{ background: i % 2 === 0 ? 'transparent' : `${T.surface}50`, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = `${T.cyan}06`}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'transparent' : `${T.surface}50`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '0.5rem 0.75rem', color: T.textMid, borderBottom: `1px solid ${T.border}44`, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Add/Edit Modal ── */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        title={isNew ? 'Add Failure Mode' : 'Edit Failure Mode'}
        subtitle="⚠ FMEA ENTRY" maxWidth={600}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Text fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {([
              ['process', 'Process / Function'],
              ['failureMode', 'Failure Mode'],
              ['effect', 'Effect of Failure'],
              ['cause', 'Root Cause'],
              ['action', 'Recommended Action'],
              ['owner', 'Action Owner'],
            ] as [keyof typeof BLANK_ROW, string][]).map(([key, label]) => (
              <div key={key} style={key === 'action' || key === 'cause' ? { gridColumn: '1 / -1' } : {}}>
                <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                <input value={draft[key] as string} onChange={e => setField(key, e.target.value)}
                  style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: T.mono, fontSize: '0.72rem', padding: '0.4rem 0.65rem' }} />
              </div>
            ))}
          </div>

          {/* Rating sliders */}
          <div style={{ background: T.surface, borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ratingInput('severity',   'Severity (S)')}
            {ratingInput('occurrence', 'Occurrence (O)')}
            {ratingInput('detection',  'Detection Difficulty (D)')}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: `1px solid ${T.border}` }}>
              <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.6rem' }}>RPN = S × O × D</span>
              <span style={{ color: getRpnSeverity(draft.rpn, config).color, fontFamily: T.mono, fontSize: '1.2rem', fontWeight: 700 }}>
                {draft.rpn}
              </span>
              <Badge label={getRpnSeverity(draft.rpn, config).label}
                color={draft.rpn >= config.rpn.critical ? 'red' : draft.rpn >= config.rpn.high ? 'yellow' : draft.rpn >= config.rpn.medium ? 'orange' : 'green'} />
            </div>
          </div>

          {/* Status & date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Status</label>
              <select value={draft.status} onChange={e => setField('status', e.target.value as FMEARow['status'])}
                style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: T.mono, fontSize: '0.72rem', padding: '0.4rem 0.65rem' }}>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Due Date</label>
              <input type="date" value={draft.dueDate} onChange={e => setField('dueDate', e.target.value)}
                style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: T.mono, fontSize: '0.72rem', padding: '0.4rem 0.65rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, paddingTop: '0.75rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save} hapticStyle="success">
              {isNew ? '+ Add' : '✓ Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
