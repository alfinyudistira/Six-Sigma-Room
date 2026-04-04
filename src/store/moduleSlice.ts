// src/store/moduleSlice.ts
// ─── Redux Toolkit — Module Data Slices ──────────────────────────────────────
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { persist, retrieve } from '@/lib/storage'

// ─── FMEA ────────────────────────────────────────────────────────────────────
export interface FMEARow {
  id: string
  process: string
  failureMode: string
  effect: string
  cause: string
  severity: number
  occurrence: number
  detection: number
  rpn: number
  action: string
  owner: string
  dueDate: string
  status: 'open' | 'in-progress' | 'closed'
}

// ─── DMAIC Phase ─────────────────────────────────────────────────────────────
export type DMAICPhase = 'define' | 'measure' | 'analyze' | 'improve' | 'control'

export interface DMAICTask {
  id: string
  phase: DMAICPhase
  task: string
  owner: string
  dueDate: string
  status: 'not-started' | 'in-progress' | 'complete' | 'blocked'
  notes: string
}

// ─── SPC Data Point ───────────────────────────────────────────────────────────
export interface SPCPoint {
  id: string
  label: string
  value: number
  timestamp: string
  note?: string
}

// ─── Pareto Item ─────────────────────────────────────────────────────────────
export interface ParetoItem {
  id: string
  category: string
  count: number
  cost?: number
  color?: string
}

// ─── Root Cause ───────────────────────────────────────────────────────────────
export interface RootCauseNode {
  id: string
  text: string
  parentId: string | null
  category?: string
  verified: boolean
}

// ─── Module State ─────────────────────────────────────────────────────────────
interface ModuleState {
  fmea: FMEARow[]
  dmaic: DMAICTask[]
  spc: SPCPoint[]
  pareto: ParetoItem[]
  rootCause: RootCauseNode[]
  hydrated: boolean
}

const initialState: ModuleState = {
  fmea: [],
  dmaic: [],
  spc: [],
  pareto: [],
  rootCause: [],
  hydrated: false,
}

// ─── Async thunks ─────────────────────────────────────────────────────────────
export const loadModuleData = createAsyncThunk('modules/load', async () => {
  const [fmea, dmaic, spc, pareto, rootCause] = await Promise.all([
    retrieve<FMEARow[]>('fmea_rows'),
    retrieve<DMAICTask[]>('dmaic_tasks'),
    retrieve<SPCPoint[]>('spc_points'),
    retrieve<ParetoItem[]>('pareto_items'),
    retrieve<RootCauseNode[]>('rootcause_nodes'),
  ])
  return { fmea, dmaic, spc, pareto, rootCause }
})

export const saveModuleData = createAsyncThunk(
  'modules/save',
  async (key: keyof Omit<ModuleState, 'hydrated'>, { getState }) => {
    const state = (getState() as { modules: ModuleState }).modules
    await persist(`${key}_${key === 'fmea' ? 'rows' : key === 'dmaic' ? 'tasks' : key === 'spc' ? 'points' : key === 'pareto' ? 'items' : 'nodes'}`, state[key])
    return key
  },
)

// ─── Slice ────────────────────────────────────────────────────────────────────
const moduleSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    // FMEA
    addFMEARow: (s, a: PayloadAction<FMEARow>) => { s.fmea.push(a.payload) },
    updateFMEARow: (s, a: PayloadAction<FMEARow>) => {
      const i = s.fmea.findIndex(r => r.id === a.payload.id)
      if (i !== -1) s.fmea[i] = a.payload
    },
    deleteFMEARow: (s, a: PayloadAction<string>) => {
      s.fmea = s.fmea.filter(r => r.id !== a.payload)
    },
    setFMEA: (s, a: PayloadAction<FMEARow[]>) => { s.fmea = a.payload },

    // DMAIC
    addDMAICTask: (s, a: PayloadAction<DMAICTask>) => { s.dmaic.push(a.payload) },
    updateDMAICTask: (s, a: PayloadAction<DMAICTask>) => {
      const i = s.dmaic.findIndex(t => t.id === a.payload.id)
      if (i !== -1) s.dmaic[i] = a.payload
    },
    deleteDMAICTask: (s, a: PayloadAction<string>) => {
      s.dmaic = s.dmaic.filter(t => t.id !== a.payload)
    },

    // SPC
    addSPCPoint: (s, a: PayloadAction<SPCPoint>) => { s.spc.push(a.payload) },
    deleteSPCPoint: (s, a: PayloadAction<string>) => {
      s.spc = s.spc.filter(p => p.id !== a.payload)
    },
    setSPC: (s, a: PayloadAction<SPCPoint[]>) => { s.spc = a.payload },

    // Pareto
    addParetoItem: (s, a: PayloadAction<ParetoItem>) => { s.pareto.push(a.payload) },
    updateParetoItem: (s, a: PayloadAction<ParetoItem>) => {
      const i = s.pareto.findIndex(p => p.id === a.payload.id)
      if (i !== -1) s.pareto[i] = a.payload
    },
    deleteParetoItem: (s, a: PayloadAction<string>) => {
      s.pareto = s.pareto.filter(p => p.id !== a.payload)
    },
    setPareto: (s, a: PayloadAction<ParetoItem[]>) => { s.pareto = a.payload },

    // Root Cause
    addRootCauseNode: (s, a: PayloadAction<RootCauseNode>) => { s.rootCause.push(a.payload) },
    deleteRootCauseNode: (s, a: PayloadAction<string>) => {
      s.rootCause = s.rootCause.filter(n => n.id !== a.payload)
    },
    toggleNodeVerified: (s, a: PayloadAction<string>) => {
      const node = s.rootCause.find(n => n.id === a.payload)
      if (node) node.verified = !node.verified
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadModuleData.fulfilled, (s, a) => {
      if (a.payload.fmea)      s.fmea      = a.payload.fmea
      if (a.payload.dmaic)     s.dmaic     = a.payload.dmaic
      if (a.payload.spc)       s.spc       = a.payload.spc
      if (a.payload.pareto)    s.pareto    = a.payload.pareto
      if (a.payload.rootCause) s.rootCause = a.payload.rootCause
      s.hydrated = true
    })
  },
})

export const {
  addFMEARow, updateFMEARow, deleteFMEARow, setFMEA,
  addDMAICTask, updateDMAICTask, deleteDMAICTask,
  addSPCPoint, deleteSPCPoint, setSPC,
  addParetoItem, updateParetoItem, deleteParetoItem, setPareto,
  addRootCauseNode, deleteRootCauseNode, toggleNodeVerified,
} = moduleSlice.actions

export default moduleSlice.reducer
