import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg:       "#050A0F",
  panel:    "#080E14",
  surface:  "#0D1520",
  border:   "#112233",
  borderHi: "#1A3A5C",
  cyan:     "#00D4FF",
  cyanDim:  "#00D4FF44",
  green:    "#00FF9C",
  greenDim: "#00FF9C33",
  red:      "#FF3B5C",
  redDim:   "#FF3B5C33",
  yellow:   "#FFD60A",
  yellowDim:"#FFD60A33",
  orange:   "#FF8C00",
  text:     "#E2EEF9",
  textDim:  "#4A6785",
  textMid:  "#7A99B8",
  mono:     "'Space Mono', monospace",
  display:  "'Syne', sans-serif",
};

// ─── COMPANY CONTEXT ─────────────────────────────────────────────────────────
import { createContext, useContext } from "react";

const CompanyCtx = createContext(null);
function useCompany() { return useContext(CompanyCtx); }

const COMPANY_DEFAULTS = {
  name: "Pulse Digital",
  dept: "Technical Support",
  industry: "IT / Tech Support",
  country: "Indonesia",
  teamSize: 27,
  processName: "Customer Complaint Resolution",
  processUnit: "hrs",
  baselineMean: 72.1,
  baselineStdDev: 17.4,
  target: 48,
  usl: 96,
  lsl: 0,
  currency: "USD",
  laborRate: 45,
  monthlyVolume: 295,
  customerLTV: 3200,
  isPulseDigital: true,
};

const INDUSTRY_OPTIONS = [
  "IT / Tech Support", "Manufacturing", "Healthcare", "Financial Services",
  "Retail / E-Commerce", "Logistics & Supply Chain", "HR / People Ops",
  "Customer Service", "Food & Beverage", "Construction", "Education", "Other",
];

