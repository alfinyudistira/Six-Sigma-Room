// src/store/moduleSlice.ts
import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  PayloadAction,
} from '@reduxjs/toolkit'
import { persist, retrieve } from '@/lib/storage'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export interface FMEARow {
  id: string; process: string; failureMode: string; effect: string;
  cause: string; severity: number; occurrence: number; detection: number;
  rpn: number; action: string; owner: string; dueDate: string;
  status: 'open' | 'in-progress' | 'closed';
}

export type DMAICPhase = 'define' | 'measure' | 'analyze' | 'improve' | 'control'

export interface DMAICTask {
  id: string; phase: DMAICPhase; task: string; owner: string;
  dueDate: string; status: 'not-started' | 'in-progress' | 'complete' | 'blocked';
  notes: string;
}

export interface SPCPoint {
  id: string; label: string; value: number; timestamp: string; note?: string;
}

export interface ParetoItem {
  id: string; category: string; count: number; cost?: number; color?: string;
}

export interface RootCauseNode {
  id: string; text: string; parentId: string | null; category?: string; verified: boolean;
}

/* --------------------------------------------------------------------------
   ADAPTERS (Simplified: remove selectId because 'id' is default)
   -------------------------------------------------------------------------- */
const fmeaAdapter = createEntityAdapter<FMEARow>()
const dmaicAdapter = createEntityAdapter<DMAICTask>()
const spcAdapter = createEntityAdapter<SPCPoint>()
const paretoAdapter = createEntityAdapter<ParetoItem>()
const rootCauseAdapter = createEntityAdapter<RootCauseNode>()

export interface ModuleState {
  fmea: ReturnType<typeof fmeaAdapter.getInitialState>
  dmaic: ReturnType<typeof dmaicAdapter.getInitialState>
  spc: ReturnType<typeof spcAdapter.getInitialState>
  pareto: ReturnType<typeof paretoAdapter.getInitialState>
  rootCause: ReturnType<typeof rootCauseAdapter.getInitialState>
  hydrated: boolean
}

const initialState: ModuleState = {
  fmea: fmeaAdapter.getInitialState(),
  dmaic: dmaicAdapter.getInitialState(),
  spc: spcAdapter.getInitialState(),
  pareto: paretoAdapter.getInitialState(),
  rootCause: rootCauseAdapter.getInitialState(),
  hydrated: false,
}

const STORAGE_KEYS = {
  fmea: 'fmea_rows',
  dmaic: 'dmaic_tasks',
  spc: 'spc_points',
  pareto: 'pareto_items',
  rootCause: 'rootcause_nodes',
} as const

type ModuleKey = keyof typeof STORAGE_KEYS

/* --------------------------------------------------------------------------
   ASYNC THUNKS
   -------------------------------------------------------------------------- */
export const loadModuleData = createAsyncThunk(
  'modules/load',
  async (_, { rejectWithValue }) => {
    try {
      const entries = await Promise.all(
        Object.entries(STORAGE_KEYS).map(async ([key, storageKey]) => {
          try {
            const data = await retrieve(storageKey)
            return [key, data]
          } catch (err) {
            console.warn(`[moduleSlice] Failed to load ${key}`, err)
            return [key, null]
          }
        }),
      )
      return Object.fromEntries(entries) as Partial<Record<ModuleKey, any>>
    } catch (err) {
      return rejectWithValue((err as Error).message)
    }
  },
)

export const saveModuleData = createAsyncThunk(
  'modules/save',
  async (key: ModuleKey, { getState, rejectWithValue }) => {
    try {
      const state = (getState() as any).modules as ModuleState
      const slice = state[key]
      // Perbaikan: Ambil semua entitas secara aman
      const items = Object.values(slice.entities).filter(Boolean)
      await persist(STORAGE_KEYS[key], items)
      return key
    } catch (err) {
      return rejectWithValue((err as Error).message)
    }
  },
)

/* --------------------------------------------------------------------------
   SLICE
   -------------------------------------------------------------------------- */
const moduleSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    addFMEARow: (state, action: PayloadAction<FMEARow>) => { fmeaAdapter.addOne(state.fmea, action.payload) },
    updateFMEARow: (state, action: PayloadAction<FMEARow>) => { fmeaAdapter.upsertOne(state.fmea, action.payload) },
    deleteFMEARow: (state, action: PayloadAction<string>) => { fmeaAdapter.removeOne(state.fmea, action.payload) },
    setFMEA: (state, action: PayloadAction<FMEARow[]>) => { fmeaAdapter.setAll(state.fmea, action.payload) },

    addDMAICTask: (state, action: PayloadAction<DMAICTask>) => { dmaicAdapter.addOne(state.dmaic, action.payload) },
    updateDMAICTask: (state, action: PayloadAction<DMAICTask>) => { dmaicAdapter.upsertOne(state.dmaic, action.payload) },
    deleteDMAICTask: (state, action: PayloadAction<string>) => { dmaicAdapter.removeOne(state.dmaic, action.payload) },

    addSPCPoint: (state, action: PayloadAction<SPCPoint>) => { spcAdapter.addOne(state.spc, action.payload) },
    updateSPCPoint: (state, action: PayloadAction<SPCPoint>) => { spcAdapter.upsertOne(state.spc, action.payload) },
    deleteSPCPoint: (state, action: PayloadAction<string>) => { spcAdapter.removeOne(state.spc, action.payload) },
    setSPC: (state, action: PayloadAction<SPCPoint[]>) => { spcAdapter.setAll(state.spc, action.payload) },

    addParetoItem: (state, action: PayloadAction<ParetoItem>) => { paretoAdapter.addOne(state.pareto, action.payload) },
    updateParetoItem: (state, action: PayloadAction<ParetoItem>) => { paretoAdapter.upsertOne(state.pareto, action.payload) },
    deleteParetoItem: (state, action: PayloadAction<string>) => { paretoAdapter.removeOne(state.pareto, action.payload) },
    setPareto: (state, action: PayloadAction<ParetoItem[]>) => { paretoAdapter.setAll(state.pareto, action.payload) },

    addRootCauseNode: (state, action: PayloadAction<RootCauseNode>) => { rootCauseAdapter.addOne(state.rootCause, action.payload) },
    updateRootCauseNode: (state, action: PayloadAction<RootCauseNode>) => { rootCauseAdapter.upsertOne(state.rootCause, action.payload) },
    deleteRootCauseNode: (state, action: PayloadAction<string>) => { rootCauseAdapter.removeOne(state.rootCause, action.payload) },
    toggleNodeVerified: (state, action: PayloadAction<string>) => {
      const node = (state.rootCause.entities as any)[action.payload]
      if (node) node.verified = !node.verified
    },

    markHydrated: (state) => { state.hydrated = true },
    clearAllModules: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(loadModuleData.fulfilled, (state, action) => {
      const p = action.payload
      if (p.fmea) fmeaAdapter.setAll(state.fmea, p.fmea)
      if (p.dmaic) dmaicAdapter.setAll(state.dmaic, p.dmaic)
      if (p.spc) spcAdapter.setAll(state.spc, p.spc)
      if (p.pareto) paretoAdapter.setAll(state.pareto, p.pareto)
      if (p.rootCause) rootCauseAdapter.setAll(state.rootCause, p.rootCause)
      state.hydrated = true
    })
  },
})

export const {
  addFMEARow, updateFMEARow, deleteFMEARow, setFMEA,
  addDMAICTask, updateDMAICTask, deleteDMAICTask,
  addSPCPoint, updateSPCPoint, deleteSPCPoint, setSPC,
  addParetoItem, updateParetoItem, deleteParetoItem, setPareto,
  addRootCauseNode, updateRootCauseNode, deleteRootCauseNode, toggleNodeVerified,
  markHydrated, clearAllModules,
} = moduleSlice.actions

export default moduleSlice.reducer

/* --------------------------------------------------------------------------
   SELECTORS
   -------------------------------------------------------------------------- */
export const fmeaSelectors = fmeaAdapter.getSelectors((state: any) => state.modules.fmea)
export const dmaicSelectors = dmaicAdapter.getSelectors((state: any) => state.modules.dmaic)
export const spcSelectors = spcAdapter.getSelectors((state: any) => state.modules.spc)
export const paretoSelectors = paretoAdapter.getSelectors((state: any) => state.modules.pareto)
export const rootCauseSelectors = rootCauseAdapter.getSelectors((state: any) => state.modules.rootCause)