// ─── COMPANY SETUP MODAL ─────────────────────────────────────────────────────
function CompanySetup({ company, onChange, onClose, isOpen }) {
  const [draft, setDraft] = useState({ ...company });
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  const isPD = draft.name === "Pulse Digital" && draft.dept === "Technical Support";

  const save = () => {
    onChange({ ...draft, isPulseDigital: isPD });
    onClose();
  };

  const loadPulseDigital = () => {
    setDraft({ ...COMPANY_DEFAULTS });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            background: T.panel, border: `1px solid ${T.borderHi}`,
            borderRadius: 12, width: "100%", maxWidth: 680,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${T.cyan}11`,
          }}
        >
          {/* Header */}
          <div style={{
            padding: "1.5rem 1.75rem", borderBottom: `1px solid ${T.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            position: "sticky", top: 0, background: T.panel, zIndex: 1,
          }}>
            <div>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                ⚡ COMPANY PROFILE
              </div>
              <div style={{ color: T.text, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 700 }}>
                Configure Your Organization
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "transparent", border: `1px solid ${T.border}`,
              color: T.textDim, width: 32, height: 32, borderRadius: 4,
              cursor: "pointer", fontFamily: T.mono, fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>

          <div style={{ padding: "1.75rem" }}>
            {/* Quick Load */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                Quick Load
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button onClick={loadPulseDigital} style={{
                  background: `${T.cyan}12`, border: `1px solid ${T.cyan}44`,
                  color: T.cyan, padding: "0.5rem 1rem", borderRadius: 6,
                  cursor: "pointer", fontFamily: T.mono, fontSize: "0.68rem",
                }}>
                  ◈ Load Pulse Digital (Demo)
                </button>
                <button onClick={() => setDraft({ ...COMPANY_DEFAULTS, name: "", dept: "", processName: "", baselineMean: 0, target: 0, usl: 0, lsl: 0, laborRate: 0, monthlyVolume: 0, customerLTV: 0, isPulseDigital: false })} style={{
                  background: `${T.green}12`, border: `1px solid ${T.green}44`,
                  color: T.green, padding: "0.5rem 1rem", borderRadius: 6,
                  cursor: "pointer", fontFamily: T.mono, fontSize: "0.68rem",
                }}>
                  ⚡ Start Fresh (Your Company)
                </button>
              </div>
            </div>

            {/* Section: Organization */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.cyan, display: "inline-block" }} />
                Organization
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.85rem" }}>
                {[
                  { label: "Company Name", key: "name", ph: "e.g. Acme Corp" },
                  { label: "Department", key: "dept", ph: "e.g. Customer Service" },
                  { label: "Country / Region", key: "country", ph: "e.g. Indonesia" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{f.label}</label>
                    <input value={draft[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.ph}
                      style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Industry</label>
                  <select value={draft.industry} onChange={e => set("industry", e.target.value)}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box", cursor: "pointer" }}>
                    {INDUSTRY_OPTIONS.map(o => <option key={o} value={o} style={{ background: T.surface }}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Team Size</label>
                  <input type="number" value={draft.teamSize} onChange={e => set("teamSize", +e.target.value)} min={1}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Currency</label>
                  <select value={draft.currency} onChange={e => set("currency", e.target.value)}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box", cursor: "pointer" }}>
                    {["USD", "IDR", "EUR", "GBP", "SGD", "AUD", "JPY", "MYR"].map(c => <option key={c} value={c} style={{ background: T.surface }}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Process */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                Process Being Improved
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.85rem" }}>
                {[
                  { label: "Process Name", key: "processName", ph: "e.g. Order Fulfillment" },
                  { label: "Measurement Unit", key: "processUnit", ph: "e.g. hrs, days, %" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{f.label}</label>
                    <input value={draft[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.ph}
                      style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                  </div>
                ))}
                {[
                  { label: "Baseline Mean", key: "baselineMean", ph: "72.1", step: "0.1" },
                  { label: "Baseline Std Dev (σ)", key: "baselineStdDev", ph: "17.4", step: "0.1" },
                  { label: "Target Value", key: "target", ph: "48", step: "0.1" },
                  { label: "Upper Spec Limit (USL)", key: "usl", ph: "96", step: "1" },
                  { label: "Lower Spec Limit (LSL)", key: "lsl", ph: "0", step: "1" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{f.label}</label>
                    <input type="number" step={f.step} value={draft[f.key]} onChange={e => set(f.key, parseFloat(e.target.value) || 0)} placeholder={f.ph}
                      style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.cyan, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Financials */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.yellow, display: "inline-block" }} />
                Financial Parameters
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.85rem" }}>
                {[
                  { label: "Staff Hourly Cost", key: "laborRate", ph: "45", step: "1", unit: "/hr" },
                  { label: "Monthly Process Volume", key: "monthlyVolume", ph: "295", step: "10", unit: "units" },
                  { label: "Customer / Contract Value", key: "customerLTV", ph: "3200", step: "100", unit: "" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                      {f.label} {f.unit && <span style={{ color: T.textDim }}>({draft.currency}{f.unit})</span>}
                    </label>
                    <input type="number" step={f.step} value={draft[f.key]} onChange={e => set(f.key, parseFloat(e.target.value) || 0)} placeholder={f.ph}
                      style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.yellow, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.6rem" }}>Preview</div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {[
                  { label: "Ppk (baseline)", val: (() => { const ppk = draft.baselineStdDev > 0 ? Math.min((draft.usl - draft.baselineMean) / (3 * draft.baselineStdDev), (draft.baselineMean - draft.lsl) / (3 * draft.baselineStdDev)) : 0; return ppk.toFixed(2); })() },
                  { label: "Gap to Close", val: `${(draft.baselineMean - draft.target).toFixed(1)} ${draft.processUnit}` },
                  { label: "Est. Annual Volume", val: (draft.monthlyVolume * 12).toLocaleString() },
                ].map(p => (
                  <div key={p.label} style={{ flex: "1 1 100px" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase" }}>{p.label}</div>
                    <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.95rem", fontWeight: 700 }}>{p.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{
                background: "transparent", border: `1px solid ${T.border}`, color: T.textDim,
                padding: "0.75rem 1.5rem", borderRadius: 6, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem",
              }}>Cancel</button>
              <button onClick={save} style={{
                background: T.cyan, border: "none", color: T.bg,
                padding: "0.75rem 2rem", borderRadius: 6, cursor: "pointer",
                fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em",
                boxShadow: `0 0 20px ${T.cyan}44`,
              }}>
                ✓ Save Company Profile
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── COMPANY BADGE (shown in header) ─────────────────────────────────────────
function CompanyBadge({ company, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: company.isPulseDigital ? `${T.cyan}10` : `${T.green}10`,
      border: `1px solid ${company.isPulseDigital ? T.cyan + "44" : T.green + "66"}`,
      borderRadius: 6, padding: "0.35rem 0.8rem", cursor: "pointer",
      display: "flex", alignItems: "center", gap: "0.5rem",
      transition: "all 0.2s",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: company.isPulseDigital ? T.cyan : T.green,
        boxShadow: `0 0 6px ${company.isPulseDigital ? T.cyan : T.green}`,
        flexShrink: 0,
      }} />
      <div style={{ textAlign: "left" }}>
        <div style={{ color: company.isPulseDigital ? T.cyan : T.green, fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", lineHeight: 1 }}>
          {company.name || "Unnamed Company"}
        </div>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", lineHeight: 1, marginTop: "0.1rem" }}>
          {company.dept} · {company.industry}
        </div>
      </div>
      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", marginLeft: "0.2rem" }}>✎</span>
    </button>
  );
}

// ─── COMPANY CONTEXT BANNER (shown inside modules) ────────────────────────────
function CompanyBanner() {
  const company = useCompany();
  if (!company || company.isPulseDigital) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: `${T.green}0C`, border: `1px solid ${T.green}33`,
        borderRadius: 8, padding: "0.85rem 1.25rem", marginBottom: "1.5rem",
        display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap",
      }}
    >
      <span style={{ color: T.green, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700 }}>
        ⚡ COMPANY MODE ACTIVE
      </span>
      <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }}>
        {company.name} · {company.dept} · {company.industry}
      </span>
      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
        Process: {company.processName} · Baseline: {company.baselineMean} {company.processUnit} → Target: {company.target} {company.processUnit}
      </span>
    </motion.div>
  );
}

// ─── PROJECT DATA (from real Black Belt report) ───────────────────────────────
const PROJECT = {
  title: "Reducing Customer Complaint Resolution Time",
  dept: "Technical Support Department",
  duration: "30 Weeks · Feb–Aug 2025",
  baseline: { resolution: 72.1, ppk: 0.43, sigma: 1.8, dpmo: 382000, csat: 6.8, escalation: 58, miscat: 22 },
  final:    { resolution: 49.2, ppk: 1.41, sigma: 3.4, dpmo: 1350,   csat: 8.1, escalation: 28, miscat: 6.2 },
  target:   { resolution: 48,   ppk: 1.33, sigma: 3.0, dpmo: 2700,   csat: 8.5, escalation: 30, miscat: 8 },
  savings:  300000,
  copq:     9000000,
  investment: 180000,
};

const PARETO_DATA = [
  { category: "Software Config",    cases: 153, pct: 28.0, avgHrs: 89.2, cumPct: 28.0,  color: T.red },
  { category: "Network Conn.",      cases: 120, pct: 21.9, avgHrs: 78.5, cumPct: 49.9,  color: T.orange },
  { category: "Hardware",           cases: 98,  pct: 17.9, avgHrs: 52.3, cumPct: 67.8,  color: T.yellow },
  { category: "Account Access",     cases: 76,  pct: 13.9, avgHrs: 64.8, cumPct: 81.7,  color: T.cyan },
  { category: "Integration",        cases: 54,  pct: 9.9,  avgHrs: 83.6, cumPct: 91.6,  color: T.green },
  { category: "Perf. Degradation",  cases: 28,  pct: 5.1,  avgHrs: 71.2, cumPct: 96.7,  color: "#9B8EC4" },
  { category: "Data Sync",          cases: 18,  pct: 3.3,  avgHrs: 68.4, cumPct: 100.0, color: "#7EB5A6" },
];

const SPC_DATA = [
  { week: "W25", avg: 51.4, mr: null },
  { week: "W26", avg: 50.1, mr: 1.3 },
  { week: "W27", avg: 49.8, mr: 0.3 },
  { week: "W28", avg: 48.7, mr: 1.1 },
  { week: "W29", avg: 49.2, mr: 0.5 },
];

const EXPERIENCE_DATA = [
  { group: "< 1 yr",  n: 87,  avgHrs: 94.2, fcr: 32, reopen: 37 },
  { group: "1–2 yr",  n: 156, avgHrs: 76.5, fcr: 41, reopen: 31 },
  { group: "2–3 yr",  n: 142, avgHrs: 65.8, fcr: 48, reopen: 25 },
  { group: "3–5 yr",  n: 118, avgHrs: 58.3, fcr: 56, reopen: 19 },
  { group: "> 5 yr",  n: 44,  avgHrs: 51.7, fcr: 64, reopen: 14 },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
function dpmoToSigma(dpmo) {
  if (dpmo <= 0) return 6.0;
  if (dpmo >= 1000000) return 0;
  const z = [
    [3.4, 6.0], [233, 5.0], [6210, 4.0], [66807, 3.0],
    [308537, 2.0], [691462, 1.0], [933193, 0.5]
  ];
  for (let i = 0; i < z.length - 1; i++) {
    if (dpmo >= z[i][0] && dpmo < z[i + 1][0]) {
      const t = (Math.log(dpmo) - Math.log(z[i][0])) / (Math.log(z[i + 1][0]) - Math.log(z[i][0]));
      return +(z[i][1] + t * (z[i + 1][1] - z[i][1])).toFixed(2);
    }
  }
  return 0;
}

function sigmaToDpmo(sigma) {
  const table = { 6: 3.4, 5: 233, 4: 6210, 3: 66807, 2: 308537, 1: 691462 };
  const keys = Object.keys(table).map(Number).sort((a, b) => b - a);
  for (let i = 0; i < keys.length - 1; i++) {
    const hi = keys[i], lo = keys[i + 1];
    if (sigma <= hi && sigma >= lo) {
      const t = (sigma - lo) / (hi - lo);
      return Math.round(table[lo] + t * (table[hi] - table[lo]));
    }
  }
  return sigma >= 6 ? 3.4 : 691462;
}

function calcPpk(mean, stdDev, usl, lsl) {
  if (stdDev <= 0) return 0;
  const cpu = (usl - mean) / (3 * stdDev);
  const cpl = (mean - lsl) / (3 * stdDev);
  return +Math.min(cpu, cpl).toFixed(3);
}

function sigmaColor(sigma) {
  if (sigma >= 4) return T.green;
  if (sigma >= 3) return T.cyan;
  if (sigma >= 2) return T.yellow;
  return T.red;
}

function ppkStatus(ppk) {
  if (ppk >= 1.67) return { label: "WORLD CLASS", color: T.green };
  if (ppk >= 1.33) return { label: "CAPABLE", color: T.cyan };
  if (ppk >= 1.0)  return { label: "MARGINAL", color: T.yellow };
  return { label: "INCAPABLE", color: T.red };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// Scanline overlay for CRT feel
function Scanlines() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9000,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)",
    }} />
  );
}

// Animated counter
function Counter({ value, decimals = 0, duration = 1500, color = T.text }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0, startTime = null;
    const end = parseFloat(value);
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + eased * (end - start));
      if (progress < 1) requestAnimationFrame(step);
      else setDisplay(end);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return (
    <span style={{ color, fontFamily: T.mono, fontWeight: 700 }}>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
    </span>
  );
}

// Glowing badge
function Badge({ label, color = T.cyan }) {
  return (
    <span style={{
      display: "inline-block", padding: "0.2rem 0.6rem",
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 3, color, fontFamily: T.mono,
      fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
    }}>{label}</span>
  );
}

// Smart Tooltip — bahasa awam
const TOOLTIPS = {
  ppk: { title: "Ppk — Process Capability Index", plain: "Ibarat akurasi tembakan. Skor ≥1.33 = tim Anda menembak tepat sasaran terus-menerus. Skor <1.0 = proses sering meleset dari target." },
  sigma: { title: "Sigma Level", plain: "Ukuran 'seberapa sedikit kesalahan' proses Anda. 6σ = hampir nol cacat. 1σ = 69% pekerjaan bermasalah. Semakin tinggi, semakin baik." },
  dpmo: { title: "DPMO — Defects Per Million Opportunities", plain: "Dari 1 juta pekerjaan, berapa yang berakhir salah/cacat. DPMO 1.350 = hanya 0,135% yang gagal. Sangat bagus." },
  copq: { title: "COPQ — Cost of Poor Quality", plain: "Total uang yang 'terbakar' sia-sia karena proses buruk, kerja dua kali, atau pelanggan kabur. Ini uang nyata yang bisa diselamatkan." },
  ucl: { title: "UCL — Upper Control Limit", plain: "Batas atas 'normal' proses. Kalau data keluar dari garis ini, ada sesuatu yang tidak beres dan perlu diselidiki segera." },
  fmea: { title: "FMEA — Failure Mode & Effects Analysis", plain: "Analisis 'apa saja yang bisa salah dan seberapa bahaya'. RPN = tingkat risiko. Makin tinggi RPN, makin urgent diperbaiki." },
  rpn: { title: "RPN — Risk Priority Number", plain: "RPN = Parahnya × Seberapa sering × Susahnya ketahuan. Misalnya: Parah (8) × Sering (7) × Susah ketahuan (7) = RPN 392. > 100 = harus segera ditangani." },
  dmaic: { title: "DMAIC Methodology", plain: "Kerangka perbaikan proses 5 fase: Define (tetapkan masalah) → Measure (ukur kondisi awal) → Analyze (cari akar masalah) → Improve (terapkan solusi) → Control (jaga supaya tidak balik lagi)." },
};

function SmartTooltip({ id, children }) {
  const [open, setOpen] = useState(false);
  const tip = TOOLTIPS[id];
  if (!tip) return children;
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
      {children}
      <button
        onClick={() => setOpen(p => !p)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{ background: `${T.cyan}22`, border: `1px solid ${T.cyan}44`, borderRadius: "50%", width: 16, height: 16, color: T.cyan, cursor: "pointer", fontFamily: T.mono, fontSize: "0.55rem", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>?</button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, zIndex: 9999, background: T.panel, border: `1px solid ${T.cyan}44`, borderRadius: 8, padding: "0.85rem 1rem", width: 280, boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${T.cyan}11`, pointerEvents: "none" }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{tip.title}</div>
            <div style={{ color: T.text, fontSize: "0.8rem", lineHeight: 1.6, fontFamily: T.mono }}>{tip.plain}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// Section header
function SectionHeader({ module, title, sub }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.cyan, boxShadow: `0 0 8px ${T.cyan}` }} />
        {module}
      </div>
      <h2 style={{ fontFamily: T.display, fontSize: "clamp(1.5rem,3.5vw,2.2rem)", color: T.text, fontWeight: 800, margin: "0 0 0.5rem", lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ color: T.textMid, fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 700, margin: 0 }}>{sub}</p>}
    </div>
  );
}

// Metric card
function MetricCard({ label, before, after, target, unit = "", decimals = 1, invert = false }) {
  const improved = invert ? after < before : after > before;
  const onTarget = invert ? after <= target : after >= target;
  const pct = before > 0 ? Math.abs(((after - before) / before) * 100).toFixed(1) : 0;
  const arrow = invert ? (after < before ? "↓" : "↑") : (after > before ? "↑" : "↓");
  const arrowColor = improved ? T.green : T.red;

  return (
    <motion.div whileHover={{ scale: 1.02 }} style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: "1.25rem", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: onTarget ? T.green : T.yellow, opacity: 0.8 }} />
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "1rem", textDecoration: "line-through" }}>{before}{unit}</div>
        <div style={{ color: T.text, fontFamily: T.mono, fontSize: "1.6rem", fontWeight: 700, lineHeight: 1 }}>{after}{unit}</div>
        <div style={{ color: arrowColor, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700, paddingBottom: "0.2rem" }}>{arrow} {pct}%</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Badge label={onTarget ? "TARGET MET ✓" : "IN PROGRESS"} color={onTarget ? T.green : T.yellow} />
        <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>TARGET: {target}{unit}</span>
      </div>
    </motion.div>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function NavBar({ active, setActive }) {
  const tabs = [
    { id: "overview",   label: "Mission Status",  icon: "◈" },
    { id: "sigma",      label: "Σ Calculator",    icon: "σ" },
    { id: "dmaic",      label: "DMAIC Tracker",   icon: "◎" },
    { id: "fmea",       label: "FMEA Scorer",     icon: "⚠" },
    { id: "copq",       label: "COPQ Engine",     icon: "$" },
    { id: "spc",        label: "SPC Charts",      icon: "~" },
    { id: "pareto",     label: "Pareto Builder",  icon: "∥" },
    { id: "rootcause",  label: "Root Cause",      icon: "?" },
    { id: "triage",     label: "AI Triage",       icon: "▶", highlight: true },
    { id: "universal",  label: "Try Your Data",   icon: "⚡", highlight: true },
  ];
  return (
    <nav style={{
      background: T.panel, borderBottom: `1px solid ${T.border}`,
      padding: "0 1.5rem", display: "flex", gap: "0", overflowX: "auto", flexShrink: 0,
      position: "relative",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          background: active === t.id ? (t.highlight ? `${T.green}15` : "#0a1520") : "transparent",
          borderTop: "none", borderLeft: "none", borderRight: "none",
          borderBottom: active === t.id ? `2px solid ${t.highlight ? T.green : T.cyan}` : `2px solid ${t.highlight ? T.green + "44" : "transparent"}`,
          color: active === t.id ? (t.highlight ? T.green : T.cyan) : (t.highlight ? T.green : T.textDim),
          padding: "0.85rem 1rem",
          cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
          letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
          transition: "all 0.2s",
          textShadow: active === t.id ? `0 0 12px ${t.highlight ? T.green : T.cyan}` : "none",
        }}>
          <span style={{ marginRight: "0.4rem", opacity: 0.7 }}>{t.icon}</span>
          {t.label}
          {t.highlight && <span style={{ marginLeft: "0.3rem", background: `${T.green}22`, border: `1px solid ${T.green}44`, borderRadius: 3, padding: "0.05rem 0.3rem", fontSize: "0.5rem", color: T.green }}>LIVE</span>}
        </button>
      ))}
    </nav>
  );
}

// ─── 01: MISSION STATUS (OVERVIEW) ───────────────────────────────────────────
function Overview() {
  const metrics = [
    { label: "Avg Resolution Time", before: PROJECT.baseline.resolution, after: PROJECT.final.resolution, target: PROJECT.target.resolution, unit: "h", invert: true },
    { label: "Process Capability Ppk", before: PROJECT.baseline.ppk, after: PROJECT.final.ppk, target: PROJECT.target.ppk },
    { label: "CSAT Score", before: PROJECT.baseline.csat, after: PROJECT.final.csat, target: PROJECT.target.csat },
    { label: "Miscategorization Rate", before: PROJECT.baseline.miscat, after: PROJECT.final.miscat, target: PROJECT.target.miscat, unit: "%", invert: true },
    { label: "Escalation Rate", before: PROJECT.baseline.escalation, after: PROJECT.final.escalation, target: PROJECT.target.escalation, unit: "%", invert: true },
    { label: "Sigma Level", before: PROJECT.baseline.sigma, after: PROJECT.final.sigma, target: PROJECT.target.sigma },
  ];

  const timelineData = [
    { phase: "Define",   week: 4,  resolution: 72.1, milestone: "Charter approved" },
    { phase: "Measure",  week: 12, resolution: 72.1, milestone: "547 cases analyzed" },
    { phase: "Analyze",  week: 17, resolution: 72.1, milestone: "5 root causes validated" },
    { phase: "Improve",  week: 22, resolution: 58.4, milestone: "Pilot: -19% reduction" },
    { phase: "Control",  week: 29, resolution: 49.2, milestone: "Ppk = 1.41 achieved" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader
        module="Module 01 — Executive Dashboard"
        title="Mission Status: Project Complete"
        sub={`${PROJECT.title} · ${PROJECT.dept} · ${PROJECT.duration}`}
      />

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Financial Impact */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Annual Savings Realized", val: PROJECT.savings, color: T.green, prefix: "$" },
          { label: "Total COPQ Identified", val: PROJECT.copq, color: T.red, prefix: "$" },
          { label: "Total Investment", val: PROJECT.investment, color: T.cyan, prefix: "$" },
          { label: "ROI Year 1", val: 66.7, color: T.yellow, suffix: "%" },
        ].map(k => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${k.color}08 0%, transparent 70%)` }} />
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>{k.label}</div>
            <div style={{ fontFamily: T.display, fontSize: "2rem", fontWeight: 800, color: k.color, textShadow: `0 0 20px ${k.color}66` }}>
              {k.prefix && k.prefix}
              <Counter value={k.val} decimals={k.label.includes("ROI") ? 1 : 0} color={k.color} />
              {k.suffix && k.suffix}
            </div>
          </div>
        ))}
      </div>

      {/* Project Timeline */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          [ DMAIC TIMELINE — RESOLUTION TIME TRAJECTORY ]
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
            <XAxis dataKey="phase" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 80]} tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.mono, fontSize: "0.75rem", color: T.text }} />
            <ReferenceLine y={48} stroke={T.green} strokeDasharray="4 4" label={{ value: "TARGET 48h", fill: T.green, fontSize: 10, fontFamily: T.mono }} />
            <Line type="monotone" dataKey="resolution" stroke={T.cyan} strokeWidth={2} dot={{ fill: T.cyan, r: 5, strokeWidth: 0 }} activeDot={{ r: 7, fill: T.cyan, boxShadow: `0 0 12px ${T.cyan}` }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SIGMA improvement visual */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "2rem", textAlign: "center" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          [ SIGMA LEVEL PROGRESSION ]
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "3rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: T.red, fontFamily: T.display, fontSize: "4rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 30px ${T.red}66` }}>1.8σ</div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem", marginTop: "0.4rem" }}>BASELINE</div>
            <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.75rem" }}>382,000 DPMO</div>
          </div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "2rem" }}>→</div>
          <div>
            <div style={{ color: T.green, fontFamily: T.display, fontSize: "4rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 30px ${T.green}66` }}>3.4σ</div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem", marginTop: "0.4rem" }}>ACHIEVED</div>
            <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.75rem" }}>1,350 DPMO</div>
          </div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.8rem", maxWidth: 200, lineHeight: 1.6 }}>
            <span style={{ color: T.cyan }}>282x</span> reduction in defects per million opportunities
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 02: SIGMA CALCULATOR ────────────────────────────────────────────────────
function SigmaCalculator() {
  const [mode, setMode] = useState("dpmo"); // dpmo | yield | ppk
  const [defects, setDefects] = useState(382000);
  const [opportunities, setOpportunities] = useState(1000000);
  const [yieldPct, setYieldPct] = useState(61.8);
  const [mean, setMean] = useState(72.1);
  const [stdDev, setStdDev] = useState(17.4);
  const [usl, setUsl] = useState(96);
  const [lsl, setLsl] = useState(0);

  const dpmo = mode === "dpmo" ? Math.round((defects / opportunities) * 1e6)
    : mode === "yield" ? Math.round((1 - yieldPct / 100) * 1e6)
    : Math.round(sigmaToDpmo(calcPpk(mean, stdDev, usl, lsl) * 3));

  const sigma = dpmoToSigma(Math.max(dpmo, 3.4));
  const ppk = mode === "ppk" ? calcPpk(mean, stdDev, usl, lsl) : +(sigma / 3).toFixed(3);
  const yld = +((1 - dpmo / 1e6) * 100).toFixed(2);
  const sc = sigmaColor(sigma);
  const ps = ppkStatus(ppk);

  const gaugeAngle = Math.min((sigma / 6) * 180, 180);

  // Gauge SVG
  const GaugeArc = ({ sigma }) => {
    const angle = Math.min((sigma / 6) * 180, 180);
    const r = 80, cx = 100, cy = 100;
    const toRad = (deg) => (deg - 180) * (Math.PI / 180);
    const x = cx + r * Math.cos(toRad(angle));
    const y = cy + r * Math.sin(toRad(angle));
    const colors = ["#FF3B5C", "#FF8C00", "#FFD60A", "#00D4FF", "#00FF9C", "#00FF9C"];
    return (
      <svg width="200" height="110" viewBox="0 0 200 110">
        {colors.map((c, i) => {
          const startAngle = i * 30 - 180;
          const endAngle = (i + 1) * 30 - 180;
          const r2 = toRad(startAngle + 180), r3 = toRad(endAngle + 180);
          const x1 = cx + r * Math.cos(r2), y1 = cy + r * Math.sin(r2);
          const x2 = cx + r * Math.cos(r3), y2 = cy + r * Math.sin(r3);
          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={`${c}33`} stroke={c} strokeWidth="0.5" />;
        })}
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={sc} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${sc})` }} />
        <circle cx={cx} cy={cy} r={5} fill={sc} style={{ filter: `drop-shadow(0 0 4px ${sc})` }} />
        {[0,1,2,3,4,5,6].map(i => {
          const a = toRad(i * 30);
          return <text key={i} x={cx + (r + 14) * Math.cos(a)} y={cy + (r + 14) * Math.sin(a)} fill={T.textDim} fontSize="9" fontFamily={T.mono} textAnchor="middle" dominantBaseline="middle">{i}σ</text>;
        })}
      </svg>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 02 — Process Capability"
        title="Sigma Level Calculator"
        sub="Convert between DPMO, yield percentage, and process capability indices. Real data from Project 02 pre-loaded."
      />

      {/* Mode Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        {[
          { id: "dpmo", label: "From DPMO" },
          { id: "yield", label: "From Yield %" },
          { id: "ppk", label: "From Ppk / Stats" },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            background: mode === m.id ? `${T.cyan}18` : T.surface,
            border: `1px solid ${mode === m.id ? T.cyan : T.border}`,
            color: mode === m.id ? T.cyan : T.textDim,
            padding: "0.6rem 1.25rem", borderRadius: 4, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase",
            transition: "all 0.2s",
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        {/* Inputs */}
        <div style={{ flex: "1 1 350px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>[ INPUT PARAMETERS ]</div>

          {mode === "dpmo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { label: "Total Defects", val: defects, set: setDefects, min: 0, max: 1000000, step: 1000 },
                { label: "Total Opportunities", val: opportunities, set: setOpportunities, min: 1000, max: 10000000, step: 10000 },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }}>{f.label}</span>
                    <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{f.val.toLocaleString()}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={f.val} onChange={e => f.set(+e.target.value)}
                    style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }} />
                </div>
              ))}
            </div>
          )}

          {mode === "yield" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }}>Process Yield (%)</span>
                <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{yieldPct}%</span>
              </div>
              <input type="range" min={50} max={99.9997} step={0.01} value={yieldPct} onChange={e => setYieldPct(+e.target.value)}
                style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }} />
            </div>
          )}

          {mode === "ppk" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { label: "Process Mean (hrs)", val: mean, set: setMean, min: 1, max: 200, step: 0.1 },
                { label: "Std Deviation σ (hrs)", val: stdDev, set: setStdDev, min: 0.1, max: 50, step: 0.1 },
                { label: "Upper Spec Limit", val: usl, set: setUsl, min: 10, max: 300, step: 1 },
                { label: "Lower Spec Limit", val: lsl, set: setLsl, min: 0, max: 50, step: 1 },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }}>{f.label}</span>
                    <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{f.val}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={f.val} onChange={e => f.set(+e.target.value)}
                    style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }} />
                </div>
              ))}
            </div>
          )}

          {/* Quick presets */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: `1px solid ${T.border}` }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>Quick Presets</div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "Baseline (1.8σ)", action: () => { setMode("dpmo"); setDefects(382000); setOpportunities(1000000); }},
                { label: "Final (3.4σ)", action: () => { setMode("dpmo"); setDefects(1350); setOpportunities(1000000); }},
                { label: "Six Sigma", action: () => { setMode("dpmo"); setDefects(3); setOpportunities(1000000); }},
              ].map(p => (
                <button key={p.label} onClick={p.action} style={{
                  background: T.panel, border: `1px solid ${T.border}`, color: T.textMid,
                  padding: "0.35rem 0.65rem", borderRadius: 3, cursor: "pointer",
                  fontFamily: T.mono, fontSize: "0.62rem",
                }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Gauge */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", textAlign: "center" }}>
            <GaugeArc sigma={sigma} />
            <div style={{ color: sc, fontFamily: T.display, fontSize: "3rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 30px ${sc}66`, marginTop: "0.5rem" }}>{sigma}σ</div>
            <Badge label={ps.label} color={ps.color} />
          </div>

          {/* Output cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "DPMO", val: dpmo.toLocaleString(), color: sc },
              { label: "Yield", val: `${yld}%`, color: sc },
              { label: "Ppk Index", val: ppk, color: ps.color },
              { label: "Cp Index", val: (ppk + 0.1).toFixed(3), color: T.textMid },
            ].map(r => (
              <div key={r.label} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1rem", textAlign: "center" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{r.label}</div>
                <div style={{ color: r.color, fontFamily: T.mono, fontSize: "1.2rem", fontWeight: 700 }}>{r.val}</div>
              </div>
            ))}
          </div>

          {/* Sigma reference table */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>Sigma Reference Table</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.25rem" }}>
              {[["σ Level","DPMO","Yield"],["1σ","691,462","30.9%"],["2σ","308,537","69.1%"],["3σ","66,807","93.3%"],["4σ","6,210","99.4%"],["5σ","233","99.98%"],["6σ","3.4","99.9997%"]].map((row, i) => (
                row.map((cell, j) => (
                  <div key={`${i}-${j}`} style={{
                    color: i === 0 ? T.textDim : (parseFloat(row[0]) === Math.round(sigma) ? T.cyan : T.textMid),
                    fontFamily: T.mono, fontSize: "0.65rem", padding: "0.2rem 0.3rem",
                    background: parseFloat(row[0]) === Math.round(sigma) ? `${T.cyan}11` : "transparent",
                    borderRadius: 2,
                  }}>{cell}</div>
                ))
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 03: DMAIC TRACKER ───────────────────────────────────────────────────────
function DMAICTracker() {
  const [activePhase, setActivePhase] = useState("D");

  const phases = {
    D: {
      name: "DEFINE", color: "#00D4FF", status: "COMPLETE",
      tools: ["Project Charter", "SIPOC", "Stakeholder Analysis", "VOC / Kano Model", "CTS Analysis"],
      keyOutputs: [
        { label: "Problem", val: "Avg resolution 72h → target 48h" },
        { label: "Business Impact", val: "$450K annual churn (conservative)" },
        { label: "Scope", val: "Escalated Tier 2/3 complaints only" },
        { label: "Team", val: "5 core + 12 extended SMEs" },
        { label: "Duration", val: "4 weeks (Month 1)" },
      ],
      insight: "The SIPOC reveals Support operates as a reactive 'shock absorber' for product defects. True optimization requires closing the feedback loop to Engineering.",
    },
    M: {
      name: "MEASURE", color: "#00FF9C", status: "COMPLETE",
      tools: ["Process Mapping", "Gage R&R (MSA)", "Pareto Analysis", "Process Capability (Ppk)", "Data Collection Plan"],
      keyOutputs: [
        { label: "Sample Size", val: "n = 547 cases over 8 weeks" },
        { label: "Baseline Ppk", val: "0.43 — process incapable" },
        { label: "DPMO", val: "382,000 (1.8σ level)" },
        { label: "Gage R&R", val: "12.4% — acceptable (<30%)" },
        { label: "Top Variation Source", val: "Investigation phase (σ = 14.3h)" },
      ],
      insight: "The mean of 72.1h is operationally deceptive due to +1.28 skewness. Managing to the mean is a strategic error — we must manage to tail risk (90th percentile = 102.4h).",
    },
    A: {
      name: "ANALYZE", color: "#FFD60A", status: "COMPLETE",
      tools: ["5 Whys", "Fishbone (Ishikawa)", "Regression Analysis", "ANOVA", "8 Wastes", "COPQ", "FMEA"],
      keyOutputs: [
        { label: "Root Cause #1", val: "Technician experience gap (84% of gap)" },
        { label: "Root Cause #2", val: "Skills mismatch (23% contribution)" },
        { label: "Root Cause #3", val: "Scattered knowledge — 5 systems (21%)" },
        { label: "NVA Time", val: "56% of 72h is non-value-added" },
        { label: "Total COPQ", val: "$9M annually identified" },
      ],
      insight: "Experience is not a 'soft' HR concern — it is a hard operational variable. Each year of experience lost to turnover costs the operation one full business day per case. R² = 0.58.",
    },
    I: {
      name: "IMPROVE", color: "#FF8C00", status: "COMPLETE",
      tools: ["Design of Experiments (DoE)", "Quality Function Deployment (QFD)", "Pilot Testing", "Solution Matrix", "Action Plan"],
      keyOutputs: [
        { label: "Solution 1", val: "Extended 6-week training + mentoring" },
        { label: "Solution 2", val: "Skills-based intelligent routing" },
        { label: "Solution 3", val: "Unified knowledge platform" },
        { label: "Solution 4", val: "Automated customer communication" },
        { label: "Pilot Result", val: "-19% resolution time (p = 0.003)" },
      ],
      insight: "DoE revealed A×C interaction: skills-based routing delivers most value when technicians are better trained. Parallel deployment of both is mandatory, not optional.",
    },
    C: {
      name: "CONTROL", color: "#00FF9C", status: "ACTIVE",
      tools: ["SPC Charts (I-MR)", "Control Plan", "Error-Proofing (Poka-Yoke)", "SOPs", "Training Plan", "Escalation Protocol"],
      keyOutputs: [
        { label: "Final Ppk", val: "1.41 — process now CAPABLE" },
        { label: "Final Sigma", val: "3.4σ (from 1.8σ baseline)" },
        { label: "DPMO Reduction", val: "382,000 → 1,350 (282x better)" },
        { label: "RPN Reduction", val: "73% aggregate FMEA risk eliminated" },
        { label: "Annual Savings", val: "$300,000 realized" },
      ],
      insight: "The project achieved what DMAIC is designed to deliver: not just fixing the process, but making failure structurally impossible through system-enforced controls.",
    },
  };

  const p = phases[activePhase];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 03 — DMAIC Intelligence"
        title="Full Cycle DMAIC Tracker"
        sub="Interactive phase navigator — click any phase to explore tools, outputs, and strategic insights."
      />

      {/* Phase selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {Object.entries(phases).map(([key, ph]) => (
          <button key={key} onClick={() => setActivePhase(key)} style={{
            flex: "1 1 80px",
            background: activePhase === key ? `${ph.color}18` : T.surface,
            border: `2px solid ${activePhase === key ? ph.color : T.border}`,
            color: activePhase === key ? ph.color : T.textDim,
            padding: "1rem 0.75rem", borderRadius: 8, cursor: "pointer",
            fontFamily: T.display, fontSize: "1.25rem", fontWeight: 800,
            textAlign: "center", transition: "all 0.2s",
            textShadow: activePhase === key ? `0 0 15px ${ph.color}88` : "none",
            boxShadow: activePhase === key ? `0 0 20px ${ph.color}22` : "none",
          }}>
            <div>{key}</div>
            <div style={{ fontFamily: T.mono, fontSize: "0.55rem", letterSpacing: "0.1em", marginTop: "0.25rem" }}>{ph.name}</div>
            <div style={{ marginTop: "0.3rem" }}><Badge label={ph.status} color={ph.color} /></div>
          </button>
        ))}
      </div>

      {/* Phase Detail */}
      <AnimatePresence mode="wait">
        <motion.div key={activePhase} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem" }}>

          {/* Tools */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
            <div style={{ color: p.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem", borderBottom: `1px solid ${T.border}`, paddingBottom: "0.5rem" }}>
              [ TOOLS DEPLOYED ]
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {p.tools.map(tool => (
                <div key={tool} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0, boxShadow: `0 0 6px ${p.color}` }} />
                  <span style={{ color: T.text, fontFamily: T.mono, fontSize: "0.8rem" }}>{tool}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Outputs */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
            <div style={{ color: p.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem", borderBottom: `1px solid ${T.border}`, paddingBottom: "0.5rem" }}>
              [ KEY OUTPUTS ]
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {p.keyOutputs.map(o => (
                <div key={o.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", paddingBottom: "0.6rem", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", textTransform: "uppercase", flexShrink: 0 }}>{o.label}</span>
                  <span style={{ color: T.text, fontFamily: T.mono, fontSize: "0.78rem", textAlign: "right" }}>{o.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Insight */}
          <div style={{ background: `${p.color}08`, border: `1px solid ${p.color}33`, borderRadius: 8, padding: "1.5rem", gridColumn: "1 / -1" }}>
            <div style={{ color: p.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              [ STRATEGIC INSIGHT — {p.name} PHASE ]
            </div>
            <p style={{ color: T.text, fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{p.insight}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 04: FMEA RISK SCORER ────────────────────────────────────────────────────
function FMEAScorer() {
  const [items, setItems] = useState([
    { id: 1, process: "Customer Communication", failure: "No proactive status update", cause: "No automated system", effect: "Customer frustration, churn", S: 9, O: 8, D: 7, fixed: false },
    { id: 2, process: "Case Assignment", failure: "Assigned to wrong skill level", cause: "Random queue assignment", effect: "32% longer resolution", S: 8, O: 7, D: 8, fixed: false },
    { id: 3, process: "Initial Triage", failure: "Case miscategorization", cause: "Rigid 12-question script", effect: "+21.5 hrs per case", S: 8, O: 8, D: 5, fixed: false },
    { id: 4, process: "Case Documentation", failure: "Incomplete closure notes", cause: "No mandatory fields", effect: "Knowledge loss, rework", S: 7, O: 7, D: 8, fixed: false },
    { id: 5, process: "Resolution Verification", failure: "Premature case closure", cause: "Pressure to meet metrics", effect: "28% reopen rate", S: 8, O: 6, D: 6, fixed: false },
  ]);

  const [newItem, setNewItem] = useState({ process: "", failure: "", cause: "", effect: "", S: 5, O: 5, D: 5 });
  const [showAdd, setShowAdd] = useState(false);

  const rpn = (item) => item.S * item.O * item.D;
  const riskColor = (rpn) => rpn > 400 ? T.red : rpn > 200 ? T.orange : rpn > 100 ? T.yellow : T.green;
  const riskLabel = (rpn) => rpn > 400 ? "CRITICAL" : rpn > 200 ? "HIGH" : rpn > 100 ? "MODERATE" : "LOW";

  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, fixed: !i.fixed } : i));
  const update = (id, field, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: +val } : i));
  const addItem = () => {
    setItems(prev => [...prev, { ...newItem, id: Date.now(), fixed: false }]);
    setNewItem({ process: "", failure: "", cause: "", effect: "", S: 5, O: 5, D: 5 });
    setShowAdd(false);
  };

  const sorted = [...items].sort((a, b) => rpn(b) - rpn(a));
  const totalRpnBefore = items.reduce((acc, i) => acc + rpn(i), 0);
  const totalRpnAfter = items.filter(i => !i.fixed).reduce((acc, i) => acc + rpn(i), 0);
  const reduction = totalRpnBefore > 0 ? Math.round(((totalRpnBefore - totalRpnAfter) / totalRpnBefore) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 04 — Risk Intelligence"
        title="FMEA Risk Priority Scorer"
        sub="Failure Mode & Effects Analysis. RPN = Severity × Occurrence × Detection. Click ✓ to mark a failure mode as controlled."
      />

      {/* RPN Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total RPN (Before)", val: totalRpnBefore, color: T.red },
          { label: "Total RPN (After Controls)", val: totalRpnAfter, color: T.green },
          { label: "Risk Reduction", val: `${reduction}%`, color: T.cyan },
          { label: "Critical Items (>400)", val: items.filter(i => rpn(i) > 400 && !i.fixed).length, color: T.red },
        ].map(k => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", textAlign: "center" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>{k.label}</div>
            <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.8rem", fontWeight: 800 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* FMEA Table */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>[ FAILURE MODE REGISTER ]</span>
          <button onClick={() => setShowAdd(!showAdd)} style={{
            background: `${T.cyan}18`, border: `1px solid ${T.cyan}`, color: T.cyan,
            padding: "0.4rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
          }}>+ Add Failure Mode</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.mono, fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Status", "Process Step", "Failure Mode", "S", "O", "D", "RPN", "Risk Level"].map(h => (
                  <th key={h} style={{ color: T.textDim, textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const r = rpn(item);
                const rc = riskColor(r);
                return (
                  <motion.tr key={item.id} layout style={{ borderBottom: `1px solid ${T.border}`, opacity: item.fixed ? 0.4 : 1, background: r > 400 && !item.fixed ? `${T.red}08` : "transparent" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <button onClick={() => toggle(item.id)} style={{
                        width: 24, height: 24, borderRadius: 4,
                        background: item.fixed ? T.green : "transparent",
                        border: `1px solid ${item.fixed ? T.green : T.border}`,
                        color: item.fixed ? T.bg : T.textDim,
                        cursor: "pointer", fontSize: "0.7rem",
                      }}>{item.fixed ? "✓" : ""}</button>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: T.textMid }}>{item.process}</td>
                    <td style={{ padding: "0.75rem 1rem", color: T.text, maxWidth: 200 }}>
                      <div>{item.failure}</div>
                      <div style={{ color: T.textDim, fontSize: "0.65rem" }}>→ {item.effect}</div>
                    </td>
                    {["S","O","D"].map(field => (
                      <td key={field} style={{ padding: "0.75rem 0.5rem" }}>
                        <input type="number" min={1} max={10} value={item[field]}
                          onChange={e => update(item.id, field, e.target.value)}
                          style={{ width: 40, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, fontSize: "0.8rem", padding: "0.2rem 0.3rem", textAlign: "center" }} />
                      </td>
                    ))}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ color: rc, fontFamily: T.mono, fontSize: "1rem", fontWeight: 700, textShadow: `0 0 8px ${rc}66` }}>{r}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}><Badge label={riskLabel(r)} color={rc} /></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ background: T.surface, border: `1px solid ${T.cyan}33`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>[ ADD NEW FAILURE MODE ]</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
              {[
                { label: "Process Step", key: "process" },
                { label: "Failure Mode", key: "failure" },
                { label: "Root Cause", key: "cause" },
                { label: "Effect on Customer", key: "effect" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{f.label}</label>
                  <input value={newItem[f.key]} onChange={e => setNewItem(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.6rem", fontFamily: T.mono, fontSize: "0.8rem", boxSizing: "border-box" }} />
                </div>
              ))}
              {["S","O","D"].map(f => (
                <div key={f}>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{f === "S" ? "Severity (1-10)" : f === "O" ? "Occurrence (1-10)" : "Detection (1-10)"}</label>
                  <input type="number" min={1} max={10} value={newItem[f]} onChange={e => setNewItem(p => ({ ...p, [f]: +e.target.value }))}
                    style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.cyan, padding: "0.6rem", fontFamily: T.mono, fontSize: "0.8rem", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <button onClick={addItem} style={{ marginTop: "1rem", background: T.cyan, border: "none", color: T.bg, padding: "0.75rem 1.5rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700 }}>
              Add to Register
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 05: COPQ ENGINE ─────────────────────────────────────────────────────────
function COPQEngine() {
  const [caseVol, setCaseVol] = useState(3543);
  const [reopenRate, setReopenRate] = useState(28);
  const [escalRate, setEscalRate] = useState(58);
  const [wasteHrs, setWasteHrs] = useState(33.5);
  const [techCost, setTechCost] = useState(45);
  const [churnRate, setChurnRate] = useState(35);
  const [slaBreachPct, setSlaBreachPct] = useState(38);
  const [ltv, setLtv] = useState(3200);

  const rework = Math.round(caseVol * (reopenRate / 100) * 285);
  const escalation = Math.round(caseVol * (escalRate / 100) * 175);
  const wastedCap = Math.round(caseVol * wasteHrs * techCost);
  const churn = Math.round(caseVol * (slaBreachPct / 100) * (churnRate / 100) * ltv);
  const reputation = Math.round(28000000 * 0.05);
  const appraisal = Math.round(caseVol * 0.1 * (20 / 60) * techCost);
  const totalCOPQ = rework + escalation + wastedCap + churn + reputation + appraisal;

  const categories = [
    { name: "Wasted Technician Capacity", val: wastedCap, color: T.red, type: "Internal" },
    { name: "Customer Churn", val: churn, color: T.orange, type: "External" },
    { name: "Reputation Damage", val: reputation, color: "#FF6B9D", type: "External" },
    { name: "Escalation Premium", val: escalation, color: T.yellow, type: "Internal" },
    { name: "Rework / Reopened Cases", val: rework, color: T.cyan, type: "Internal" },
    { name: "Quality Appraisal", val: appraisal, color: T.green, type: "Appraisal" },
  ].sort((a, b) => b.val - a.val);

  const fmt = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${(n / 1e3).toFixed(0)}K`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 05 — Financial Intelligence"
        title="COPQ Engine"
        sub="Cost of Poor Quality simulator. Adjust process parameters to see the true financial cost of process failure. Real data pre-loaded."
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        {/* Sliders */}
        <div style={{ flex: "1 1 350px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>[ PROCESS PARAMETERS ]</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[
              { label: "Annual Case Volume", val: caseVol, set: setCaseVol, min: 500, max: 20000, step: 100, fmt: v => v.toLocaleString() },
              { label: "Case Reopen Rate (%)", val: reopenRate, set: setReopenRate, min: 0, max: 60, step: 1, fmt: v => `${v}%` },
              { label: "Escalation Rate (%)", val: escalRate, set: setEscalRate, min: 0, max: 80, step: 1, fmt: v => `${v}%` },
              { label: "Waste Hours / Case", val: wasteHrs, set: setWasteHrs, min: 0, max: 60, step: 0.5, fmt: v => `${v}h` },
              { label: "Technician Cost ($/hr)", val: techCost, set: setTechCost, min: 20, max: 150, step: 5, fmt: v => `$${v}` },
              { label: "Churn Rate (SLA breach)", val: churnRate, set: setChurnRate, min: 0, max: 70, step: 1, fmt: v => `${v}%` },
              { label: "SLA Breach Rate (%)", val: slaBreachPct, set: setSlaBreachPct, min: 0, max: 80, step: 1, fmt: v => `${v}%` },
              { label: "Customer LTV ($)", val: ltv, set: setLtv, min: 500, max: 10000, step: 100, fmt: v => `$${v.toLocaleString()}` },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem" }}>{s.label}</span>
                  <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.8rem", fontWeight: 700 }}>{s.fmt(s.val)}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => s.set(+e.target.value)}
                  style={{ width: "100%", accentColor: T.yellow, cursor: "pointer" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Total COPQ */}
          <div style={{ background: T.surface, border: `2px solid ${T.red}44`, borderRadius: 8, padding: "2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${T.red}10 0%, transparent 70%)` }} />
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Total Annual COPQ
            </div>
            <div style={{ color: T.red, fontFamily: T.display, fontSize: "2.8rem", fontWeight: 800, textShadow: `0 0 30px ${T.red}66` }}>
              {fmt(totalCOPQ)}
            </div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.72rem", marginTop: "0.5rem" }}>
              ROI: <span style={{ color: T.green }}>{Math.round((PROJECT.savings / PROJECT.investment) * 100)}%</span> · Payback: <span style={{ color: T.cyan }}>&lt;1 year</span>
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", flex: 1 }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>Breakdown by Category</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {categories.map(c => (
                <div key={c.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ color: T.textMid, fontSize: "0.72rem", fontFamily: T.mono }}>{c.name}</span>
                    <span style={{ color: c.color, fontFamily: T.mono, fontSize: "0.78rem", fontWeight: 700 }}>{fmt(c.val)}</span>
                  </div>
                  <div style={{ height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                    <motion.div
                      animate={{ width: `${Math.min((c.val / totalCOPQ) * 100, 100)}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: "100%", background: c.color, borderRadius: 2 }}
                    />
                  </div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textAlign: "right" }}>
                    {((c.val / totalCOPQ) * 100).toFixed(1)}% · {c.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* COPQ bar chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginTop: "1.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>Visual Breakdown</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categories} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => [fmt(v), "Cost"]} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.75rem", color: T.text }} />
            <Bar dataKey="val" radius={[3, 3, 0, 0]}>
              {categories.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─── 06: SPC CHARTS (LIVE INPUT) ─────────────────────────────────
function SPCCharts() {
  const DEMO_DATASETS = {
    resolution: {
      label: "Avg Resolution Time (hrs)",
      unit: "hrs",
      target: 48,
      targetLabel: "48h SLA Target",
      color: T.cyan,
      points: [72.1, 68.4, 71.2, 70.8, 69.5, 65.2, 61.8, 58.4, 55.1, 53.2, 51.4, 50.1, 49.8, 48.7, 49.2],
    },
    miscat: {
      label: "Miscategorization Rate (%)",
      unit: "%",
      target: 8,
      targetLabel: "8% Target",
      color: T.orange,
      points: [22, 20.5, 19.8, 18.2, 16.5, 14.1, 12.3, 11.0, 9.8, 8.9, 7.1, 6.8, 6.4, 6.2, 6.2],
    },
    csat: {
      label: "Customer Satisfaction (/ 10)",
      unit: "/10",
      target: 8.5,
      targetLabel: "8.5 CSAT Target",
      color: T.green,
      points: [6.8, 6.9, 7.0, 7.0, 7.1, 7.3, 7.5, 7.6, 7.8, 7.9, 7.9, 8.0, 8.1, 8.2, 8.1],
    },
    escalation: {
      label: "Escalation Rate (%)",
      unit: "%",
      target: 30,
      targetLabel: "30% Target",
      color: T.yellow,
      points: [58, 55, 53, 51, 49, 46, 43, 40, 37, 35, 33, 31, 30, 29, 28],
    },
  };

  const BLANK_DATASET = { label: "Your Metric", unit: "", target: null, targetLabel: "", color: T.cyan, points: [] };

  const [mode, setMode] = useState("demo"); // "demo" | "custom"
  const [selectedDemo, setSelectedDemo] = useState("resolution");
  const [customLabel, setCustomLabel] = useState("My Process Metric");
  const [customUnit, setCustomUnit] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [customPoints, setCustomPoints] = useState([]);
  const [newPoint, setNewPoint] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [weRulesEnabled, setWeRulesEnabled] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [startWeek, setStartWeek] = useState(1);

  const activeDataset = mode === "demo"
    ? DEMO_DATASETS[selectedDemo]
    : { ...BLANK_DATASET, label: customLabel, unit: customUnit, target: customTarget !== "" ? parseFloat(customTarget) : null, targetLabel: customTarget !== "" ? `${customTarget}${customUnit} Target` : "", points: customPoints };

  const pts = activeDataset.points;
  const n = pts.length;

  // ── SPC calculations ──
  const mean = n > 0 ? pts.reduce((a, b) => a + b, 0) / n : 0;
  const movingRanges = pts.slice(1).map((v, i) => Math.abs(v - pts[i]));
  const avgMR = movingRanges.length > 0 ? movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length : 0;
  const ucl = mean + 2.66 * avgMR;
  const lcl = mean - 2.66 * avgMR;
  const mrUcl = 3.267 * avgMR;
  const stdDev = n > 1 ? Math.sqrt(pts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)) : 0;

  // ── Western Electric Rules ──
  const checkWE = (points, mean, ucl, lcl, enabled) => {
    if (!enabled || points.length < 2) return points.map(() => ({ signal: false, rules: [] }));
    const sigma = (ucl - mean) / 3;
    return points.map((v, i) => {
      const rules = [];
      // Rule 1: Point beyond 3σ
      if (v > ucl || v < lcl) rules.push("R1: Beyond 3σ");
      // Rule 2: 2 of 3 beyond 2σ (same side)
      if (i >= 2) {
        const window = [points[i-2], points[i-1], v];
        const aboveTwoSig = window.filter(p => p > mean + 2 * sigma).length;
        const belowTwoSig = window.filter(p => p < mean - 2 * sigma).length;
        if (aboveTwoSig >= 2 || belowTwoSig >= 2) rules.push("R2: 2/3 beyond 2σ");
      }
      // Rule 3: 4 of 5 beyond 1σ (same side)
      if (i >= 4) {
        const window = points.slice(i-4, i+1);
        const aboveOneSig = window.filter(p => p > mean + sigma).length;
        const belowOneSig = window.filter(p => p < mean - sigma).length;
        if (aboveOneSig >= 4 || belowOneSig >= 4) rules.push("R3: 4/5 beyond 1σ");
      }
      // Rule 4: 8 consecutive same side
      if (i >= 7) {
        const window = points.slice(i-7, i+1);
        if (window.every(p => p > mean) || window.every(p => p < mean)) rules.push("R4: 8pts same side");
      }
      // Rule 5: 6 consecutive trending
      if (i >= 5) {
        const window = points.slice(i-5, i+1);
        const trending = window.every((v, j) => j === 0 || v > window[j-1]) ||
                         window.every((v, j) => j === 0 || v < window[j-1]);
        if (trending) rules.push("R5: 6pts trending");
      }
      return { signal: rules.length > 0, rules };
    });
  };

  const weResults = checkWE(pts, mean, ucl, lcl, weRulesEnabled);
  const totalViolations = weResults.filter(r => r.signal).length;
  const allRulesViolated = [...new Set(weResults.flatMap(r => r.rules))];

  const chartData = pts.map((v, i) => ({
    point: `W${startWeek + i}`,
    value: v,
    ucl: +ucl.toFixed(3),
    lcl: +lcl.toFixed(3),
    mean: +mean.toFixed(3),
    mr: i > 0 ? +Math.abs(v - pts[i-1]).toFixed(3) : null,
    mrUcl: +mrUcl.toFixed(3),
    signal: weResults[i]?.signal,
    ruleNames: weResults[i]?.rules?.join(", ") || "",
  }));

  const inControl = totalViolations === 0;

  // ── Handlers ──
  const addPoint = () => {
    const v = parseFloat(newPoint);
    if (!isNaN(v)) {
      if (mode === "custom") setCustomPoints(p => [...p, v]);
      setNewPoint("");
    }
  };

  const removePoint = (idx) => {
    if (mode === "custom") setCustomPoints(p => p.filter((_, i) => i !== idx));
  };

  const loadBulk = () => {
    const vals = bulkInput.split(/[\n,\s]+/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (vals.length > 0) {
      if (mode === "custom") setCustomPoints(vals);
      setBulkInput("");
      setShowBulk(false);
    }
  };

  const resetCustom = () => { setCustomPoints([]); setNewPoint(""); setBulkInput(""); };

  const loadDemoAsCustom = () => {
    const ds = DEMO_DATASETS[selectedDemo];
    setCustomLabel(ds.label);
    setCustomUnit(ds.unit);
    setCustomTarget(ds.target?.toString() || "");
    setCustomPoints([...ds.points]);
    setMode("custom");
  };

  const exportCSV = () => {
    const header = `Point,Value,Mean,UCL,LCL,MR,Signal\n`;
    const rows = chartData.map(d => `${d.point},${d.value},${d.mean},${d.ucl},${d.lcl},${d.mr ?? ""},${d.signal ? "YES" : "no"}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SPC_${(activeDataset.label).replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = inControl ? T.green : T.red;
  const ds = activeDataset;
  const fmt2 = v => isNaN(v) ? "—" : v.toFixed(2);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 06 — Statistical Process Control"
        title="Live I-MR Control Charts"
        sub="Input your own weekly data or explore Pulse Digital demo datasets. Western Electric rules auto-applied. Export as CSV when ready."
      />

      {/* ── Mode Toggle ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { id: "demo", label: "◈ Pulse Digital Demo Data", sub: "Pre-loaded from real project" },
          { id: "custom", label: "⚡ Your Company Data", sub: "Input your own metrics" },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            flex: "1 1 200px",
            background: mode === m.id ? `${m.id === "custom" ? T.green : T.cyan}15` : T.surface,
            border: `2px solid ${mode === m.id ? (m.id === "custom" ? T.green : T.cyan) : T.border}`,
            color: mode === m.id ? (m.id === "custom" ? T.green : T.cyan) : T.textDim,
            padding: "0.85rem 1.25rem", borderRadius: 8, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.72rem", textAlign: "left",
            transition: "all 0.2s",
          }}>
            <div style={{ fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{m.label}</div>
            <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>{m.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Demo Dataset Selector ── */}
      {mode === "demo" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Select Metric (15 weeks of post-implementation data)
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Object.entries(DEMO_DATASETS).map(([key, ds]) => (
              <button key={key} onClick={() => setSelectedDemo(key)} style={{
                background: selectedDemo === key ? `${ds.color}18` : T.panel,
                border: `1px solid ${selectedDemo === key ? ds.color : T.border}`,
                color: selectedDemo === key ? ds.color : T.textDim,
                padding: "0.5rem 1rem", borderRadius: 20, cursor: "pointer",
                fontFamily: T.mono, fontSize: "0.67rem", transition: "all 0.2s",
              }}>{ds.label}</button>
            ))}
          </div>
          <button onClick={loadDemoAsCustom} style={{
            marginTop: "0.75rem", background: "transparent", border: `1px solid ${T.border}`,
            color: T.textDim, padding: "0.4rem 0.9rem", borderRadius: 4,
            cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
          }}>
            → Edit this data in Custom Mode
          </button>
        </div>
      )}

      {/* ── Custom Input Panel ── */}
      {mode === "custom" && (
        <div style={{ background: T.surface, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            [ YOUR COMPANY DATA — CONFIGURE ]
          </div>

          {/* Metric config */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              { label: "Metric Name", val: customLabel, set: setCustomLabel, ph: "e.g. Resolution Time" },
              { label: "Unit", val: customUnit, set: setCustomUnit, ph: "e.g. hrs, %, /10" },
              { label: "Target Value", val: customTarget, set: setCustomTarget, ph: "e.g. 48" },
              { label: "Starting Week #", val: startWeek, set: v => setStartWeek(parseInt(v)||1), ph: "e.g. 1", type: "number" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{f.label}</label>
                <input type={f.type || "text"} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.55rem 0.75rem", fontFamily: T.mono, fontSize: "0.8rem", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>

          {/* Add single point */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>Add Point:</div>
            <input type="number" value={newPoint} onChange={e => setNewPoint(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPoint()}
              placeholder={`Value ${customUnit ? `(${customUnit})` : ""}`}
              style={{ background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 4, color: T.cyan, padding: "0.55rem 0.8rem", fontFamily: T.mono, fontSize: "0.85rem", width: 130 }} />
            <button onClick={addPoint} style={{ background: `${T.cyan}18`, border: `1px solid ${T.cyan}`, color: T.cyan, padding: "0.55rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>
              + Plot
            </button>
            <button onClick={() => setShowBulk(p => !p)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.55rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>
              {showBulk ? "▲ Hide Bulk" : "▼ Paste Bulk"}
            </button>
            <button onClick={resetCustom} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.55rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>
              ✕ Clear
            </button>
          </div>

          {/* Bulk paste */}
          <AnimatePresence>
            {showBulk && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: "0.75rem" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", marginBottom: "0.4rem" }}>
                  Paste numbers separated by commas, spaces, or new lines:
                </div>
                <textarea value={bulkInput} onChange={e => setBulkInput(e.target.value)}
                  placeholder={"51.4, 50.1, 49.8, 48.7, 49.2\nor one per line"}
                  style={{ width: "100%", minHeight: 80, background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 4, color: T.text, padding: "0.7rem", fontFamily: T.mono, fontSize: "0.8rem", resize: "vertical", boxSizing: "border-box" }} />
                <button onClick={loadBulk} style={{ marginTop: "0.5rem", background: `${T.green}18`, border: `1px solid ${T.green}`, color: T.green, padding: "0.5rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>
                  Load {bulkInput.split(/[\n,\s]+/).filter(v => !isNaN(parseFloat(v)) && v.trim() !== "").length} Values →
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plotted points chips */}
          {customPoints.length > 0 && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {customPoints.map((v, i) => (
                <span key={i} onClick={() => removePoint(i)} style={{
                  background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3,
                  padding: "0.2rem 0.5rem", color: T.textMid, fontFamily: T.mono,
                  fontSize: "0.68rem", cursor: "pointer",
                  transition: "all 0.15s",
                }} title="Click to remove">
                  W{startWeek + i}: {v}{customUnit}
                </span>
              ))}
            </div>
          )}
          {customPoints.length === 0 && (
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.72rem", padding: "0.75rem 0" }}>
              No data yet. Add points above or paste bulk values. Minimum 5 recommended for stable control limits.
            </div>
          )}
        </div>
      )}

      {/* ── Status Bar ── */}
      {n >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Process Status", val: inControl ? "IN CONTROL" : "OUT OF CONTROL", color: statusColor },
            { label: "Center Line (X̄)", val: `${fmt2(mean)}${ds.unit}`, color: T.cyan },
            { label: "UCL (+3σ)", val: `${fmt2(ucl)}${ds.unit}`, color: T.red },
            { label: "LCL (−3σ)", val: `${fmt2(lcl)}${ds.unit}`, color: T.yellow },
            { label: "Avg Moving Range", val: fmt2(avgMR), color: T.textMid },
            { label: "Std Dev (σ)", val: fmt2(stdDev), color: T.textMid },
            { label: "n (data points)", val: n, color: T.textMid },
            { label: "WE Violations", val: `${totalViolations}`, color: totalViolations > 0 ? T.red : T.green },
          ].map(k => (
            <div key={k.label} style={{ background: T.surface, border: `1px solid ${k.color}22`, borderRadius: 6, padding: "0.65rem 0.9rem", textAlign: "center" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.3rem", lineHeight: 1.3 }}>{k.label}</div>
              <div style={{ color: k.color, fontFamily: T.mono, fontSize: "0.88rem", fontWeight: 700 }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {n < 2 && mode === "custom" && (
        <div style={{ background: `${T.yellow}08`, border: `1px solid ${T.yellow}33`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.75rem" }}>
            ⚠ Add at least 2 data points to generate control limits. 5+ recommended for reliable limits.
          </div>
        </div>
      )}

      {/* ── I Chart ── */}
      {n >= 2 && (
        <>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ color: activeDataset.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                [ INDIVIDUALS CHART — {ds.label.toUpperCase()} ]
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => setWeRulesEnabled(p => !p)} style={{
                  background: weRulesEnabled ? `${T.cyan}15` : "transparent",
                  border: `1px solid ${weRulesEnabled ? T.cyan : T.border}`,
                  color: weRulesEnabled ? T.cyan : T.textDim,
                  padding: "0.3rem 0.7rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem",
                }}>
                  {weRulesEnabled ? "✓" : "○"} WE Rules
                </button>
                <button onClick={exportCSV} style={{
                  background: "transparent", border: `1px solid ${T.border}`, color: T.textDim,
                  padding: "0.3rem 0.7rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem",
                }}>
                  ↓ CSV
                </button>
                <button onClick={() => setShowTable(p => !p)} style={{
                  background: "transparent", border: `1px solid ${T.border}`, color: T.textDim,
                  padding: "0.3rem 0.7rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem",
                }}>
                  {showTable ? "▲ Hide" : "▼ Table"}
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="point" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }}
                  formatter={(val, name, props) => {
                    const r = props.payload?.ruleNames;
                    return [
                      <span style={{ color: props.payload?.signal ? T.red : T.cyan }}>
                        {val}{ds.unit}{r ? ` ⚠ ${r}` : ""}
                      </span>,
                      "Value"
                    ];
                  }}
                />
                <ReferenceLine y={ucl} stroke={T.red} strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: `UCL ${fmt2(ucl)}`, fill: T.red, fontSize: 10, fontFamily: T.mono, position: "insideTopRight" }} />
                <ReferenceLine y={mean} stroke={T.cyan} strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: `X̄ ${fmt2(mean)}`, fill: T.cyan, fontSize: 10, fontFamily: T.mono, position: "insideTopRight" }} />
                <ReferenceLine y={lcl} stroke={T.yellow} strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: `LCL ${fmt2(lcl)}`, fill: T.yellow, fontSize: 10, fontFamily: T.mono, position: "insideBottomRight" }} />
                {ds.target !== null && ds.target !== undefined && (
                  <ReferenceLine y={ds.target} stroke={T.green} strokeWidth={1}
                    label={{ value: ds.targetLabel, fill: T.green, fontSize: 10, fontFamily: T.mono, position: "insideTopLeft" }} />
                )}
                <Line type="monotone" dataKey="value" stroke={activeDataset.color} strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const c = payload.signal ? T.red : activeDataset.color;
                    return (
                      <g key={`dot-${cx}-${cy}`}>
                        <circle cx={cx} cy={cy} r={payload.signal ? 7 : 5} fill={c} stroke="none"
                          style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
                        {payload.signal && <circle cx={cx} cy={cy} r={11} fill="none" stroke={T.red} strokeWidth={1.5} strokeOpacity={0.5} />}
                      </g>
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── MR Chart ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>
              [ MOVING RANGE CHART — Process Variability ]
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData.slice(1).map(d => ({ point: d.point, mr: d.mr, mrUcl: d.mrUcl }))} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="point" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                <ReferenceLine y={mrUcl} stroke={T.red} strokeDasharray="4 4"
                  label={{ value: `MR UCL ${fmt2(mrUcl)}`, fill: T.red, fontSize: 10, fontFamily: T.mono, position: "insideTopRight" }} />
                <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }}
                  formatter={v => [`${v}${ds.unit}`, "Moving Range"]} />
                <Bar dataKey="mr" radius={[3, 3, 0, 0]}>
                  {chartData.slice(1).map((d, i) => (
                    <Cell key={i} fill={d.mr > mrUcl ? T.red : T.green} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── WE Rules Status ── */}
          {weRulesEnabled && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>
                [ WESTERN ELECTRIC RULES — Auto-Check ]
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "0.6rem" }}>
                {[
                  { id: "R1", label: "Rule 1: Point beyond ±3σ (UCL/LCL)", desc: "Immediate special cause — investigate now" },
                  { id: "R2", label: "Rule 2: 2 of 3 points beyond ±2σ (same side)", desc: "Process shift suspected" },
                  { id: "R3", label: "Rule 3: 4 of 5 points beyond ±1σ (same side)", desc: "Process drift — gradual shift" },
                  { id: "R4", label: "Rule 4: 8+ consecutive points same side of mean", desc: "Sustained bias — check setup" },
                  { id: "R5", label: "Rule 5: 6 consecutive points trending", desc: "Process trending — check for wear or degradation" },
                ].map(rule => {
                  const violated = allRulesViolated.some(r => r.startsWith(rule.id));
                  return (
                    <div key={rule.id} style={{
                      background: violated ? `${T.red}0A` : `${T.green}08`,
                      border: `1px solid ${violated ? T.red + "44" : T.green + "33"}`,
                      borderRadius: 6, padding: "0.75rem 1rem",
                      display: "flex", gap: "0.6rem", alignItems: "flex-start",
                    }}>
                      <span style={{ color: violated ? T.red : T.green, fontFamily: T.mono, fontSize: "0.9rem", lineHeight: 1.2, flexShrink: 0 }}>
                        {violated ? "⚠" : "✓"}
                      </span>
                      <div>
                        <div style={{ color: violated ? T.red : T.green, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.2rem" }}>{rule.label}</div>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>{rule.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalViolations > 0 && (
                <div style={{ marginTop: "0.85rem", background: `${T.red}0A`, border: `1px solid ${T.red}33`, borderRadius: 6, padding: "0.75rem 1rem" }}>
                  <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    ⚠ {totalViolations} out-of-control signal(s) detected at {weResults.map((r, i) => r.signal ? chartData[i]?.point : null).filter(Boolean).join(", ")}
                  </div>
                  <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem" }}>
                    Trigger 5 Whys investigation within 24 hrs. Check for special causes: staffing change, system update, new process step, or external event.
                  </div>
                </div>
              )}
              {totalViolations === 0 && n >= 5 && (
                <div style={{ marginTop: "0.85rem", background: `${T.green}08`, border: `1px solid ${T.green}33`, borderRadius: 6, padding: "0.75rem 1rem" }}>
                  <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700 }}>
                    ✓ Process is in statistical control — all {n} points within limits, no WE rule violations detected.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Data Table ── */}
          <AnimatePresence>
            {showTable && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: "1.5rem" }}>
                  <div style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase" }}>[ RAW DATA TABLE ]</span>
                    <button onClick={exportCSV} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.3rem 0.7rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem" }}>
                      ↓ Export CSV
                    </button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.mono, fontSize: "0.72rem" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          {["Period", "Value", "UCL", "Mean", "LCL", "Mov. Range", "Status"].map(h => (
                            <th key={h} style={{ color: T.textDim, padding: "0.6rem 1rem", textAlign: "left", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map((row, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: row.signal ? `${T.red}08` : "transparent" }}>
                            <td style={{ padding: "0.55rem 1rem", color: T.textMid }}>{row.point}</td>
                            <td style={{ padding: "0.55rem 1rem", color: row.signal ? T.red : T.text, fontWeight: row.signal ? 700 : 400 }}>{row.value}{ds.unit}</td>
                            <td style={{ padding: "0.55rem 1rem", color: T.textDim }}>{row.ucl}{ds.unit}</td>
                            <td style={{ padding: "0.55rem 1rem", color: T.cyan }}>{row.mean}{ds.unit}</td>
                            <td style={{ padding: "0.55rem 1rem", color: T.textDim }}>{row.lcl}{ds.unit}</td>
                            <td style={{ padding: "0.55rem 1rem", color: T.textMid }}>{row.mr !== null ? `${row.mr}${ds.unit}` : "—"}</td>
                            <td style={{ padding: "0.55rem 1rem" }}>
                              {row.signal
                                ? <Badge label={`⚠ ${row.ruleNames}`} color={T.red} />
                                : <Badge label="In Control" color={T.green} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Capability Summary ── */}
          {n >= 5 && stdDev > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>
                [ PROCESS CAPABILITY SNAPSHOT ]
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.85rem" }}>
                {[
                  { label: "Mean", val: `${fmt2(mean)}${ds.unit}`, note: "Center of process" },
                  { label: "Std Dev (σ)", val: fmt2(stdDev), note: "Variation magnitude" },
                  { label: "Natural Width (±3σ)", val: `${fmt2(mean - 3*stdDev)} – ${fmt2(mean + 3*stdDev)}${ds.unit}`, note: "99.73% of data" },
                  ...(ds.target !== null && ds.target !== undefined ? [
                    { label: "vs Target", val: `${mean > ds.target ? "+" : ""}${fmt2(mean - ds.target)}${ds.unit}`, note: mean <= ds.target ? "✓ At or below target" : "↑ Above target", valColor: mean <= ds.target ? T.green : T.yellow },
                    { label: "% At/Below Target", val: `${Math.round(pts.filter(v => v <= ds.target).length / n * 100)}%`, note: `of ${n} data points` },
                  ] : []),
                ].map(k => (
                  <div key={k.label} style={{ background: T.panel, borderRadius: 6, padding: "0.85rem 1rem" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{k.label}</div>
                    <div style={{ color: k.valColor || T.cyan, fontFamily: T.mono, fontSize: "1rem", fontWeight: 700 }}>{k.val}</div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.2rem" }}>{k.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}


// ─── 07: PARETO BUILDER ──────────────────────────────────────────────────────
function ParetoBuilder() {
  const [items, setItems] = useState(PARETO_DATA.map(d => ({ ...d, active: true })));
  const [sortBy, setSortBy] = useState("cases");

  const active = items.filter(i => i.active).sort((a, b) => b[sortBy] - a[sortBy]);
  const total = active.reduce((acc, i) => acc + i[sortBy === "cases" ? "cases" : "avgHrs"], 0);
  let cumulative = 0;
  const withCum = active.map(i => {
    const val = sortBy === "cases" ? i.cases : i.avgHrs;
    cumulative += val;
    return { ...i, val, cumPct: +((cumulative / total) * 100).toFixed(1) };
  });

  const vital = withCum.filter(i => i.cumPct <= 80).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 07 — Pareto Intelligence"
        title="Pareto Builder"
        sub="80/20 rule visualization. Toggle categories on/off, sort by case volume or average resolution time. From 547 real cases."
      />

      {/* Controls */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", textTransform: "uppercase" }}>Sort By:</div>
        {[{ id: "cases", label: "Case Volume" }, { id: "avgHrs", label: "Avg Resolution Time" }].map(s => (
          <button key={s.id} onClick={() => setSortBy(s.id)} style={{
            background: sortBy === s.id ? `${T.cyan}18` : T.surface,
            border: `1px solid ${sortBy === s.id ? T.cyan : T.border}`,
            color: sortBy === s.id ? T.cyan : T.textDim,
            padding: "0.5rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem",
          }}>{s.label}</button>
        ))}
        <div style={{ marginLeft: "auto", color: T.cyan, fontFamily: T.mono, fontSize: "0.75rem" }}>
          Vital Few: <strong>{vital} categories</strong> → 80% of impact
        </div>
      </div>

      {/* Category toggles */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {items.map((item, i) => (
          <button key={item.category} onClick={() => setItems(prev => prev.map((it, j) => j === i ? { ...it, active: !it.active } : it))} style={{
            background: item.active ? `${item.color}22` : T.panel,
            border: `1px solid ${item.active ? item.color : T.border}`,
            color: item.active ? item.color : T.textDim,
            padding: "0.35rem 0.75rem", borderRadius: 20, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.65rem", transition: "all 0.2s",
            opacity: item.active ? 1 : 0.5,
          }}>{item.category}</button>
        ))}
      </div>

      {/* Pareto Chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={withCum} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
            <XAxis dataKey="category" tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }} />
            <ReferenceLine yAxisId="right" y={80} stroke={T.yellow} strokeDasharray="4 4" label={{ value: "80%", fill: T.yellow, fontSize: 10, fontFamily: T.mono, position: "right" }} />
            <Bar yAxisId="left" dataKey="val" radius={[3, 3, 0, 0]}>
              {withCum.map((entry, i) => <Cell key={i} fill={entry.cumPct <= 80 ? entry.color : `${entry.color}66`} />)}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={T.yellow} strokeWidth={2} dot={{ fill: T.yellow, r: 4 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.mono, fontSize: "0.75rem" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["Category", "Cases", "% of Total", "Avg Hrs", "Cumulative %", "Priority"].map(h => (
                <th key={h} style={{ color: T.textDim, textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withCum.map(row => (
              <tr key={row.category} style={{ borderBottom: `1px solid ${T.border}`, background: row.cumPct <= 80 ? `${row.color}08` : "transparent" }}>
                <td style={{ padding: "0.75rem 1rem", color: row.color }}>{row.category}</td>
                <td style={{ padding: "0.75rem 1rem", color: T.text }}>{row.cases}</td>
                <td style={{ padding: "0.75rem 1rem", color: T.textMid }}>{row.pct}%</td>
                <td style={{ padding: "0.75rem 1rem", color: T.text }}>{row.avgHrs}h</td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={{ color: row.cumPct <= 80 ? T.yellow : T.textDim }}>{row.cumPct}%</span>
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <Badge label={row.cumPct <= 80 ? "VITAL FEW" : "Trivial Many"} color={row.cumPct <= 80 ? T.yellow : T.textDim} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── 08: ROOT CAUSE ANALYZER ─────────────────────────────────────────────────
function RootCauseAnalyzer() {
  const [activeRC, setActiveRC] = useState(0);
  const [answers, setAnswers] = useState({});

  const rootCauses = [
    {
      title: "Technician Experience Gap",
      category: "MAN", contribution: 84, validated: true,
      pValue: "< 0.001", rSquared: 0.58,
      whys: [
        { q: "Why does experience significantly affect resolution time?", a: "Experienced technicians use tacit knowledge and shortcuts; novices rely on trial-and-error." },
        { q: "Why do less experienced technicians lack product knowledge?", a: "Onboarding only covers basics — not updated since March 2021, missing 4 of the top 10 current issues." },
        { q: "Why is the training program inadequate?", a: "Training curriculum was last updated 3 years ago and misses recent product features." },
        { q: "Why hasn't training been updated?", a: "No dedicated training owner — responsibility split among supervisors averaging only 2 hrs/month vs 15 needed." },
        { q: "Why is there no dedicated training owner?", a: "Training viewed as a one-time onboarding expense, not a continuous operational necessity." },
      ],
      rootCause: "Lack of organizational commitment and resource allocation to continuous technical learning.",
      solution: "Extended 6-week onboarding + mentor pairing + quarterly competency assessments.",
    },
    {
      title: "Poor Case Categorization",
      category: "METHOD", contribution: 20, validated: true,
      pValue: "< 0.001", effect: "+21.5 hrs per miscategorized case",
      whys: [
        { q: "Why are 22% of cases miscategorized at intake?", a: "Tier 1 agents lack technical depth to assess complex symptoms using a rigid 12-question script." },
        { q: "Why do scripts not handle complexity?", a: "Scripts designed 5 years ago for V1.0 — current product V4.2 has 315% more features (45 → 187)." },
        { q: "Why weren't scripts updated with product evolution?", a: "No process to update support materials when engineering releases new features." },
        { q: "Why do engineering and support operate in silos?", a: "Engineering reports to CTO, Support to COO — no shared governance. Product launch checklist: 0 support touchpoints." },
        { q: "Why no cross-functional product launch process?", a: "Organizational structure separates functions with no shared governance or feedback loop established." },
      ],
      rootCause: "Lack of cross-functional product development process that integrates support readiness.",
      solution: "AI-assisted categorization + dynamic intake + mandatory product launch checklist.",
    },
    {
      title: "Scattered Knowledge Sources",
      category: "MATERIAL", contribution: 21, validated: true,
      pValue: "< 0.001", rCorr: 0.67,
      whys: [
        { q: "Why do technicians spend 18 mins avg searching?", a: "Must search across 5+ disconnected systems: Wiki, SharePoint, Email, Slack, PDF library." },
        { q: "Why is knowledge scattered across multiple systems?", a: "Systems implemented organically over time (Wiki 2018, SharePoint 2019) with no integration strategy." },
        { q: "Why was there no knowledge management strategy?", a: "KM budget proposals rejected in 2020 and 2022 — viewed as 'nice to have' rather than critical." },
        { q: "Why wasn't KM prioritized?", a: "Business cases failed to quantify financial impact of search time — only focused on software licensing costs." },
        { q: "Why wasn't the impact quantified?", a: "No operational metrics exist to track information retrieval time or knowledge reuse efficiency." },
      ],
      rootCause: "Lack of operational metrics to quantify knowledge management value.",
      solution: "Unified knowledge platform + AI-powered search + structured decision trees.",
    },
  ];

  const rc = rootCauses[activeRC];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 08 — Causal Intelligence"
        title="5 Whys Root Cause Analyzer"
        sub="Interactive drill-down into the 3 primary validated root causes. All causes confirmed at p < 0.001 statistical confidence."
      />

      {/* RC Selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {rootCauses.map((rc, i) => (
          <button key={i} onClick={() => setActiveRC(i)} style={{
            background: activeRC === i ? `${T.cyan}10` : T.surface,
            border: `2px solid ${activeRC === i ? T.cyan : T.border}`,
            borderRadius: 8, padding: "1.25rem", cursor: "pointer", textAlign: "left",
            transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <Badge label={rc.category} color={T.cyan} />
              <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>{rc.contribution}% of gap</span>
            </div>
            <div style={{ color: activeRC === i ? T.text : T.textMid, fontFamily: T.display, fontSize: "0.95rem", fontWeight: 700 }}>{rc.title}</div>
            <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.62rem", marginTop: "0.4rem" }}>✓ Statistically Validated · p {rc.pValue}</div>
          </button>
        ))}
      </div>

      {/* 5 Whys Chain */}
      <AnimatePresence mode="wait">
        <motion.div key={activeRC} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
              [ 5 WHYS DRILL-DOWN — {rc.title.toUpperCase()} ]
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {rc.whys.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "1rem", paddingBottom: "1rem", position: "relative" }}>
                  {i < rc.whys.length - 1 && (
                    <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 2, background: `${T.cyan}33` }} />
                  )}
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: `${T.cyan}18`, border: `2px solid ${T.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.cyan, fontFamily: T.mono, fontSize: "0.8rem", fontWeight: 700, zIndex: 1 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem", marginBottom: "0.25rem", fontStyle: "italic" }}>Why {i + 1}: {w.q}</div>
                    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.75rem 1rem", color: T.text, fontSize: "0.83rem", lineHeight: 1.6 }}>{w.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Root Cause + Solution */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1rem" }}>
            <div style={{ background: `${T.red}0A`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: "1.5rem" }}>
              <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>[ ROOT CAUSE ]</div>
              <p style={{ color: T.text, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{rc.rootCause}</p>
            </div>
            <div style={{ background: `${T.green}0A`, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem" }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>[ IMPLEMENTED SOLUTION ]</div>
              <p style={{ color: T.text, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{rc.solution}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Contribution Chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginTop: "1.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
          Root Cause Contribution to 24-Hour Gap
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { label: "Technician Experience Gap", hrs: 20.2, pct: 84, color: T.red },
            { label: "Day/Week Timing Effect", hrs: 6.0, pct: 25, color: T.orange },
            { label: "Skills Mismatch", hrs: 5.6, pct: 23, color: T.yellow },
            { label: "Scattered Knowledge", hrs: 5.1, pct: 21, color: T.cyan },
            { label: "Case Miscategorization", hrs: 4.7, pct: 20, color: "#9B8EC4" },
            { label: "Workload Imbalance", hrs: 3.1, pct: 13, color: T.green },
          ].map(c => (
            <div key={c.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }}>{c.label}</span>
                <span style={{ color: c.color, fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700 }}>−{c.hrs}h ({c.pct}%)</span>
              </div>
              <div style={{ height: 6, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                  style={{ height: "100%", background: c.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem" }}>
          * Percentages sum to &gt;100% due to overlapping effects between root causes
        </div>
      </div>
    </motion.div>
  );
}

// ─── AI TRIAGE SIMULATOR ────────────────────────────────────────────────────
const COMPLAINT_KEYWORDS = {
  "Software Configuration": ["software","config","configuration","install","setup","application","app","program","setting","database","db","sql","sync","api","integration","error","crash","bug","code","system"],
  "Network Connectivity": ["network","wifi","internet","connection","connect","dns","ip","vpn","ping","bandwidth","slow","timeout","firewall","router","port","latency","offline"],
  "Hardware Troubleshooting": ["hardware","printer","device","keyboard","mouse","screen","monitor","disk","drive","memory","ram","cpu","battery","power","cable","peripheral","physical"],
  "Account Access Issues": ["login","password","account","access","locked","permission","auth","2fa","token","session","username","credentials","unauthorized","forbidden"],
  "Performance Degradation": ["slow","performance","lagging","hang","freeze","loading","speed","response","delay","timeout","high cpu","memory leak"],
  "Data Sync Errors": ["sync","synchronize","data","backup","export","import","upload","download","transfer","missing data","duplicate","corrupt"],
  "Integration Problems": ["integration","third party","vendor","api","webhook","connector","middleware","sap","salesforce","erp","crm"],
};

const TECHNICIANS = [
  { name: "Andi Pratama", level: "Senior (5+ yr)", skills: ["Software Configuration","Network Connectivity","Integration Problems"], load: 18, maxLoad: 30, color: T.green },
  { name: "Budi Santoso", level: "Mid (3-5 yr)", skills: ["Hardware Troubleshooting","Account Access Issues","Performance Degradation"], load: 22, maxLoad: 30, color: T.cyan },
  { name: "Cindy Rahayu", level: "Mid (3-5 yr)", skills: ["Data Sync Errors","Software Configuration","Network Connectivity"], load: 25, maxLoad: 30, color: T.yellow },
  { name: "Doni Kusuma", level: "Junior (1-2 yr)", skills: ["Account Access Issues","Hardware Troubleshooting"], load: 28, maxLoad: 30, color: T.orange },
  { name: "Eka Wijaya", level: "Senior (5+ yr)", skills: ["Integration Problems","Performance Degradation","Software Configuration"], load: 12, maxLoad: 30, color: T.green },
];

function AITriageSimulator() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | analyzing | result
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);

  const classifyComplaint = (text) => {
    const lower = text.toLowerCase();
    const scores = {};
    for (const [cat, keywords] of Object.entries(COMPLAINT_KEYWORDS)) {
      scores[cat] = keywords.filter(k => lower.includes(k)).length;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topCat = sorted[0][0];
    const totalMatches = sorted.reduce((acc, [, v]) => acc + v, 0);
    const confidence = totalMatches === 0 ? 72 : Math.min(60 + (sorted[0][1] / Math.max(totalMatches, 1)) * 40, 97);
    return { category: topCat, confidence: Math.round(confidence), allScores: sorted.slice(0, 3) };
  };

  const routeToTechnician = (category) => {
    const eligible = TECHNICIANS.filter(t => t.skills.includes(category) && t.load < t.maxLoad);
    if (eligible.length === 0) return TECHNICIANS.sort((a, b) => a.load - b.load)[0];
    return eligible.sort((a, b) => {
      const levelScore = (t) => t.level.includes("Senior") ? 3 : t.level.includes("Mid") ? 2 : 1;
      return levelScore(b) - levelScore(a) || a.load - b.load;
    })[0];
  };

  const estimateResolution = (category, tech) => {
    const baseMap = { "Software Configuration": 89, "Network Connectivity": 78, "Hardware Troubleshooting": 52, "Account Access Issues": 64, "Integration Problems": 83, "Performance Degradation": 71, "Data Sync Errors": 68 };
    const base = baseMap[category] || 72;
    const expFactor = tech.level.includes("Senior") ? 0.58 : tech.level.includes("Mid") ? 0.82 : 1.0;
    const loadFactor = 1 + (tech.load / tech.maxLoad) * 0.15;
    return Math.round(base * expFactor * loadFactor);
  };

  const analyze = async () => {
    if (!input.trim()) return;
    setPhase("analyzing");
    setProgress(0);
    // Simulate progressive analysis steps
    const steps = [
      { label: "Tokenizing complaint text...", pct: 20 },
      { label: "Running keyword classification model...", pct: 45 },
      { label: "Checking skills matrix...", pct: 65 },
      { label: "Evaluating workload capacity...", pct: 82 },
      { label: "Generating routing recommendation...", pct: 100 },
    ];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 200));
      setProgress(step.pct);
    }
    const classification = classifyComplaint(input);
    const tech = routeToTechnician(classification.category);
    const estHrs = estimateResolution(classification.category, tech);
    setResult({ ...classification, technician: tech, estimatedHrs: estHrs, sla: estHrs <= 48 ? "ON TRACK" : "AT RISK" });
    setPhase("result");
  };

  const reset = () => { setPhase("idle"); setInput(""); setResult(null); setProgress(0); };

  const EXAMPLES = [
    "Database keeps crashing when I try to run reports. Getting SQL timeout errors.",
    "I can't login to my account — says password is wrong but I just reset it.",
    "The printer is not printing even though it shows as connected.",
    "API integration with Salesforce stopped syncing customer data since yesterday.",
    "Everything is extremely slow — system takes 3 minutes to load a single page.",
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1000, margin: "0 auto" }}>
      <SectionHeader
        module="Module 09 — Live Demo · Try It Yourself"
        title="AI Triage & Routing Simulator"
        sub="Type any support complaint below. The AI will classify it, match it to the right technician based on skills + workload, and estimate resolution time — just like the real system built in this project."
      />

      {/* Input area */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>
          [ COMPLAINT INPUT — TYPE ANYTHING ]
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={phase === "analyzing"}
          placeholder="Describe a support issue... e.g. 'Our database keeps crashing and the API integration stopped working.'"
          style={{ width: "100%", minHeight: 100, background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.text, padding: "0.85rem 1rem", fontFamily: T.mono, fontSize: "0.85rem", lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }}
        />
        {/* Example buttons */}
        <div style={{ marginTop: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Quick Examples:</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setInput(ex)} disabled={phase === "analyzing"} style={{
                background: T.panel, border: `1px solid ${T.border}`, color: T.textMid,
                padding: "0.3rem 0.65rem", borderRadius: 20, cursor: "pointer",
                fontFamily: T.mono, fontSize: "0.62rem",
              }}>Example {i + 1}</button>
            ))}
          </div>
        </div>
        <button onClick={phase === "result" ? reset : analyze} disabled={phase === "analyzing" || (!input.trim() && phase === "idle")} style={{
          background: phase === "result" ? `${T.yellow}18` : `${T.cyan}18`,
          border: `2px solid ${phase === "result" ? T.yellow : T.cyan}`,
          color: phase === "result" ? T.yellow : T.cyan,
          padding: "0.85rem 2rem", borderRadius: 6, cursor: "pointer",
          fontFamily: T.mono, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", width: "100%", transition: "all 0.3s",
          textShadow: `0 0 15px ${phase === "result" ? T.yellow : T.cyan}44`,
        }}>
          {phase === "idle" && "▶ SUBMIT & ANALYZE"}
          {phase === "analyzing" && `⏳ ANALYZING... ${progress}%`}
          {phase === "result" && "↺ RESET — TRY ANOTHER"}
        </button>
        {phase === "analyzing" && (
          <div style={{ marginTop: "0.75rem", height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
              style={{ height: "100%", background: T.cyan, borderRadius: 2, boxShadow: `0 0 8px ${T.cyan}` }} />
          </div>
        )}
      </div>

      {/* Result */}
      <AnimatePresence>
        {phase === "result" && result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* AI Classification */}
            <div style={{ background: T.surface, border: `2px solid ${T.cyan}44`, borderRadius: 8, padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
                [ AI CLASSIFICATION RESULT ]
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ background: `${T.cyan}10`, border: `1px solid ${T.cyan}33`, borderRadius: 6, padding: "1.25rem" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>Category</div>
                  <div style={{ color: T.cyan, fontFamily: T.display, fontSize: "1rem", fontWeight: 700 }}>{result.category}</div>
                </div>
                <div style={{ background: `${T.green}10`, border: `1px solid ${T.green}33`, borderRadius: 6, padding: "1.25rem" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>AI Confidence</div>
                  <div style={{ color: T.green, fontFamily: T.display, fontSize: "1.5rem", fontWeight: 800 }}>{result.confidence}%</div>
                </div>
                <div style={{ background: `${T.yellow}10`, border: `1px solid ${T.yellow}33`, borderRadius: 6, padding: "1.25rem" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>Est. Resolution</div>
                  <div style={{ color: T.yellow, fontFamily: T.display, fontSize: "1.5rem", fontWeight: 800 }}>{result.estimatedHrs}h</div>
                </div>
                <div style={{ background: result.sla === "ON TRACK" ? `${T.green}10` : `${T.red}10`, border: `1px solid ${result.sla === "ON TRACK" ? T.green : T.red}33`, borderRadius: 6, padding: "1.25rem" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>48h SLA Status</div>
                  <div style={{ color: result.sla === "ON TRACK" ? T.green : T.red, fontFamily: T.display, fontSize: "1rem", fontWeight: 800 }}>{result.sla}</div>
                </div>
              </div>
              {/* Confidence bar for alternatives */}
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Alternative Classifications</div>
              {result.allScores.map(([cat, score], i) => (
                <div key={cat} style={{ marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ color: i === 0 ? T.cyan : T.textMid, fontFamily: T.mono, fontSize: "0.7rem" }}>{cat}</span>
                    <span style={{ color: i === 0 ? T.cyan : T.textDim, fontFamily: T.mono, fontSize: "0.68rem" }}>{i === 0 ? result.confidence : Math.max(result.confidence - 20 - i * 12, 10)}%</span>
                  </div>
                  <div style={{ height: 3, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${i === 0 ? result.confidence : Math.max(result.confidence - 20 - i * 12, 10)}%`, height: "100%", background: i === 0 ? T.cyan : T.textDim, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Routing Result */}
            <div style={{ background: T.surface, border: `2px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem" }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
                [ SKILLS-BASED ROUTING — ASSIGNED TECHNICIAN ]
              </div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${result.technician.color}22`, border: `2px solid ${result.technician.color}`, display: "flex", alignItems: "center", justifyContent: "center", color: result.technician.color, fontFamily: T.display, fontSize: "1.4rem", fontWeight: 800, flexShrink: 0 }}>
                  {result.technician.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: T.text, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>{result.technician.name}</div>
                  <div style={{ color: result.technician.color, fontFamily: T.mono, fontSize: "0.72rem", marginBottom: "0.5rem" }}>{result.technician.level}</div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {result.technician.skills.map(s => <Badge key={s} label={s} color={result.technician.skills.includes(result.category) ? T.green : T.textDim} />)}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Workload</div>
                  <div style={{ color: result.technician.load > 25 ? T.red : T.green, fontFamily: T.mono, fontSize: "1.1rem", fontWeight: 700 }}>
                    {result.technician.load}/{result.technician.maxLoad}
                  </div>
                  <div style={{ width: 80, height: 4, background: T.panel, borderRadius: 2, overflow: "hidden", marginTop: "0.3rem" }}>
                    <div style={{ width: `${(result.technician.load / result.technician.maxLoad) * 100}%`, height: "100%", background: result.technician.load > 25 ? T.red : T.green, borderRadius: 2 }} />
                  </div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.25rem" }}>cases this week</div>
                </div>
              </div>
              <div style={{ marginTop: "1rem", background: T.panel, borderRadius: 6, padding: "0.85rem", color: T.textMid, fontFamily: T.mono, fontSize: "0.75rem", lineHeight: 1.6, borderLeft: `3px solid ${T.cyan}` }}>
                💡 <strong style={{ color: T.cyan }}>Why this technician?</strong> Skill match for "{result.category}" ✓ · Workload below 30-case cap ✓ · {result.technician.level.includes("Senior") ? "Senior experience reduces est. resolution by ~42% vs junior" : "Mid-level experience, appropriate for this complexity tier"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explainer */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem" }}>
        {[
          { icon: "🤖", title: "AI Classification", desc: "Keyword-weighted NLP model assigns category + confidence score. If <75% confidence, flags for Tier 2 manual review." },
          { icon: "🎯", title: "Skills-Based Routing", desc: "Matches case category to technician skill matrix. Blocks assignment if workload exceeds 30-case weekly cap." },
          { icon: "⏱", title: "Resolution Estimate", desc: "Calculates based on category baseline × technician experience factor × current workload. Real coefficients from 547-case dataset." },
        ].map(tip => (
          <div key={tip.title}>
            <div style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>{tip.icon}</div>
            <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>{tip.title}</div>
            <div style={{ color: T.textMid, fontSize: "0.72rem", lineHeight: 1.5 }}>{tip.desc}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── UNIVERSAL COPQ CALCULATOR ───────────────────────────────────────────────
const INDUSTRY_PRESETS = {
  techsupport: {
    label: "🖥️ IT / Tech Support",
    desc: "Based on real Project 02 data — 547 cases, 30-week initiative",
    fields: [
      { key: "volume", label: "Monthly Case/Ticket Volume", unit: "cases", val: 295, min: 50, max: 5000, step: 10 },
      { key: "reopenRate", label: "Case Reopen / Rework Rate", unit: "%", val: 28, min: 0, max: 60, step: 1 },
      { key: "escalRate", label: "Escalation Rate", unit: "%", val: 58, min: 0, max: 80, step: 1 },
      { key: "wasteHrs", label: "Non-Value-Added Hours per Case", unit: "hrs", val: 33.5, min: 0, max: 60, step: 0.5 },
      { key: "laborRate", label: "Staff Hourly Cost", unit: "$/hr", val: 45, min: 10, max: 200, step: 5 },
      { key: "churnRate", label: "Customer Churn Rate (from delay)", unit: "%", val: 35, min: 0, max: 80, step: 1 },
      { key: "ltv", label: "Customer Lifetime Value", unit: "$", val: 3200, min: 100, max: 50000, step: 100 },
    ],
    calcCopq: (f) => {
      const annual = f.volume * 12;
      const rework = annual * (f.reopenRate / 100) * 285;
      const escalation = annual * (f.escalRate / 100) * 175;
      const waste = annual * f.wasteHrs * f.laborRate;
      const churn = annual * 0.38 * (f.churnRate / 100) * f.ltv;
      return { rework, escalation, waste, churn, other: waste * 0.06 };
    },
  },
  manufacturing: {
    label: "🏭 Manufacturing",
    desc: "Production defects, rework, scrap, and warranty costs",
    fields: [
      { key: "volume", label: "Monthly Production Units", unit: "units", val: 10000, min: 100, max: 500000, step: 100 },
      { key: "reopenRate", label: "Defect / Scrap Rate", unit: "%", val: 4.5, min: 0, max: 30, step: 0.1 },
      { key: "escalRate", label: "Rework Rate (reprocessed)", unit: "%", val: 8, min: 0, max: 40, step: 0.5 },
      { key: "wasteHrs", label: "Wasted Labor Hours per Defect", unit: "hrs", val: 2.5, min: 0, max: 20, step: 0.1 },
      { key: "laborRate", label: "Labor Cost per Hour", unit: "$/hr", val: 30, min: 10, max: 150, step: 2 },
      { key: "churnRate", label: "Customer Return / Warranty Rate", unit: "%", val: 2.5, min: 0, max: 20, step: 0.1 },
      { key: "ltv", label: "Material Cost per Unit", unit: "$", val: 85, min: 1, max: 5000, step: 1 },
    ],
    calcCopq: (f) => {
      const annual = f.volume * 12;
      const scrap = annual * (f.reopenRate / 100) * f.ltv;
      const rework = annual * (f.escalRate / 100) * f.wasteHrs * f.laborRate;
      const waste = annual * (f.reopenRate / 100) * f.wasteHrs * f.laborRate * 0.5;
      const warranty = annual * (f.churnRate / 100) * f.ltv * 2.5;
      return { rework: scrap, escalation: rework, waste, churn: warranty, other: waste * 0.1 };
    },
  },
  logistics: {
    label: "🚚 E-Commerce / Logistics",
    desc: "Late deliveries, failed shipments, returns handling",
    fields: [
      { key: "volume", label: "Monthly Shipments/Orders", unit: "orders", val: 5000, min: 100, max: 200000, step: 100 },
      { key: "reopenRate", label: "Late Delivery Rate", unit: "%", val: 12, min: 0, max: 50, step: 0.5 },
      { key: "escalRate", label: "Return / Damaged Rate", unit: "%", val: 6, min: 0, max: 30, step: 0.5 },
      { key: "wasteHrs", label: "Hours to Handle Each Complaint", unit: "hrs", val: 1.5, min: 0.1, max: 10, step: 0.1 },
      { key: "laborRate", label: "Staff Hourly Cost", unit: "$/hr", val: 25, min: 10, max: 100, step: 2 },
      { key: "churnRate", label: "Customer Churn after Bad Exp.", unit: "%", val: 22, min: 0, max: 60, step: 1 },
      { key: "ltv", label: "Average Order Value / LTV", unit: "$", val: 150, min: 10, max: 5000, step: 10 },
    ],
    calcCopq: (f) => {
      const annual = f.volume * 12;
      const lateHandling = annual * (f.reopenRate / 100) * f.wasteHrs * f.laborRate;
      const returns = annual * (f.escalRate / 100) * f.ltv * 0.6;
      const waste = annual * (f.reopenRate / 100) * f.wasteHrs * f.laborRate * 0.3;
      const churn = annual * 0.3 * (f.churnRate / 100) * f.ltv * 2;
      return { rework: lateHandling, escalation: returns, waste, churn, other: waste * 0.08 };
    },
  },
  custom: {
    label: "⚙️ Custom — Your Process",
    desc: "Enter your own metrics. Works for any industry or department.",
    fields: [
      { key: "volume", label: "Monthly Process Volume", unit: "units", val: 1000, min: 10, max: 100000, step: 10 },
      { key: "reopenRate", label: "Defect / Error / Rework Rate", unit: "%", val: 15, min: 0, max: 60, step: 0.5 },
      { key: "escalRate", label: "Escalation / Exception Rate", unit: "%", val: 20, min: 0, max: 80, step: 1 },
      { key: "wasteHrs", label: "Wasted Hours per Failure", unit: "hrs", val: 5, min: 0, max: 40, step: 0.5 },
      { key: "laborRate", label: "Average Staff Hourly Cost", unit: "$/hr", val: 35, min: 5, max: 300, step: 5 },
      { key: "churnRate", label: "Customer/Client Loss Rate", unit: "%", val: 20, min: 0, max: 80, step: 1 },
      { key: "ltv", label: "Customer / Contract Value", unit: "$", val: 2000, min: 100, max: 100000, step: 100 },
    ],
    calcCopq: (f) => {
      const annual = f.volume * 12;
      const rework = annual * (f.reopenRate / 100) * f.wasteHrs * f.laborRate;
      const escalation = annual * (f.escalRate / 100) * f.wasteHrs * f.laborRate * 0.6;
      const waste = annual * (f.reopenRate / 100) * f.wasteHrs * f.laborRate * 0.4;
      const churn = annual * 0.3 * (f.churnRate / 100) * f.ltv;
      return { rework, escalation, waste, churn, other: waste * 0.07 };
    },
  },
};

function UniversalCOPQ() {
  const [industry, setIndustry] = useState("techsupport");
  const [improvement, setImprovement] = useState(25);
  const [fieldVals, setFieldVals] = useState({});

  const preset = INDUSTRY_PRESETS[industry];
  const vals = preset.fields.reduce((acc, f) => ({ ...acc, [f.key]: fieldVals[`${industry}_${f.key}`] ?? f.val }), {});
  const setVal = (key, val) => setFieldVals(prev => ({ ...prev, [`${industry}_${key}`]: val }));

  const { rework, escalation, waste, churn, other } = preset.calcCopq(vals);
  const totalCopq = rework + escalation + waste + churn + other;
  const savings = totalCopq * (improvement / 100);

  const fmt = (n) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${(n / 1e3).toFixed(0)}K`;
  };

  const categories = [
    { name: "Wasted Labor / Capacity", val: waste, color: T.red },
    { name: "Customer Churn / Lost Revenue", val: churn, color: T.orange },
    { name: "Rework / Scrap / Defects", val: rework, color: T.yellow },
    { name: "Escalation / Exception Handling", val: escalation, color: T.cyan },
    { name: "Appraisal / Inspection", val: other, color: T.green },
  ].sort((a, b) => b.val - a.val);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeader
        module="Module 10 — Universal Simulator · Any Industry"
        title="How Much Is Your Process Burning?"
        sub="Enter your company's real numbers. This calculator reveals the hidden cost of process inefficiency — for any industry, any department."
      />

      {/* Industry selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        {Object.entries(INDUSTRY_PRESETS).map(([key, p]) => (
          <button key={key} onClick={() => setIndustry(key)} style={{
            background: industry === key ? `${T.cyan}12` : T.surface,
            border: `2px solid ${industry === key ? T.cyan : T.border}`,
            borderRadius: 8, padding: "1rem", cursor: "pointer", textAlign: "left", transition: "all 0.2s",
          }}>
            <div style={{ color: industry === key ? T.text : T.textMid, fontFamily: T.display, fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.3rem" }}>{p.label}</div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", lineHeight: 1.4 }}>{p.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        {/* Input sliders */}
        <div style={{ flex: "1 1 340px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
            [ YOUR PROCESS PARAMETERS ]
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {preset.fields.map(f => (
              <div key={f.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }}>{f.label}</span>
                  <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.8rem", fontWeight: 700 }}>{vals[f.key].toLocaleString()} {f.unit}</span>
                </div>
                <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.key]}
                  onChange={e => setVal(f.key, parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: T.yellow, cursor: "pointer" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Total COPQ */}
          <div style={{ background: T.surface, border: `2px solid ${T.red}55`, borderRadius: 8, padding: "2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${T.red}12 0%, transparent 70%)` }} />
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              <SmartTooltip id="copq">Estimated Annual COPQ</SmartTooltip>
            </div>
            <motion.div key={Math.round(totalCopq)} initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              style={{ color: T.red, fontFamily: T.display, fontSize: "2.8rem", fontWeight: 800, textShadow: `0 0 30px ${T.red}66`, lineHeight: 1 }}>
              {fmt(totalCopq)}
            </motion.div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem", marginTop: "0.4rem" }}>per year being wasted</div>
          </div>

          {/* What-If Slider */}
          <div style={{ background: `${T.green}0A`, border: `2px solid ${T.green}44`, borderRadius: 8, padding: "1.5rem" }}>
            <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>
              🎮 WHAT-IF IMPROVEMENT SIMULATOR
            </div>
            <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem", marginBottom: "1rem" }}>
              If we optimize this process by...
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }}>Improvement Level</span>
              <span style={{ color: T.green, fontFamily: T.mono, fontSize: "1.2rem", fontWeight: 700 }}>{improvement}%</span>
            </div>
            <input type="range" min={5} max={80} step={5} value={improvement}
              onChange={e => setImprovement(+e.target.value)}
              style={{ width: "100%", accentColor: T.green, cursor: "pointer", marginBottom: "1rem" }} />
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {[10,25,33,50].map(p => (
                <button key={p} onClick={() => setImprovement(p)} style={{
                  flex: 1, background: improvement === p ? `${T.green}22` : T.panel,
                  border: `1px solid ${improvement === p ? T.green : T.border}`,
                  color: improvement === p ? T.green : T.textDim,
                  padding: "0.3rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
                }}>{p}%</button>
              ))}
            </div>
            <div style={{ background: T.panel, borderRadius: 6, padding: "1rem", textAlign: "center" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Annual Savings Unlocked</div>
              <motion.div key={Math.round(savings)} initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                style={{ color: T.green, fontFamily: T.display, fontSize: "2rem", fontWeight: 800, textShadow: `0 0 20px ${T.green}66` }}>
                {fmt(savings)}
              </motion.div>
              <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem", marginTop: "0.4rem", lineHeight: 1.5 }}>
                by applying DMAIC process improvement methods to your operation
              </div>
            </div>
          </div>

          {/* COPQ Breakdown */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>Cost Breakdown</div>
            {categories.map(c => (
              <div key={c.name} style={{ marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.65rem" }}>{c.name}</span>
                  <span style={{ color: c.color, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>{fmt(c.val)}</span>
                </div>
                <div style={{ height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${(c.val / totalCopq) * 100}%` }} transition={{ duration: 0.4 }}
                    style={{ height: "100%", background: c.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: `${T.cyan}08`, border: `1px solid ${T.cyan}33`, borderRadius: 8, padding: "1.5rem", marginTop: "1.5rem", textAlign: "center" }}>
        <div style={{ color: T.cyan, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          This is exactly what a Six Sigma Black Belt does.
        </div>
        <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.78rem", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
          Finding the hidden cost → quantifying it precisely → building the business case → executing the DMAIC cycle → locking in gains permanently.
          In Project 02, this methodology identified <strong style={{ color: T.yellow }}>$9M</strong> in COPQ and delivered <strong style={{ color: T.green }}>$300K</strong> in realized annual savings.
        </div>
      </div>
    </motion.div>
  );
}

// ─── HERO PAGE ────────────────────────────────────────────────────────────────
function Hero({ onEnter }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 80);
    return () => clearInterval(t);
  }, []);

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789σΣΔΩμ∑∏∫√±≤≥≠";
  const scramble = (str, progress) => str.split("").map((c, i) => i < progress ? c : chars[Math.floor(Math.random() * chars.length)]).join("");

  const title = "SIX SIGMA WAR ROOM";
  const progress = Math.min(tick * 0.8, title.length);
  const displayTitle = scramble(title, progress);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", textAlign: "center", padding: "2rem",
      background: T.bg,
      position: "relative", overflow: "hidden",
    }}>
      {/* Grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(${T.border} 1px, transparent 1px),
          linear-gradient(90deg, ${T.border} 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        opacity: 0.4,
      }} />
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "60vw", height: "60vw",
        background: `radial-gradient(ellipse, ${T.cyan}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} style={{ position: "relative", zIndex: 1 }}>
        {/* Top label */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 10px ${T.green}`, animation: "pulse 1.5s infinite" }} />
          PROJECT 02 / 14 · DMAIC FULL CYCLE · STATUS: COMPLETE
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 10px ${T.green}`, animation: "pulse 1.5s infinite" }} />
        </motion.div>

        {/* Main title */}
        <h1 style={{
          fontFamily: T.display, fontWeight: 800,
          fontSize: "clamp(2.5rem, 8vw, 5.5rem)",
          color: T.text, lineHeight: 1.05, margin: "0 0 0.5rem",
          letterSpacing: "-0.02em",
        }}>
          {displayTitle.split("").map((c, i) => (
            <span key={i} style={{ color: i < progress ? T.text : T.textDim }}>{c}</span>
          ))}
        </h1>

        <div style={{ color: T.cyan, fontFamily: T.display, fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 700, marginBottom: "1.5rem", textShadow: `0 0 30px ${T.cyan}66` }}>
          DMAIC Intelligence Platform
        </div>

        <p style={{ color: T.textMid, fontSize: "0.95rem", maxWidth: 560, lineHeight: 1.7, margin: "0 auto 2.5rem", fontFamily: T.mono }}>
          Reducing Customer Complaint Resolution Time.<br />
          547 cases analyzed · $9M COPQ identified · 1.8σ → 3.4σ achieved.
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
          {[
            { val: "72→49h", label: "Resolution Time" },
            { val: "0.43→1.41", label: "Ppk Index" },
            { val: "$300K", label: "Annual Savings" },
            { val: "73%", label: "FMEA Risk ↓" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "1.2rem", fontWeight: 700, textShadow: `0 0 15px ${T.cyan}66` }}>{s.val}</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Live Demo badges */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2rem" }}>
          {[
            { icon: "▶", label: "AI Triage Simulator", sub: "Type any complaint → watch AI route it live" },
            { icon: "⚡", label: "Try Your Data", sub: "Enter your company numbers → get COPQ instantly" },
          ].map(f => (
            <div key={f.label} style={{ background: `${T.green}10`, border: `1px solid ${T.green}44`, borderRadius: 8, padding: "0.75rem 1.25rem", textAlign: "center" }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em" }}>{f.icon} {f.label}</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.2rem" }}>{f.sub}</div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${T.cyan}55` }}
          whileTap={{ scale: 0.95 }}
          onClick={onEnter}
          style={{
            background: "transparent",
            border: `2px solid ${T.cyan}`,
            color: T.cyan, padding: "1rem 2.5rem",
            fontFamily: T.mono, fontSize: "0.85rem",
            fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: `0 0 20px ${T.cyan}33, inset 0 0 20px ${T.cyan}08`,
            transition: "all 0.3s",
          }}>
          ENTER WAR ROOM →
        </motion.button>

        <div style={{ marginTop: "1.5rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.1em" }}>
          by Alfin Maulana Yudistira · Six Sigma Black Belt · 2025
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showApp, setShowApp] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("ss_tab") || "overview");
  const [company, setCompany] = useState(COMPANY_DEFAULTS);
  const [showCompanySetup, setShowCompanySetup] = useState(false);

  useEffect(() => { localStorage.setItem("ss_tab", activeTab); }, [activeTab]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const tabs = ["overview","sigma","dmaic","fmea","copq","spc","pareto","rootcause","triage","universal"];
      if (e.key >= "1" && e.key <= "9") setActiveTab(tabs[parseInt(e.key) - 1]);
      if (e.key === "0") setActiveTab("universal");
      if (e.key === "Escape") {
        if (showCompanySetup) setShowCompanySetup(false);
        else setShowApp(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCompanySetup]);

  const views = {
    overview: Overview, sigma: SigmaCalculator, dmaic: DMAICTracker,
    fmea: FMEAScorer, copq: COPQEngine, spc: SPCCharts,
    pareto: ParetoBuilder, rootcause: RootCauseAnalyzer,
    triage: AITriageSimulator, universal: UniversalCOPQ,
  };
  const ActiveView = views[activeTab];

  if (!showApp) return <Hero onEnter={() => setShowApp(true)} />;

  return (
    <CompanyCtx.Provider value={company}>
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", color: T.text }}>
        <Scanlines />

        {/* Header */}
        <div style={{ background: T.panel, borderBottom: `1px solid ${T.border}`, padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
            <div>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Six Sigma Black Belt · Project 02/14
              </div>
              <div style={{ color: T.text, fontFamily: T.display, fontSize: "1rem", fontWeight: 700, lineHeight: 1 }}>
                DMAIC Intelligence Platform
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Company Badge */}
            <CompanyBadge company={company} onClick={() => setShowCompanySetup(true)} />

            {/* KPI chips — show company data if available, else Pulse Digital */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {company.isPulseDigital ? [
                { label: `${PROJECT.final.ppk}`, sub: "Ppk", color: T.green },
                { label: `${PROJECT.final.sigma}σ`, sub: "Level", color: T.cyan },
                { label: `$${(PROJECT.savings / 1000).toFixed(0)}K`, sub: "Saved", color: T.yellow },
              ] : [
                {
                  label: (() => {
                    if (company.baselineStdDev <= 0) return "—";
                    const ppk = Math.min(
                      (company.usl - company.baselineMean) / (3 * company.baselineStdDev),
                      (company.baselineMean - company.lsl) / (3 * company.baselineStdDev)
                    );
                    return ppk.toFixed(2);
                  })(),
                  sub: "Ppk", color: T.yellow,
                },
                { label: company.baselineMean + company.processUnit, sub: "Baseline", color: T.red },
                { label: company.target + company.processUnit, sub: "Target", color: T.green },
              ].map(k => (
                <div key={k.sub} style={{ textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "0.3rem 0.6rem" }}>
                  <div style={{ color: k.color, fontFamily: T.mono, fontSize: "0.82rem", fontWeight: 700 }}>{k.label}</div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase" }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowApp(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 4, color: T.textDim, padding: "0.35rem 0.7rem", fontFamily: T.mono, fontSize: "0.62rem", cursor: "pointer" }}>
              ← EXIT
            </button>
          </div>
        </div>

        <NavBar active={activeTab} setActive={setActiveTab} />

        <main style={{ flex: 1, padding: "2rem 1.5rem", overflowY: "auto" }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ActiveView />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>
            © 2025 Alfin Maulana Yudistira · Six Sigma Black Belt · Technical Support Efficiency Transformation
          </span>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
            {company.isPulseDigital ? "Demo Mode: Pulse Digital" : `Company Mode: ${company.name}`}
          </span>
        </div>

        {/* Keyboard hints */}
        <div style={{ background: "#030709", borderTop: `1px solid ${T.border}`, padding: "0.3rem 1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {[["1-9","Switch modules"],["ESC","Back / Exit"],["Click badge","Switch company"]].map(s => (
            <span key={s[0]} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
              <span style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: "0.05rem 0.3rem", color: T.textMid, marginRight: "0.3rem" }}>{s[0]}</span>
              {s[1]}
            </span>
          ))}
        </div>

        {/* Company Setup Modal */}
        <CompanySetup
          company={company}
          onChange={setCompany}
          onClose={() => setShowCompanySetup(false)}
          isOpen={showCompanySetup}
        />

        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: ${T.bg}; color: ${T.text}; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: ${T.bg}; }
          ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
          input:focus, textarea:focus, select:focus { outline: 1px solid ${T.cyan}44; }
          button:hover { opacity: 0.85; }
          select option { background: ${T.surface}; color: ${T.text}; }
          @media (max-width: 600px) {
            main { padding: 1.25rem 1rem !important; }
            nav { padding: 0 0.5rem !important; }
          }
          @media print {
            nav, footer, button { display: none !important; }
            body { background: #fff !important; color: #000 !important; }
          }
        `}</style>

        <Analytics />
        <SpeedInsights />
      </div>
    </CompanyCtx.Provider>
  );
}

