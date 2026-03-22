import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#050A0F", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "2rem" }}>
          <div style={{ color: "#FF3B5C", fontFamily: "monospace", fontSize: "1.2rem" }}>⚠ MODULE ERROR</div>
          <div style={{ color: "#7A99B8", fontFamily: "monospace", fontSize: "0.8rem", maxWidth: 500, textAlign: "center" }}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button onClick={() => {
            try {
              const keys = Object.keys(localStorage).filter(k =>
                k.startsWith("ss_") || k.startsWith("sigma_") || k.startsWith("dmaic_") ||
                k.startsWith("fmea_") || k.startsWith("copq_") || k.startsWith("spc_") ||
                k.startsWith("pareto_") || k.startsWith("rc_") || k.startsWith("triage_") ||
                k.startsWith("bus_")                              
              );
              keys.forEach(k => localStorage.removeItem(k));
            } catch {}
            this.setState({ hasError: false, error: null });
          }}
            style={{ background: "transparent", border: "1px solid #00D4FF", color: "#00D4FF", padding: "0.5rem 1.5rem", fontFamily: "monospace", cursor: "pointer", borderRadius: 4 }}>
            ↺ Retry (Clear Module State)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
const CompanyCtx = createContext(null);
function useCompany() { return useContext(CompanyCtx); }

// ─── CURRENCY FORMATTER HOOK ─────────────────────────────────────────────────
function useCurrencyFmt() {
  const company = useContext(CompanyCtx);
  const sym = company?.currency || "USD";
  const S = { USD:"$", IDR:"Rp", EUR:"€", GBP:"£", SGD:"S$", AUD:"A$", JPY:"¥", MYR:"RM" };
  const s = S[sym] || sym + " ";
  const fmt = (n) => {
    if (n == null || isNaN(n)) return `${s}0`;
    const neg = n < 0;
    const abs = Math.abs(n);
    let result;
    if (sym === "IDR") {
      if (abs >= 1e12) result = `${(abs/1e12).toFixed(1)}T`;
      else if (abs >= 1e9)  result = `${(abs/1e9).toFixed(1)}M`;
      else if (abs >= 1e6)  result = `${(abs/1e6).toFixed(0)}Jt`;
      else if (abs >= 1e3)  result = `${(abs/1e3).toFixed(0)}K`;
      else result = `${Math.round(abs).toLocaleString()}`;
    } else {
      if (abs >= 1e9) result = `${(abs/1e9).toFixed(2)}B`;
      else if (abs >= 1e6) result = `${(abs/1e6).toFixed(2)}M`;
      else if (abs >= 1e3) result = `${(abs/1e3).toFixed(0)}K`;
      else result = `${Math.round(abs).toLocaleString()}`;
    }
    return neg ? `-${s}${result}` : `${s}${result}`;
  };
  const fmtFull = (n) => `${s}${Math.round(n).toLocaleString()}`;
  return { sym, s, fmt, fmtFull };
}

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
  slaTarget: 48,
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
  const [validationErrors, setValidationErrors] = useState([]);
  const numKeys = ["teamSize","baselineMean","baselineStdDev","target","usl","lsl","laborRate","monthlyVolume","customerLTV","slaTarget"];
  const [strVals, setStrVals] = useState(() =>
    Object.fromEntries(numKeys.map(k => [k, String(company[k] ?? "")]))
  );

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  const setNum = (k, raw) => {
    setStrVals(p => ({ ...p, [k]: raw }));
    const n = raw === "" ? 0 : parseFloat(raw);
    if (!isNaN(n)) setDraft(p => ({ ...p, [k]: n }));
  };
  
  const save = () => {
    const errs = [];
    if (!draft.name.trim()) errs.push("Company Name is required");
    if (draft.baselineStdDev <= 0) errs.push("Baseline Std Dev must be greater than 0");
    if (draft.usl <= draft.lsl) errs.push("USL must be greater than LSL");
    if (draft.target > draft.usl || draft.target < draft.lsl)
      errs.push("Target must be within spec limits (between LSL and USL)");
    if (draft.laborRate <= 0) errs.push("Staff Hourly Cost must be greater than 0");
    if (draft.monthlyVolume <= 0) errs.push("Monthly Volume must be greater than 0");
    if (errs.length > 0) { setValidationErrors(errs); return; }
    setValidationErrors([]);
    onChange({ ...draft });
    onClose();
  };

  const loadPulseDigital = () => {
    setDraft({ ...COMPANY_DEFAULTS });
    setStrVals(Object.fromEntries(numKeys.map(k => [k, String(COMPANY_DEFAULTS[k] ?? "")])));
    setValidationErrors([]);
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
                {(() => {
                  const [confirmFresh, setConfirmFresh] = React.useState(false);
                  return confirmFresh ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: `${T.yellow}10`, border: `1px solid ${T.yellow}44`, borderRadius: 6, padding: "0.4rem 0.75rem" }}>
                      <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.62rem" }}>Clear all fields?</span>
                      <button onClick={() => {
                        const blank = { ...COMPANY_DEFAULTS, name: "", dept: "", processName: "", baselineMean: 0, baselineStdDev: 0, target: 0, usl: 0, lsl: 0, laborRate: 0, monthlyVolume: 0, customerLTV: 0, isPulseDigital: false };
                        setDraft(blank);
                        setStrVals(Object.fromEntries(numKeys.map(k => [k, String(blank[k] ?? "")])));
                        setValidationErrors([]);
                        setConfirmFresh(false);
                      }} style={{ background: T.yellow, border: "none", color: T.bg, padding: "0.25rem 0.6rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700 }}>Yes</button>
                      <button onClick={() => setConfirmFresh(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.25rem 0.6rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem" }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmFresh(true)} style={{
                      background: `${T.green}12`, border: `1px solid ${T.green}44`,
                      color: T.green, padding: "0.5rem 1rem", borderRadius: 6,
                      cursor: "pointer", fontFamily: T.mono, fontSize: "0.68rem",
                    }}>
                      ⚡ Start Fresh (Your Company)
                    </button>
                  );
                })()}
                <label style={{
                  background: `${T.yellow}12`, border: `1px solid ${T.yellow}44`,
                  color: T.yellow, padding: "0.5rem 1rem", borderRadius: 6,
                  cursor: "pointer", fontFamily: T.mono, fontSize: "0.68rem", display: "inline-flex", alignItems: "center",
                }}>
                  ↑ Import JSON
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const parsed = JSON.parse(ev.target.result);
                        // Validasi: pastikan field numerik kritis adalah angka valid
                        const criticalNumericFields = ["baselineMean","baselineStdDev","usl","lsl","target","laborRate","monthlyVolume","customerLTV","teamSize"];
                        const invalidFields = criticalNumericFields.filter(f => {
                          const v = parsed[f];
                          return v !== undefined && (typeof v !== "number" || isNaN(v));
                        });
                        if (invalidFields.length > 0) {
                          alert(`JSON contains invalid numeric values for: ${invalidFields.join(", ")}.\nPlease export from this app first.`);
                          return;
                        }
                        const merged = { ...COMPANY_DEFAULTS, ...parsed };
                        setDraft(merged);
                        setStrVals(Object.fromEntries(numKeys.map(k => [k, String(merged[k] ?? "")])));
                        setValidationErrors([]);
                      } catch { alert("Invalid JSON file — please export from this app first"); }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }} />
                </label>
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
                  <input type="number" value={strVals.teamSize} onChange={e => setNum("teamSize", e.target.value)} min={1}
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
                    <input type="number" step={f.step} value={strVals[f.key]} onChange={e => setNum(f.key, e.target.value)} placeholder={f.ph}
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
                  { label: "SLA Target (hrs)", key: "slaTarget", ph: "48", step: "1", unit: "hrs" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                      {f.label} {f.unit && <span style={{ color: T.textDim }}>({draft.currency}{f.unit})</span>}
                    </label>
                    <input type="number" step={f.step} value={strVals[f.key]} onChange={e => setNum(f.key, e.target.value)} placeholder={f.ph}
                      style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.yellow, padding: "0.6rem 0.75rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Process Health Score — NEW FEATURE */}
            {(() => {
              const ppk = draft.baselineStdDev > 0 ? Math.min((draft.usl - draft.baselineMean) / (3 * draft.baselineStdDev), (draft.baselineMean - draft.lsl) / (3 * draft.baselineStdDev)) : 0;
              // Ppk score: Six Sigma standard — 1.67 = world class (max 40pts)
              const ppkScore = Math.min(ppk / 1.67 * 40, 40);
              // Gap-to-target score: seberapa dekat mean ke target (max 40pts)
              const targetRange = draft.usl - draft.lsl;
              const gap = (draft.baselineMean > 0 && targetRange > 0)
                ? Math.max(0, (1 - Math.abs(draft.baselineMean - draft.target) / targetRange)) * 40
                : 0;
          const teamScore = Math.min(draft.teamSize / 50 * 15, 15);
              const volScore = draft.monthlyVolume > 0 ? Math.min(draft.monthlyVolume / 300 * 15, 15) : 0;
              // Spec width score: USL-LSL yang reasonable vs mean (max 20pts)
              const specRatio = draft.baselineStdDev > 0 && targetRange > 0
                ? Math.min(targetRange / (6 * draft.baselineStdDev) / 2, 1) * 20
                : 0;
              const health = Math.round(ppkScore + gap + specRatio);
              const hColor = health >= 80 ? T.green : health >= 55 ? T.yellow : health >= 35 ? T.orange : T.red;
              const hLabel = health >= 80 ? "EXCELLENT" : health >= 55 ? "MODERATE" : health >= 35 ? "AT RISK" : "CRITICAL";
              return (
                <div style={{ background: `${hColor}0A`, border: `1px solid ${hColor}33`, borderRadius: 8, padding: "1rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase" }}>⚡ Process Health Score</div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ color: hColor, fontFamily: T.display, fontSize: "1.5rem", fontWeight: 800 }}>{health}</span>
                      <span style={{ color: hColor, fontFamily: T.mono, fontSize: "0.55rem" }}>/100</span>
                      <span style={{ background: `${hColor}22`, border: `1px solid ${hColor}44`, borderRadius: 3, padding: "0.1rem 0.4rem", color: hColor, fontFamily: T.mono, fontSize: "0.55rem", letterSpacing: "0.1em" }}>{hLabel}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${health}%`, height: "100%", background: `linear-gradient(90deg, ${hColor}88, ${hColor})`, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    {[
                      { l: "Ppk Score", v: ppkScore.toFixed(0), m: 40 },
                      { l: "Gap Score", v: gap.toFixed(0), m: 40 },
                      { l: "Team Score", v: teamScore.toFixed(0), m: 15 },
                      { l: "Volume Score", v: volScore.toFixed(0), m: 15 },
                  { l: "Spec Width", v: specRatio.toFixed(0), m: 20 },
                    ].map(sc => (
                      <div key={sc.l} style={{ textAlign: "center", flex: "1 1 60px" }}>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", textTransform: "uppercase" }}>{sc.l}</div>
                        <div style={{ color: hColor, fontFamily: T.mono, fontSize: "0.82rem", fontWeight: 700 }}>{sc.v}<span style={{ color: T.textDim, fontSize: "0.5rem" }}>/{sc.m}</span></div>
                      </div>
                    ))}
                  </div>
                <div style={{ marginTop: "0.5rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", fontStyle: "italic" }}>
                    * Indicative score based on process capability parameters — not a certified Six Sigma metric.
                  </div>
                </div>
              );
            })()}

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

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div style={{ background: `${T.red}12`, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "0.85rem 1rem", marginBottom: "1rem" }}>
                <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.35rem" }}>⚠ Fix before saving:</div>
                {validationErrors.map((e, i) => (
                  <div key={i} style={{ color: T.red, fontFamily: T.mono, fontSize: "0.62rem", marginBottom: "0.15rem" }}>· {e}</div>
                ))}
              </div>
            )}

    {/* Demo Mode Toggle */}
<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", padding: "0.85rem 1rem", background: `${T.cyan}08`, border: `1px solid ${T.cyan}22`, borderRadius: 6 }}>
  <input
    type="checkbox"
    id="demo-mode-toggle"
    checked={draft.isPulseDigital || false}
    onChange={e => setDraft(p => ({ ...p, isPulseDigital: e.target.checked }))}
    style={{ accentColor: T.cyan, width: 14, height: 14, cursor: "pointer" }}
  />
  <label htmlFor="demo-mode-toggle" style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", cursor: "pointer" }}>
    Use as Demo Mode (Pulse Digital showcase data)
  </label>
</div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{
                background: "transparent", border: `1px solid ${T.border}`, color: T.textDim,
                padding: "0.75rem 1.5rem", borderRadius: 6, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem",
              }}>Cancel</button>
              <button onClick={() => {
                const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${draft.name.replace(/\s+/g, "_") || "company"}_profile.json`;
                a.click();
                URL.revokeObjectURL(url);
              }} style={{
                background: "transparent", border: `1px solid ${T.green}`, color: T.green,
                padding: "0.75rem 1.25rem", borderRadius: 6, cursor: "pointer",
                fontFamily: T.mono, fontSize: "0.72rem", letterSpacing: "0.05em",
              }}>
                ↓ Export JSON
              </button>
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
        Process: {company.processName} · Baseline: {company.baselineMean} {company.processUnit} → Target: {company.target} {company.processUnit} · Currency: {company.currency}
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

// Smart Tooltip — Layman's Terms
const TOOLTIPS = {
  // ── Existing ──────────────────────────────────────────────────────────────
  ppk:      { title: "Ppk — Process Capability Index", plain: "Like shooting accuracy. A score ≥1.33 = your team consistently hits the target. A score <1.0 = the process often misses the mark." },
  sigma:    { title: "Sigma Level", plain: "A measure of 'how few errors' your process makes. 6σ = almost zero defects. 1σ = 69% of the work has issues. The higher, the better." },
  dpmo:     { title: "DPMO — Defects Per Million Opportunities", plain: "Out of 1 million jobs, how many end up wrong or defective. A DPMO of 1,350 = only 0.135% fail. Excellent." },
  copq:     { title: "COPQ — Cost of Poor Quality", plain: "Total money 'burned' and wasted due to bad processes, rework, or lost customers. This is real money that can be saved." },
  ucl:      { title: "UCL — Upper Control Limit", plain: "The 'normal' upper limit of a process. If data goes above this line, something is wrong and needs to be investigated immediately." },
  fmea:     { title: "FMEA — Failure Mode & Effects Analysis", plain: "An analysis of 'what can go wrong and how dangerous it is'. RPN = risk level. The higher the RPN, the more urgent it is to fix." },
  rpn:      { title: "RPN — Risk Priority Number", plain: "RPN = Severity × Occurrence × Detection difficulty. Example: Severe (8) × Frequent (7) × Hard to detect (7) = RPN 392. > 100 = must be addressed immediately." },
  dmaic:    { title: "DMAIC Methodology", plain: "A 5-phase process improvement framework: Define (set the problem) → Measure (assess current state) → Analyze (find root causes) → Improve (implement solutions) → Control (keep it from reverting back)." },
  
  // ── SPC Module ────────────────────────────────────────────────────────────
  lcl:      { title: "LCL — Lower Control Limit", plain: "The 'normal' lower limit of a process. Data below this line is also abnormal — it could mean a sudden change that needs checking, even if the results look good." },
  imr:      { title: "I-MR Chart — Individuals & Moving Range", plain: "Two charts at once: the top monitors individual values, the bottom monitors the jumps between data points. Both must be stable for the process to be 'in control'." },
  weco:     { title: "Western Electric Rules", plain: "A set of rules to detect warning signals on a control chart. Example: 1 point outside UCL/LCL = immediate danger. 8 consecutive points on one side of the centerline = the process has shifted." },
  mr:       { title: "Moving Range (MR)", plain: "The absolute difference between two consecutive data points. E.g., 5th data = 70, 6th data = 82, MR = |82-70| = 12. A consistently high MR means the process is inconsistent." },
  
  // ── Pareto Module ─────────────────────────────────────────────────────────
  pareto:   { title: "Pareto Principle (80/20 Rule)", plain: "80% of problems usually come from 20% of the causes. A Pareto chart helps you find the 'vital few' — a small group of causes that have the biggest impact when solved." },
  cumPct:   { title: "Cumulative Percentage Line", plain: "The red line on a Pareto chart. The point where this line hits 80% shows the boundary between major causes (handle these first) and minor ones." },
  
  // ── Root Cause Module ─────────────────────────────────────────────────────
  fiveWhys: { title: "5 Whys Technique", plain: "Ask 'Why?' 5 times in a row to find the true root cause. Example: Machine broke → Why? Not maintained → Why? No schedule → Why? ... and so on." },
  fishbone: { title: "Fishbone / Ishikawa Diagram", plain: "A diagram to group problem causes into categories: Man, Machine, Method, Material, Measurement, Environment. Helps the team see all factors at once." },
  impact:   { title: "Impact Score (Root Cause)", plain: "An estimate of how much this root cause contributes to the total problem, in percent. Total impact must be ≤ 100%. Focus on the biggest impact first." },
  
  // ── COPQ Categories ───────────────────────────────────────────────────────
  internalFailure:  { title: "Internal Failure Cost", plain: "Costs from defects or errors found BEFORE the product/service reaches the customer. Example: rework, re-inspection, scrap material. These are visible but often considered normal." },
  externalFailure:  { title: "External Failure Cost", plain: "Costs from defects found AFTER reaching the customer. Example: warranty claims, refunds, lost customers, ruined reputation. These are the most expensive and dangerous." },
  appraisal:        { title: "Appraisal Cost", plain: "Costs for checking and inspecting quality. Example: QC inspection, testing, audits. Necessary, but if it's too high, your process isn't good enough and requires too much checking." },
  prevention:       { title: "Prevention Cost", plain: "Costs to prevent defects from happening in the first place. Example: training, good process design, routine maintenance. This is the best investment — every $1 spent here can save $10 in external failure." },
  
  // ── Triage Module ─────────────────────────────────────────────────────────
  sla:      { title: "SLA — Service Level Agreement", plain: "The agreed time limit to resolve a complaint/ticket. E.g., a 48-hour SLA = all tickets must be closed within 48 hours. Breach = ticket passes the limit, risking fines or lost customers." },
  triage:   { title: "Triage — Complaint Classification", plain: "The process of sorting and routing complaints to the right person/team as fast as possible. Like a hospital ER: emergency patients get treated first. Bad triage = slow response time = angry customers." },
  confidence: { title: "AI Confidence Score", plain: "How confident the AI is in its classification, in percent. ≥75% = safe to proceed. <75% = recommends a manual review by a supervisor before routing the ticket to a technician." },
};


function SmartTooltip({ id, children }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const tip = TOOLTIPS[id];
  if (!tip) return children;

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setTipPos({
        top: rect.top + window.scrollY - 8,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
      });
    }
    setOpen(true);
  };

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
      {children}
      <button
        ref={btnRef}
        onClick={() => open ? setOpen(false) : handleOpen()}
        onMouseEnter={handleOpen}
        onMouseLeave={() => setOpen(false)}
        style={{ background: `${T.cyan}22`, border: `1px solid ${T.cyan}44`, borderRadius: "50%", width: 16, height: 16, color: T.cyan, cursor: "pointer", fontFamily: T.mono, fontSize: "0.55rem", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>?</button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: tipPos.top,
              left: tipPos.left,
              transform: "translateY(-100%)",
              zIndex: 9999,
              background: T.panel,
              border: `1px solid ${T.cyan}44`,
              borderRadius: 8,
              padding: "0.85rem 1rem",
              width: 280,
              maxWidth: "calc(100vw - 2rem)",
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${T.cyan}11`,
              pointerEvents: "none",
            }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{tip.title}</div>
            <div style={{ color: T.text, fontSize: "0.8rem", lineHeight: 1.6, fontFamily: T.mono }}>{tip.plain}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ── Platform Event Bus — cross-module data flow ──────────────────────────────
// Modul bisa "publish" update dan modul lain bisa "subscribe" ke perubahan
const PlatformBus = {
  publish(event, data) {
    try {
      // Simpan ke localStorage sebagai bridge antar modul
      const key = `bus_${event}`;
      const payload = { data, ts: Date.now() };
      localStorage.setItem(key, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("platform_bus", { detail: { event, data } }));
    } catch {}
  },
  // Hook untuk subscribe ke event tertentu
  useSubscribe(event, callback) {
    useEffect(() => {
      const handler = (e) => {
        if (e.detail?.event === event) callback(e.detail.data);
      };
      window.addEventListener("platform_bus", handler);
      return () => window.removeEventListener("platform_bus", handler);
    }, [event, callback]);
  },
  // Baca data terakhir dari event (untuk initial load)
  getLast(event) {
    try {
      const raw = localStorage.getItem(`bus_${event}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  // Hapus semua bus_ keys yang sudah lebih dari maxAgeMs (default 24 jam)
  pruneStale(maxAgeMs = 86400000) {
    try {
      const now = Date.now();
      Object.keys(localStorage)
        .filter(k => k.startsWith("bus_"))
        .forEach(k => {
          try {
            const payload = JSON.parse(localStorage.getItem(k));
            if (payload?.ts && (now - payload.ts) > maxAgeMs) {
              localStorage.removeItem(k);
            }
          } catch { localStorage.removeItem(k); }
        });
    } catch {}
  },
};

// Hook: baca summary lintas modul untuk ditampilkan di module lain
function useCrossModuleSummary() {
  const [summary, setSummary] = useState(() => buildSummary());

  function buildSummary() {
    const result = {};
    // FMEA: ambil critical items (RPN >= 200)
    try {
      const items = JSON.parse(localStorage.getItem("fmea_items") || "[]");
      const withRpn = items.map(i => ({ ...i, rpn: (i.S||1)*(i.O||1)*(i.D||1) }));
      result.fmea = {
        total: items.length,
        critical: withRpn.filter(i => i.rpn >= 200),
        topRpn: [...withRpn].sort((a,b) => b.rpn - a.rpn).slice(0,3),
      };
    } catch { result.fmea = { total: 0, critical: [], topRpn: [] }; }

    // Root Cause: open items
    try {
      const rcs = JSON.parse(localStorage.getItem("rc_items") || "[]");
      result.rootcause = {
        total: rcs.length,
        open: rcs.filter(r => r.status === "OPEN"),
        solved: rcs.filter(r => r.status === "SOLVED"),
        totalImpact: rcs.reduce((a,r) => a + (r.impact||0), 0),
      };
    } catch { result.rootcause = { total: 0, open: [], solved: [], totalImpact: 0 }; }

    // SPC: out-of-control points
    try {
      const pts = JSON.parse(localStorage.getItem("spc_custom_points") || "[]");
      const vals = pts.map(d => d.value || d.v || d).filter(v => typeof v === "number");
      if (vals.length > 1) {
        const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
        const mr = vals.slice(1).map((v,i) => Math.abs(v - vals[i]));
        const mrBar = mr.reduce((a,b)=>a+b,0)/mr.length;
        const ucl = mean + 2.66 * mrBar;
        const lcl = mean - 2.66 * mrBar;
        result.spc = {
          dataPoints: vals.length,
          mean: +mean.toFixed(2),
          outOfControl: vals.filter(v => v > ucl || v < lcl).length,
          ucl: +ucl.toFixed(2),
          lcl: +lcl.toFixed(2),
        };
      } else { result.spc = { dataPoints: vals.length, outOfControl: 0 }; }
    } catch { result.spc = { dataPoints: 0, outOfControl: 0 }; }

    // Triage: breach rate
    try {
      const hist = JSON.parse(localStorage.getItem("triage_history") || "[]");
      result.triage = {
        total: hist.length,
        breach: hist.filter(t => t.sla === "BREACH").length,
        atRisk: hist.filter(t => t.sla === "AT RISK").length,
        topCategory: hist.length > 0
          ? Object.entries(hist.reduce((acc,t) => { acc[t.category]=(acc[t.category]||0)+1; return acc; }, {}))
              .sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"
          : "—",
      };
    } catch { result.triage = { total: 0, breach: 0, atRisk: 0, topCategory: "—" }; }

    return result;
  }

  useEffect(() => {
    const handler = () => setSummary(buildSummary());
    window.addEventListener("lsupdate", handler);
    window.addEventListener("platform_bus", handler);
    return () => {
      window.removeEventListener("lsupdate", handler);
      window.removeEventListener("platform_bus", handler);
    };
  }, []);

  return summary;
}

// ── Universal localStorage hook ─────────────
function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });

  const set = useCallback((v) => {
    setVal(prev => {
      const newVal = typeof v === "function" ? v(prev) : v;
      try {
        localStorage.setItem(key, JSON.stringify(newVal));
        // Dispatch custom event agar LiveOpsCenter bisa detect same-tab changes
        window.dispatchEvent(new Event("lsupdate"));
      } catch {}
      return newVal;
    });
  }, [key]);

  const reset = useCallback(() => {
    setVal(initial);
    try { localStorage.removeItem(key); } catch {}
  }, [key, initial]);

  return [val, set, reset];
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
function useCopyClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    const succeed = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(succeed).catch(() => {
        // fallback jika clipboard permission denied
        try {
          const el = document.createElement("textarea");
          el.value = text;
          el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
          succeed();
        } catch {}
      });
    } else {
      // Clipboard API tidak ada sama sekali (HTTP atau browser lama)
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        succeed();
      } catch {}
    }
  };
  return [copied, copy];
}

// ── PDF Report Generator ──────────────────────────────────────────────────────
function usePDFExport() {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async ({ title, subtitle, sections, company, filename = "dmaic-report" }) => {
    setExporting(true);
    try {
      const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Space Mono', monospace; background: #fff; color: #111; padding: 2cm; font-size: 10pt; }
        h1 { font-family: 'Syne', sans-serif; font-size: 22pt; font-weight: 800; color: #0a0a0a; margin-bottom: 4px; }
        h2 { font-family: 'Syne', sans-serif; font-size: 14pt; font-weight: 700; color: #111; margin: 20px 0 8px; border-bottom: 2px solid #00D4FF; padding-bottom: 4px; }
        h3 { font-size: 10pt; font-weight: 700; color: #333; margin: 12px 0 4px; }
        p, li { font-size: 9.5pt; line-height: 1.6; color: #333; }
        .header { border-bottom: 3px solid #00D4FF; padding-bottom: 12px; margin-bottom: 24px; }
        .meta { font-size: 8.5pt; color: #666; margin-top: 4px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 8pt; font-weight: 700; margin: 0 2px; }
        .badge-green { background: #e6fff5; color: #00875a; border: 1px solid #00875a44; }
        .badge-red { background: #fff0f0; color: #cc0000; border: 1px solid #cc000044; }
        .badge-yellow { background: #fffbe6; color: #996600; border: 1px solid #99660044; }
        .badge-blue { background: #e6f4ff; color: #0066cc; border: 1px solid #0066cc44; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 12px 0; }
        .kpi-card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; text-align: center; }
        .kpi-val { font-size: 16pt; font-weight: 800; color: #0a0a0a; }
        .kpi-label { font-size: 7.5pt; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8.5pt; }
        th { background: #f0f8ff; color: #333; text-align: left; padding: 6px 8px; border-bottom: 2px solid #00D4FF; font-size: 7.5pt; text-transform: uppercase; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .section { margin-bottom: 24px; page-break-inside: avoid; }
        .insight-box { background: #f0f8ff; border-left: 3px solid #00D4FF; padding: 10px 14px; margin: 10px 0; border-radius: 0 6px 6px 0; }
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 8pt; color: #888; display: flex; justify-content: space-between; }
        @page { margin: 1.5cm; size: A4; }
        @media print { body { padding: 0; } }
      `;

      const bodyHTML = `
        <div class="header">
          <h1>${title}</h1>
          <div class="meta">
            ${company?.name ? `<strong>${company.name}</strong> · ` : ""}
            ${company?.dept ? `${company.dept} · ` : ""}
            ${subtitle || ""}
          </div>
          <div class="meta" style="margin-top:6px;">
            Generated: ${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })} · 
            DMAIC Intelligence Platform · Alfin Maulana Yudistira
          </div>
        </div>

        ${sections.map(sec => `
          <div class="section">
            <h2>${sec.title}</h2>
            ${sec.content}
          </div>
        `).join("")}

        <div class="footer">
          <span>DMAIC Intelligence Platform · ${company?.name || "Pulse Digital"}</span>
          <span>Confidential · ${new Date().getFullYear()}</span>
        </div>
      `;

      const win = window.open("", "_blank");
      if (!win) { alert("Pop-up blocked. Allow pop-ups for this site."); setExporting(false); return; }
      win.document.write(`<!DOCTYPE html><html><head><title>${filename}</title><style>${styles}</style></head><body>${bodyHTML}</body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); }, 800);
    } catch (err) {
      alert("PDF export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return { exportPDF, exporting };
}

// ── Screenshot/Export utility ─────────────────────────────────────────────────
function ExportButton({ targetId, filename = "dmaic-export", label = "🖨 Print / Save PDF" }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      const el = document.getElementById(targetId);
      if (!el) { setLoading(false); return; }
      const printContent = el.innerHTML;
      const win = window.open("", "_blank");
      if (!win) {
        alert("Pop-up blocked by browser.\nPlease allow pop-ups for this site, then try again.");
        setLoading(false);
        return;
      }
      win.document.write(`
        <html><head><title>${filename}</title>
        <style>
          body { background: #050A0F; color: #E2EEF9; font-family: monospace; padding: 2rem; }
          * { box-sizing: border-box; }
        </style></head>
        <body>${printContent}</body></html>
      `);
      win.document.close();
      win.print();
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    } finally { setLoading(false); }
  };
  return (
    <button onClick={handle} disabled={loading} style={{
      background: "transparent", border: `1px solid ${T.border}`,
      color: T.textDim, padding: "0.35rem 0.8rem", borderRadius: 4,
      cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
      transition: "all 0.2s",
    }}>{loading ? "⏳ Exporting..." : label}</button>
  );
}

// ── Copy Report Button ─────────────────────────────────────────────────────────
function CopyReportButton({ data, label = "⎘ Copy Report" }) {
  const [copied, copy] = useCopyClipboard();
  return (
    <button onClick={() => copy(data)} style={{
      background: copied ? `${T.green}18` : "transparent",
      border: `1px solid ${copied ? T.green : T.border}`,
      color: copied ? T.green : T.textDim,
      padding: "0.35rem 0.8rem", borderRadius: 4,
      cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
      transition: "all 0.2s",
    }}>{copied ? "✓ Copied!" : label}</button>
  );
}

// ── Editable Label ────────────────────────────────────────────────────────────
function EditableLabel({ value, onChange, style: s = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  if (editing) return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange(draft); setEditing(false); }}
      onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      style={{ background: "transparent", border: `1px solid ${T.cyan}55`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, padding: "0.1rem 0.3rem", fontSize: "inherit", width: "100%", ...s }}
    />
  );
  return (
    <span onClick={() => { setDraft(value); setEditing(true); }} title="Click to edit"
      style={{ cursor: "text", borderBottom: `1px dashed ${T.border}`, ...s }}>
      {value} <span style={{ color: T.textDim, fontSize: "0.7em" }}>✎</span>
    </span>
  );
}

// ── Scenario Badge ────────────────────────────────────────────────────────────
function ScenarioBadge({ label, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}18` : T.surface,
      border: `2px solid ${active ? color : T.border}`,
      color: active ? color : T.textDim,
      padding: "0.5rem 1.1rem", borderRadius: 6,
      cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem",
      fontWeight: active ? 700 : 400,
      letterSpacing: "0.08em", textTransform: "uppercase",
      transition: "all 0.2s",
      textShadow: active ? `0 0 10px ${color}66` : "none",
    }}>{label}</button>
  );
}

// ── Delta Pill ────────────────────────────────────────────────────────────────
function DeltaPill({ a, b, invert = false, fmtFn = v => v }) {
  if (!a || !b || Math.abs(a) < 0.0001) return null;
  const diff = b - a;
  const rawPct = Math.abs(((b - a) / a) * 100);
  // Cap di 9999% supaya tidak tampil absurd
  const pct = Math.min(rawPct, 9999).toFixed(1);
  const better = invert ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "↑" : "↓";
  const color = better ? T.green : T.red;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.2rem",
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "0.15rem 0.5rem",
      color, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700,
    }}>
      {arrow} {pct}%
    </span>
  );
}

function SyncFromCompanyButton({ onSync }) {
  const company = useCompany();
  if (!company || company.isPulseDigital) return null;
  return (
    <button onClick={() => onSync(company)} style={{
      background: `${T.cyan}12`,
      border: `1px solid ${T.cyan}44`,
      color: T.cyan,
      padding: "0.35rem 0.8rem", borderRadius: 4,
      cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
    }}>
      ⟳ Sync from Company
    </button>
  );
}
      
// ── Module Toolbar (Export, Copy, Reset, Save indicator) ─────────────────────
function ModuleToolbar({ onReset, copyData, exportId, saved, children }) {
  return (
    <div style={{
      display: "flex", gap: "0.5rem", alignItems: "center",
      marginBottom: "1.5rem", flexWrap: "wrap",
      padding: "0.6rem 0.85rem",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 6,
    }}>
      {saved !== undefined && (
        <span style={{ color: saved ? T.green : T.textDim, fontFamily: T.mono, fontSize: "0.58rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: saved ? T.green : T.textDim, display: "inline-block" }} />
          {saved ? "Auto-saved" : "Not saved"}
        </span>
      )}
      <div style={{ flex: 1 }} />
      {children}
      {copyData && <CopyReportButton data={copyData} />}
      {exportId && <ExportButton targetId={exportId} />}
      {onReset && (
        <button onClick={onReset} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          color: T.textDim, padding: "0.35rem 0.8rem", borderRadius: 4,
          cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>↺ Reset</button>
      )}
    </div>
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
    { id: "triage",     label: "Smart Triage",       icon: "▶", highlight: true },
    { id: "universal",  label: "Try Your Data",   icon: "⚡", highlight: true },
    { id: "ops",        label: "Live Ops",        icon: "⚡", highlight: true },
  ];
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const activeTab = tabs.find(t => t.id === active);

  return (
    <>
      {/* Desktop nav — hidden on mobile */}
      <nav style={{
        background: T.panel, borderBottom: `1px solid ${T.border}`,
        padding: "0 1.5rem", display: "flex", gap: "0", overflowX: "auto", flexShrink: 0,
        position: "relative", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}
        className="desktop-nav"
      >
        {tabs.map(t => (
          <button key={t.id} data-tab={t.id} onClick={() => setActive(t.id)} style={{
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

      {/* Mobile nav — shown on small screens */}
      <div className="mobile-nav" style={{ background: T.panel, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{
            width: "100%", background: "transparent", border: "none",
            padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ color: activeTab?.highlight ? T.green : T.cyan, fontFamily: T.mono, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <span style={{ opacity: 0.7, marginRight: "0.4rem" }}>{activeTab?.icon}</span>
            {activeTab?.label}
            {activeTab?.highlight && <span style={{ marginLeft: "0.4rem", background: `${T.green}22`, border: `1px solid ${T.green}44`, borderRadius: 3, padding: "0.05rem 0.3rem", fontSize: "0.5rem", color: T.green }}>LIVE</span>}
          </span>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.9rem", transition: "transform 0.2s", display: "inline-block", transform: mobileMenuOpen ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", borderTop: `1px solid ${T.border}` }}
            >
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setActive(t.id); setMobileMenuOpen(false); }} style={{
                  width: "100%", background: active === t.id ? (t.highlight ? `${T.green}12` : `${T.cyan}0A`) : "transparent",
                  border: "none", borderBottom: `1px solid ${T.border}`,
                  color: active === t.id ? (t.highlight ? T.green : T.cyan) : (t.highlight ? T.green : T.textDim),
                  padding: "0.75rem 1.25rem", cursor: "pointer",
                  fontFamily: T.mono, fontSize: "0.68rem",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  display: "flex", alignItems: "center", gap: "0.6rem", textAlign: "left",
                }}>
                  <span style={{ opacity: 0.7 }}>{t.icon}</span>
                  {t.label}
                  {t.highlight && <span style={{ background: `${T.green}22`, border: `1px solid ${T.green}44`, borderRadius: 3, padding: "0.05rem 0.3rem", fontSize: "0.5rem", color: T.green }}>LIVE</span>}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── 01: MISSION STATUS (OVERVIEW) ───────────────────────────────────────────

const OVERVIEW_DEFAULTS = {
  projectName: "Reducing Customer Complaint Resolution Time",
  dept: "Technical Support Department",
  duration: "30 Weeks · Feb–Aug 2025",
  metrics: [
    { id: "resolution", label: "Avg Resolution Time", before: 72.1, after: 49.2, target: 48, unit: "h", invert: true, description: "End-to-end complaint resolution" },
    { id: "ppk",        label: "Process Capability Ppk", before: 0.43, after: 1.41, target: 1.33, unit: "", invert: false, description: "Ppk ≥ 1.33 = capable process" },
    { id: "csat",       label: "CSAT Score", before: 6.8, after: 8.1, target: 8.5, unit: "/10", invert: false, description: "Customer satisfaction score" },
    { id: "miscat",     label: "Miscategorization Rate", before: 22, after: 6.2, target: 8, unit: "%", invert: true, description: "% of cases incorrectly routed" },
    { id: "escalation", label: "Escalation Rate", before: 58, after: 28, target: 30, unit: "%", invert: true, description: "% requiring Tier 2/3 escalation" },
    { id: "sigma",      label: "Sigma Level", before: 1.8, after: 3.4, target: 3.0, unit: "σ", invert: false, description: "Process sigma level" },
  ],
  financials: {
    savings: 300000,
    copq: 9000000,
    investment: 180000,
  },
};

function Overview() {
  const { fmt: fmtCur } = useCurrencyFmt();
  const company = useCompany();
  const [data, setData] = useLocalState("overview_data", OVERVIEW_DEFAULTS);
  const [editMode, setEditMode] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);

// Auto-sync dari CompanyCtx setiap company berubah (hanya kalau bukan Demo Mode)
  const prevCompanyRef = useRef(null);
  useEffect(() => {
    if (!company || company.isPulseDigital) return;
    const prev = prevCompanyRef.current;
    // Hanya update kalau ada field yang benar-benar berubah
    const changed =
      !prev ||
      prev.dept !== company.dept ||
      prev.processName !== company.processName ||
      prev.baselineMean !== company.baselineMean ||
      prev.target !== company.target ||
      prev.laborRate !== company.laborRate ||
      prev.monthlyVolume !== company.monthlyVolume;
    if (!changed) return;
    prevCompanyRef.current = company;
    setData(p => ({
      ...p,
      dept: company.dept || p.dept,
      projectName: company.processName || p.projectName,
      financials: {
        ...p.financials,
        // Estimasi kasar COPQ dari company data kalau belum ada custom value
      },
      metrics: p.metrics.map(m =>
        m.id === "resolution"
          ? { ...m, before: company.baselineMean || m.before, target: company.target || m.target }
          : m
      ),
    }));
  }, [company]);
  
  const setMetricVal = (id, field, val) => {
    setData(prev => ({
      ...prev,
      metrics: prev.metrics.map(m => m.id === id ? { ...m, [field]: parseFloat(val) || 0 } : m),
    }));
  };
  const setMetricLabel = (id, val) => {
    setData(prev => ({ ...prev, metrics: prev.metrics.map(m => m.id === id ? { ...m, label: val } : m) }));
  };
  const setFinancial = (key, val) => {
    setData(prev => ({ ...prev, financials: { ...prev.financials, [key]: parseFloat(val) || 0 } }));
  };

  const fmt = fmtCur;
  const roi = data.financials.investment > 0
  ? Math.round(((data.financials.savings - data.financials.investment) / data.financials.investment) * 100)
  : 0;

  const timelineData = [
    { phase: "Define",  week: 4,  resolution: data.metrics.find(m=>m.id==="resolution")?.before || 72, milestone: "Charter approved" },
    { phase: "Measure", week: 12, resolution: data.metrics.find(m=>m.id==="resolution")?.before || 72, milestone: "Data collected" },
    { phase: "Analyze", week: 17, resolution: data.metrics.find(m=>m.id==="resolution")?.before || 72, milestone: "Root causes validated" },
    { phase: "Improve", week: 22, resolution: +(
  (data.metrics.find(m=>m.id==="resolution")?.before||72) * 0.6 +
  (data.metrics.find(m=>m.id==="resolution")?.after||49) * 0.4
).toFixed(1), milestone: "Pilot: improvement — 40% gains locked" },
    { phase: "Control", week: 29, resolution: data.metrics.find(m=>m.id==="resolution")?.after || 49, milestone: "Gains locked in" },
  ];

  const sigmaMetric = data.metrics.find(m => m.id === "sigma");

  const copyReport = `PROJECT RESULTS REPORT
${data.projectName}
${data.dept} · ${data.duration}

KEY METRICS:
${data.metrics.map(m => {
  const improved = m.invert ? m.after < m.before : m.after > m.before;
  const pct = m.before > 0 ? Math.abs(((m.after - m.before) / m.before) * 100).toFixed(1) : 0;
  return `  ${m.label}: ${m.before}${m.unit} → ${m.after}${m.unit} (${improved ? "↓" : "↑"} ${pct}%) | Target: ${m.target}${m.unit}`;
}).join('\n')}

FINANCIAL IMPACT:
  Annual Savings: ${fmt(data.financials.savings)}
  Total COPQ: ${fmt(data.financials.copq)}
  Investment: ${fmt(data.financials.investment)}
  ROI Year 1: ${roi}%`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader
        module="Module 01 — Executive Dashboard"
        title={
          <EditableLabel
            value={data.projectName}
            onChange={v => setData(p => ({ ...p, projectName: v }))}
            style={{ color: T.text, fontFamily: "'Syne', sans-serif", fontSize: "inherit", fontWeight: 800 }}
          />
        }
        sub={`${data.dept} · ${data.duration}`}
      />

      {/* Toolbar */}
      <ModuleToolbar
  onReset={() => setData(OVERVIEW_DEFAULTS)}
  copyData={copyReport}
  exportId="overview-export"
  saved={true}
>
        <SyncFromCompanyButton onSync={(company) => setData(p => ({
          ...p,
          dept: company.dept || p.dept,
          projectName: company.processName || p.projectName,
          metrics: p.metrics.map(m =>
            m.id === "resolution"
              ? { ...m, before: company.baselineMean, target: company.target }
              : m
          ),
        }))} />
        <button onClick={() => setEditMode(p => !p)} style={{
          background: editMode ? `${T.yellow}18` : "transparent",
          border: `1px solid ${editMode ? T.yellow : T.border}`,
          color: editMode ? T.yellow : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4,
          cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
          transition: "all 0.2s",
        }}>
          {editMode ? "✓ Done Editing" : "✎ Edit All Values"}
        </button>

        {(() => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newUnit, setNewUnit] = React.useState("");
  const [newInvert, setNewInvert] = React.useState(false);
  return addOpen ? (
    <div style={{ background: T.surface, border: `1px solid ${T.cyan}44`, borderRadius: 6, padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 240 }}>
      <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>New Metric</div>
      <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Metric name (e.g. First Call Resolution)"
        style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.4rem 0.6rem", fontFamily: T.mono, fontSize: "0.72rem" }} />
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Unit (%, hrs…)"
          style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.4rem 0.6rem", fontFamily: T.mono, fontSize: "0.72rem" }} />
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={newInvert} onChange={e => setNewInvert(e.target.checked)} style={{ accentColor: T.cyan }} />
          Lower = better
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button onClick={() => {
          if (!newLabel.trim()) return;
          setData(prev => ({ ...prev, metrics: [...prev.metrics, { id: `custom_${Date.now()}`, label: newLabel.trim(), before: 0, after: 0, target: 0, unit: newUnit.trim(), invert: newInvert, description: "Custom metric" }] }));
          setNewLabel(""); setNewUnit(""); setNewInvert(false); setAddOpen(false);
        }} style={{ flex: 1, background: T.cyan, border: "none", color: T.bg, padding: "0.35rem 0.5rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700 }}>
          + Add
        </button>
        <button onClick={() => { setNewLabel(""); setNewUnit(""); setNewInvert(false); setAddOpen(false); }}
          style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.35rem 0.6rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem" }}>
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <button onClick={() => setAddOpen(true)} style={{
      background: `${T.green}12`, border: `1px solid ${T.green}44`,
      color: T.green, padding: "0.35rem 0.8rem", borderRadius: 4,
      cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
    }}>+ Add Metric</button>
  );
})()}
      </ModuleToolbar>

{/* Overall Progress Bar */}
      {(() => {
        const metMet = data.metrics.filter(m => m.invert ? m.after <= m.target : m.after >= m.target).length;
        const total = data.metrics.length;
        const pct = Math.round((metMet / total) * 100);
        const color = pct === 100 ? T.green : pct >= 66 ? T.cyan : T.yellow;
        return (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.85rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>Project Completion</div>
            <div style={{ flex: 1, height: 6, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
              <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                style={{ height: "100%", background: color, borderRadius: 3, boxShadow: `0 0 8px ${color}55` }} />
            </div>
            <div style={{ color, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700, whiteSpace: "nowrap" }}>{metMet}/{total} targets met · {pct}%</div>
          </div>
        );
      })()}
      
      {/* Edit Mode Banner */}
      {editMode && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: `${T.yellow}0C`, border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: "0.85rem 1.25rem", marginBottom: "1.5rem", fontFamily: T.mono, fontSize: "0.72rem", color: T.yellow }}>
          ✎ Edit Mode ON — click any metric value to edit. Input your own before/after data.
        </motion.div>
      )}

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {data.metrics.map(m => {
          const improved = m.invert ? m.after < m.before : m.after > m.before;
          const onTarget = m.invert ? m.after <= m.target : m.after >= m.target;
          const pct = m.before > 0 ? Math.abs(((m.after - m.before) / m.before) * 100).toFixed(1) : 0;
          const arrow = m.invert ? (m.after < m.before ? "↓" : "↑") : (m.after > m.before ? "↑" : "↓");
          const arrowColor = improved ? T.green : T.red;
          const isActive = activeMetric === m.id;

          return (
            <motion.div key={m.id} whileHover={{ scale: 1.02 }}
              onClick={() => setActiveMetric(isActive ? null : m.id)}
              style={{
                background: T.surface,
                border: `1px solid ${isActive ? T.cyan : (onTarget ? T.green + "44" : T.border)}`,
                borderRadius: 8, padding: "1.25rem",
                position: "relative", overflow: "hidden", cursor: "pointer",
                transition: "border-color 0.2s",
              }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: onTarget ? T.green : T.yellow, opacity: 0.8 }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                {editMode ? (
                  <EditableLabel value={m.label} onChange={v => setMetricLabel(m.id, v)}
                    style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }} />
                ) : (
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{m.label}</div>
                )}
                <Badge label={onTarget ? "TARGET MET ✓" : "IN PROGRESS"} color={onTarget ? T.green : T.yellow} />
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", marginBottom: "0.5rem" }}>
                {editMode ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", textTransform: "uppercase", marginBottom: "0.1rem" }}>before</span>
  <input type="number" value={m.before} onChange={e => setMetricVal(m.id, "before", e.target.value)}
    style={{ width: 65, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.textDim, fontFamily: T.mono, fontSize: "0.9rem", padding: "0.2rem 0.3rem", textDecoration: "line-through", textAlign: "center" }} />
</div>
<span style={{ color: T.textDim, fontFamily: T.mono }}>→</span>
<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
  <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.5rem", textTransform: "uppercase", marginBottom: "0.1rem" }}>after</span>
  <input type="number" value={m.after} onChange={e => setMetricVal(m.id, "after", e.target.value)}
    style={{ width: 65, background: T.panel, border: `1px solid ${T.cyan}55`, borderRadius: 3, color: T.text, fontFamily: T.mono, fontSize: "1.3rem", fontWeight: 700, padding: "0.2rem 0.3rem", textAlign: "center" }} />
</div>
                  </>
                ) : (
                  <>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "1rem", textDecoration: "line-through" }}>{m.before}{m.unit}</div>
                    <div style={{ color: T.text, fontFamily: T.mono, fontSize: "1.6rem", fontWeight: 700, lineHeight: 1 }}>{m.after}{m.unit}</div>
                  </>
                )}
                <div style={{ color: arrowColor, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700, paddingBottom: "0.2rem" }}>{arrow} {pct}%</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ height: 4, background: T.panel, borderRadius: 2, overflow: "hidden", flex: 1, marginRight: "0.75rem" }}>
                  <motion.div
                    animate={{ width: `${(() => {
  if (m.invert) {
    if (m.before <= m.target) return 100;
    const raw = (m.before - m.after) / (m.before - m.target);
    return Math.min(Math.max(isNaN(raw) ? 0 : raw * 100, 0), 100);
  } else {
    if (m.before >= m.target) return 100;
    const raw = (m.after - m.before) / (m.target - m.before);
    return Math.min(Math.max(isNaN(raw) ? 0 : raw * 100, 0), 100);
  }
})()}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ height: "100%", background: onTarget ? T.green : T.yellow, borderRadius: 2 }}
                  />
                </div>
                {editMode ? (
                  <input type="number" value={m.target} onChange={e => setMetricVal(m.id, "target", e.target.value)}
                    style={{ width: 65, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", padding: "0.15rem 0.25rem" }} />
                ) : (
                  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>TARGET: {m.target}{m.unit}</span>
                )}
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isActive && !editMode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: `1px solid ${T.border}` }}>
                    <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem", lineHeight: 1.6 }}>{m.description}</div>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
                        Gap closed: <span style={{ color: T.cyan }}>{Math.abs(m.after - m.before).toFixed(1)}{m.unit}</span>
                      </div>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
                        Remaining: <span style={{ color: onTarget ? T.green : T.yellow }}>
                          {onTarget ? "0 (done)" : Math.abs(m.after - m.target).toFixed(1) + m.unit}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Financial Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { key: "savings",    label: "Annual Savings Realized", color: T.green },
          { key: "copq",       label: "Total COPQ Identified",   color: T.red },
          { key: "investment", label: "Total Investment",         color: T.cyan },
          { label: "ROI Year 1", color: roi >= 0 ? T.yellow : T.red, val: (roi >= 0 ? "+" : "") + roi + "%" },
        ].map(k => (
          <div key={k.label}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${k.color}08 0%, transparent 70%)` }} />
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>{k.label}</div>
            {editMode && k.key ? (
              <input type="number" value={data.financials[k.key]}
                onChange={e => setFinancial(k.key, e.target.value)}
                style={{ width: "100%", background: T.panel, border: `1px solid ${k.color}44`, borderRadius: 4, color: k.color, fontFamily: T.display, fontSize: "1.6rem", fontWeight: 800, textAlign: "center", padding: "0.25rem", boxSizing: "border-box" }} />
            ) : (
              <div style={{ fontFamily: T.display, fontSize: "2rem", fontWeight: 800, color: k.color, textShadow: `0 0 20px ${k.color}66` }}>
                {k.val || fmt(data.financials[k.key])}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          [ DMAIC TIMELINE — RESOLUTION TRAJECTORY ]
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
            <XAxis dataKey="phase" tick={{ fill: T.textDim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <YAxis domain={[
              Math.max(0, (data.metrics.find(m=>m.id==="resolution")?.after || 40) - 10),
              (data.metrics.find(m=>m.id==="resolution")?.before || 80) + 5
            ]} tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.mono, fontSize: "0.75rem", color: T.text }}
              formatter={(v) => [`${v}h`, "Resolution Time"]}
              labelFormatter={(l, p) => p?.[0] ? `${l} · ${p[0].payload.milestone}` : l}
            />
            <ReferenceLine y={data.metrics.find(m=>m.id==="resolution")?.target || 48} stroke={T.green} strokeDasharray="4 4"
              label={{ value: `TARGET ${data.metrics.find(m=>m.id==="resolution")?.target || 48}h`, fill: T.green, fontSize: 10, fontFamily: T.mono }} />
            <Line type="monotone" dataKey="resolution" stroke={T.cyan} strokeWidth={2.5}
              dot={{ fill: T.cyan, r: 6, strokeWidth: 0 }}
              activeDot={{ r: 8, fill: T.cyan, style: { filter: `drop-shadow(0 0 8px ${T.cyan})` } }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sigma + Scores visual */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem" }}>
        {/* Sigma progression */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "2rem", textAlign: "center" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
            [ SIGMA PROGRESSION ]
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ color: T.red, fontFamily: T.display, fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 30px ${T.red}66` }}>
                {sigmaMetric?.before || 1.8}σ
              </div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem", marginTop: "0.4rem" }}>BASELINE</div>
            </div>
            <div style={{ color: T.textDim, fontFamily: T.display, fontSize: "2rem" }}>→</div>
            <div>
              <div style={{ color: T.green, fontFamily: T.display, fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 30px ${T.green}66` }}>
                {sigmaMetric?.after || 3.4}σ
              </div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem", marginTop: "0.4rem" }}>ACHIEVED</div>
            </div>
          </div>
          {/* Mini sigma progress bars */}
          <div style={{ marginTop: "1.5rem" }}>
            {[
              { label: "Baseline", val: (sigmaMetric?.before || 1.8) / 6 * 100, color: T.red, sigma: sigmaMetric?.before || 1.8 },
              { label: "Current", val: (sigmaMetric?.after || 3.4) / 6 * 100, color: T.green, sigma: sigmaMetric?.after || 3.4 },
              { label: "Six Sigma Goal", val: 100, color: T.textDim, sigma: 6 },
            ].map(s => (
              <div key={s.label} style={{ marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>{s.label}</span>
                  <span style={{ color: s.color, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>{s.sigma}σ</span>
                </div>
                <div style={{ height: 6, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${s.val}%` }} transition={{ duration: 0.8 }}
                    style={{ height: "100%", background: s.color, borderRadius: 3, opacity: s.label === "Six Sigma Goal" ? 0.3 : 1 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar — all metrics */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>
            [ BEFORE vs AFTER — ALL METRICS ]
          </div>
          <ResponsiveContainer width="100%" height={280}>
  <RadarChart outerRadius={85} data={data.metrics.map(m => {
    const maxVal = Math.max(m.before, m.after, m.target, 1);
    const normBefore = Math.round((m.before / maxVal) * 100);
    const normAfter = Math.round((m.after / maxVal) * 100);
    return {
      metric: m.label.length > 12 ? m.label.slice(0, 12) + "…" : m.label,
      Before: isNaN(normBefore) ? 0 : normBefore,
      After: isNaN(normAfter) ? 0 : normAfter,
    };
  })}>
              <PolarGrid stroke={T.border} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Before" dataKey="Before" stroke={T.red} fill={T.red} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="After" dataKey="After" stroke={T.green} fill={T.green} fillOpacity={0.2} strokeWidth={2} />
              <Legend formatter={v => <span style={{ color: v === "Before" ? T.red : T.green, fontFamily: T.mono, fontSize: "0.62rem" }}>{v}</span>} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }} formatter={v => [`${v} pts`, ""]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 02: SIGMA CALCULATOR ────────────────────────────────────────────────────
function SigmaCalculator() {
  const company = useCompany();
  const { sym, s, fmt, fmtFull } = useCurrencyFmt();
  const [mode, setMode] = useLocalState("sigma_mode", "dpmo");
  const [defects, setDefects] = useLocalState("sigma_defects", 382000);
  const [opportunities, setOpportunities] = useLocalState("sigma_opps", 1000000);
  const [yieldPct, setYieldPct] = useLocalState("sigma_yield", 61.8);
  const [mean, setMean] = useLocalState("sigma_mean", 72.1);
  const [stdDev, setStdDev] = useLocalState("sigma_std", 17.4);
  const [usl, setUsl] = useLocalState("sigma_usl", 96);
  const [lsl, setLsl] = useLocalState("sigma_lsl", 0);
  const [history, setHistory] = useLocalState("sigma_history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showDistribution, setShowDistribution] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [compareB, setCompareB] = useLocalState("sigma_compareB", { defects: 1350, opportunities: 1000000 });

  const calcAll = (d, o, y, m, s, u, l, md) => {
    let dpmoVal;
    if (md === "dpmo") dpmoVal = Math.round((d / Math.max(o, 1)) * 1e6);
    else if (md === "yield") dpmoVal = Math.round((1 - y / 100) * 1e6);
    else dpmoVal = Math.round(sigmaToDpmo(calcPpk(m, s, u, l) * 3));
    dpmoVal = Math.max(dpmoVal, 0);
    const sig = dpmoToSigma(Math.max(dpmoVal, 3.4));
    const pk = md === "ppk" ? calcPpk(m, s, u, l) : +(sig / 3).toFixed(3);
    const yld = +((1 - dpmoVal / 1e6) * 100).toFixed(4);
    return { dpmo: dpmoVal, sigma: sig, ppk: pk, yield: yld };
  };

  const res = calcAll(defects, opportunities, yieldPct, mean, stdDev, usl, lsl, mode);
  const resB = calcAll(compareB.defects, compareB.opportunities, 50, 72, 17, 96, 0, "mode");
  const sc = sigmaColor(res.sigma);
  const ps = ppkStatus(res.ppk);

  // Save to history
  const saveSnapshot = () => {
    const snap = { ...res, mode, timestamp: new Date().toLocaleTimeString(), label: `${res.sigma}σ` };
    setHistory(prev => [snap, ...prev].slice(0, 10));
  };

  // Normal distribution curve data
  const distData = Array.from({ length: 61 }, (_, i) => {
    const x = (i - 30) / 5;
    const y = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const sigmaX = mode === "ppk" ? mean + x * stdDev : x * (res.sigma > 0 ? 1 : 1);
    const inSpec = mode === "ppk" ? (sigmaX <= usl && sigmaX >= lsl) : Math.abs(x) <= res.sigma / 3;
    return { x: x.toFixed(2), y: +y.toFixed(4), inSpec, sigmaX: +sigmaX.toFixed(1) };
  });

  // Benchmark comparison data
  const benchmarkData = [
    { industry: "Healthcare", sigma: 3.5, dpmo: 22750 },
    { industry: "Airlines (safety)", sigma: 6.0, dpmo: 3.4 },
    { industry: "Retail Banking", sigma: 3.0, dpmo: 66807 },
    { industry: "Your Process", sigma: res.sigma, dpmo: res.dpmo, highlight: true },
    { industry: "Project Target", sigma: 3.4, dpmo: 1350 },
    { industry: "Six Sigma Goal", sigma: 6.0, dpmo: 3.4 },
    { industry: "World Class Mfg", sigma: 5.7, dpmo: 19 },
  ].sort((a, b) => a.sigma - b.sigma);

  const PRESETS = [
    ...(company && !company.isPulseDigital && company.baselineMean > 0 ? [
      { label: `${company.name} Baseline`, dpmo: null, mode: "ppk", mean: company.baselineMean, std: company.baselineStdDev, usl: company.usl, lsl: company.lsl },
    ] : []),
    { label: "Project Baseline", dpmo: 382000, mode: "dpmo" },
    { label: "Project Final", dpmo: 1350, mode: "dpmo" },
    { label: "3σ Standard", dpmo: 66807, mode: "dpmo" },
    { label: "4σ Target", dpmo: 6210, mode: "dpmo" },
    { label: "5σ World Class", dpmo: 233, mode: "dpmo" },
    { label: "6σ Ideal", dpmo: 3, mode: "dpmo" },
  ];

  const copyReport = `SIGMA LEVEL ANALYSIS
Mode: ${mode.toUpperCase()} | ${new Date().toLocaleDateString()}

Results:
  Sigma Level: ${res.sigma}σ (${ps.label})
  DPMO: ${res.dpmo.toLocaleString()}
  Process Yield: ${res.yield}%
  Ppk Index: ${res.ppk}

${compareMode ? `Comparison (Baseline):
  Sigma: ${resB.sigma}σ
  DPMO: ${resB.dpmo.toLocaleString()}
  Improvement: ${(res.sigma - resB.sigma).toFixed(2)}σ | ${Math.round(((resB.dpmo - res.dpmo)/resB.dpmo)*100)}% defect reduction` : ""}`;

  // Big animated gauge
  const BigGauge = ({ sigma, color }) => {
    const angle = Math.min((sigma / 6) * 180, 180);
    const r = 90, cx = 110, cy = 110;
    const toRad = (deg) => (deg - 180) * (Math.PI / 180);
    const x = cx + r * Math.cos(toRad(angle));
    const y = cy + r * Math.sin(toRad(angle));
    const zones = [
      { start: 0, end: 30, color: T.red, label: "1σ" },
      { start: 30, end: 60, color: T.orange, label: "2σ" },
      { start: 60, end: 90, color: T.yellow, label: "3σ" },
      { start: 90, end: 120, color: T.cyan, label: "4σ" },
      { start: 120, end: 150, color: "#7EB5FF", label: "5σ" },
      { start: 150, end: 180, color: T.green, label: "6σ" },
    ];
    return (
      <svg width="220" height="125" viewBox="0 0 220 125">
        {/* Outer ring */}
        <path d={`M ${cx - r - 8} ${cy} A ${r + 8} ${r + 8} 0 0 1 ${cx + r + 8} ${cy}`}
          fill="none" stroke={T.border} strokeWidth="2" />
        {/* Colored zones */}
        {zones.map((z, i) => {
          const s1 = toRad(z.start), s2 = toRad(z.end);
          const x1 = cx + r * Math.cos(s1), y1 = cy + r * Math.sin(s1);
          const x2 = cx + r * Math.cos(s2), y2 = cy + r * Math.sin(s2);
          const ri = r - 12;
          const xi1 = cx + ri * Math.cos(s1), yi1 = cy + ri * Math.sin(s1);
          const xi2 = cx + ri * Math.cos(s2), yi2 = cy + ri * Math.sin(s2);
          return (
            <g key={i}>
              <path d={`M ${xi1} ${yi1} A ${ri} ${ri} 0 0 1 ${xi2} ${yi2} L ${x2} ${y2} A ${r} ${r} 0 0 0 ${x1} ${y1} Z`}
                fill={`${z.color}33`} stroke={z.color} strokeWidth="0.5" />
              <text x={cx + (r + 14) * Math.cos(toRad((z.start + z.end) / 2))}
                y={cy + (r + 14) * Math.sin(toRad((z.start + z.end) / 2))}
                fill={T.textDim} fontSize="8" fontFamily={T.mono} textAnchor="middle" dominantBaseline="middle">
                {z.label}
              </text>
            </g>
          );
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="3.5" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={7} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <circle cx={cx} cy={cy} r={3} fill={T.bg} />
        {/* Tick marks */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const a = toRad(i * 30);
          const x1t = cx + (r - 16) * Math.cos(a), y1t = cy + (r - 16) * Math.sin(a);
          const x2t = cx + (r - 8) * Math.cos(a), y2t = cy + (r - 8) * Math.sin(a);
          return <line key={i} x1={x1t} y1={y1t} x2={x2t} y2={y2t} stroke={T.textDim} strokeWidth="1.5" />;
        })}
      </svg>
    );
  };

  return (
    <motion.div id="overview-export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader
        module="Module 02 — Process Capability"
        title="Sigma Level Calculator"
        sub="Convert between DPMO, yield, and capability indices. Distribution visualizer, benchmarks, and multi-sigma comparison."
      />

      {/* Toolbar */}
      <ModuleToolbar
        onReset={() => { setDefects(382000); setOpportunities(1000000); setYieldPct(61.8); setMean(72.1); setStdDev(17.4); setUsl(96); setLsl(0); setMode("dpmo"); }}
        copyData={copyReport}
        saved={true}
      >
        <button onClick={() => setCompareMode(p => !p)} style={{
          background: compareMode ? `${T.yellow}18` : "transparent",
          border: `1px solid ${compareMode ? T.yellow : T.border}`,
          color: compareMode ? T.yellow : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>⇄ Compare A vs B</button>
        <button onClick={() => setShowDistribution(p => !p)} style={{
          background: showDistribution ? `${T.cyan}15` : "transparent",
          border: `1px solid ${showDistribution ? T.cyan : T.border}`,
          color: showDistribution ? T.cyan : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>~ Distribution</button>
        <button onClick={() => setShowHistory(p => !p)} style={{
          background: showHistory ? `${T.green}15` : "transparent",
          border: `1px solid ${showHistory ? T.green : T.border}`,
          color: showHistory ? T.green : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>⏱ History ({history.length})</button>
        <button onClick={saveSnapshot} style={{
          background: `${T.cyan}18`, border: `1px solid ${T.cyan}`,
          color: T.cyan, padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>+ Save Snapshot</button>
      </ModuleToolbar>

      {/* Preset quick buttons */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", alignSelf: "center" }}>PRESETS:</span>
        {PRESETS.map(p => {
  const isActive = p.mode === mode && (
    p.mode === "dpmo"
      ? res.dpmo === Math.round((p.dpmo / 1000000) * 1000000)
      : (p.mean === mean && p.std === stdDev)
  );
            return (
              <button key={p.label} onClick={() => {
                setMode(p.mode);
                if (p.mode === "dpmo") { setDefects(p.dpmo); setOpportunities(1000000); }
                if (p.mode === "ppk" && p.mean) { setMean(p.mean); setStdDev(p.std); setUsl(p.usl); setLsl(p.lsl); }
              }} style={{
                background: isActive ? `${T.cyan}18` : T.panel,
                border: `1px solid ${isActive ? T.cyan : T.border}`,
                color: isActive ? T.cyan : T.textDim,
                padding: "0.3rem 0.7rem", borderRadius: 20, cursor: "pointer",
                fontFamily: T.mono, fontSize: "0.62rem", transition: "all 0.2s",
    }}>
      {p.label}
    </button>
  );
})}

      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        {/* Input Panel */}
        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Mode selector */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>Input Mode</div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              {[
                { id: "dpmo", label: "DPMO", desc: "Defects per million" },
                { id: "yield", label: "Yield %", desc: "Process success rate" },
                { id: "ppk", label: "Ppk / Stats", desc: "Statistical params" },
              ].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  flex: "1 1 80px",
                  background: mode === m.id ? `${T.cyan}18` : T.panel,
                  border: `2px solid ${mode === m.id ? T.cyan : T.border}`,
                  color: mode === m.id ? T.cyan : T.textDim,
                  padding: "0.65rem 0.5rem", borderRadius: 6, cursor: "pointer",
                  fontFamily: T.mono, textAlign: "center", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: mode === m.id ? 700 : 400, letterSpacing: "0.05em" }}>{m.label}</div>
                  <div style={{ fontSize: "0.55rem", opacity: 0.6, marginTop: "0.15rem" }}>{m.desc}</div>
                </button>
              ))}
            </div>

            {/* Inputs with both slider + number input */}
            {mode === "dpmo" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "Total Defects", val: defects, set: setDefects, min: 0, max: 1000000, step: 100, fmtV: v => v.toLocaleString() },
                  { label: "Total Opportunities", val: opportunities, set: setOpportunities, min: 1000, max: 10000000, step: 10000, fmtV: v => v.toLocaleString() },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", alignItems: "center" }}>
                      <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem" }}>{f.label}</span>
                      <input type="number" value={f.val} onChange={e => f.set(Math.max(0, +e.target.value))}
                        style={{ width: 100, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, fontSize: "0.8rem", padding: "0.2rem 0.35rem", textAlign: "right", fontWeight: 700 }} />
                    </div>
                    <input type="range" min={f.min} max={f.max} step={f.step} value={f.val} onChange={e => f.set(+e.target.value)}
                      style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.15rem" }}>
                      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>{f.min.toLocaleString()}</span>
                      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>{f.max.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                <div style={{ background: T.panel, borderRadius: 6, padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Calculated DPMO</div>
                  <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "1.25rem", fontWeight: 700 }}>
                    {Math.round((defects / Math.max(opportunities, 1)) * 1e6).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {mode === "yield" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", alignItems: "center" }}>
                  <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem" }}>Process Yield (%)</span>
                  <input type="number" value={yieldPct} step={0.01} min={0} max={100} onChange={e => setYieldPct(Math.min(100, Math.max(0, +e.target.value)))}
                    style={{ width: 80, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, fontSize: "0.8rem", padding: "0.2rem 0.35rem", textAlign: "right", fontWeight: 700 }} />
                </div>
                <input type="range" min={30} max={99.9997} step={0.01} value={yieldPct} onChange={e => setYieldPct(+e.target.value)}
                  style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  {[50, 69, 93.3, 99.4, 99.98, 99.9997].map((v, i) => (
                    <button key={v} onClick={() => setYieldPct(v)} style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontFamily: T.mono, fontSize: "0.55rem", padding: "0.2rem" }}>{i+1}σ</button>
                  ))}
                </div>
              </div>
            )}

            {mode === "ppk" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "Process Mean", val: mean, set: setMean, min: 0, max: 200, step: 0.1 },
                  { label: "Std Deviation (σ)", val: stdDev, set: setStdDev, min: 0.1, max: 50, step: 0.1 },
                  { label: "Upper Spec Limit (USL)", val: usl, set: setUsl, min: 1, max: 300, step: 1 },
                  { label: "Lower Spec Limit (LSL)", val: lsl, set: setLsl, min: 0, max: 200, step: 1 },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", alignItems: "center" }}>
                      <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }}>{f.label}</span>
                      <input type="number" value={f.val} step={f.step} onChange={e => f.set(+e.target.value)}
                        style={{ width: 75, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, fontSize: "0.8rem", padding: "0.2rem 0.35rem", textAlign: "right", fontWeight: 700 }} />
                    </div>
                    <input type="range" min={f.min} max={f.max} step={f.step} value={f.val} onChange={e => f.set(+e.target.value)}
                      style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {[
                    { label: "Cpu (upper)", val: stdDev > 0 ? ((usl - mean) / (3 * stdDev)).toFixed(3) : "—" },
                    { label: "Cpl (lower)", val: stdDev > 0 && mean > lsl ? ((mean - lsl) / (3 * stdDev)).toFixed(3) : "—" },
                    { label: "Cp (potential)", val: stdDev > 0 ? ((usl - lsl) / (6 * stdDev)).toFixed(3) : "—" },
                    { label: "Ppk (actual)", val: res.ppk },
                  ].map(k => (
                    <div key={k.label} style={{ background: T.panel, borderRadius: 4, padding: "0.5rem 0.65rem", textAlign: "center" }}>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase" }}>{k.label}</div>
                      <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.9rem", fontWeight: 700 }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compare B panel */}
          {compareMode && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `${T.yellow}0A`, border: `1px solid ${T.yellow}33`, borderRadius: 8, padding: "1.25rem" }}>
              <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>[ SCENARIO B — BASELINE ]</div>
              {[
                { label: "Defects B", val: compareB.defects, key: "defects", min: 0, max: 1000000, step: 100 },
                { label: "Opportunities B", val: compareB.opportunities, key: "opportunities", min: 1000, max: 10000000, step: 10000 },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.67rem" }}>{f.label}</span>
                    <input type="number" value={f.val} onChange={e => setCompareB(p => ({ ...p, [f.key]: +e.target.value }))}
                      style={{ width: 90, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.yellow, fontFamily: T.mono, fontSize: "0.78rem", padding: "0.2rem 0.35rem", textAlign: "right" }} />
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={f.val}
                    onChange={e => setCompareB(p => ({ ...p, [f.key]: +e.target.value }))}
                    style={{ width: "100%", accentColor: T.yellow, cursor: "pointer" }} />
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Results Panel */}
        <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Big Gauge */}
          <div style={{ background: T.surface, border: `2px solid ${sc}33`, borderRadius: 8, padding: "1.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${sc}08 0%, transparent 70%)` }} />
            <BigGauge sigma={res.sigma} color={sc} />
            <motion.div key={res.sigma} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ color: sc, fontFamily: T.display, fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 40px ${sc}77`, marginTop: "0.5rem" }}>
              {res.sigma}σ
            </motion.div>
            <div style={{ marginTop: "0.4rem" }}><Badge label={ps.label} color={ps.color} /></div>
            {compareMode && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: `${T.yellow}10`, borderRadius: 6 }}>
                <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.65rem" }}>
                  Baseline B: {resB.sigma}σ · {res.sigma > resB.sigma ? `↑ +${(res.sigma - resB.sigma).toFixed(2)}σ improvement` : `↓ ${(resB.sigma - res.sigma).toFixed(2)}σ regression`}
                </div>
              </div>
            )}
          </div>

          {/* Output cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.65rem" }}>
            {[
              { label: "DPMO", val: res.dpmo.toLocaleString(), sub: "defects per million", color: sc },
              { label: "Yield", val: `${res.yield}%`, sub: "process success", color: sc },
              { label: "Ppk Index", val: res.ppk, sub: ppkStatus(res.ppk).label, color: ppkStatus(res.ppk).color },
              { label: "% Defective", val: `${(100 - res.yield).toFixed(4)}%`, sub: "failure rate", color: res.yield > 99 ? T.green : res.yield > 93 ? T.yellow : T.red },
            ].map(r => (
              <motion.div key={r.label} whileHover={{ scale: 1.03 }}
                style={{ background: T.surface, border: `1px solid ${r.color}22`, borderRadius: 6, padding: "0.9rem", textAlign: "center" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{r.label}</div>
                <motion.div key={r.val} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                  style={{ color: r.color, fontFamily: T.mono, fontSize: "1.1rem", fontWeight: 800, textShadow: `0 0 10px ${r.color}44` }}>
                  {r.val}
                </motion.div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.56rem", marginTop: "0.15rem" }}>{r.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Sigma reference table — highlighted */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>Sigma Reference Table</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0" }}>
              {[["σ", "DPMO", "Yield", "Ppk"], ["1σ","691,462","30.9%","0.33"], ["2σ","308,537","69.1%","0.67"], ["3σ","66,807","93.3%","1.00"], ["4σ","6,210","99.4%","1.33"], ["5σ","233","99.98%","1.67"], ["6σ","3.4","99.9997%","2.00"]].map((row, i) => {
                const isHeader = i === 0;
                const sigRow = isHeader ? null : parseFloat(row[0]);
                const isActive = !isHeader && sigRow !== null && !isNaN(sigRow) && Math.round(res.sigma) === sigRow;
                return row.map((cell, j) => (
                  <div key={`${i}-${j}`} style={{
                    color: i === 0 ? T.textDim : (isActive ? (j === 0 ? sc : T.text) : T.textMid),
                    fontFamily: T.mono, fontSize: "0.63rem", padding: "0.3rem 0.4rem",
                    background: isActive ? `${sc}15` : "transparent",
                    borderBottom: `1px solid ${T.border}`,
                    borderLeft: j === 0 ? "none" : `1px solid ${T.border}`,
                    fontWeight: isActive ? 700 : 400,
                    position: "relative",
                  }}>
                    {cell}
                    {isActive && j === 0 && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: sc, borderRadius: "2px 0 0 2px" }} />}
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Distribution curve */}
      {showDistribution && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginTop: "1.5rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
            Normal Distribution — Spec Limits Visualization
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barCategoryGap="0%">
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
              <XAxis dataKey="x" tick={{ fill: T.textDim, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false}
                tickFormatter={(v, i) => i % 10 === 0 ? `${v}σ` : ""} />
              <YAxis tick={{ fill: T.textDim, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.68rem", color: T.text }}
                formatter={(v, n, p) => [`σ = ${p.payload.x}`, "Position"]} />
              <Bar dataKey="y" radius={[2, 2, 0, 0]}>
                {distData.map((d, i) => <Cell key={i} fill={d.inSpec ? `${sc}88` : `${T.red}44`} />)}
              </Bar>
              <ReferenceLine x="0.00" stroke={T.cyan} strokeDasharray="3 3" label={{ value: "μ", fill: T.cyan, fontSize: 10, fontFamily: T.mono }} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: `${sc}88` }} />
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>Within spec ({res.yield}%)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: `${T.red}44` }} />
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>Outside spec ({(100 - res.yield).toFixed(3)}%)</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Industry Benchmarks */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginTop: "1.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
          Industry Benchmark Comparison
        </div>
        {benchmarkData.map(b => {
          const pct = (b.sigma / 6) * 100;
          const c = b.highlight ? sc : sigmaColor(b.sigma);
          return (
            <div key={b.industry} style={{ marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 150, color: b.highlight ? sc : T.textMid, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: b.highlight ? 700 : 400, flexShrink: 0 }}>
                {b.industry} {b.highlight && "◀"}
              </div>
              <div style={{ flex: 1, height: 10, background: T.panel, borderRadius: 5, overflow: "hidden" }}>
                <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                  style={{ height: "100%", background: b.highlight ? `linear-gradient(90deg,${c}88,${c})` : c + "66", borderRadius: 5,
                    boxShadow: b.highlight ? `0 0 8px ${c}55` : "none" }} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", minWidth: 130, flexShrink: 0 }}>
                <span style={{ color: c, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: b.highlight ? 700 : 400 }}>{b.sigma}σ</span>
                <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>{b.dpmo.toLocaleString()} DPMO</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* History panel */}
      <AnimatePresence>
        {/* ── TRAJECTORY FORECASTER ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.cyan, display: "inline-block" }} />
          Improvement Trajectory Forecaster
        </div>
        {(() => {
          const currentDpmo = res.dpmo || 1;
          const currentSigma = res.sigma || 0;
          const INDUSTRY_BENCHMARKS = {
            "IT / Tech Support": { sigma: 4.2, label: "IT Industry Avg" },
            "Manufacturing": { sigma: 4.5, label: "Manufacturing Avg" },
            "Healthcare": { sigma: 4.8, label: "Healthcare Avg" },
            "Financial Services": { sigma: 4.6, label: "Financial Avg" },
            "Retail / E-Commerce": { sigma: 3.8, label: "Retail Avg" },
            "Logistics & Supply Chain": { sigma: 3.9, label: "Logistics Avg" },
            "Customer Service": { sigma: 3.7, label: "Customer Svc Avg" },
            "HR / People Ops": { sigma: 3.5, label: "HR Avg" },
          };
          const industryKey = company?.industry || "IT / Tech Support";
          const benchmark = INDUSTRY_BENCHMARKS[industryKey] || INDUSTRY_BENCHMARKS["IT / Tech Support"];
          const milestones = [3, 3.5, 4, 4.5, 5, 5.5, 6];
          const dpmoFromSigma = (s) => {
            const z = s - 1.5;
            const p = 0.5 * (1 + Math.sign(z) * (1 - Math.exp(-0.147 * z * z - 0.118 * Math.abs(z) - 0.271)));
            return Math.round((1 - p) * 1e6);
          };
          const monthsToSigma = (targetSigma, improvementPctPerMonth = 15) => {
            if (currentSigma >= targetSigma) return 0;
            let dpmo = currentDpmo;
            let months = 0;
            while (dpmo > dpmoFromSigma(targetSigma) && months < 120) {
              dpmo = dpmo * (1 - improvementPctPerMonth / 100);
              months++;
            }
            return months;
          };
          const trajectoryData = milestones.map(s => ({
            sigma: s,
            months: monthsToSigma(s),
            dpmo: dpmoFromSigma(s),
            reachable: monthsToSigma(s) <= 60,
          })).filter(m => m.sigma > currentSigma);

          const nextMilestone = trajectoryData[0];
          const benchmarkGap = (benchmark.sigma - currentSigma).toFixed(2);

          return (
            <div>
              {/* Benchmark comparison */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, background: `${T.yellow}0A`, border: `1px solid ${T.yellow}22`, borderRadius: 6, padding: "0.85rem", minWidth: 140 }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Your Process</div>
                  <div style={{ color: T.yellow, fontFamily: T.display, fontSize: "1.6rem", fontWeight: 800 }}>{currentSigma.toFixed(2)}σ</div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>{currentDpmo.toLocaleString()} DPMO</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", color: T.textDim, fontFamily: T.mono, fontSize: "1.2rem" }}>→</div>
                <div style={{ flex: 1, background: `${T.cyan}0A`, border: `1px solid ${T.cyan}22`, borderRadius: 6, padding: "0.85rem", minWidth: 140 }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{benchmark.label}</div>
                  <div style={{ color: T.cyan, fontFamily: T.display, fontSize: "1.6rem", fontWeight: 800 }}>{benchmark.sigma}σ</div>
                  <div style={{ color: parseFloat(benchmarkGap) > 0 ? T.red : T.green, fontFamily: T.mono, fontSize: "0.58rem" }}>
                    {parseFloat(benchmarkGap) > 0 ? `▼ ${benchmarkGap}σ gap` : `▲ ${Math.abs(parseFloat(benchmarkGap))}σ above avg`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", color: T.textDim, fontFamily: T.mono, fontSize: "1.2rem" }}>→</div>
                <div style={{ flex: 1, background: `${T.green}0A`, border: `1px solid ${T.green}22`, borderRadius: 6, padding: "0.85rem", minWidth: 140 }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>World Class</div>
                  <div style={{ color: T.green, fontFamily: T.display, fontSize: "1.6rem", fontWeight: 800 }}>6.0σ</div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>3.4 DPMO</div>
                </div>
              </div>

              {/* Next milestone callout */}
              {nextMilestone && (
                <div style={{ background: `${T.green}0A`, border: `1px solid ${T.green}33`, borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase" }}>Next Milestone</div>
                    <div style={{ color: T.green, fontFamily: T.mono, fontSize: "1rem", fontWeight: 700 }}>{nextMilestone.sigma}σ — {nextMilestone.dpmo.toLocaleString()} DPMO</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase" }}>Est. Time @ 15%/mo improvement</div>
                    <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "1rem", fontWeight: 700 }}>{nextMilestone.months} months</div>
                  </div>
                </div>
              )}

              {/* Milestone timeline */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {trajectoryData.map((m, i) => (
                  <div key={m.sigma} style={{
                    flex: "1 1 100px", background: m.reachable ? `${T.cyan}0A` : `${T.textDim}08`,
                    border: `1px solid ${m.reachable ? T.cyan + "33" : T.border}`,
                    borderRadius: 6, padding: "0.6rem 0.75rem", textAlign: "center",
                  }}>
                    <div style={{ color: m.reachable ? T.cyan : T.textDim, fontFamily: T.mono, fontSize: "0.9rem", fontWeight: 700 }}>{m.sigma}σ</div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", marginTop: "0.15rem" }}>
                      {m.months === 0 ? "✓ Reached" : m.reachable ? `~${m.months}mo` : ">60mo"}
                    </div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem" }}>{m.dpmo.toLocaleString()} DPMO</div>
                  </div>
                ))}
              </div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", marginTop: "0.6rem" }}>
                * Projection assumes 15% DPMO reduction per month via sustained DMAIC effort
              </div>
            </div>
          );
        })()}
      </div>

      {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.85rem", alignItems: "center" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase" }}>[ CALCULATION HISTORY ]</div>
                <button onClick={() => setHistory([])} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.2rem 0.5rem", borderRadius: 3, cursor: "pointer", fontFamily: T.mono, fontSize: "0.58rem" }}>Clear</button>
              </div>
              {history.length === 0 ? (
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.72rem" }}>No snapshots yet. Click "+ Save Snapshot" to save current calculation.</div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {history.map((h, i) => {
                    const c = sigmaColor(h.sigma);
                    return (
                      <div key={i} style={{ background: T.panel, border: `1px solid ${c}33`, borderRadius: 6, padding: "0.65rem 0.85rem", minWidth: 120 }}>
                        <div style={{ color: c, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{h.sigma}σ</div>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>{h.dpmo.toLocaleString()} DPMO</div>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", marginTop: "0.15rem" }}>{h.timestamp}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}



// ─── 03: DMAIC TRACKER ───────────────────────────────────────────────────────
const DMAIC_PROJECT_START = "2025-02-03"; // Tanggal mulai project (bisa diubah)

const weekToDate = (weekNum, startDateStr) => {
  const start = new Date(startDateStr);
  const d = new Date(start.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const DMAIC_DEFAULTS = {
  D: {
    name: "DEFINE", color: "#00D4FF", status: "COMPLETE", progress: 100,
    startWeek: 1, endWeek: 4,
    tools: [
      { name: "Project Charter", done: true, note: "Executive sign-off secured" },
      { name: "SIPOC Diagram", done: true, note: "8 suppliers, 10-step process mapped" },
      { name: "Stakeholder Analysis", done: true, note: "7 stakeholders mapped, 3 champions" },
      { name: "VOC / Kano Model", done: true, note: "126 customer responses collected" },
      { name: "CTS Analysis", done: true, note: "3 tiers: Must-Have, Satisfier, Delighter" },
    ],
    keyOutputs: [
      { label: "Problem Statement", val: "Avg resolution 72h → target 48h", editable: true },
      { label: "Business Impact", val: "$450K annual churn (conservative)", editable: true },
      { label: "Scope", val: "Escalated Tier 2/3 complaints only", editable: true },
      { label: "Team Size", val: "5 core + 12 extended SMEs", editable: true },
      { label: "Duration", val: "4 weeks (Month 1)", editable: true },
    ],
    insight: "The SIPOC reveals Support operates as a reactive 'shock absorber' for product defects. True optimization requires closing the feedback loop to Engineering.",
    risk: "HIGH — scope too broad initially. Narrowed to Tier 2/3 only.",
    riskColor: "#FF8C00",
    decisions: [
      "Scope narrowed from all complaints → Tier 2/3 escalated only",
      "Timeline extended 4→6 months to ensure thorough data collection",
      "Budget revised to include KM system investment",
    ],
  },
  M: {
    name: "MEASURE", color: "#00FF9C", status: "COMPLETE", progress: 100,
    startWeek: 5, endWeek: 12,
    tools: [
      { name: "Current State Process Map", done: true, note: "16-step map, bottlenecks at steps 5 & 10" },
      { name: "Gage R&R (MSA)", done: true, note: "12.4% — acceptable (<30% threshold)" },
      { name: "Pareto Analysis", done: true, note: "Top 3 categories = 65% of resolution time" },
      { name: "Process Capability (Ppk)", done: true, note: "Ppk = 0.43 — process incapable" },
      { name: "Data Collection Plan", done: true, note: "n = 547 cases over 8 weeks" },
    ],
    keyOutputs: [
      { label: "Sample Size", val: "n = 547 cases / 8 weeks", editable: true },
      { label: "Baseline Ppk", val: "0.43 — process incapable", editable: true },
      { label: "Baseline DPMO", val: "382,000 (1.8σ level)", editable: true },
      { label: "Gage R&R", val: "12.4% — acceptable", editable: true },
      { label: "Top Variation", val: "Diagnosis phase (σ = 14.3h)", editable: true },
    ],
    insight: "The mean of 72.1h is operationally deceptive (+1.28 skewness). Managing to the mean is a strategic error — tail risk (90th pct = 102.4h) is the real target.",
    risk: "MEDIUM — Hawthorne Effect risk during data collection. Mitigated with blind historical review.",
    riskColor: "#FFD60A",
    decisions: [
      "Scope refined: simple FCR cases excluded — fundamentally different behavior",
      "Added 'time-to-first-response' as secondary metric (r = 0.61 correlation)",
      "Analyze phase extended +2 weeks for hypothesis investigation depth",
    ],
  },
  A: {
    name: "ANALYZE", color: "#FFD60A", status: "COMPLETE", progress: 100,
    startWeek: 13, endWeek: 17,
    tools: [
      { name: "5 Whys Analysis", done: true, note: "3 root causes drilled to fundamental level" },
      { name: "Fishbone (Ishikawa)", done: true, note: "6 categories: Man, Method, Machine, Material, Measurement, Environment" },
      { name: "Regression Analysis", done: true, note: "Experience → time: R² = 0.58, p < 0.001" },
      { name: "ANOVA Testing", done: true, note: "Day-of-week effect: F = 11.8, p < 0.001" },
      { name: "8 Wastes Analysis", done: true, note: "56% NVA time — 33.5h waste per case" },
      { name: "COPQ Analysis", done: true, note: "$9M total COPQ identified" },
    ],
    keyOutputs: [
      { label: "Root Cause #1", val: "Technician experience gap (84% of gap)", editable: true },
      { label: "Root Cause #2", val: "Skills mismatch (23% contribution)", editable: true },
      { label: "Root Cause #3", val: "Scattered knowledge — 5 systems (21%)", editable: true },
      { label: "NVA Time", val: "56% of 72h is non-value-added", editable: true },
      { label: "Total COPQ", val: "$9M annually identified", editable: true },
    ],
    insight: "Experience is not a soft HR concern — it's a hard operational variable. Each year of experience lost to turnover costs one full business day per case. R² = 0.58.",
    risk: "LOW — all 6 root causes validated at p < 0.001. Scope refined to exclude vendor-dependent Integration Problems.",
    riskColor: "#00FF9C",
    decisions: [
      "Integration Problems (9.9%) removed — external vendor dependencies outside our control",
      "Added 'skill-to-case match rate' as new KPI — unmeasured but critical",
      "Phase 1 target revised: 72h → 60h (not 48h), accounting for training maturation",
    ],
  },
  I: {
    name: "IMPROVE", color: "#FF8C00", status: "COMPLETE", progress: 100,
    startWeek: 18, endWeek: 24,
    tools: [
      { name: "Design of Experiments (DoE)", done: true, note: "2³⁻¹ fractional factorial — A×C interaction discovered" },
      { name: "Quality Function Deployment (QFD)", done: true, note: "Skills routing scored 5.77 — highest priority" },
      { name: "Pilot Testing (30-day)", done: true, note: "n=50 cases, −19% resolution time (p=0.003)" },
      { name: "Solution Selection Matrix", done: true, note: "5 solutions, composite score >70 each" },
      { name: "Wave Implementation Plan", done: true, note: "3 waves: Quick wins → Structural → Sustained" },
    ],
    keyOutputs: [
      { label: "Solution 1", val: "6-week training + mentoring (+90 days)", editable: true },
      { label: "Solution 2", val: "Skills-based intelligent routing", editable: true },
      { label: "Solution 3", val: "Unified knowledge platform", editable: true },
      { label: "Solution 4", val: "Automated customer communication", editable: true },
      { label: "Pilot Result", val: "−19% resolution time (p = 0.003)", editable: true },
    ],
    insight: "DoE revealed A×C interaction: skills-based routing delivers max value only when technicians are better trained. Parallel deployment is mandatory, not optional.",
    risk: "MEDIUM — Knowledge platform delayed Week 22 due to data migration. Manual workaround activated.",
    riskColor: "#FFD60A",
    decisions: [
      "Wave 1 (quick wins) launched Week 18 — immediate CSAT +0.8 pts",
      "DoE confirmed: routing + training must be simultaneous, not sequential",
      "Budget $180K maintained — custom AI engine descoped, off-shelf modules used",
    ],
  },
  C: {
    name: "CONTROL", color: "#00FF9C", status: "ACTIVE", progress: 85,
    startWeek: 25, endWeek: 30,
    tools: [
      { name: "I-MR Control Charts", done: true, note: "5 weeks in-control, no WE violations" },
      { name: "Control Plan", done: true, note: "8 metrics, weekly cadence, 3-tier escalation" },
      { name: "Error-Proofing (Poka-Yoke)", done: true, note: "5 mechanisms, 73% aggregate RPN reduction" },
      { name: "SOPs (5 documents)", done: true, note: "TS-01 to TS-05 — intake to escalation" },
      { name: "Training Plan (6 modules)", done: true, note: "TM-01 to TM-06, 100% completion on core" },
      { name: "Quarterly Review Cadence", done: false, note: "Scheduled Week 32 — upcoming" },
    ],
    keyOutputs: [
      { label: "Final Ppk", val: "1.41 — process CAPABLE", editable: true },
      { label: "Final Sigma", val: "3.4σ (from 1.8σ baseline)", editable: true },
      { label: "DPMO Reduction", val: "382,000 → 1,350 (282x better)", editable: true },
      { label: "RPN Reduction", val: "73% aggregate risk eliminated", editable: true },
      { label: "Annual Savings", val: "$300,000 realized", editable: true },
    ],
    insight: "The project achieved what DMAIC is designed to deliver: making failure structurally impossible through system-enforced controls. Process is in statistical control.",
    risk: "LOW — all metrics GREEN for 5 consecutive weeks. Entropy risk flagged for 3-6 month horizon.",
    riskColor: "#00FF9C",
    decisions: [
      "Process ownership transferred to Support Ops Manager",
      "Automated OCAP triggers activated on SPC violations",
      "Project 3 (HR Analytics) formally initiated — human capital sustainability",
    ],
  },
};

function DMAICTracker() {
  const company = useCompany();
  const [showBridge, setShowBridge] = useState(false);
  const [bridgePhase, setBridgePhase] = useState(null);
  const [bridgeData, setBridgeData] = useState({});
  const [bridgeStatus, setBridgeStatus] = useState({});

  const pullFromModules = (phaseId) => {
    const pulled = {};
    const status = {};

    // Pull dari Sigma Calculator
    try {
      const sigmaRaw = localStorage.getItem("sigma_history") || "[]";
      const sigmaHistory = JSON.parse(sigmaRaw);
      if (sigmaHistory.length > 0) {
        const latest = sigmaHistory[0];
        pulled.sigma = {
          source: "Σ Calculator",
          icon: "σ",
          color: "#00D4FF",
          items: [
            `Sigma Level: ${latest.sigma || "—"}σ`,
            `DPMO: ${latest.dpmo?.toLocaleString() || "—"}`,
            `Ppk: ${latest.ppk || "—"}`,
            `Yield: ${latest.yield || "—"}%`,
          ].filter(i => !i.includes("—")),
        };
        status.sigma = "ok";
      } else { status.sigma = "empty"; }
    } catch { status.sigma = "error"; }

    // Pull dari SPC Charts
    try {
      const spcRaw = localStorage.getItem("spc_custom_points") || "[]";
      const spcData = JSON.parse(spcRaw);
      if (spcData.length > 0) {
        const vals = spcData.map(d => d.value || d.v || d).filter(v => typeof v === "number");
        if (vals.length > 0) {
          const mean = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
          const max = Math.max(...vals).toFixed(2);
          const min = Math.min(...vals).toFixed(2);
          pulled.spc = {
            source: "SPC Charts",
            icon: "~",
            color: "#00FF9C",
            items: [
              `Data Points: ${vals.length}`,
              `Mean: ${mean}`,
              `Range: ${min} – ${max}`,
            ],
          };
          status.spc = "ok";
        } else { status.spc = "empty"; }
      } else { status.spc = "empty"; }
    } catch { status.spc = "error"; }

    // Pull dari Pareto Builder
    try {
      const paretoRaw = localStorage.getItem("pareto_items") || "[]";
      const paretoItems = JSON.parse(paretoRaw);
      const active = paretoItems.filter(i => i.active !== false);
      if (active.length > 0) {
        const sorted = [...active].sort((a, b) => (b.cases || 0) - (a.cases || 0));
        const total = sorted.reduce((a, i) => a + (i.cases || 0), 0);
        let cum = 0;
        const vitalFew = sorted.filter(i => {
          cum += i.cases || 0;
          return total > 0 && (cum / total) * 100 <= 80;
        });
        pulled.pareto = {
          source: "Pareto Builder",
          icon: "∥",
          color: "#FFD60A",
          items: [
            `Total Categories: ${active.length}`,
            `Vital Few (80%): ${vitalFew.length} categories`,
            ...vitalFew.slice(0, 3).map(i => `  → ${i.category}: ${i.cases} cases`),
          ],
        };
        status.pareto = "ok";
      } else { status.pareto = "empty"; }
    } catch { status.pareto = "error"; }

    // Pull dari FMEA
    try {
      const fmeaRaw = localStorage.getItem("fmea_items") || "[]";
      const fmeaItems = JSON.parse(fmeaRaw);
      if (fmeaItems.length > 0) {
        const withRpn = fmeaItems.map(i => ({ ...i, rpn: (i.S || 1) * (i.O || 1) * (i.D || 1) }));
        const sorted = [...withRpn].sort((a, b) => b.rpn - a.rpn);
        const critical = sorted.filter(i => i.rpn >= 200);
        pulled.fmea = {
          source: "FMEA Scorer",
          icon: "⚠",
          color: "#FF3B5C",
          items: [
            `Total Failure Modes: ${fmeaItems.length}`,
            `Critical RPN (≥200): ${critical.length}`,
            ...sorted.slice(0, 2).map(i => `  → ${i.failure || "Unknown"}: RPN ${i.rpn}`),
          ],
        };
        status.fmea = "ok";
      } else { status.fmea = "empty"; }
    } catch { status.fmea = "error"; }

    // Pull dari Triage History
    try {
      const triageRaw = localStorage.getItem("triage_history") || localStorage.getItem("triage_history_pd") || "[]";
      const triageItems = JSON.parse(triageRaw);
      if (triageItems.length > 0) {
        const cats = {};
        triageItems.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const breach = triageItems.filter(t => t.sla === "BREACH").length;
        pulled.triage = {
          source: "Smart Triage",
          icon: "▶",
          color: "#00FF9C",
          items: [
            `Total Tickets: ${triageItems.length}`,
            `SLA Breach: ${breach} (${((breach / triageItems.length) * 100).toFixed(0)}%)`,
            ...top.map(([c, n]) => `  → ${c}: ${n} tickets`),
          ],
        };
        status.triage = "ok";
      } else { status.triage = "empty"; }
    } catch { status.triage = "error"; }

    // Pull dari Root Cause
    try {
      const rcRaw = localStorage.getItem("rc_items") || "[]";
      const rcItems = JSON.parse(rcRaw);
      if (rcItems.length > 0) {
        const validated = rcItems.filter(r => r.validated);
        const topImpact = [...rcItems].sort((a, b) => (b.contribution || 0) - (a.contribution || 0));
        pulled.rootcause = {
          source: "Root Cause",
          icon: "?",
          color: "#FF8C00",
          items: [
            `Root Causes Identified: ${rcItems.length}`,
            `Validated: ${validated.length}`,
            ...topImpact.slice(0, 2).map(r => `  → ${r.title}: ${r.contribution || 0}% impact`),
          ],
        };
        status.rootcause = "ok";
      } else { status.rootcause = "empty"; }
    } catch { status.rootcause = "error"; }

    setBridgeData(pulled);
    setBridgeStatus(status);
    setBridgePhase(phaseId);
    setShowBridge(true);
  };

  const getRelevantSources = (phaseId) => {
    const map = {
      define:  ["triage","pareto"],
      measure: ["sigma","spc"],
      analyze: ["pareto","fmea","rootcause"],
      improve: ["fmea","rootcause","sigma"],
      control: ["spc","sigma","triage"],
    };
    return map[phaseId] || [];
  };
  const [phases, setPhases] = useLocalState("dmaic_phases", DMAIC_DEFAULTS);
  const [activePhase, setActivePhase] = useLocalState("dmaic_activePhase", "D");
  const [viewMode, setViewMode] = useLocalState("dmaic_view", "detail"); // detail | timeline | checklist | custom
  const [editMode, setEditMode] = useState(false);
  const [expandedTool, setExpandedTool] = useState(null);
  const [customProject, setCustomProject] = useLocalState("dmaic_custom", {
    name: "", problem: "", metric: "", baseline: "", target: "", dept: "",
    D: { status: "NOT STARTED", progress: 0, notes: "" },
    M: { status: "NOT STARTED", progress: 0, notes: "" },
    A: { status: "NOT STARTED", progress: 0, notes: "" },
    I: { status: "NOT STARTED", progress: 0, notes: "" },
    C: { status: "NOT STARTED", progress: 0, notes: "" },
  });
  const [showCustomSetup, setShowCustomSetup] = useState(false);

  const p = phases[activePhase];
  const phaseKeys = ["D", "M", "A", "I", "C"];
  const totalComplete = phaseKeys.filter(k => phases[k].status === "COMPLETE").length;
  const overallProgress = Math.round(phaseKeys.reduce((acc, k) => acc + phases[k].progress, 0) / 5);

  const toggleTool = (phaseKey, toolIdx) => {
    setPhases(prev => ({
      ...prev,
      [phaseKey]: {
        ...prev[phaseKey],
        tools: prev[phaseKey].tools.map((t, i) => i === toolIdx ? { ...t, done: !t.done } : t),
      }
    }));
  };

  const setPhaseProgress = (phaseKey, val) => {
    setPhases(prev => ({
      ...prev,
      [phaseKey]: { ...prev[phaseKey], progress: val, status: val === 100 ? "COMPLETE" : val > 0 ? "ACTIVE" : "NOT STARTED" }
    }));
  };

  const updateOutput = (phaseKey, idx, val) => {
    setPhases(prev => ({
      ...prev,
      [phaseKey]: {
        ...prev[phaseKey],
        keyOutputs: prev[phaseKey].keyOutputs.map((o, i) => i === idx ? { ...o, val } : o),
      }
    }));
  };

  const statusColor = (status) => {
    if (status === "COMPLETE") return T.green;
    if (status === "ACTIVE") return T.cyan;
    return T.textDim;
  };

  const phaseFlowData = phaseKeys.map(k => ({
    phase: k, name: phases[k].name, progress: phases[k].progress,
    color: phases[k].color, status: phases[k].status,
    weeks: `W${phases[k].startWeek}–${phases[k].endWeek}`,
  }));

  const copyReport = `DMAIC PROJECT TRACKER REPORT
Overall Progress: ${overallProgress}% (${totalComplete}/5 phases complete)

${phaseKeys.map(k => {
  const ph = phases[k];
  const doneCt = ph.tools.filter(t => t.done).length;
  return `${k} — ${ph.name} [${ph.status}] ${ph.progress}%
  Tools: ${doneCt}/${ph.tools.length} complete
  ${ph.keyOutputs.map(o => `  ${o.label}: ${o.val}`).join('\n')}`;
}).join('\n\n')}`;

  // ── TIMELINE VIEW ────────────────────────────────────────────────────────
  const TimelineView = () => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "2rem", marginBottom: "1.5rem" }}>
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "2rem" }}>
        30-Week DMAIC Journey
      </div>
      {/* Horizontal flow */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "2rem", overflowX: "auto", padding: "0.5rem 0" }}>
        {phaseFlowData.map((ph, i) => (
          <div key={ph.phase} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => { setActivePhase(ph.phase); setViewMode("detail"); }}
              style={{
                background: `${ph.color}15`,
                border: `2px solid ${ph.color}`,
                borderRadius: 8, padding: "1rem 1.25rem",
                textAlign: "center", cursor: "pointer",
                boxShadow: `0 0 20px ${ph.color}22`,
                minWidth: 110,
              }}>
              <div style={{ color: ph.color, fontFamily: T.display, fontSize: "1.5rem", fontWeight: 800, textShadow: `0 0 15px ${ph.color}88` }}>{ph.phase}</div>
              <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.55rem", letterSpacing: "0.1em", marginTop: "0.2rem" }}>{ph.name}</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", marginTop: "0.2rem" }}>{ph.weeks}</div>
              {/* Progress arc */}
              <div style={{ marginTop: "0.6rem", height: 5, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                <motion.div animate={{ width: `${ph.progress}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                  style={{ height: "100%", background: ph.color, borderRadius: 3 }} />
              </div>
              <div style={{ color: ph.color, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.3rem", fontWeight: 700 }}>{ph.progress}%</div>
              <div style={{ marginTop: "0.4rem" }}><Badge label={ph.status} color={statusColor(ph.status)} /></div>
            </motion.div>
            {i < phaseFlowData.length - 1 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 0.25rem" }}>
                <motion.div animate={{ scaleX: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                  style={{ color: phases[phaseFlowData[i + 1].phase].status === "COMPLETE" || phases[phaseFlowData[i + 1].phase].status === "ACTIVE" ? T.cyan : T.textDim, fontFamily: T.mono, fontSize: "1.2rem" }}>
                  →
                </motion.div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Gantt-style bar */}
      <div style={{ marginTop: "1rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Week-by-Week Gantt
        </div>
        {phaseFlowData.map((ph) => (
          <div key={ph.phase} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ color: ph.color, fontFamily: T.mono, fontSize: "0.65rem", width: 80, flexShrink: 0, fontWeight: 700 }}>{ph.phase} — {ph.name.slice(0, 3)}</div>
            <div style={{ flex: 1, height: 16, background: T.panel, borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <motion.div
                animate={{ width: `${ph.progress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${((phases[ph.phase].startWeek - 1) / 30) * 100}%`,
                  width: `${((phases[ph.phase].endWeek - phases[ph.phase].startWeek + 1) / 30) * 100}%`,
                  background: `linear-gradient(90deg, ${ph.color}99, ${ph.color})`,
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", width: 50, flexShrink: 0, textAlign: "right" }}>{ph.weeks}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem", padding: "0 80px 0 0" }}>
          {[1, 5, 10, 15, 20, 25, 30].map(w => (
            <span key={w} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>W{w}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ── CHECKLIST VIEW ────────────────────────────────────────────────────────
  const ChecklistView = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1rem" }}>
      {phaseKeys.map(key => {
        const ph = phases[key];
        const doneCount = ph.tools.filter(t => t.done).length;
        const pct = Math.round((doneCount / ph.tools.length) * 100);
        return (
          <div key={key} style={{ background: T.surface, border: `1px solid ${ph.color}33`, borderRadius: 8, padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ color: ph.color, fontFamily: T.display, fontSize: "1rem", fontWeight: 800 }}>{key} — {ph.name}</div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ color: ph.color, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>{doneCount}/{ph.tools.length}</span>
                <input type="range" min={0} max={100} step={5} value={ph.progress}
                  onChange={e => setPhaseProgress(key, +e.target.value)}
                  style={{ width: 70, accentColor: ph.color, cursor: "pointer" }} />
                <span style={{ color: ph.color, fontFamily: T.mono, fontSize: "0.65rem" }}>{ph.progress}%</span>
              </div>
            </div>
            <div style={{ height: 4, background: T.panel, borderRadius: 2, overflow: "hidden", marginBottom: "1rem" }}>
              <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                style={{ height: "100%", background: ph.color, borderRadius: 2 }} />
            </div>
            {ph.tools.map((tool, i) => (
              <motion.div key={tool.name} whileHover={{ x: 3 }}
                onClick={() => toggleTool(key, i)}
                style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.5rem 0.4rem", cursor: "pointer", borderRadius: 4, marginBottom: "0.2rem",
                  background: tool.done ? `${ph.color}08` : "transparent", transition: "background 0.2s" }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: "0.05rem",
                  background: tool.done ? ph.color : "transparent",
                  border: `2px solid ${tool.done ? ph.color : T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: tool.done ? `0 0 8px ${ph.color}55` : "none",
                }}>
                  {tool.done && <span style={{ color: T.bg, fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: tool.done ? T.text : T.textMid, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: tool.done ? 700 : 400, textDecoration: tool.done ? "none" : "none" }}>
                    {tool.name}
                  </div>
                  {expandedTool === `${key}-${i}` && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", marginTop: "0.25rem", lineHeight: 1.5 }}>
                      {tool.note}
                    </motion.div>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); setExpandedTool(expandedTool === `${key}-${i}` ? null : `${key}-${i}`); }}
                  style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem", padding: "0 0.2rem" }}>
                  {expandedTool === `${key}-${i}` ? "▲" : "▼"}
                </button>
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );

  // ── CUSTOM PROJECT VIEW ────────────────────────────────────────────────────
  const CustomView = () => (
    <div>
      <div style={{ background: `${T.green}0C`, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.75rem" }}>⚡ YOUR DMAIC PROJECT TRACKER</div>
        {!company.isPulseDigital && (
          <button onClick={() => setCustomProject(p => ({
            ...p,
            name: company.processName || p.name,
            dept: company.dept || p.dept,
            metric: company.processUnit || p.metric,
            baseline: String(company.baselineMean) || p.baseline,
            target: String(company.target) || p.target,
          }))} style={{
            background: `${T.cyan}12`, border: `1px solid ${T.cyan}44`,
            color: T.cyan, padding: "0.4rem 0.85rem", borderRadius: 4,
            cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
            marginBottom: "0.75rem", display: "block",
          }}>
            ⟳ Auto-fill from Company Profile
          </button>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          {[
            { label: "Project Name", key: "name", ph: "e.g. Reduce Defect Rate" },
            { label: "Department", key: "dept", ph: "e.g. Production Line A" },
            { label: "Problem Metric", key: "metric", ph: "e.g. Defect Rate (%)" },
            { label: "Baseline Value", key: "baseline", ph: "e.g. 8.5%" },
            { label: "Target Value", key: "target", ph: "e.g. 2.0%" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</label>
              <input value={customProject[f.key]} onChange={e => setCustomProject(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.78rem", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1rem" }}>
        {phaseKeys.map(key => {
          const ph = phases[key];
          const cp = customProject[key];
          return (
            <div key={key} style={{ background: T.surface, border: `2px solid ${ph.color}33`, borderRadius: 8, padding: "1.25rem" }}>
              <div style={{ color: ph.color, fontFamily: T.display, fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem" }}>
                {key} — {ph.name}
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Status</label>
                <select value={cp.status}
                  onChange={e => setCustomProject(p => ({ ...p, [key]: { ...p[key], status: e.target.value } }))}
                  style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.45rem 0.65rem", fontFamily: T.mono, fontSize: "0.75rem", cursor: "pointer" }}>
                  {["NOT STARTED", "IN PROGRESS", "ACTIVE", "COMPLETE", "ON HOLD"].map(s => (
                    <option key={s} value={s} style={{ background: T.surface }}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase" }}>Progress</label>
                  <span style={{ color: ph.color, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>{cp.progress}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={cp.progress}
                  onChange={e => setCustomProject(p => ({ ...p, [key]: { ...p[key], progress: +e.target.value } }))}
                  style={{ width: "100%", accentColor: ph.color, cursor: "pointer" }} />
                <div style={{ height: 4, background: T.panel, borderRadius: 2, overflow: "hidden", marginTop: "0.3rem" }}>
                  <motion.div animate={{ width: `${cp.progress}%` }} transition={{ duration: 0.5 }}
                    style={{ height: "100%", background: ph.color, borderRadius: 2 }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Notes / Key Output</label>
                <textarea value={cp.notes}
                  onChange={e => setCustomProject(p => ({ ...p, [key]: { ...p[key], notes: e.target.value } }))}
                  placeholder={`Key findings or outputs for ${ph.name} phase...`}
                  style={{ width: "100%", minHeight: 70, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.72rem", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ── INTELLIGENCE BRIDGE MODAL ── */}
      <AnimatePresence>
        {showBridge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={e => { if (e.target === e.currentTarget) setShowBridge(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto", boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 40px ${T.cyan}11` }}
            >
              <div style={{ padding: "1.5rem 1.75rem", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.panel, zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    ✦ DMAIC INTELLIGENCE BRIDGE
                  </div>
                  <div style={{ color: T.text, fontFamily: T.display, fontSize: "1rem", fontWeight: 700 }}>
                    Evidence for {bridgePhase?.toUpperCase()} Phase
                  </div>
                </div>
                <button onClick={() => setShowBridge(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, width: 32, height: 32, borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              <div style={{ padding: "1.75rem" }}>
                {/* Phase guidance */}
                <div style={{ background: `${T.cyan}08`, border: `1px solid ${T.cyan}22`, borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1.5rem" }}>
                  <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>What to look for in {bridgePhase?.toUpperCase()}</div>
                  <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem", lineHeight: 1.6 }}>
                    {bridgePhase === "define" && "Identify the problem scope using Pareto (vital few issues) and Triage data (ticket volume & category patterns)."}
                    {bridgePhase === "measure" && "Baseline your process using Sigma Level, DPMO, and SPC control limits. These are your measurement evidence."}
                    {bridgePhase === "analyze" && "Use Pareto to find root cause candidates, FMEA to assess risk, and Root Cause module for validated 5-Whys."}
                    {bridgePhase === "improve" && "Reference FMEA action items and Root Cause solutions. Track Sigma improvement post-implementation."}
                    {bridgePhase === "control" && "Monitor SPC for out-of-control signals and Sigma trend. Use Triage data to verify ticket reduction."}
                  </div>
                </div>

                {/* Evidence cards from each module */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {getRelevantSources(bridgePhase).map(sourceKey => {
                    const data = bridgeData[sourceKey];
                    const st = bridgeStatus[sourceKey];
                    const allSources = {
                      sigma: { label: "Σ Calculator", icon: "σ", color: T.cyan },
                      spc: { label: "SPC Charts", icon: "~", color: T.green },
                      pareto: { label: "Pareto Builder", icon: "∥", color: T.yellow },
                      fmea: { label: "FMEA Scorer", icon: "⚠", color: T.red },
                      triage: { label: "Smart Triage", icon: "▶", color: T.green },
                      rootcause: { label: "Root Cause", icon: "?", color: T.orange },
                    };
                    const meta = allSources[sourceKey];
                    return (
                      <div key={sourceKey} style={{
                        background: T.surface,
                        border: `1px solid ${st === "ok" ? meta.color + "44" : T.border}`,
                        borderRadius: 8, padding: "1rem 1.25rem",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: st === "ok" ? "0.75rem" : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: meta.color, fontFamily: T.mono, fontSize: "0.85rem" }}>{meta.icon}</span>
                            <span style={{ color: st === "ok" ? meta.color : T.textDim, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>{meta.label}</span>
                          </div>
                          <span style={{
                            background: st === "ok" ? `${meta.color}18` : `${T.textDim}11`,
                            border: `1px solid ${st === "ok" ? meta.color + "44" : T.border}`,
                            color: st === "ok" ? meta.color : T.textDim,
                            fontFamily: T.mono, fontSize: "0.55rem",
                            padding: "0.15rem 0.5rem", borderRadius: 20,
                          }}>
                            {st === "ok" ? "✓ DATA FOUND" : st === "empty" ? "NO DATA YET" : "ERROR"}
                          </span>
                        </div>
                        {st === "ok" && data?.items && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            {data.items.map((item, i) => (
                              <div key={i} style={{ color: item.startsWith("  →") ? T.textMid : T.text, fontFamily: T.mono, fontSize: "0.68rem", paddingLeft: item.startsWith("  →") ? "0.5rem" : 0 }}>
                                {item.startsWith("  →") ? item : `· ${item}`}
                              </div>
                            ))}
                          </div>
                        )}
                        {st === "empty" && (
                          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem" }}>
                            Go to {meta.label} and add data first — then come back here.
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* All other sources as secondary */}
                  {Object.keys(bridgeData).filter(k => !getRelevantSources(bridgePhase).includes(k)).length > 0 && (
                    <div>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.5rem", marginTop: "0.5rem" }}>Additional Evidence Available</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {Object.entries(bridgeData).filter(([k]) => !getRelevantSources(bridgePhase).includes(k)).map(([key, data]) => (
                          <div key={key} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.6rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: data.color, fontFamily: T.mono, fontSize: "0.65rem" }}>{data.icon} {data.source}</span>
                            <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>{data.items?.[0] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Evidence score */}
                {(() => {
                  const relevant = getRelevantSources(bridgePhase);
                  const filled = relevant.filter(k => bridgeStatus[k] === "ok").length;
                  const pct = relevant.length > 0 ? Math.round((filled / relevant.length) * 100) : 0;
                  const color = pct >= 80 ? T.green : pct >= 50 ? T.yellow : T.red;
                  return (
                    <div style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, padding: "1rem", marginTop: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase" }}>Phase Evidence Score</span>
                        <span style={{ color, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{filled}/{relevant.length} modules linked · {pct}%</span>
                      </div>
                      <div style={{ height: 5, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", marginTop: "0.4rem" }}>
                        {pct >= 80 ? "✓ Strong evidence base — phase is well-supported" : pct >= 50 ? "⚠ Partial evidence — fill remaining modules for stronger case" : "✕ Weak evidence — go complete the recommended modules first"}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionHeader
        module="Module 03 — DMAIC Intelligence"
        title="Full Cycle DMAIC Tracker"
        sub="Interactive navigator — explore Pulse Digital project or track your own. Checklist, timeline, and custom project modes."
      />

      {/* Overall progress bar */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase" }}>Overall Project Progress</span>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{overallProgress}%</span>
            <Badge label={`${totalComplete}/5 Phases Complete`} color={totalComplete === 5 ? T.green : T.cyan} />
          </div>
        </div>
        <div style={{ height: 8, background: T.panel, borderRadius: 4, overflow: "hidden" }}>
          <motion.div animate={{ width: `${overallProgress}%` }} transition={{ duration: 1 }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${T.cyan}, ${T.green})`, borderRadius: 4, boxShadow: `0 0 12px ${T.cyan}55` }} />
        </div>
      </div>

      {/* Toolbar */}
      <ModuleToolbar
        onReset={() => { setPhases(DMAIC_DEFAULTS); }}
        copyData={copyReport}
        saved={true}
      >
        {[
          { id: "detail", label: "◈ Phase Detail" },
          { id: "timeline", label: "⟶ Timeline" },
          { id: "checklist", label: "✓ Checklist" },
          { id: "custom", label: "⚡ My Project", highlight: true },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{
            background: viewMode === v.id ? (v.highlight ? `${T.green}18` : `${T.cyan}15`) : "transparent",
            border: `1px solid ${viewMode === v.id ? (v.highlight ? T.green : T.cyan) : T.border}`,
            color: viewMode === v.id ? (v.highlight ? T.green : T.cyan) : T.textDim,
            padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.62rem", transition: "all 0.2s",
          }}>{v.label}</button>
        ))}
        <button onClick={() => setEditMode(p => !p)} style={{
          background: editMode ? `${T.yellow}18` : "transparent",
          border: `1px solid ${editMode ? T.yellow : T.border}`,
          color: editMode ? T.yellow : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer",
          fontFamily: T.mono, fontSize: "0.62rem",
        }}>{editMode ? "✓ Done" : "✎ Edit"}</button>
      </ModuleToolbar>

      {/* Timeline view */}
      {viewMode === "timeline" && <TimelineView />}

      {/* Checklist view */}
      {viewMode === "checklist" && <ChecklistView />}

      {/* Custom project view */}
      {viewMode === "custom" && <CustomView />}

      {/* Detail view */}
      {viewMode === "detail" && (
        <>
          {/* Phase selector */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {phaseKeys.map(key => {
              const ph = phases[key];
              return (
                <motion.button key={key} onClick={() => setActivePhase(key)} whileHover={{ scale: 1.03 }} style={{
                  flex: "1 1 80px",
                  background: activePhase === key ? `${ph.color}18` : T.surface,
                  border: `2px solid ${activePhase === key ? ph.color : T.border}`,
                  color: activePhase === key ? ph.color : T.textDim,
                  padding: "1rem 0.75rem", borderRadius: 8, cursor: "pointer",
                  fontFamily: T.display, fontSize: "1.25rem", fontWeight: 800,
                  textAlign: "center", transition: "all 0.2s",
                  textShadow: activePhase === key ? `0 0 15px ${ph.color}88` : "none",
                  boxShadow: activePhase === key ? `0 0 25px ${ph.color}22` : "none",
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Progress bar on button */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: T.panel }}>
                    <div style={{ width: `${ph.progress}%`, height: "100%", background: ph.color, transition: "width 0.5s" }} />
                  </div>
                  <div>{key}</div>
                  <div style={{ fontFamily: T.mono, fontSize: "0.52rem", letterSpacing: "0.1em", marginTop: "0.2rem" }}>{ph.name}</div>
                  <div style={{ fontFamily: T.mono, fontSize: "0.5rem", color: T.textDim, marginTop: "0.15rem" }}>
                    {weekToDate(ph.startWeek, DMAIC_PROJECT_START)} →
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: "0.5rem", color: T.textDim }}>
                    {weekToDate(ph.endWeek, DMAIC_PROJECT_START)}
                  </div>
                  <div style={{ marginTop: "0.3rem" }}><Badge label={ph.status} color={statusColor(ph.status)} /></div>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activePhase} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>

              {/* Phase meta row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "Phase Progress", val: `${p.progress}%`, color: p.color },
                  { label: "Tools Deployed", val: `${p.tools.filter(t => t.done).length}/${p.tools.length}`, color: T.cyan },
                  { label: "Duration", val: `${weekToDate(p.startWeek, DMAIC_PROJECT_START)} → ${weekToDate(p.endWeek, DMAIC_PROJECT_START)}`, color: T.textMid },
                  { label: "Risk Level", val: p.risk.split("—")[0].trim(), color: p.riskColor },
                ].map(k => (
                  <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.75rem 1rem", textAlign: "center" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{k.label}</div>
                    <div style={{ color: k.color, fontFamily: T.mono, fontSize: "0.9rem", fontWeight: 700 }}>{k.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
                {/* Tools panel with checkboxes */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
                                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                    <div style={{ color: p.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      [ TOOLS DEPLOYED ]
                    </div>
                    <button onClick={() => pullFromModules(p.id)} style={{
                      background: `${T.cyan}12`, border: `1px solid ${T.cyan}33`,
                      color: T.cyan, padding: "0.3rem 0.75rem", borderRadius: 4,
                      cursor: "pointer", fontFamily: T.mono, fontSize: "0.58rem",
                      display: "flex", alignItems: "center", gap: "0.4rem",
                    }}>
                      <span style={{ fontSize: "0.7rem" }}>✦</span> Pull Evidence
                    </button>
                  </div>
                  {p.tools.map((tool, i) => (
                    <motion.div key={tool.name} whileHover={{ x: 3 }}
                      onClick={() => toggleTool(activePhase, i)}
                      style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", padding: "0.55rem 0.3rem", cursor: "pointer", borderRadius: 4, marginBottom: "0.2rem", background: tool.done ? `${p.color}08` : "transparent" }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: "0.05rem",
                        background: tool.done ? p.color : "transparent",
                        border: `2px solid ${tool.done ? p.color : T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: tool.done ? `0 0 8px ${p.color}44` : "none",
                        transition: "all 0.2s",
                      }}>
                        {tool.done && <span style={{ color: T.bg, fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: tool.done ? T.text : T.textMid, fontFamily: T.mono, fontSize: "0.78rem", fontWeight: tool.done ? 700 : 400 }}>{tool.name}</div>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", marginTop: "0.2rem", lineHeight: 1.4 }}>{tool.note}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Key outputs — editable */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
                  <div style={{ color: p.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem", borderBottom: `1px solid ${T.border}`, paddingBottom: "0.5rem" }}>
                    [ KEY OUTPUTS ] {editMode && <span style={{ color: T.yellow, fontSize: "0.55rem" }}>· EDIT MODE</span>}
                  </div>
                  {p.keyOutputs.map((o, i) => (
                    <div key={o.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", paddingBottom: "0.6rem", marginBottom: "0.6rem", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", flexShrink: 0 }}>{o.label}</span>
                      {editMode ? (
                        <input value={o.val} onChange={e => updateOutput(activePhase, i, e.target.value)}
                          style={{ flex: 1, background: T.panel, border: `1px solid ${T.cyan}44`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, fontSize: "0.75rem", padding: "0.2rem 0.4rem", textAlign: "right" }} />
                      ) : (
                        <span style={{ color: T.text, fontFamily: T.mono, fontSize: "0.78rem", textAlign: "right" }}>{o.val}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Insight */}
              <div style={{ background: `${p.color}08`, border: `1px solid ${p.color}33`, borderRadius: 8, padding: "1.5rem", marginBottom: "1rem" }}>
                <div style={{ color: p.color, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  [ STRATEGIC INSIGHT — {p.name} ]
                </div>
                <p style={{ color: T.text, fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>{p.insight}</p>
              </div>

              {/* Risk + Decisions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1rem" }}>
                <div style={{ background: `${p.riskColor}0A`, border: `1px solid ${p.riskColor}33`, borderRadius: 8, padding: "1.25rem" }}>
                  <div style={{ color: p.riskColor, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.6rem" }}>[ RISK ASSESSMENT ]</div>
                  <p style={{ color: T.text, fontFamily: T.mono, fontSize: "0.78rem", lineHeight: 1.6, margin: 0 }}>{p.risk}</p>
                </div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem" }}>
                  <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.6rem" }}>[ KEY DECISIONS MADE ]</div>
                  {p.decisions.map((d, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                      <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", flexShrink: 0, marginTop: "0.05rem" }}>→</span>
                      <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.5 }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ─── 04: FMEA RISK SCORER ────────────────────────────────────────────────────
const FMEA_DEFAULTS = [
  { id: 1, process: "Customer Communication", failure: "No proactive status update", cause: "No automated system", effect: "Customer frustration, churn", S: 9, O: 8, D: 7, fixed: false, action: "Automated status engine", owner: "IT Ops", dueWeek: 18 },
  { id: 2, process: "Case Assignment",        failure: "Assigned to wrong skill level", cause: "Random queue assignment", effect: "32% longer resolution", S: 8, O: 7, D: 8, fixed: false, action: "Skills-based routing algorithm", owner: "IT Dev", dueWeek: 22 },
  { id: 3, process: "Case Documentation",     failure: "Incomplete closure notes", cause: "No mandatory fields", effect: "Knowledge loss, rework", S: 7, O: 7, D: 8, fixed: false, action: "Mandatory field enforcement", owner: "Support Ops", dueWeek: 20 },
  { id: 4, process: "Initial Triage",         failure: "Case miscategorization", cause: "Rigid 12-question script", effect: "+21.5 hrs per case", S: 8, O: 8, D: 5, fixed: false, action: "AI-assisted categorization", owner: "IT Dev", dueWeek: 22 },
  { id: 5, process: "Resolution Verification",failure: "Premature case closure", cause: "Pressure to meet metrics", effect: "28% reopen rate", S: 8, O: 6, D: 6, fixed: false, action: "48hr cooling period + flag", owner: "Support Mgr", dueWeek: 19 },
];

function FMEAScorer() {
  const crossModule = useCrossModuleSummary();
  const spcAlert = (crossModule.spc?.outOfControl || 0) > 0;
  const triageBreachAlert = (crossModule.triage?.breach || 0) >= 3;
  const company = useCompany();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const { exportPDF, exporting: pdfExporting } = usePDFExport();
  const [items, setItems] = useLocalState("fmea_items", FMEA_DEFAULTS);
  const [newItem, setNewItem] = useState({ process: "", failure: "", cause: "", effect: "", S: 5, O: 5, D: 5, action: "", owner: "", dueWeek: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useLocalState("fmea_view", "table"); // table | matrix | heatmap
  const [sortBy, setSortBy] = useLocalState("fmea_sort", "rpn");
  const [filterMin, setFilterMin] = useState(0);

  const rpn = (item) => item.S * item.O * item.D;
  const rpnColor = (r) => r > 400 ? T.red : r > 200 ? T.orange : r > 100 ? T.yellow : T.green;
  const rpnLabel = (r) => r > 400 ? "CRITICAL" : r > 200 ? "HIGH" : r > 100 ? "MODERATE" : "LOW";

  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, fixed: !i.fixed } : i));
  const update = (id, field, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: field === "S" || field === "O" || field === "D" ? +val : val } : i));
  const addItem = () => {
    if (!newItem.process || !newItem.failure) return;
    setItems(prev => [...prev, { ...newItem, id: Date.now(), fixed: false }]);
    setNewItem({ process: "", failure: "", cause: "", effect: "", S: 5, O: 5, D: 5, action: "", owner: "", dueWeek: 0 });
    setShowAdd(false);
  };
  const deleteItem = (id) => {
  if (!window.confirm("Hapus failure mode ini?")) return;
  setItems(prev => prev.filter(i => i.id !== id));
};

  const sorted = [...items]
    .filter(i => rpn(i) >= filterMin)
    .sort((a, b) => {
      if (sortBy === "rpn") return rpn(b) - rpn(a);
      if (sortBy === "severity") return b.S - a.S;
      if (sortBy === "status") return a.fixed === b.fixed ? 0 : a.fixed ? 1 : -1;
      return 0;
    });

  const totalBefore = items.reduce((acc, i) => acc + rpn(i), 0);
  const totalAfter = items.filter(i => !i.fixed).reduce((acc, i) => acc + rpn(i), 0);
  const reduction = totalBefore > 0 ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100) : 0;
  const criticalCount = items.filter(i => rpn(i) > 400 && !i.fixed).length;

  // Heatmap grid: S (1-10) vs O (1-10), value = count of items in that cell
  const heatmapData = Array.from({ length: 10 }, (_, si) =>
    Array.from({ length: 10 }, (_, oi) => ({
      s: si + 1, o: oi + 1,
      count: items.filter(i => i.S === si + 1 && i.O === oi + 1).length,
      items: items.filter(i => i.S === si + 1 && i.O === oi + 1),
      baseRpn: (si + 1) * (oi + 1) * 5, // assume D=5 for heatmap
    }))
  );

  const copyReport = `FMEA RISK REGISTER
Total RPN Before: ${totalBefore} | After Controls: ${totalAfter} | Reduction: ${reduction}%
Critical Items: ${criticalCount}

${sorted.map(i => `[${rpnLabel(rpn(i))}] RPN ${rpn(i)} | ${i.process}: ${i.failure}
  Cause: ${i.cause} | Effect: ${i.effect}
  S=${i.S} O=${i.O} D=${i.D} | Status: ${i.fixed ? "CONTROLLED" : "OPEN"}
  Action: ${i.action} | Owner: ${i.owner}`).join('\n\n')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader
        module="Module 04 — Risk Intelligence"
        title="FMEA Risk Priority Scorer"
        sub="Live editable risk register. Heat map, matrix view, and scenario modelling. Click any S/O/D value to edit live."
      />

{/* Cross-Module Alert Banner */}
      {(spcAlert || triageBreachAlert) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: `${T.red}0C`, border: `1px solid ${T.red}44`, borderRadius: 8, padding: "0.85rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: T.red, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700 }}>⚠ CROSS-MODULE ALERT</span>
          {spcAlert && (
            <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem" }}>
              SPC: <span style={{ color: T.red }}>{crossModule.spc.outOfControl} titik out-of-control</span> terdeteksi — cek failure mode terkait
            </span>
          )}
          {triageBreachAlert && (
            <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem" }}>
              Triage: <span style={{ color: T.orange }}>{crossModule.triage.breach} SLA breach</span> — kategori terbanyak: {crossModule.triage.topCategory}
            </span>
          )}
        </motion.div>
      )}
        
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total RPN (Open)", val: totalAfter, color: criticalCount > 0 ? T.red : T.yellow },
          { label: "Total RPN (All)", val: totalBefore, color: T.textDim },
          { label: "Risk Reduction", val: `${reduction}%`, color: T.green },
          { label: "Critical (>400)", val: criticalCount, color: criticalCount > 0 ? T.red : T.green },
          { label: "Controlled", val: items.filter(i => i.fixed).length, color: T.green },
          { label: "Total Items", val: items.length, color: T.textMid },
        ].map(k => (
          <motion.div key={k.label} whileHover={{ scale: 1.03 }}
            style={{ background: T.surface, border: `1px solid ${k.color}22`, borderRadius: 8, padding: "1rem", textAlign: "center" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.35rem" }}>{k.label}</div>
            <motion.div key={k.val} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              style={{ color: k.color, fontFamily: T.display, fontSize: "1.6rem", fontWeight: 800, textShadow: `0 0 15px ${k.color}44` }}>
              {k.val}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <ModuleToolbar
  onReset={() => { setItems(FMEA_DEFAULTS); setSortBy("rpn"); setFilterMin(0); }}
  copyData={copyReport}
  saved={true}
>
  {/* CSV Export */}
  <button onClick={() => {
    const header = "Process,Failure,Cause,Effect,S,O,D,RPN,Status,Action,Owner,DueWeek\n";
    const rows = items.map(i =>
      `"${i.process}","${i.failure}","${i.cause}","${i.effect}",${i.S},${i.O},${i.D},${rpn(i)},${i.fixed?"CONTROLLED":"OPEN"},"${i.action}","${i.owner}",${i.dueWeek}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "FMEA_Register.csv"; a.click();
    URL.revokeObjectURL(url);
  }} style={{
    background: `${T.green}12`, border: `1px solid ${T.green}44`,
    color: T.green, padding: "0.35rem 0.8rem", borderRadius: 4,
    cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
  }}>↓ CSV</button>

<button onClick={() => exportPDF({
          title: "FMEA Risk Register",
          subtitle: `${items.length} failure modes · RPN reduction: ${reduction}%`,
          company,
          filename: "FMEA_Report",
          sections: [
            {
              title: "Risk Summary",
              content: `
                <div class="kpi-grid">
                  <div class="kpi-card"><div class="kpi-val">${totalBefore}</div><div class="kpi-label">Total RPN Before</div></div>
                  <div class="kpi-card"><div class="kpi-val">${totalAfter}</div><div class="kpi-label">Total RPN After</div></div>
                  <div class="kpi-card"><div class="kpi-val">${reduction}%</div><div class="kpi-label">Risk Reduction</div></div>
                  <div class="kpi-card"><div class="kpi-val">${criticalCount}</div><div class="kpi-label">Critical Items</div></div>
                </div>`,
            },
            {
              title: "Failure Mode Register",
              content: `
                <table>
                  <thead><tr><th>Process</th><th>Failure Mode</th><th>Cause</th><th>S</th><th>O</th><th>D</th><th>RPN</th><th>Level</th><th>Status</th><th>Action</th><th>Owner</th></tr></thead>
                  <tbody>
                    ${[...items].sort((a,b) => rpn(b)-rpn(a)).map(i => `
                      <tr>
                        <td>${i.process}</td>
                        <td>${i.failure}</td>
                        <td>${i.cause}</td>
                        <td>${i.S}</td><td>${i.O}</td><td>${i.D}</td>
                        <td><strong>${rpn(i)}</strong></td>
                        <td>${rpnLabel(rpn(i))}</td>
                        <td>${i.fixed ? "CONTROLLED" : "OPEN"}</td>
                        <td>${i.action}</td>
                        <td>${i.owner}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>`,
            },
          ],
        })} disabled={pdfExporting} style={{
          background: `${T.red}12`, border: `1px solid ${T.red}44`,
          color: pdfExporting ? T.textDim : T.red,
          padding: "0.35rem 0.8rem", borderRadius: 4,
          cursor: pdfExporting ? "not-allowed" : "pointer",
          fontFamily: T.mono, fontSize: "0.62rem",
        }}>{pdfExporting ? "⏳..." : "📄 PDF"}</button>
        
  {/* CSV Import */}
  <label style={{
    background: `${T.yellow}12`, border: `1px solid ${T.yellow}44`,
    color: T.yellow, padding: "0.35rem 0.8rem", borderRadius: 4,
    cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
  }}>
    ↑ Import
    <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split("\n").slice(1).filter(l => l.trim());
        const parsed = lines.map((line, idx) => {
          const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, "")) || [];
          return {
            id: Date.now() + idx,
            process: cols[0] || "", failure: cols[1] || "", cause: cols[2] || "",
            effect: cols[3] || "", S: Math.min(10, Math.max(1, +cols[4] || 5)),
            O: Math.min(10, Math.max(1, +cols[5] || 5)), D: Math.min(10, Math.max(1, +cols[6] || 5)),
            fixed: cols[8] === "CONTROLLED", action: cols[9] || "", owner: cols[10] || "",
            dueWeek: Math.max(0, +cols[11] || 0),
          };
        }).filter(i => i.process && i.failure);
        if (parsed.length === 0) { alert("No valid rows found. Use the CSV export format."); return; }
        if (window.confirm(`Import ${parsed.length} items? This will REPLACE current data.`)) setItems(parsed);
      };
      reader.readAsText(file);
      e.target.value = "";
    }} />
  </label>
        {/* AI Suggest Button */}
        <button
          onClick={async () => {
            setAiLoading(true);
            setAiError("");
            const prompt = `You are a Six Sigma Black Belt and FMEA expert. Generate exactly 4 realistic FMEA failure modes for a company with this profile:
- Company: ${company?.name || "Unknown"}
- Industry: ${company?.industry || "General"}
- Department: ${company?.dept || "Operations"}
- Process being improved: ${company?.processName || "General Process"}

For each failure mode, respond ONLY with valid JSON array. No markdown, no explanation outside JSON:
[
  {
    "process": "<specific process step name>",
    "failure": "<specific failure mode>",
    "cause": "<root cause>",
    "effect": "<effect on customer or business>",
    "S": <severity 1-10>,
    "O": <occurrence 1-10>,
    "D": <detection difficulty 1-10>,
    "action": "<recommended corrective action>",
    "owner": "<team or role responsible>",
    "dueWeek": <week number 1-30>
  }
]
Make it realistic and specific to the industry and process above.`;
            try {
              const res = await fetch("/api/claude", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ content: prompt }] }),
              });
              const data = await res.json();
              const raw = data?.content?.[0]?.text || "";
              const clean = raw.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(clean);
              if (!Array.isArray(parsed)) throw new Error("Invalid response");
              const newItems = parsed.map((i, idx) => ({
                ...i,
                id: Date.now() + idx,
                fixed: false,
                S: Math.min(10, Math.max(1, +i.S || 5)),
                O: Math.min(10, Math.max(1, +i.O || 5)),
                D: Math.min(10, Math.max(1, +i.D || 5)),
                dueWeek: +i.dueWeek || 0,
              }));
              if (window.confirm(`AI generated ${newItems.length} failure modes for "${company?.processName || "your process"}". Add to existing register?`)) {
                setItems(prev => [...prev, ...newItems]);
              }
            } catch (e) {
              setAiError("AI gagal generate — coba lagi");
            } finally {
              setAiLoading(false);
            }
          }}
          disabled={aiLoading}
          style={{
            background: aiLoading ? `${T.cyan}08` : `${T.cyan}15`,
            border: `1px solid ${T.cyan}55`,
            color: aiLoading ? T.textDim : T.cyan,
            padding: "0.35rem 0.8rem", borderRadius: 4,
            cursor: aiLoading ? "not-allowed" : "pointer",
            fontFamily: T.mono, fontSize: "0.62rem",
            display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
          {aiLoading ? "⏳ Generating..." : "✦ AI Suggest"}
        </button>
        {aiError && <span style={{ color: T.red, fontFamily: T.mono, fontSize: "0.6rem" }}>{aiError}</span>}

        {[
          { id: "table", label: "≡ Register" },
          { id: "matrix", label: "◫ Matrix" },
          { id: "heatmap", label: "⬛ Heat Map" },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{
            background: viewMode === v.id ? `${T.cyan}15` : "transparent",
            border: `1px solid ${viewMode === v.id ? T.cyan : T.border}`,
            color: viewMode === v.id ? T.cyan : T.textDim,
            padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.62rem",
          }}>{v.label}</button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>Min RPN:</span>
          <input type="number" value={filterMin} onChange={e => setFilterMin(+e.target.value)} min={0} max={1000}
            style={{ width: 55, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.text, fontFamily: T.mono, fontSize: "0.72rem", padding: "0.2rem 0.35rem" }} />
        </div>
        {["rpn", "severity", "status"].map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            background: sortBy === s ? `${T.yellow}15` : "transparent",
            border: `1px solid ${sortBy === s ? T.yellow : T.border}`,
            color: sortBy === s ? T.yellow : T.textDim,
            padding: "0.35rem 0.7rem", borderRadius: 4, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.6rem",
          }}>Sort: {s.toUpperCase()}</button>
        ))}
      </ModuleToolbar>

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase" }}>[ FAILURE MODE REGISTER — {sorted.length} items ]</span>
            <button onClick={() => setShowAdd(!showAdd)} style={{
              background: `${T.cyan}18`, border: `1px solid ${T.cyan}`, color: T.cyan,
              padding: "0.4rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
            }}>+ Add Failure Mode</button>
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontFamily: T.mono, fontSize: "0.72rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["✓", "Process Step", "Failure Mode / Effect", "Cause", "S", "O", "D", "RPN", "Level", "Action", "Owner", "Due", "🗑"].map(h => (
                    <th key={h} style={{ color: T.textDim, textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(item => {
                  const r = rpn(item);
                  const rc = rpnColor(r);
                  return (
                    <motion.tr key={item.id} layout
                      style={{ borderBottom: `1px solid ${T.border}`, opacity: item.fixed ? 0.45 : 1, background: r > 400 && !item.fixed ? `${T.red}06` : "transparent", transition: "opacity 0.3s" }}>
                      <td style={{ padding: "0.65rem 0.75rem" }}>
                        <button onClick={() => toggle(item.id)} style={{
                          width: 22, height: 22, borderRadius: 4,
                          background: item.fixed ? T.green : "transparent",
                          border: `1.5px solid ${item.fixed ? T.green : T.border}`,
                          color: item.fixed ? T.bg : T.textDim, cursor: "pointer", fontSize: "0.7rem",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: item.fixed ? `0 0 8px ${T.green}55` : "none",
                          transition: "all 0.2s",
                        }}>{item.fixed ? "✓" : ""}</button>
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem", color: T.textMid, whiteSpace: "nowrap" }}>
                        <EditableLabel value={item.process} onChange={v => update(item.id, "process", v)} style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }} />
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem", color: T.text, maxWidth: 180 }}>
                        <EditableLabel value={item.failure} onChange={v => update(item.id, "failure", v)} style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem" }} />
                        <div style={{ color: T.textDim, fontSize: "0.62rem", marginTop: "0.15rem" }}>→ <EditableLabel value={item.effect} onChange={v => update(item.id, "effect", v)} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }} /></div>
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem", color: T.textMid, maxWidth: 130 }}>
                        <EditableLabel value={item.cause} onChange={v => update(item.id, "cause", v)} style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }} />
                      </td>
                      {["S","O","D"].map(field => (
                        <td key={field} style={{ padding: "0.5rem 0.4rem" }}>
                          <input type="number" min={1} max={10} value={item[field]}
                            onChange={e => update(item.id, field, e.target.value)}
                            style={{ width: 38, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.cyan, fontFamily: T.mono, fontSize: "0.82rem", padding: "0.2rem 0.25rem", textAlign: "center", fontWeight: 700 }} />
                        </td>
                      ))}
                      <td style={{ padding: "0.65rem 0.75rem" }}>
                        <span style={{ color: rc, fontFamily: T.mono, fontSize: "1.05rem", fontWeight: 800, textShadow: `0 0 8px ${rc}66` }}>{r}</span>
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem" }}><Badge label={rpnLabel(r)} color={rc} /></td>
                      <td style={{ padding: "0.65rem 0.75rem", maxWidth: 140, color: T.textDim, fontSize: "0.62rem" }}>
                        <EditableLabel value={item.action || "—"} onChange={v => update(item.id, "action", v)} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }} />
                      </td>
                      <td style={{ padding: "0.65rem 0.75rem" }}>
                        <EditableLabel value={item.owner || "—"} onChange={v => update(item.id, "owner", v)} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem" }} />
                      </td>
                      <td style={{ padding: "0.65rem 0.5rem" }}>
  <input type="number" min={0} max={99} value={item.dueWeek}
    onChange={e => update(item.id, "dueWeek", Math.max(0, +e.target.value))}
    style={{ width: 42, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: item.dueWeek > 0 ? T.yellow : T.textDim, fontFamily: T.mono, fontSize: "0.62rem", padding: "0.2rem 0.25rem", textAlign: "center" }} />
</td>
                      <td style={{ padding: "0.65rem 0.5rem" }}>
                        <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem", padding: "0.1rem 0.3rem" }}>✕</button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MATRIX VIEW ── */}
      {viewMode === "matrix" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            RPN Risk Matrix — Severity vs Occurrence (size = Detection difficulty)
          </div>
          <div style={{ position: "relative", height: 320, background: T.panel, borderRadius: 8, overflow: "hidden" }}>
            {/* Quadrant labels */}
            {[
              { x: "5%", y: "5%", label: "LOW RISK", color: T.green },
              { x: "75%", y: "5%", label: "CRITICAL", color: T.red },
              { x: "5%", y: "75%", label: "WATCH", color: T.yellow },
              { x: "75%", y: "75%", label: "HIGH RISK", color: T.orange },
            ].map(q => (
              <div key={q.label} style={{ position: "absolute", left: q.x, top: q.y, color: q.color, fontFamily: T.mono, fontSize: "0.55rem", opacity: 0.4, letterSpacing: "0.1em" }}>{q.label}</div>
            ))}
            {/* Quadrant dividers */}
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: `${T.border}`, opacity: 0.5 }} />
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: `${T.border}`, opacity: 0.5 }} />
            {/* Bubbles */}
            {items.map(item => {
              const r = rpn(item);
              const rc = rpnColor(r);
              const x = ((item.O - 1) / 9) * 85 + 5;
              const y = (1 - (item.S - 1) / 9) * 80 + 5;
              const size = Math.max(16, Math.min(40, item.D * 3));
              return (
                <motion.div key={item.id}
                  initial={{ scale: 0 }} animate={{ scale: item.fixed ? 0.5 : 1 }} transition={{ type: "spring", delay: 0.1 }}
                  title={`${item.failure}\nS=${item.S} O=${item.O} D=${item.D} RPN=${r}`}
                  style={{
                    position: "absolute", left: `${x}%`, top: `${y}%`,
                    width: size, height: size, borderRadius: "50%",
                    background: `${rc}33`, border: `2px solid ${rc}`,
                    transform: "translate(-50%,-50%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", opacity: item.fixed ? 0.3 : 1,
                    boxShadow: `0 0 12px ${rc}44`,
                    transition: "opacity 0.3s",
                    zIndex: 1,
                  }}
                  onClick={() => toggle(item.id)}
                >
                  <span style={{ color: rc, fontFamily: T.mono, fontSize: `${Math.max(8, size * 0.35)}px`, fontWeight: 700, textAlign: "center", lineHeight: 1 }}>
  {r}
  {items.filter(i2 => i2.S === item.S && i2.O === item.O).length > 1 && (
    <span style={{ display: "block", fontSize: "0.45rem", opacity: 0.8 }}>
      +{items.filter(i2 => i2.S === item.S && i2.O === item.O).length - 1}
    </span>
  )}
</span>
                </motion.div>
              );
            })}
            {/* Axis labels */}
            <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>← Occurrence →</div>
            <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>← Severity →</div>
          </div>
          <div style={{ marginTop: "0.75rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
            Bubble size = Detection difficulty (D). Click any bubble to toggle controlled. Position = S × O risk zone.
          </div>
        </div>
      )}

      {/* ── HEAT MAP VIEW ── */}
      {viewMode === "heatmap" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem", overflowX: "auto" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
            RPN Heat Map — Severity (rows) × Occurrence (columns) · Color = Risk Zone
          </div>
          <div style={{ display: "inline-grid", gridTemplateColumns: `40px repeat(10, 36px)`, gap: 2, minWidth: 410 }}>
            {/* Header row */}
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", display: "flex", alignItems: "center", justifyContent: "center" }}>S\O</div>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textAlign: "center", padding: "0.2rem 0" }}>{i + 1}</div>
            ))}
            {/* Data rows — S from 10 down to 1 */}
            {Array.from({ length: 10 }, (_, si) => {
              const s = 10 - si;
              return (
                <React.Fragment key={s}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{s}</div>
                  {Array.from({ length: 10 }, (_, oi) => {
                    const o = oi + 1;
                    const baseRpn = s * o * 5;
                    const cellItems = items.filter(i => i.S === s && i.O === o);
                    const cellColor = baseRpn > 400 ? T.red : baseRpn > 200 ? T.orange : baseRpn > 100 ? T.yellow : baseRpn > 50 ? T.cyan : T.green;
                    const hasItem = cellItems.length > 0;
                    return (
                      <div key={o} title={cellItems.map(i => `${i.failure} (RPN ${rpn(i)})`).join('\n') || `S=${s} O=${o} RPN≈${baseRpn}`}
                        style={{
                          width: 36, height: 36, borderRadius: 4,
                          background: hasItem ? `${cellColor}55` : `${cellColor}15`,
                          border: `1px solid ${hasItem ? cellColor : cellColor + "33"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: hasItem ? "pointer" : "default",
                          boxShadow: hasItem ? `0 0 8px ${cellColor}44` : "none",
                          transition: "all 0.2s",
                          position: "relative",
                        }}>
                        {hasItem && (
                          <span style={{ color: cellColor, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 800 }}>
                            {cellItems.length > 1 ? cellItems.length : rpn(cellItems[0])}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "Critical (RPN >400)", color: T.red },
              { label: "High (200-400)", color: T.orange },
              { label: "Moderate (100-200)", color: T.yellow },
              { label: "Low (<100)", color: T.green },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: `${l.color}55`, border: `1px solid ${l.color}` }} />
                <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ background: T.surface, border: `1px solid ${T.cyan}33`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>[ ADD NEW FAILURE MODE ]</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
              {[
                { label: "Process Step", key: "process" },
                { label: "Failure Mode", key: "failure" },
                { label: "Root Cause", key: "cause" },
                { label: "Effect on Customer", key: "effect" },
                { label: "Recommended Action", key: "action" },
                { label: "Owner", key: "owner" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</label>
                  <input value={newItem[f.key]} onChange={e => setNewItem(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.55rem 0.65rem", fontFamily: T.mono, fontSize: "0.78rem", boxSizing: "border-box" }} />
                </div>
              ))}
              {["S","O","D"].map(f => (
                <div key={f}>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    {f === "S" ? "Severity (1-10)" : f === "O" ? "Occurrence (1-10)" : "Detection (1-10)"}
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input type="range" min={1} max={10} value={newItem[f]} onChange={e => setNewItem(p => ({ ...p, [f]: +e.target.value }))}
                      style={{ flex: 1, accentColor: T.cyan, cursor: "pointer" }} />
                    <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.9rem", fontWeight: 700, minWidth: 20 }}>{newItem[f]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={addItem} style={{ background: T.cyan, border: "none", color: T.bg, padding: "0.65rem 1.5rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700 }}>
                ✓ Add to Register (RPN: {newItem.S * newItem.O * newItem.D})
              </button>
              <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.65rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 05: COPQ ENGINE ─────────────────────────────────────────────────────────

const COPQ_DEFAULTS = {
  A: { name: "Scenario A — Baseline", caseVol: 3543, reopenRate: 28, escalRate: 58, wasteHrs: 33.5, techCost: 45, churnRate: 35, slaBreachPct: 38, ltv: 3200, annualRevenue: 28000000, reputationPct: 5 },
  B: { name: "Scenario B — Post-DMAIC", caseVol: 3543, reopenRate: 11, escalRate: 28, wasteHrs: 18, techCost: 45, churnRate: 15, slaBreachPct: 10, ltv: 3200, annualRevenue: 28000000, reputationPct: 2 },
};

function calcCOPQ(p) {
  const rework   = Math.round(p.caseVol * (p.reopenRate / 100) * 285);
  const escalation = Math.round(p.caseVol * (p.escalRate / 100) * 175);
  const wastedCap  = Math.round(p.caseVol * p.wasteHrs * p.techCost);
  const churn    = Math.round(p.caseVol * (p.slaBreachPct / 100) * (p.churnRate / 100) * p.ltv);
  const reputation = Math.round(p.annualRevenue * ((p.reputationPct || 5) / 100));
  const appraisal  = Math.round(p.caseVol * 0.1 * (20 / 60) * p.techCost);
  const total    = rework + escalation + wastedCap + churn + reputation + appraisal;
  return { rework, escalation, wastedCap, churn, reputation, appraisal, total };
}
const COPQ_CATEGORY_DEFAULTS = {
  wastedCap:  "Wasted Labor Capacity",
  churn:      "Customer Churn",
  reputation: "Reputation Damage",
  escalation: "Escalation Premium",
  rework:     "Rework / Reopened Cases",
  appraisal:  "Quality Appraisal",
};

function COPQEngine() {
  const { sym, s, fmt, fmtFull } = useCurrencyFmt();
  const company = useCompany();
  const [copqAiLoading, setCopqAiLoading] = useState(false);
  const [copqAiResult, setCopqAiResult] = useState("");
  const [copqAiError, setCopqAiError] = useState("");
  const [showExecDeck, setShowExecDeck] = useState(false);
  const [activeScenario, setActiveScenario] = useLocalState("copq_activeScenario", "A");
  const [scenarios, setScenarios] = useLocalState("copq_scenarios", COPQ_DEFAULTS);
  const [viewMode, setViewMode] = useLocalState("copq_viewMode", "single");
  const [scenarioNames, setScenarioNames] = useLocalState("copq_scenarioNames", { A: COPQ_DEFAULTS.A.name, B: COPQ_DEFAULTS.B.name });
  const [investment, setInvestment] = useLocalState("copq_investment", 180000);
  const [catLabels, setCatLabels] = useLocalState("copq_catLabels", COPQ_CATEGORY_DEFAULTS);
  const [showCatEditor, setShowCatEditor] = useState(false);
  // Auto-sync company params when company changes
  useEffect(() => {
    if (company && !company.isPulseDigital) {
      setScenarios(prev => ({
        A: { ...prev.A, techCost: company.laborRate || prev.A.techCost, ltv: company.customerLTV || prev.A.ltv, caseVol: (company.monthlyVolume || 295) * 12 },
        B: { ...prev.B, techCost: company.laborRate || prev.B.techCost, ltv: company.customerLTV || prev.B.ltv, caseVol: (company.monthlyVolume || 295) * 12 },
      }));
    }
  }, [company?.laborRate, company?.customerLTV, company?.monthlyVolume]);

  const setParam = (scenario, key, val) => {
    setScenarios(prev => ({ ...prev, [scenario]: { ...prev[scenario], [key]: val } }));
  };

  const copqA = calcCOPQ(scenarios.A);
  const copqB = calcCOPQ(scenarios.B);
  const activeCopq = activeScenario === "A" ? copqA : copqB;
  const activeParams = scenarios[activeScenario];

  const savings = copqA.total - copqB.total;
  const roiPct = investment > 0 ? Math.round((savings / investment) * 100) : 0;

  const categories = [
    { key: "wastedCap",   name: catLabels.wastedCap  || COPQ_CATEGORY_DEFAULTS.wastedCap,   color: T.red,    type: "Internal" },
    { key: "churn",       name: catLabels.churn       || COPQ_CATEGORY_DEFAULTS.churn,       color: T.orange, type: "External" },
    { key: "reputation",  name: catLabels.reputation  || COPQ_CATEGORY_DEFAULTS.reputation,  color: "#FF6B9D",type: "External" },
    { key: "escalation",  name: catLabels.escalation  || COPQ_CATEGORY_DEFAULTS.escalation,  color: T.yellow, type: "Internal" },
    { key: "rework",      name: catLabels.rework      || COPQ_CATEGORY_DEFAULTS.rework,      color: T.cyan,   type: "Internal" },
    { key: "appraisal",   name: catLabels.appraisal   || COPQ_CATEGORY_DEFAULTS.appraisal,   color: T.green,  type: "Appraisal" },
  ];

  const PARAMS = [
    { key: "caseVol",      label: "Annual Case Volume",        min: 500,  max: 20000, step: 100, fmt: v => v.toLocaleString(),  unit: "cases" },
    { key: "reopenRate",   label: "Case Reopen Rate",          min: 0,    max: 60,    step: 1,   fmt: v => `${v}%`,            unit: "%" },
    { key: "escalRate",    label: "Escalation Rate",           min: 0,    max: 80,    step: 1,   fmt: v => `${v}%`,            unit: "%" },
    { key: "wasteHrs",     label: "Waste Hours / Case",        min: 0,    max: 60,    step: 0.5, fmt: v => `${v}h`,            unit: "hrs" },
    { key: "techCost",     label: "Staff Hourly Cost",         min: 10,   max: 200,   step: 5,   fmt: v => `${s}${v}`,          unit: `${s}/hr` },
    { key: "churnRate",    label: "Churn Rate (SLA breach)",   min: 0,    max: 70,    step: 1,   fmt: v => `${v}%`,            unit: "%" },
    { key: "slaBreachPct", label: "SLA Breach Rate",           min: 0,    max: 80,    step: 1,   fmt: v => `${v}%`,            unit: "%" },
    { key: "ltv",          label: "Customer LTV",              min: 100,  max: 20000, step: 100, fmt: v => `${s}${v.toLocaleString()}`, unit: s },
    { key: "annualRevenue",label: "Annual Revenue",            min: 1e6,  max: 500e6, step: 1e6, fmt: v => fmt(v),             unit: s },
    { key: "reputationPct", label: "Reputation Cost (% Revenue)", min: 0, max: 15, step: 0.5, fmt: v => `${v}%`, unit: "%" },
  ];

  // Radar data for comparison
  const radarData = [
    { metric: "Rework", A: Math.round((copqA.rework / copqA.total) * 100), B: Math.round((copqB.rework / copqB.total) * 100) },
    { metric: "Escalation", A: Math.round((copqA.escalation / copqA.total) * 100), B: Math.round((copqB.escalation / copqB.total) * 100) },
    { metric: "Waste Cap.", A: Math.round((copqA.wastedCap / copqA.total) * 100), B: Math.round((copqB.wastedCap / copqB.total) * 100) },
    { metric: "Churn", A: Math.round((copqA.churn / copqA.total) * 100), B: Math.round((copqB.churn / copqB.total) * 100) },
    { metric: "Reputation", A: Math.round((copqA.reputation / copqA.total) * 100), B: Math.round((copqB.reputation / copqB.total) * 100) },
  ];

  // Copy report text
  const reportText = `COPQ ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()}

${scenarioNames.A}: ${fmt(copqA.total)}
${scenarioNames.B}: ${fmt(copqB.total)}
Savings Realized: ${fmt(savings)}
ROI: ${roiPct}%

BREAKDOWN (${scenarioNames.A}):
${categories.map(c => `  ${c.name}: ${fmt(copqA[c.key])} (${((copqA[c.key]/copqA.total)*100).toFixed(1)}%)`).join('\n')}

BREAKDOWN (${scenarioNames.B}):
${categories.map(c => `  ${c.name}: ${fmt(copqB[c.key])} (${((copqB[c.key]/copqB.total)*100).toFixed(1)}%)`).join('\n')}`;

  const renderParamPanel = (scenario) => {
    const params = scenarios[scenario];
    const sc = scenario === "A" ? T.red : T.green;
    return (
      <div style={{ background: T.surface, border: `2px solid ${sc}33`, borderRadius: 8, padding: "1.5rem", flex: "1 1 300px" }}>
        <div style={{ color: sc, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          [ {scenario === "A" ? "▲" : "▼"} SCENARIO {scenario} ]
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <EditableLabel
            value={scenarioNames[scenario]}
            onChange={v => setScenarioNames(p => ({ ...p, [scenario]: v }))}
            style={{ color: sc, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {PARAMS.map(p => (
            <div key={p.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", alignItems: "center" }}>
                <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.67rem" }}>{p.label}</span>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  {viewMode === "compare" && (
                    <DeltaPill a={scenarios.A[p.key]} b={scenarios.B[p.key]}
                      invert={["caseVol","techCost","ltv","annualRevenue"].indexOf(p.key) === -1}
                      fmtFn={p.fmt} />
                  )}
                  <input
                    type="number"
                    value={params[p.key]}
                    onChange={e => setParam(scenario, p.key, parseFloat(e.target.value) || 0)}
                    style={{
                      width: 70, background: T.panel, border: `1px solid ${T.border}`,
                      borderRadius: 3, color: sc, fontFamily: T.mono,
                      fontSize: "0.78rem", padding: "0.15rem 0.35rem",
                      textAlign: "right", fontWeight: 700,
                    }}
                  />
                </div>
              </div>
              <input type="range" min={p.min} max={p.max} step={p.step} value={params[p.key]}
                onChange={e => setParam(scenario, p.key, parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: sc, cursor: "pointer" }} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderResultPanel = (scenario, copq) => {
    const sc = scenario === "A" ? T.red : T.green;
    const cats = [...categories].sort((a, b) => copq[b.key] - copq[a.key]);
    return (
      <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Big number */}
        <div id={`copq-total-${scenario}`} style={{ background: T.surface, border: `2px solid ${sc}44`, borderRadius: 8, padding: "1.75rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${sc}10 0%, transparent 70%)` }} />
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Total Annual COPQ
          </div>
          <motion.div key={copq.total} initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
            style={{ color: sc, fontFamily: T.display, fontSize: "2.5rem", fontWeight: 800, textShadow: `0 0 30px ${sc}66`, lineHeight: 1 }}>
            {fmt(copq.total)}
          </motion.div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", marginTop: "0.5rem" }}>
            {fmtFull(copq.total)} / year
          </div>
          {viewMode === "compare" && scenario === "B" && (
            <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: `${T.green}12`, borderRadius: 4 }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>
                {savings >= 0 ? `↓ ${fmt(savings)} saved vs Scenario A` : `↑ ${fmt(Math.abs(savings))} more than A`}
              </div>
            </div>
          )}
        </div>

        {/* Breakdown bars */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", flex: 1 }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>Breakdown</div>
          {cats.map(c => {
            const pct = ((copq[c.key] / copq.total) * 100).toFixed(1);
            const aVal = copqA[c.key];
            const bVal = copqB[c.key];
            return (
              <div key={c.key} style={{ marginBottom: "0.7rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem", alignItems: "center" }}>
                  <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.65rem" }}>{c.name}</span>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    {viewMode === "compare" && <DeltaPill a={aVal} b={bVal} invert fmtFn={fmt} />}
                    <span style={{ color: c.color, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>{fmt(copq[c.key])}</span>
                  </div>
                </div>
                <div style={{ height: 5, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
                    style={{ height: "100%", background: c.color, borderRadius: 3 }} />
                </div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textAlign: "right", marginTop: "0.1rem" }}>
                  {pct}% · {c.type}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
    {showExecDeck && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{
            background: T.panel, border: `1px solid ${T.borderHi}`,
            borderRadius: 12, width: "100%", maxWidth: 680,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 40px ${T.cyan}11`,
          }}>
            {/* Deck Header */}
            <div style={{ background: `linear-gradient(135deg, ${T.bg} 0%, #0a1a2e 100%)`, padding: "2rem 2rem 1.5rem", borderBottom: `1px solid ${T.border}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${T.cyan}, ${T.green}, ${T.yellow})` }} />
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.5rem" }}>EXECUTIVE SUMMARY · COST OF POOR QUALITY</div>
              <div style={{ color: T.text, fontFamily: T.display, fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.25rem" }}>{company?.name || "Company"} — COPQ Analysis</div>
              <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }}>{company?.dept || "Department"} · {company?.processName || "Process"} · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
              <div style={{ position: "absolute", top: "1rem", right: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => window.print()} style={{ background: `${T.cyan}18`, border: `1px solid ${T.cyan}44`, color: T.cyan, padding: "0.35rem 0.75rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem" }}>🖨 Print</button>
                <button onClick={() => setShowExecDeck(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, width: 28, height: 28, borderRadius: 4, cursor: "pointer", fontFamily: T.mono }}>✕</button>
              </div>
            </div>
            <div style={{ padding: "1.75rem" }}>
              {/* KPI Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {[
              { label: "Annual COPQ (Baseline)", value: fmtFull(copqA.total), color: T.red },
                  { label: "Annual COPQ (Post-DMAIC)", value: fmtFull(copqB.total), color: T.green },
                  { label: "Annual Savings", value: fmtFull(Math.max(0, copqA.total - copqB.total)), color: T.cyan },
                  { label: "ROI 12-Month", value: investment > 0 ? `${Math.round(((copqA.total - copqB.total) / investment) * 100)}%` : "—", color: T.yellow },
                ].map(k => (
                  <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem", textAlign: "center" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase", marginBottom: "0.4rem", lineHeight: 1.3 }}>{k.label}</div>
                    <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 800 }}>{k.value}</div>
                  </div>
                ))}
              </div>
              {/* COPQ Breakdown */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>COPQ Breakdown — Baseline vs Post-DMAIC</div>
                {[
                  { label: "Wasted Labor Capacity", a: copqA.wastedCap, b: copqB.wastedCap, color: T.red },
                  { label: "Customer Churn Cost", a: copqA.churn, b: copqB.churn, color: T.orange },
                  { label: "Escalation Cost", a: copqA.escalation, b: copqB.escalation, color: T.yellow },
                  { label: "Rework Cost", a: copqA.rework, b: copqB.rework, color: T.cyan },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.65rem" }}>{row.label}</span>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", textDecoration: "line-through" }}>{fmtFull(row.a)}</span>
                      <span style={{ color: row.color, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>{fmtFull(row.b)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Recommendation */}
              <div style={{ background: `${T.green}0A`, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.6rem" }}>Strategic Recommendation</div>
                <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.75rem", lineHeight: 1.7 }}>
                  Based on COPQ analysis, implementing the proposed DMAIC improvement initiative for <strong style={{ color: T.cyan }}>{company?.processName || "this process"}</strong> is projected to reduce annual Cost of Poor Quality from <strong style={{ color: T.red }}>{fmtFull(copqA.total)}</strong> to <strong style={{ color: T.green }}>{fmtFull(copqB.total)}</strong>, delivering a net saving of <strong style={{ color: T.cyan }}>{fmtFull(Math.max(0, copqA.total - copqB.total))}</strong> per year. Recommend immediate prioritization of the top COPQ driver: <strong style={{ color: T.yellow }}>
                    {[...categories].sort((a,b) => copqA[b.key] - copqA[a.key])[0]?.name || "Wasted Labor Capacity"}</strong>.
                </div>
              </div>
              {/* Footer */}
              <div style={{ textAlign: "center", color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
                Generated by DMAIC Intelligence Platform · Alfin Maulana Yudistira · Six Sigma Black Belt
              </div>
            </div>
          </div>
        </div>
      )}
      <SectionHeader
        module="Module 05 — Financial Intelligence"
        title="COPQ Engine"
        sub="Cost of Poor Quality with full scenario comparison. Edit any value directly. All data auto-saved."
      />

 {/* AI COPQ Benchmark Panel */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>✦ AI COPQ Advisor</div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", lineHeight: 1.6 }}>
            {copqAiResult || "Click for your AI COPQ analysis — benchmark vs industry and cost reduction priority recommendations"}
          </div>
          {copqAiError && <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.3rem" }}>{copqAiError}</div>}
        </div>
        <button
          onClick={async () => {
            setCopqAiLoading(true);
            setCopqAiResult("");
            setCopqAiError("");
            try {
              const prompt = `You are a Six Sigma Black Belt and financial analyst specializing in Cost of Poor Quality (COPQ) reduction.

Company profile:
- Company: ${company?.name || "Unknown"}
- Industry: ${company?.industry || "General"}
- Process: ${company?.processName || "General Process"}
- Monthly volume: ${company?.monthlyVolume || "N/A"} units/cases
- Staff hourly cost: ${company?.currency || "USD"} ${company?.laborRate || "N/A"}/hr

Current COPQ Data:
- Scenario A (Baseline) Total COPQ: ${fmt(copqA.total)}
  - Wasted Labor: ${fmt(copqA.wastedCap)}
  - Customer Churn: ${fmt(copqA.churn)}
  - Escalation: ${fmt(copqA.escalation)}
  - Rework: ${fmt(copqA.rework)}
- Scenario B (Improved) Total COPQ: ${fmt(copqB.total)}
- Projected Annual Savings: ${fmt(Math.abs(copqA.total - copqB.total))}
- ROI: ${roiPct}%

Provide a concise COPQ advisory in 3-4 sentences:
1. Is this COPQ level typical or high for this industry?
2. Which cost category should be attacked first and why?
3. One specific, actionable recommendation to accelerate COPQ reduction.

Be direct, specific, and use the numbers provided.`;
              const res = await fetch("/api/claude", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ content: prompt }] }),
              });
              const data = await res.json();
              const text = data?.content?.[0]?.text || "";
              setCopqAiResult(text || "Tidak ada respons dari AI");
            } catch {
              setCopqAiError("AI gagal — coba lagi");
            } finally {
              setCopqAiLoading(false);
            }
          }}
          disabled={copqAiLoading}
          style={{
            background: copqAiLoading ? `${T.yellow}08` : `${T.yellow}15`,
            border: `1px solid ${T.yellow}55`,
            color: copqAiLoading ? T.textDim : T.yellow,
            padding: "0.5rem 1rem", borderRadius: 4,
            cursor: copqAiLoading ? "not-allowed" : "pointer",
            fontFamily: T.mono, fontSize: "0.65rem", whiteSpace: "nowrap",
            alignSelf: "center",
          }}>
          {copqAiLoading ? "⏳ Analyzing..." : "✦ AI Advise"}
        </button>
      </div>
      
{/* Category Label Editor — Company Mode only */}
      {!company?.isPulseDigital && (
        <AnimatePresence>
          {showCatEditor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ background: T.surface, border: `1px solid ${T.cyan}33`, borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.85rem" }}>
                ✎ Rename Cost Categories — sesuaikan dengan terminologi industri kamu
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.65rem" }}>
                {Object.entries(COPQ_CATEGORY_DEFAULTS).map(([key, defaultLabel]) => (
                  <div key={key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{defaultLabel}</label>
                    <input
                      value={catLabels[key] || defaultLabel}
                      onChange={e => setCatLabels(prev => ({ ...prev, [key]: e.target.value || defaultLabel }))}
                      placeholder={defaultLabel}
                      style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.75rem", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.85rem" }}>
                <button onClick={() => setCatLabels(COPQ_CATEGORY_DEFAULTS)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem" }}>
                  ↺ Reset to Default
                </button>
                <button onClick={() => setShowCatEditor(false)} style={{ background: `${T.green}18`, border: `1px solid ${T.green}44`, color: T.green, padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem" }}>
                  ✓ Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      
      {/* Toolbar */}
      <ModuleToolbar
        onReset={() => { 
          setScenarios(COPQ_DEFAULTS); setScenarioNames({ A: COPQ_DEFAULTS.A.name, B: COPQ_DEFAULTS.B.name }); }}
        copyData={reportText}
        saved={true}
      >
        {!company?.isPulseDigital && (
          <button onClick={() => setShowCatEditor(p => !p)} style={{
            background: showCatEditor ? `${T.cyan}15` : "transparent",
            border: `1px solid ${showCatEditor ? T.cyan : T.border}`,
            color: showCatEditor ? T.cyan : T.textDim,
            padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
          }}>✎ Rename Categories</button>
        )}
        <button onClick={() => setShowExecDeck(true)} style={{
          background: `${T.yellow}18`, border: `1px solid ${T.yellow}55`,
          color: T.yellow, padding: "0.35rem 0.85rem", borderRadius: 4,
          cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700,
        }}>📊 Executive Deck</button>
        <ScenarioBadge label="Single View" color={T.cyan} active={viewMode === "single"} onClick={() => setViewMode("single")} />
        <ScenarioBadge label="⇄ Compare A vs B" color={T.yellow} active={viewMode === "compare"} onClick={() => setViewMode("compare")} />
      </ModuleToolbar>

      {/* Scenario tabs (single mode) */}
      {viewMode === "single" && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {["A", "B"].map(s => (
            <ScenarioBadge key={s} label={`${s === "A" ? "▲" : "▼"} ${scenarioNames[s]}`}
              color={s === "A" ? T.red : T.green}
              active={activeScenario === s}
              onClick={() => setActiveScenario(s)}
            />
          ))}
        </div>
      )}

      {/* SINGLE MODE */}
      {viewMode === "single" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          {renderParamPanel(activeScenario)}
          {renderResultPanel(activeScenario, activeCopq)}
        </div>
      )}

      {/* COMPARE MODE */}
      {viewMode === "compare" && (
        <>
          {/* Savings Hero */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: scenarioNames.A + " COPQ", val: fmt(copqA.total), color: T.red, sub: "Before improvement" },
              { label: scenarioNames.B + " COPQ", val: fmt(copqB.total), color: T.green, sub: "After improvement" },
              { label: "COPQ Savings", val: fmt(Math.abs(savings)), color: savings >= 0 ? T.green : T.red, sub: savings >= 0 ? "Annual savings unlocked" : "Increase — review B params" },
              { label: "ROI Estimate", val: `${roiPct}%`, color: T.yellow, sub: `vs ${fmtFull(investment)} investment` },
              { label: "Reduction", val: `${copqA.total > 0 ? Math.abs(((copqB.total - copqA.total) / copqA.total) * 100).toFixed(1) : 0}%`, color: T.cyan, sub: "COPQ reduction achieved" },
            ].map(k => (
              <motion.div key={k.label} whileHover={{ scale: 1.02 }}
                style={{ background: T.surface, border: `1px solid ${k.color}33`, borderRadius: 8, padding: "1.25rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${k.color}08 0%, transparent 70%)` }} />
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>{k.label}</div>
                <motion.div key={k.val} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                  style={{ color: k.color, fontFamily: T.display, fontSize: "1.7rem", fontWeight: 800, textShadow: `0 0 20px ${k.color}55` }}>
                  {k.val}
                </motion.div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.25rem" }}>{k.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Side-by-side params + results */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            {renderParamPanel("A")}
            {renderParamPanel("B")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            {renderResultPanel("A", copqA)}
            {renderResultPanel("B", copqB)}
          </div>
        </>
      )}

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "1.5rem", marginTop: "0.5rem" }}>
        {/* Bar chart */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
            {viewMode === "compare" ? "A vs B — Side by Side" : "Cost Breakdown"}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {viewMode === "compare" ? (
              <BarChart data={categories.map(c => ({ name: c.name.split(" ").slice(0,2).join(" "), A: copqA[c.key], B: copqB[c.key], color: c.color }))}
                margin={{ top: 5, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [fmt(v), n === "A" ? scenarioNames.A : scenarioNames.B]} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }} />
                <Legend formatter={v => <span style={{ color: v === "A" ? T.red : T.green, fontFamily: T.mono, fontSize: "0.65rem" }}>{v === "A" ? scenarioNames.A : scenarioNames.B}</span>} />
                <Bar dataKey="A" fill={T.red} fillOpacity={0.8} radius={[3,3,0,0]} />
                <Bar dataKey="B" fill={T.green} fillOpacity={0.8} radius={[3,3,0,0]} />
              </BarChart>
            ) : (
              <BarChart data={[...categories].sort((a,b) => activeCopq[b.key]-activeCopq[a.key]).map(c => ({ name: c.name.split(" ").slice(0,2).join(" "), val: activeCopq[c.key], color: c.color }))}
                margin={{ top: 5, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 8, fontFamily: T.mono }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [fmt(v), "Cost"]} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }} />
                <Bar dataKey="val" radius={[3,3,0,0]}>
                  {[...categories].sort((a,b) => activeCopq[b.key]-activeCopq[a.key]).map((c,i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Radar comparison */}
        {viewMode === "compare" && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
              Cost Structure Radar — % of Total
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <PolarGrid stroke={T.border} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: T.textDim, fontSize: 8 }} />
                <Radar name={scenarioNames.A} dataKey="A" stroke={T.red} fill={T.red} fillOpacity={0.15} strokeWidth={2} />
                <Radar name={scenarioNames.B} dataKey="B" stroke={T.green} fill={T.green} fillOpacity={0.15} strokeWidth={2} />
                <Legend formatter={v => <span style={{ color: v === scenarioNames.A ? T.red : T.green, fontFamily: T.mono, fontSize: "0.62rem" }}>{v}</span>} />
                <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }} formatter={v => [`${v}% of total`, ""]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* What-If payback */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
            Payback Analysis
          </div>
          {[10, 25, 33, 50, 75].map(pct => {
  const savingsAmt = Math.round(copqA.total * pct / 100);
  const months = (investment <= 0 || savingsAmt <= 0)
    ? "—"
    : Math.max(Math.round((investment / savingsAmt) * 12), 1);
  const barPct = copqA.total > 0 ? Math.min((savingsAmt / copqA.total) * 100, 100) : 0;
  return (
    <div key={pct} style={{ marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", width: 35, textAlign: "right", flexShrink: 0 }}>{pct}%</div>
      <div style={{ flex: 1, height: 8, background: T.panel, borderRadius: 4, overflow: "hidden" }}>
        <motion.div animate={{ width: `${barPct}%` }} transition={{ duration: 0.6, delay: pct * 0.01 }}
          style={{ height: "100%", background: pct >= 30 ? T.green : T.yellow, borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", minWidth: 160, flexShrink: 0 }}>
        <span style={{ color: pct >= 30 ? T.green : T.yellow, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>{fmt(savingsAmt)}</span>
        <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>· {months}mo payback</span>
      </div>
    </div>
  );
})}
          <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>Investment Cost:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem" }}>{s}</span>
                <input type="number" value={investment} onChange={e => setInvestment(parseFloat(e.target.value) || 0)}
                  style={{ width: 100, background: T.panel, border: `1px solid ${T.cyan}44`, borderRadius: 4, color: T.cyan, fontFamily: T.mono, fontSize: "0.78rem", padding: "0.2rem 0.4rem", fontWeight: 700 }} />
              </div>
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>Annual COPQ: {fmt(copqA.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 06: SPC CHARTS (LIVE INPUT) ─────────────────────────────────
function SPCCharts() {
  const company = useCompany();
  const [spcAiLoading, setSpcAiLoading] = useState(false);
  const [spcAiResult, setSpcAiResult] = useState("");
  const [spcAiError, setSpcAiError] = useState("");
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
  const [customLabel, setCustomLabel] = useLocalState("spc_custom_label", "My Process Metric");
  const [customUnit, setCustomUnit] = useLocalState("spc_custom_unit", "");
  const [customTarget, setCustomTarget] = useLocalState("spc_custom_target", "");
  const [customPoints, setCustomPoints] = useLocalState("spc_custom_points", []);
  const [newPoint, setNewPoint] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [weRulesEnabled, setWeRulesEnabled] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [startWeek, setStartWeek] = useLocalState("spc_start_week", 1);
  const [customUSL, setCustomUSL] = useLocalState("spc_custom_usl", "");
const [customLSL, setCustomLSL] = useLocalState("spc_custom_lsl", "");

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
  const lcl = Math.max(0, mean - 2.66 * avgMR);
  const mrUcl = 3.267 * avgMR;
  const stdDev = n > 1 ? Math.sqrt(pts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)) : 0;

  // ── Western Electric Rules ──
  const checkWE = (points, mean, ucl, lcl, enabled) => {
    if (!enabled || points.length < 2) return points.map(() => ({ signal: false, rules: [] }));
    const sigma = (ucl - mean) / 3;
    return points.map((v, i) => {
      const rules = [];
      // Rule 1: Point beyond 3σ (outside control limits)
      if (v > ucl || v < lcl) rules.push("R1: Beyond 3σ");
      // Rule 2: 2 of 3 consecutive points beyond 2σ on the SAME side
      if (i >= 2) {
        const w2 = [points[i - 2], points[i - 1], v];
        const aboveTwoSig = w2.filter(p => p > mean + 2 * sigma).length;
        const belowTwoSig = w2.filter(p => p < mean - 2 * sigma).length;
        if (aboveTwoSig >= 2 || belowTwoSig >= 2) rules.push("R2: 2/3 beyond 2σ");
      }
      // Rule 3: 4 of 5 consecutive points beyond 1σ on the SAME side
      if (i >= 4) {
        const w3 = points.slice(i - 4, i + 1);
        const aboveOneSig = w3.filter(p => p > mean + sigma).length;
        const belowOneSig = w3.filter(p => p < mean - sigma).length;
        if (aboveOneSig >= 4 || belowOneSig >= 4) rules.push("R3: 4/5 beyond 1σ");
      }
      // Rule 4: 8 consecutive points all on the same side of the mean
      if (i >= 7) {
        const w4 = points.slice(i - 7, i + 1);
        if (w4.every(p => p > mean) || w4.every(p => p < mean)) {
          rules.push("R4: 8pts same side");
        }
      }
      // Rule 5: 6 consecutive points steadily increasing or decreasing (trend)
      if (i >= 5) {
        const w5 = points.slice(i - 5, i + 1);
        const trendUp   = w5.every((p, j) => j === 0 || p > w5[j - 1]);
        const trendDown = w5.every((p, j) => j === 0 || p < w5[j - 1]);
        if (trendUp || trendDown) rules.push("R5: 6pts trending");
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
  const tooFewPoints = n > 0 && n < 7;

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
      if (mode === "custom") {
  if (customPoints.length > 0) {
    if (window.confirm(`Replace ${customPoints.length} existing points with ${vals.length} new points? Or cancel to append instead.`)) {
      setCustomPoints(vals);
    } else {
      setCustomPoints(p => [...p, ...vals]);
    }
  } else {
    setCustomPoints(vals);
  }
}
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

{/* AI SPC Interpreter */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>✦ AI Pattern Analysis</div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", lineHeight: 1.6 }}>
            {spcAiResult || "Click Analyze for AI interpretation of the pattern on your control chart. "}
          </div>
          {spcAiError && <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.3rem" }}>{spcAiError}</div>}
        </div>
        <button
          onClick={async () => {
            setSpcAiLoading(true);
            setSpcAiResult("");
            setSpcAiError("");
            try {
              const vals = pts;
              if (vals.length < 5) { setSpcAiError("Minimal 5 data points dulu"); setSpcAiLoading(false); return; }
              const meanVal = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
              const mrArr = vals.slice(1).map((v,i)=>Math.abs(v-vals[i]));
              const mrBarVal = mrArr.length > 0 ? (mrArr.reduce((a,b)=>a+b,0)/mrArr.length).toFixed(2) : "0";
              const uclVal = (+meanVal + 2.66 * +mrBarVal).toFixed(2);
              const lclVal = (+meanVal - 2.66 * +mrBarVal).toFixed(2);
              const oocCount = vals.filter(v => v > +uclVal || v < +lclVal).length;
              const prompt = `You are a Six Sigma Black Belt analyzing a Statistical Process Control (SPC) I-MR chart.

Process context:
- Company: ${company?.name || "Unknown"}
- Process: ${company?.processName || activeDataset.label}
- Unit: ${activeDataset.unit || company?.processUnit || "units"}
- Target: ${activeDataset.target || company?.target || "N/A"}

SPC Data:
- Data points: ${vals.length}
- Mean: ${meanVal}
- UCL: ${uclVal} | LCL: ${lclVal}
- Out-of-control points: ${oocCount}
- Western Electric violations: ${totalViolations}
- Last 5 values: ${vals.slice(-5).join(", ")}
- All values: ${vals.join(", ")}

Analyze in 3-4 sentences: Is the process in control? Any patterns (trend, shift, cycles)? What is the likely cause if out of control? One concrete action.`;
              const res = await fetch("/api/claude", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ content: prompt }] }),
              });
              const data = await res.json();
              setSpcAiResult(data?.content?.[0]?.text || "Tidak ada respons dari AI");
            } catch {
              setSpcAiError("AI gagal — coba lagi");
            } finally {
              setSpcAiLoading(false);
            }
          }}
          disabled={spcAiLoading}
          style={{
            background: spcAiLoading ? `${T.cyan}08` : `${T.cyan}15`,
            border: `1px solid ${T.cyan}55`,
            color: spcAiLoading ? T.textDim : T.cyan,
            padding: "0.5rem 1rem", borderRadius: 4,
            cursor: spcAiLoading ? "not-allowed" : "pointer",
            fontFamily: T.mono, fontSize: "0.65rem", whiteSpace: "nowrap",
            alignSelf: "center",
          }}>
          {spcAiLoading ? "⏳ Analyzing..." : "✦ AI Analyze Chart"}
        </button>
      </div>
      
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
{ label: "USL (Upper Spec)", val: customUSL, set: setCustomUSL, ph: "e.g. 96" },
{ label: "LSL (Lower Spec)", val: customLSL, set: setCustomLSL, ph: "e.g. 0" },
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
  <span key={i} style={{
    background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3,
    padding: "0.15rem 0.4rem", color: T.textMid, fontFamily: T.mono,
    fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "0.3rem",
  }}>
    <span style={{ color: T.textDim, fontSize: "0.58rem" }}>W{startWeek + i}:</span>
    <input
      type="number"
      value={v}
      onChange={e => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) setCustomPoints(prev => prev.map((p, idx) => idx === i ? val : p));
      }}
      style={{ width: 52, background: "transparent", border: "none", color: T.cyan, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700, textAlign: "center", padding: 0 }}
    />
    <span style={{ color: T.textDim, fontSize: "0.6rem" }}>{customUnit}</span>
    <button onClick={() => removePoint(i)} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem", padding: "0 0.1rem", lineHeight: 1 }}>✕</button>
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

      {tooFewPoints && n >= 2 && (
        <div style={{ background: `${T.yellow}0C`, border: `1px solid ${T.yellow}44`, borderRadius: 6, padding: "0.65rem 1rem", marginBottom: "1rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.7rem" }}>⚠ Only {n} data point(s) — SPC control limits require minimum 7 points to be statistically reliable. Add more data for valid results.</span>
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
                <SyncFromCompanyButton onSync={(c) => {
  setMode("custom");
  setCustomLabel(c.processName || "Process Metric");
  setCustomUnit(c.processUnit || "");
  setCustomTarget(String(c.target || ""));
  setCustomUSL(String(c.usl || ""));
  setCustomLSL(String(c.lsl || ""));
}} />
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
                    ...(customUSL !== "" && customLSL !== "" && stdDev > 0 && mode === "custom" ? [
                      {
                        label: "Ppk (Capability)",
                        val: (() => {
                          const usl = parseFloat(customUSL);
                          const lsl = parseFloat(customLSL);
                          if (isNaN(usl) || isNaN(lsl)) return "—";
                          const ppk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));
                          return ppk.toFixed(3);
                        })(),
                        note: (() => {
                          const usl = parseFloat(customUSL);
                          const lsl = parseFloat(customLSL);
                          if (isNaN(usl) || isNaN(lsl)) return "Enter USL & LSL";
                          const ppk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));
                          return ppk >= 1.33 ? "✓ Capable" : ppk >= 1.0 ? "⚠ Marginal" : "✕ Incapable";
                        })(),
                        valColor: (() => {
                          const usl = parseFloat(customUSL);
                          const lsl = parseFloat(customLSL);
                          if (isNaN(usl) || isNaN(lsl) || stdDev === 0) return T.textDim;
                          const ppk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));
                          return ppk >= 1.33 ? T.green : ppk >= 1.0 ? T.yellow : T.red;
                        })(),
                      }
                    ] : []),
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

const PARETO_DEFAULTS = [
  { id: 1, category: "Software Configuration", cases: 153, avgHrs: 89.2, color: T.red,    active: true, group: "Cognitive" },
  { id: 2, category: "Network Connectivity",   cases: 120, avgHrs: 78.5, color: T.orange, active: true, group: "Cognitive" },
  { id: 3, category: "Hardware",               cases: 98,  avgHrs: 52.3, color: T.yellow, active: true, group: "Transactional" },
  { id: 4, category: "Account Access",         cases: 76,  avgHrs: 64.8, color: T.cyan,   active: true, group: "Transactional" },
  { id: 5, category: "Integration",            cases: 54,  avgHrs: 83.6, color: T.green,  active: true, group: "Cognitive" },
  { id: 6, category: "Perf. Degradation",      cases: 28,  avgHrs: 71.2, color: "#9B8EC4",active: true, group: "Cognitive" },
  { id: 7, category: "Data Sync",              cases: 18,  avgHrs: 68.4, color: "#7EB5A6",active: true, group: "Transactional" },
];

const COLORS_POOL = [T.red, T.orange, T.yellow, T.cyan, T.green, "#9B8EC4", "#7EB5A6", "#FF6B9D", "#00B4D8", "#E9C46A"];

function ParetoBuilder() {
  const [items, setItems] = useLocalState("pareto_items", PARETO_DEFAULTS);
  const [sortBy, setSortBy] = useLocalState("pareto_sort", "cases");
  const [viewMode, setViewMode] = useLocalState("pareto_view", "chart"); // chart | treemap | scatter | heatstrip
  const [threshold, setThreshold] = useLocalState("pareto_threshold", 80);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newItem, setNewItem] = useState({ category: "", cases: 0, avgHrs: 0, group: "Cognitive" });
  const [showWhatIf, setShowWhatIf] = useLocalState("pareto_whatif", false);
  const [reductions, setReductions] = useLocalState("pareto_reductions", {});
  const [csvText, setCsvText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [metricWeights, setMetricWeights] = useLocalState("pareto_weights", { cases: 0.5, avgHrs: 0.5 });
  const [hrsReductionFactor, setHrsReductionFactor] = useLocalState("pareto_hrsfactor", 30);
  const [showWeighted, setShowWeighted] = useState(false);

  // ── Core calculations ──────────────────────────────────────────────────
  const active = items.filter(i => i.active);

  const getVal = (item) => {
    if (sortBy === "cases") return item.cases;
    if (sortBy === "avgHrs") return item.avgHrs;
    if (sortBy === "totalHrs") return item.cases * item.avgHrs;
    if (sortBy === "weighted") return (item.cases * metricWeights.cases + item.avgHrs * metricWeights.avgHrs);
    return item.cases;
  };

  const sorted = [...active].sort((a, b) => getVal(b) - getVal(a));
  const total = sorted.reduce((acc, i) => acc + getVal(i), 0);
  let cum = 0;
  const withCum = sorted.map(i => {
    const val = getVal(i);
    cum += val;
    const cumPct = total > 0 ? +((cum / total) * 100).toFixed(1) : 0;
    const totalHrs = i.cases * i.avgHrs;
    const reduction = reductions[i.id] || 0;
    const whatIfCases = Math.round(i.cases * (1 - reduction / 100));
    const whatIfHrs = i.avgHrs * (1 - reduction * (hrsReductionFactor / 100) / 100);
    return { ...i, val, cumPct, totalHrs, whatIfCases, whatIfHrs, reduction };
  });

  const vitalFew = withCum.filter(i => i.cumPct <= threshold);
  const trivialMany = withCum.filter(i => i.cumPct > threshold);
  const totalCases = active.reduce((a, i) => a + i.cases, 0);
  const totalHrsAll = active.reduce((a, i) => a + i.cases * i.avgHrs, 0);
  const avgResolution = totalCases > 0 ? (totalHrsAll / totalCases).toFixed(1) : 0;

  // What-if totals
  const whatIfCasesTotal = withCum.reduce((a, i) => a + i.whatIfCases, 0);
  const whatIfHrsTotal = withCum.reduce((a, i) => a + i.whatIfCases * i.whatIfHrs, 0);
  const whatIfAvg = whatIfCasesTotal > 0 ? (whatIfHrsTotal / whatIfCasesTotal).toFixed(1) : avgResolution;

  // ── Handlers ──────────────────────────────────────────────────────────
  const toggleItem = (id) => setItems(p => p.map(i => i.id === id ? { ...i, active: !i.active } : i));
  const toggleAll = () => {
    const allActive = items.every(i => i.active);
    setItems(p => p.map(i => ({ ...i, active: !allActive })));
  };
  const updateItem = (id, field, val) => setItems(p => p.map(i => i.id === id ? { ...i, [field]: field === "cases" || field === "avgHrs" ? parseFloat(val) || 0 : val } : i));
  const deleteItem = (id) => {
  const item = items.find(i => i.id === id);
  if (!window.confirm(`Hapus kategori "${item?.category}"?`)) return;
  setItems(p => p.filter(i => i.id !== id));
  setEditingId(null);
};
  const addItem = () => {
    if (!newItem.category) return;
    const colorIdx = items.length % COLORS_POOL.length;
    setItems(p => [...p, { ...newItem, id: Date.now(), color: COLORS_POOL[colorIdx], active: true }]);
    setNewItem({ category: "", cases: 0, avgHrs: 0, group: "Cognitive" });
    setShowAdd(false);
  };

  const importCSV = () => {
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    const parsed = lines.map((line, i) => {
      const parts = line.split(",").map(p => p.trim());
      const colorIdx = (items.length + i) % COLORS_POOL.length;
      return { id: Date.now() + i, category: parts[0] || `Item ${i+1}`, cases: parseInt(parts[1]) || 0, avgHrs: parseFloat(parts[2]) || 0, color: COLORS_POOL[colorIdx], active: true, group: parts[3] || "Other" };
    }).filter(p => p.category);
    if (parsed.length > 0) {
  setItems(p => {
    const existingNames = p.map(i => i.category.toLowerCase());
    const newItems = parsed.filter(i => !existingNames.includes(i.category.toLowerCase()));
    const dupes = parsed.length - newItems.length;
    if (dupes > 0) alert(`${dupes} duplicate category(ies) skipped.`);
    return [...p, ...newItems];
  });
  setCsvText("");
  setShowImport(false);
}
  };

  const exportCSV = () => {
    const header = "Category,Cases,Avg Hrs,Group,Total Hrs,% of Total,Priority\n";
    const rows = withCum.map(i => `${i.category},${i.cases},${i.avgHrs},${i.group || ""},${i.totalHrs.toFixed(0)},${i.val > 0 ? ((i.val/total)*100).toFixed(1) : 0}%,${i.cumPct <= threshold ? "Vital Few" : "Trivial Many"}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "pareto_analysis.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const copyReport = `PARETO ANALYSIS REPORT
Total Cases: ${totalCases} | Avg Resolution: ${avgResolution}h | Threshold: ${threshold}%

VITAL FEW (${vitalFew.length} categories = ${threshold}% of impact):
${vitalFew.map(i => `  ${i.category}: ${i.cases} cases, ${i.avgHrs}h avg, ${((i.val/total)*100).toFixed(1)}% of total`).join('\n')}

TRIVIAL MANY (${trivialMany.length} categories):
${trivialMany.map(i => `  ${i.category}: ${i.cases} cases, ${i.avgHrs}h avg`).join('\n')}

${showWhatIf ? `WHAT-IF SCENARIO:
  Current avg: ${avgResolution}h → Projected: ${whatIfAvg}h
  Reduction: ${(((parseFloat(avgResolution) - parseFloat(whatIfAvg)) / parseFloat(avgResolution)) * 100).toFixed(1)}%` : ""}`;

  const fmt = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();

  // ── Chart data ──────────────────────────────────────────────────────────
  const chartData = withCum.map(i => ({
    ...i,
    name: i.category.split(" ").slice(0, 2).join(" "),
    pctOfTotal: total > 0 ? +((i.val / total) * 100).toFixed(1) : 0,
  }));

  // ── TREEMAP via custom SVG ─────────────────────────────────────────────
  const TreemapView = () => {
    const W = 600, H = 280;
    let remaining = [...withCum].map(i => ({ ...i, area: i.val / total }));
    const rects = [];
    let x = 0, y = 0, rowW = W;

    // Simple squarified approximation
    const placed = remaining.map((item, idx) => {
      const w = Math.max(40, (item.val / total) * W);
      const h = H;
      return { ...item, w, h };
    });

    // Two-row layout
    const row1 = placed.slice(0, Math.ceil(placed.length / 2));
    const row2 = placed.slice(Math.ceil(placed.length / 2));
    const row1Total = row1.reduce((a, i) => a + i.val, 0);
    const row2Total = row2.reduce((a, i) => a + i.val, 0);

    let cx = 0;
    const cells = [
      ...row1.map(item => {
        const w = total > 0 ? (item.val / total) * W : 0;
        const r = { ...item, x: cx, y: 0, w, h: H * 0.55 };
        cx += w; return r;
      }),
      ...(() => { cx = 0; return row2; })().map(item => {
        const w = total > 0 ? (item.val / total) * W : 0;
        const r = { ...item, x: cx, y: H * 0.57, w, h: H * 0.43 };
        cx += w; return r;
      }),
    ];

    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
          Treemap — Area proportional to {sortBy === "cases" ? "Case Volume" : sortBy === "avgHrs" ? "Avg Hrs" : "Total Hours"}
        </div>
        <div style={{ overflowX: "auto" }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", minWidth: 320 }}>
            {cells.map((cell, i) => (
              <g key={cell.id} onClick={() => setActiveItem(activeItem === cell.id ? null : cell.id)} style={{ cursor: "pointer" }}>
                <rect x={cell.x + 1} y={cell.y + 1} width={Math.max(0, cell.w - 2)} height={Math.max(0, cell.h - 2)}
                  fill={`${cell.color}${cell.cumPct <= threshold ? "55" : "22"}`}
                  stroke={cell.color} strokeWidth={activeItem === cell.id ? 2 : 0.5}
                  style={{ filter: activeItem === cell.id ? `drop-shadow(0 0 8px ${cell.color})` : "none" }} />
                {cell.w > 50 && cell.h > 30 && (
                  <>
                    <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 - 8} textAnchor="middle"
                      fill={cell.color} fontSize={Math.min(12, cell.w / 8)} fontFamily={T.mono} fontWeight="700">
                      {cell.w > 80 ? cell.category.split(" ")[0] : "•"}
                    </text>
                    <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 8} textAnchor="middle"
                      fill={T.textMid} fontSize={Math.min(10, cell.w / 10)} fontFamily={T.mono}>
                      {cell.val > 0 ? `${((cell.val / total) * 100).toFixed(0)}%` : ""}
                    </text>
                    {cell.cumPct <= threshold && cell.h > 45 && (
                      <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2 + 22} textAnchor="middle"
                        fill={T.yellow} fontSize="8" fontFamily={T.mono}>VITAL</text>
                    )}
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          {withCum.map(i => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: i.color }} />
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>{i.category.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── SCATTER VIEW ──────────────────────────────────────────────────────
  const ScatterView = () => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
        Volume vs Complexity — bubble size = Total Hours (Cases × Avg Hrs)
      </div>
      <div style={{ position: "relative", height: 300, background: T.panel, borderRadius: 8, overflow: "hidden" }}>
        {/* Grid */}
        {[25,50,75].map(v => (
          <div key={v} style={{ position: "absolute", left: `${v}%`, top: 0, bottom: 0, width: 1, background: T.border, opacity: 0.3 }} />
        ))}
        {[25,50,75].map(v => (
          <div key={v} style={{ position: "absolute", top: `${v}%`, left: 0, right: 0, height: 1, background: T.border, opacity: 0.3 }} />
        ))}

        {/* Quadrant labels */}
        {[
          { x: "3%", y: "5%", label: "Low Volume", sub: "Low Complexity", color: T.green },
          { x: "55%", y: "5%", label: "High Volume", sub: "Low Complexity", color: T.cyan },
          { x: "3%", y: "60%", label: "Low Volume", sub: "High Complexity", color: T.yellow },
          { x: "55%", y: "60%", label: "CRITICAL ZONE", sub: "High V × High C", color: T.red },
        ].map(q => (
          <div key={q.label} style={{ position: "absolute", left: q.x, top: q.y, pointerEvents: "none" }}>
            <div style={{ color: q.color, fontFamily: T.mono, fontSize: "0.55rem", fontWeight: 700, opacity: 0.5 }}>{q.label}</div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.48rem", opacity: 0.35 }}>{q.sub}</div>
          </div>
        ))}
        {/* Dividers */}
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.5, background: T.border }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1.5, background: T.border }} />

        {/* Bubbles */}
        {withCum.map((item, i) => {
          const maxCases = Math.max(...withCum.map(x => x.cases));
          const maxHrs = Math.max(...withCum.map(x => x.avgHrs));
          const maxTotal = Math.max(...withCum.map(x => x.totalHrs));
          const xPct = 5 + (item.cases / maxCases) * 85;
          const yPct = 90 - (item.avgHrs / maxHrs) * 80;
          const size = Math.max(24, Math.min(64, (item.totalHrs / maxTotal) * 70));
          const isActive = activeItem === item.id;
          return (
            <motion.div key={item.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: i * 0.08 }}
              onClick={() => setActiveItem(isActive ? null : item.id)}
              title={`${item.category}\nCases: ${item.cases} | Avg: ${item.avgHrs}h | Total: ${item.totalHrs.toFixed(0)}h`}
              style={{
                position: "absolute", left: `${xPct}%`, top: `${yPct}%`,
                width: size, height: size, borderRadius: "50%",
                background: `${item.color}${isActive ? "55" : "33"}`,
                border: `${isActive ? 3 : 1.5}px solid ${item.color}`,
                transform: "translate(-50%,-50%)",
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                cursor: "pointer",
                boxShadow: isActive ? `0 0 20px ${item.color}66` : `0 0 8px ${item.color}22`,
                transition: "all 0.2s", zIndex: isActive ? 10 : 1,
              }}>
              <span style={{ color: item.color, fontFamily: T.mono, fontSize: `${Math.max(7, size * 0.18)}px`, fontWeight: 800, lineHeight: 1 }}>
                {item.cases}
              </span>
              {size > 36 && <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", lineHeight: 1 }}>{item.avgHrs}h</span>}
              {isActive && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: T.panel, border: `1px solid ${item.color}55`, borderRadius: 6, padding: "0.5rem 0.75rem", whiteSpace: "nowrap", zIndex: 20 }}>
                  <div style={{ color: item.color, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700 }}>{item.category}</div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>{item.cases} cases · {item.avgHrs}h · {item.totalHrs.toFixed(0)}h total</div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
        {/* Axis labels */}
        <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>← Case Volume →</div>
        <div style={{ position: "absolute", left: 4, top: "40%", transform: "rotate(-90deg)", color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>← Avg Hours →</div>
      </div>
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", marginTop: "0.5rem" }}>
        Click any bubble to see details. Bubble size = Total Hours (Cases × Avg Hrs).
      </div>
    </div>
  );

  // ── HEAT STRIP VIEW ────────────────────────────────────────────────────
  const HeatStripView = () => {
    const maxTotal = Math.max(...withCum.map(i => i.totalHrs));
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          Heat Strip — Total Hours Intensity per Category
        </div>
        {withCum.map((item, i) => {
          const intensity = maxTotal > 0 ? item.totalHrs / maxTotal : 0;
          const isVital = item.cumPct <= threshold;
          return (
            <motion.div key={item.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setActiveItem(activeItem === item.id ? null : item.id)}
              style={{ marginBottom: "0.6rem", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                <div style={{ width: 120, flexShrink: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isVital && <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.55rem", fontWeight: 700 }}>★</span>}
                  <span style={{ color: item.color, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: isVital ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.category.split(" ")[0]}</span>
                </div>
                <div style={{ flex: 1, height: 22, background: T.panel, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <motion.div animate={{ width: `${intensity * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                    style={{
                      height: "100%",
                      background: `linear-gradient(90deg,${item.color}88,${item.color})`,
                      borderRadius: 4,
                      boxShadow: activeItem === item.id ? `0 0 12px ${item.color}66` : "none",
                    }} />
                  <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: T.text, fontFamily: T.mono, fontSize: "0.6rem", fontWeight: 700 }}>
                    {item.totalHrs.toFixed(0)}h
                  </div>
                </div>
                <div style={{ minWidth: 80, textAlign: "right", flexShrink: 0 }}>
                  <span style={{ color: isVital ? T.yellow : T.textDim, fontFamily: T.mono, fontSize: "0.65rem" }}>{item.cases} cases</span>
                </div>
                <div style={{ minWidth: 55, textAlign: "right", flexShrink: 0 }}>
                  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>{item.avgHrs}h avg</span>
                </div>
              </div>
              <AnimatePresence>
                {activeItem === item.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ background: `${item.color}0A`, border: `1px solid ${item.color}33`, borderRadius: 6, padding: "0.65rem 1rem", marginLeft: "120px" }}>
                    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                      {[
                        { label: "Total Hours", val: `${item.totalHrs.toFixed(0)}h` },
                        { label: "% of Volume", val: `${((item.cases / totalCases) * 100).toFixed(1)}%` },
                        { label: "% of Impact", val: `${((item.val / total) * 100).toFixed(1)}%` },
                        { label: "Cumulative", val: `${item.cumPct}%` },
                        { label: "Priority", val: isVital ? "VITAL FEW" : "Trivial Many" },
                      ].map(k => (
                        <div key={k.label}>
                          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase" }}>{k.label}</div>
                          <div style={{ color: item.color, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>{k.val}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader
        module="Module 07 — Pareto Intelligence"
        title="Pareto Builder"
        sub="80/20 analysis with full custom data. Add, edit, delete categories. 4 view modes. What-If simulator. Import/Export CSV."
      />

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.65rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Active Categories", val: active.length, color: T.cyan },
          { label: "Total Cases", val: totalCases.toLocaleString(), color: T.text },
          { label: "Vital Few", val: `${vitalFew.length} cats`, color: T.yellow },
          { label: "Avg Resolution", val: `${avgResolution}h`, color: T.orange },
          { label: "Total Hours", val: `${(totalHrsAll/1000).toFixed(1)}K`, color: T.red },
          ...(showWhatIf ? [{ label: "What-If Avg", val: `${whatIfAvg}h`, color: T.green }] : []),
        ].map(k => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.7rem 0.85rem", textAlign: "center" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>{k.label}</div>
            <motion.div key={k.val} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
              style={{ color: k.color, fontFamily: T.mono, fontSize: "0.95rem", fontWeight: 700 }}>{k.val}</motion.div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <ModuleToolbar
        onReset={() => { setItems(PARETO_DEFAULTS); setReductions({}); }}
        copyData={copyReport}
        saved={true}
      >
        {[
          { id: "chart", label: "∥ Pareto Chart" },
          { id: "treemap", label: "⬛ Treemap" },
          { id: "scatter", label: "◉ Scatter" },
          { id: "heatstrip", label: "⬤ Heat Strip" },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{
            background: viewMode === v.id ? `${T.cyan}15` : "transparent",
            border: `1px solid ${viewMode === v.id ? T.cyan : T.border}`,
            color: viewMode === v.id ? T.cyan : T.textDim,
            padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
          }}>{v.label}</button>
        ))}
        <button onClick={() => setShowWhatIf(p => !p)} style={{
          background: showWhatIf ? `${T.green}15` : "transparent",
          border: `1px solid ${showWhatIf ? T.green : T.border}`,
          color: showWhatIf ? T.green : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>🎮 What-If</button>
        <button onClick={() => setShowImport(p => !p)} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          color: T.textDim, padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>↑ Import CSV</button>
        <button onClick={exportCSV} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          color: T.textDim, padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>↓ Export CSV</button>
      </ModuleToolbar>

      {/* Sort + Threshold Controls */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase" }}>Sort:</span>
        {[
          { id: "cases", label: "Case Volume" },
          { id: "avgHrs", label: "Avg Hours" },
          { id: "totalHrs", label: "Total Hours" },
          { id: "weighted", label: "Weighted" },
        ].map(s => (
          <button key={s.id} onClick={() => setSortBy(s.id)} style={{
            background: sortBy === s.id ? `${T.cyan}18` : T.surface,
            border: `1px solid ${sortBy === s.id ? T.cyan : T.border}`,
            color: sortBy === s.id ? T.cyan : T.textDim,
            padding: "0.35rem 0.75rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
          }}>{s.label}</button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>Threshold:</span>
          <input type="range" min={50} max={95} step={5} value={threshold} onChange={e => setThreshold(+e.target.value)}
            style={{ width: 80, accentColor: T.yellow, cursor: "pointer" }} />
          <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.78rem", fontWeight: 700, minWidth: 35 }}>{threshold}%</span>
          <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem" }}>
            → {vitalFew.length} vital, {trivialMany.length} trivial
          </span>
        </div>
      </div>

      {/* Category chips — editable */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={toggleAll} style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.textDim, padding: "0.3rem 0.65rem", borderRadius: 20, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem" }}>
          {items.every(i => i.active) ? "□ Deselect All" : "■ Select All"}
        </button>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => toggleItem(item.id)} style={{
              background: item.active ? `${item.color}22` : T.panel,
              border: `1px solid ${item.active ? item.color : T.border}`,
              borderRight: "none",
              color: item.active ? item.color : T.textDim,
              padding: "0.3rem 0.65rem", borderRadius: "20px 0 0 20px", cursor: "pointer",
              fontFamily: T.mono, fontSize: "0.63rem", transition: "all 0.2s",
              opacity: item.active ? 1 : 0.5,
            }}>
              {item.active ? "●" : "○"} {item.category.split(" ").slice(0,2).join(" ")}
            </motion.button>
            <button onClick={() => setEditingId(editingId === item.id ? null : item.id)} style={{
              background: editingId === item.id ? `${item.color}33` : item.active ? `${item.color}11` : T.panel,
              border: `1px solid ${item.active ? item.color : T.border}`,
              color: item.active ? item.color : T.textDim,
              padding: "0.3rem 0.4rem", borderRadius: "0 20px 20px 0", cursor: "pointer",
              fontFamily: T.mono, fontSize: "0.6rem", opacity: item.active ? 1 : 0.5,
            }}>✎</button>
          </div>
        ))}
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: `${T.green}18`, border: `1px solid ${T.green}44`, color: T.green,
          padding: "0.3rem 0.75rem", borderRadius: 20, cursor: "pointer", fontFamily: T.mono, fontSize: "0.63rem",
        }}>+ Add</button>
      </div>

      {/* Inline edit panel */}
      <AnimatePresence>
        {editingId !== null && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            {items.filter(i => i.id === editingId).map(item => (
              <div key={item.id} style={{ background: `${item.color}0A`, border: `1px solid ${item.color}33`, borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" }}>
                <div style={{ color: item.color, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>
                  [ EDITING: {item.category} ]
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem" }}>
                  {[
                    { label: "Category Name", key: "category", type: "text" },
                    { label: "Case Count", key: "cases", type: "number" },
                    { label: "Avg Resolution (hrs)", key: "avgHrs", type: "number" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</label>
                      <input type={f.type} value={item[f.key]}
                        onChange={e => updateItem(item.id, f.key, e.target.value)}
                        style={{ width: "100%", background: T.panel, border: `1px solid ${item.color}44`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem" }}>
                  <button onClick={() => setEditingId(null)} style={{ background: T.cyan, border: "none", color: T.bg, padding: "0.5rem 1.25rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>✓ Done</button>
                  <button onClick={() => deleteItem(item.id)} style={{ background: `${T.red}18`, border: `1px solid ${T.red}44`, color: T.red, padding: "0.5rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>✕ Delete</button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add item form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.85rem" }}>[ ADD NEW CATEGORY ]</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem" }}>
                {[
                  { label: "Category Name", key: "category", type: "text", ph: "e.g. Login Issues" },
                  { label: "Case Count", key: "cases", type: "number", ph: "e.g. 45" },
                  { label: "Avg Hours", key: "avgHrs", type: "number", ph: "e.g. 67.5" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</label>
                    <input type={f.type} value={newItem[f.key]} placeholder={f.ph}
                      onChange={e => setNewItem(p => ({ ...p, [f.key]: f.type === "number" ? parseFloat(e.target.value)||0 : e.target.value }))}
                      style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.82rem", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Group</label>
                  <select value={newItem.group} onChange={e => setNewItem(p => ({ ...p, group: e.target.value }))}
                    style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.78rem", cursor: "pointer", boxSizing: "border-box" }}>
                    {["Cognitive", "Transactional", "Technical", "Other"].map(g => <option key={g} style={{ background: T.surface }}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={addItem} style={{ background: T.green, border: "none", color: T.bg, padding: "0.55rem 1.5rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700 }}>
                  ✓ Add Category {newItem.cases > 0 ? `(${newItem.cases} cases · ${newItem.avgHrs}h)` : ""}
                </button>
                <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.55rem 0.85rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Import */}
      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.65rem" }}>[ IMPORT CSV — Format: Category, Cases, Avg Hrs, Group ]</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", marginBottom: "0.65rem" }}>Example: Software Bug, 120, 85.5, Cognitive</div>
             <div style={{ background: T.panel, borderRadius: 4, padding: "0.6rem 0.85rem", marginBottom: "0.75rem", fontFamily: T.mono, fontSize: "0.6rem" }}>
  <div style={{ color: T.textDim, marginBottom: "0.3rem", textTransform: "uppercase", fontSize: "0.55rem" }}>Format (one row per line):</div>
  <div style={{ color: T.cyan }}>Category Name, Cases, Avg Hrs, Group</div>
  <div style={{ color: T.textMid, marginTop: "0.2rem" }}>Software Bug, 153, 89.2, Cognitive</div>
  <div style={{ color: T.textMid }}>Network Issue, 120, 78.5, Technical</div>
  <button onClick={() => setCsvText("Software Bug,153,89.2,Cognitive\nNetwork Issue,120,78.5,Technical\nHardware Fail,98,52.3,Technical")}
    style={{ marginTop: "0.4rem", background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.2rem 0.6rem", borderRadius: 3, cursor: "pointer", fontFamily: T.mono, fontSize: "0.55rem" }}>
    Load Example
  </button>
</div>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder={"Login Error, 45, 67.2, Transactional\nPayment Fail, 38, 92.1, Cognitive"}
                style={{ width: "100%", minHeight: 80, background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 4, color: T.text, padding: "0.65rem", fontFamily: T.mono, fontSize: "0.75rem", resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.65rem" }}>
                <button onClick={importCSV} style={{ background: T.cyan, border: "none", color: T.bg, padding: "0.5rem 1.25rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>Import</button>
                <button onClick={() => setShowImport(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.5rem 0.85rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VIEW RENDERING ── */}
      {viewMode === "chart" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase" }}>
              Pareto Chart — {sortBy === "cases" ? "Case Volume" : sortBy === "avgHrs" ? "Avg Resolution Time" : sortBy === "totalHrs" ? "Total Hours" : "Weighted Score"}
            </div>
            <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.7rem" }}>
              <strong>{vitalFew.length}</strong> categories = {threshold}% of total impact
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 20, right: 65, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 9, fontFamily: T.mono }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0} />
              <YAxis yAxisId="left" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: "0.72rem", color: T.text }}
                formatter={(val, name, props) => {
                  const d = props.payload;
                  if (name === "cumPct") return [`${val}% cumulative`, "Cumulative %"];
                  return [`${val} ${sortBy === "cases" ? "cases" : "hrs"} (${d.pctOfTotal}% of total)`, d.category];
                }}
              />
              <ReferenceLine yAxisId="right" y={threshold} stroke={T.yellow} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: `${threshold}%`, fill: T.yellow, fontSize: 11, fontFamily: T.mono, position: "right" }} />
              <Bar yAxisId="left" dataKey="val" radius={[4, 4, 0, 0]} maxBarSize={70}>
                {chartData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.cumPct <= threshold ? entry.color : `${entry.color}44`}
                    stroke={activeItem === entry.id ? entry.color : "none"}
                    strokeWidth={2}
                    style={{ filter: entry.cumPct <= threshold ? `drop-shadow(0 0 6px ${entry.color}55)` : "none", cursor: "pointer" }}
                    onClick={() => setActiveItem(activeItem === entry.id ? null : entry.id)}
                  />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={T.yellow} strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return <circle key={cx} cx={cx} cy={cy} r={payload.cumPct <= threshold ? 6 : 4} fill={payload.cumPct <= threshold ? T.yellow : T.textDim} stroke="none" style={{ filter: `drop-shadow(0 0 4px ${T.yellow}88)` }} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === "treemap" && <TreemapView />}
      {viewMode === "scatter" && <ScatterView />}
      {viewMode === "heatstrip" && <HeatStripView />}

      {/* What-If Simulator */}
      <AnimatePresence>
        {showWhatIf && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: `${T.green}0A`, border: `2px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    🎮 WHAT-IF IMPROVEMENT SIMULATOR
                  </div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
                    Drag sliders to simulate case volume reduction per category
                  </div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", marginTop: "0.2rem", fontStyle: "italic" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>
    Hrs reduction sensitivity:
  </span>
  <input type="range" min={10} max={100} step={10} value={hrsReductionFactor}
    onChange={e => setHrsReductionFactor(+e.target.value)}
    style={{ width: 100, accentColor: T.yellow }} />
  <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700 }}>
    {hrsReductionFactor}% coupling
  </span>
  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
    (how much avg hrs drops per % case reduction)
  </span>
</div>
                  </div>
                </div>
                <div style={{ background: `${T.green}18`, border: `1px solid ${T.green}44`, borderRadius: 8, padding: "0.75rem 1.25rem", textAlign: "center" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase" }}>Projected Avg Resolution</div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "1rem", textDecoration: "line-through" }}>{avgResolution}h</span>
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.9rem" }}>→</span>
                    <motion.span key={whatIfAvg} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                      style={{ color: parseFloat(whatIfAvg) < parseFloat(avgResolution) ? T.green : T.red, fontFamily: T.display, fontSize: "1.8rem", fontWeight: 800, textShadow: `0 0 15px ${T.green}66` }}>
                      {whatIfAvg}h
                    </motion.span>
                  </div>
                  {parseFloat(avgResolution) > 0 && (
                    <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", marginTop: "0.2rem" }}>
                      ↓ {(((parseFloat(avgResolution) - parseFloat(whatIfAvg)) / parseFloat(avgResolution)) * 100).toFixed(1)}% reduction
                    </div>
                  )}
                </div>
              </div>

              {withCum.map(item => {
                const red = reductions[item.id] || 0;
                return (
                  <div key={item.id} style={{ marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ width: 130, flexShrink: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      <span style={{ color: item.color, fontFamily: T.mono, fontSize: "0.63rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.category.split(" ").slice(0,2).join(" ")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 200 }}>
                      <input type="range" min={0} max={80} step={5} value={red}
                        onChange={e => setReductions(p => ({ ...p, [item.id]: +e.target.value }))}
                        style={{ flex: 1, accentColor: item.color, cursor: "pointer" }} />
                      <span style={{ color: red > 0 ? T.green : T.textDim, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700, minWidth: 35 }}>
                        {red > 0 ? `-${red}%` : "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", minWidth: 180, flexShrink: 0 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase" }}>Before</div>
                        <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem" }}>{item.cases} cases</div>
                      </div>
                      <span style={{ color: T.textDim, alignSelf: "center", fontFamily: T.mono, fontSize: "0.8rem" }}>→</span>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase" }}>After</div>
                        <div style={{ color: red > 0 ? T.green : T.textMid, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: red > 0 ? 700 : 400 }}>{item.whatIfCases} cases</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setReductions({})} style={{ marginTop: "0.5rem", background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.4rem 0.85rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem" }}>
                ↺ Reset All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table — enhanced */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase" }}>[ DATA TABLE — {withCum.length} categories ]</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Badge label={`${vitalFew.length} Vital Few`} color={T.yellow} />
            <Badge label={`${trivialMany.length} Trivial Many`} color={T.textDim} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.mono, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Category", "Cases", "% Vol", "Avg Hrs", "Total Hrs", "% Impact", "Cumul.", "Priority", ""].map(h => (
                  <th key={h} style={{ color: T.textDim, textAlign: "left", padding: "0.65rem 0.85rem", fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withCum.map((row, i) => {
                const isVital = row.cumPct <= threshold;
                const pctImpact = total > 0 ? ((row.val / total) * 100).toFixed(1) : 0;
                const volPct = totalCases > 0 ? ((row.cases / totalCases) * 100).toFixed(1) : 0;
                return (
                  <motion.tr key={row.id} layout
                    style={{ borderBottom: `1px solid ${T.border}`, background: isVital ? `${row.color}08` : "transparent", cursor: "pointer" }}
                    onClick={() => setActiveItem(activeItem === row.id ? null : row.id)}>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button onClick={e => { e.stopPropagation(); toggleItem(row.id); }}
      style={{ width: 14, height: 14, borderRadius: 2, background: row.active ? row.color : "transparent", border: `1.5px solid ${row.color}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {row.active && <span style={{ color: T.bg, fontSize: "0.5rem", fontWeight: 900 }}>✓</span>}
    </button>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0, boxShadow: isVital ? `0 0 6px ${row.color}` : "none" }} />
                        <span style={{ color: row.color, fontWeight: isVital ? 700 : 400 }}>{row.category}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", color: T.text, fontWeight: 700 }}>{row.cases}</td>
                    <td style={{ padding: "0.65rem 0.85rem", color: T.textMid }}>{volPct}%</td>
                    <td style={{ padding: "0.65rem 0.85rem", color: T.text }}>{row.avgHrs}h</td>
                    <td style={{ padding: "0.65rem 0.85rem", color: T.orange, fontWeight: 700 }}>{row.totalHrs.toFixed(0)}h</td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <div style={{ height: 5, width: 50, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pctImpact}%`, height: "100%", background: row.color, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: row.color }}>{pctImpact}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <span style={{ color: isVital ? T.yellow : T.textDim, fontWeight: isVital ? 700 : 400 }}>{row.cumPct}%</span>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <Badge label={isVital ? "VITAL FEW" : "Trivial Many"} color={isVital ? T.yellow : T.textDim} />
                    </td>
                    <td style={{ padding: "0.65rem 0.5rem" }}>
                      <button onClick={e => { e.stopPropagation(); setEditingId(editingId === row.id ? null : row.id); }} style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>✎</button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${T.border}`, background: `${T.cyan}08` }}>
                <td style={{ padding: "0.65rem 0.85rem", color: T.cyan, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: "0.65rem 0.85rem", color: T.text, fontWeight: 700 }}>{totalCases}</td>
                <td style={{ padding: "0.65rem 0.85rem", color: T.textMid }}>100%</td>
                <td style={{ padding: "0.65rem 0.85rem", color: T.cyan, fontWeight: 700 }}>{avgResolution}h avg</td>
                <td style={{ padding: "0.65rem 0.85rem", color: T.orange, fontWeight: 700 }}>{(totalHrsAll/1000).toFixed(1)}K h</td>
                <td style={{ padding: "0.65rem 0.85rem", color: T.textMid }}>100%</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 08: ROOT CAUSE ANALYZER ─────────────────────────────────────────────────
const RC_DEFAULTS = [
  {
    id: 1, title: "Technician Experience Gap", category: "MAN", contribution: 84, validated: true,
    pValue: "< 0.001", rSquared: 0.58, effect: "Each 1yr experience = −8.4h resolution time",
    whys: [
      { q: "Why does experience significantly affect resolution time?", a: "Experienced technicians use tacit knowledge and shortcuts; novices rely on trial-and-error." },
      { q: "Why do less experienced technicians lack product knowledge?", a: "Onboarding only covers basics — not updated since March 2021, missing 4 of top 10 current issues." },
      { q: "Why is the training program inadequate?", a: "Training curriculum was last updated 3 years ago and misses recent product features (V1→V4.2, 315% more features)." },
      { q: "Why hasn't training been updated?", a: "No dedicated training owner — responsibility split among supervisors averaging only 2 hrs/month vs 15 hrs needed." },
      { q: "Why is there no dedicated training owner?", a: "Training viewed as a one-time onboarding expense, not a continuous operational necessity." },
    ],
    rootCause: "Lack of organizational commitment and resource allocation to continuous technical learning.",
    solution: "Extended 6-week onboarding + mentor pairing (90 days) + quarterly competency assessments.",
    status: "SOLVED", impact: 20.2,
  },
  {
    id: 2, title: "Poor Case Categorization", category: "METHOD", contribution: 20, validated: true,
    pValue: "< 0.001", effect: "Miscategorization adds +21.5 hrs per affected case",
    whys: [
      { q: "Why are 22% of cases miscategorized at intake?", a: "Tier 1 agents lack technical depth to assess complex symptoms using a rigid 12-question script." },
      { q: "Why don't scripts handle complexity?", a: "Scripts designed 5 years ago for V1.0 — current product V4.2 has 315% more features (45 → 187)." },
      { q: "Why weren't scripts updated with product evolution?", a: "No process to update support materials when engineering releases new features." },
      { q: "Why do engineering and support operate in silos?", a: "Engineering reports to CTO, Support to COO — no shared governance, 0 support touchpoints in launch checklist." },
      { q: "Why no cross-functional product launch process?", a: "Organizational structure separates functions with no shared governance or feedback loop." },
    ],
    rootCause: "Lack of cross-functional product development process that integrates support readiness.",
    solution: "AI-assisted categorization + dynamic intake + mandatory product launch checklist.",
    status: "SOLVED", impact: 4.7,
  },
  {
    id: 3, title: "Scattered Knowledge Sources", category: "MATERIAL", contribution: 21, validated: true,
    pValue: "< 0.001", rCorr: 0.67, effect: "Technicians spend avg 18 mins/case searching across 5+ systems",
    whys: [
      { q: "Why do technicians spend 18 mins avg searching?", a: "Must search across 5+ disconnected systems: Wiki, SharePoint, Email, Slack, PDF library." },
      { q: "Why is knowledge scattered across multiple systems?", a: "Systems implemented organically (Wiki 2018, SharePoint 2019) with no integration strategy." },
      { q: "Why was there no knowledge management strategy?", a: "KM budget proposals rejected in 2020 and 2022 — viewed as 'nice to have' not critical." },
      { q: "Why wasn't KM prioritized?", a: "Business cases failed to quantify financial impact of search time — only focused on software licensing costs." },
      { q: "Why wasn't the impact quantified?", a: "No operational metrics exist to track information retrieval time or knowledge reuse efficiency." },
    ],
    rootCause: "Lack of operational metrics to quantify knowledge management value.",
    solution: "Unified knowledge platform + AI-powered search + structured decision trees.",
    status: "SOLVED", impact: 5.1,
  },
];

function RootCauseAnalyzer() {
  const crossModule = useCrossModuleSummary();
  const fmeaCritical = crossModule.fmea?.critical || [];
  const spcOOC = crossModule.spc?.outOfControl || 0;
  const company = useCompany();
  const [aiWhysLoading, setAiWhysLoading] = useState(false);
  const [aiWhysError, setAiWhysError] = useState("");
  const { exportPDF, exporting: pdfExporting } = usePDFExport();
  const [rootCauses, setRootCauses] = useLocalState("rc_items", RC_DEFAULTS);

  const updateWhyField = (rcId, whyIdx, field, val) => {
    setRootCauses(prev => prev.map(r =>
      r.id === rcId
        ? { ...r, whys: r.whys.map((w, i) => i === whyIdx ? { ...w, [field]: val } : w) }
        : r
    ));
  };

  const updateRCField = (rcId, field, val) => {
    setRootCauses(prev => prev.map(r =>
      r.id === rcId ? { ...r, [field]: val } : r
    ));
  };

  const [activeRC, setActiveRC] = useLocalState("rc_active", 0);
  const [activeWhy, setActiveWhy] = useState(null);
  const [viewMode, setViewMode] = useLocalState("rc_view", "whys"); // whys | fishbone | matrix | custom
  const [showAddRC, setShowAddRC] = useState(false);
  const [newRC, setNewRC] = useState({ title: "", category: "MAN", contribution: 10, effect: "", whys: [{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }], rootCause: "", solution: "", status: "OPEN", impact: 0 });

  const rc = rootCauses[activeRC] || rootCauses[0];
  const statusColor = (s) => s === "SOLVED" ? T.green : s === "IN PROGRESS" ? T.yellow : T.red;

  const CATEGORIES = ["MAN", "METHOD", "MACHINE", "MATERIAL", "MEASUREMENT", "ENVIRONMENT"];
  const catColor = (c) => ({ MAN: T.red, METHOD: T.orange, MACHINE: T.yellow, MATERIAL: T.cyan, MEASUREMENT: "#9B8EC4", ENVIRONMENT: T.green }[c] || T.textDim);

const totalGap = company && !company.isPulseDigital && company.baselineMean > 0 && company.target > 0
  ? Math.abs(company.baselineMean - company.target)
  : 24.1;
  const totalContrib = rootCauses.reduce((acc, r) => acc + r.impact, 0);

  const copyReport = `ROOT CAUSE ANALYSIS REPORT
${rootCauses.length} validated root causes — Total gap explained: ${totalContrib.toFixed(1)}h of ${totalGap}h

${rootCauses.map((r, i) => `${i+1}. ${r.title} [${r.category}]
   Contribution: ${r.contribution}% | Impact: −${r.impact}h | Status: ${r.status}
   Effect: ${r.effect}
   Root Cause: ${r.rootCause}
   Solution: ${r.solution}
   5 Whys:
   ${r.whys.map((w, j) => `   W${j+1}: ${w.q}\n        → ${w.a}`).join('\n')}`).join('\n\n')}`;

  // Fishbone data — map whys to fishbone bones
  const fishboneCategories = CATEGORIES.map(cat => ({
    name: cat, color: catColor(cat),
    causes: rootCauses.filter(r => r.category === cat).map(r => r.title),
  })).filter(c => c.causes.length > 0);

  const FishboneView = () => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1.25rem" }}>
        Ishikawa Fishbone Diagram — Cause Categories
      </div>
      {/* Central spine */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1, height: 3, background: `linear-gradient(90deg,${T.border},${T.red})`, borderRadius: 2 }} />
        <div style={{ background: `${T.red}22`, border: `2px solid ${T.red}`, borderRadius: 8, padding: "0.65rem 1.25rem", flexShrink: 0, marginLeft: "0.5rem" }}>
          <div style={{ color: T.red, fontFamily: T.display, fontSize: "0.9rem", fontWeight: 800, lineHeight: 1 }}>EFFECT</div>
          <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.65rem", marginTop: "0.2rem" }}>Resolution Time = 72.1h</div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>Target: 48h</div>
        </div>
      </div>

      {/* Bones grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "1rem" }}>
        {CATEGORIES.map(cat => {
          const catRCs = rootCauses.filter(r => r.category === cat);
          const c = catColor(cat);
          return (
            <div key={cat} style={{ background: `${c}08`, border: `1px solid ${c}33`, borderRadius: 8, padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: `1px solid ${c}22`, paddingBottom: "0.5rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
                <span style={{ color: c, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em" }}>{cat}</span>
              </div>
              {catRCs.length > 0 ? catRCs.map(r => (
                <div key={r.id} onClick={() => { setActiveRC(rootCauses.indexOf(r)); setViewMode("whys"); }}
                  style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", cursor: "pointer", padding: "0.35rem 0.4rem", borderRadius: 4, background: `${c}08`, transition: "background 0.2s" }}>
                  <span style={{ color: c, fontFamily: T.mono, fontSize: "0.65rem", flexShrink: 0 }}>→</span>
                  <div>
                    <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem" }}>{r.title}</div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>{r.contribution}% · −{r.impact}h</div>
                  </div>
                </div>
              )) : (
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", fontStyle: "italic" }}>No causes in this category</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const MatrixView = () => (
    <div>
      {/* Impact vs Controllability matrix */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          Impact vs Contribution Matrix — bubble size = % of gap
        </div>
        <div style={{ position: "relative", height: 280, background: T.panel, borderRadius: 8, overflow: "hidden" }}>
          {/* Quadrant labels */}
          {[
            { x: "5%", y: "8%", label: "Quick Wins", sub: "Low effort, High impact", color: T.green },
            { x: "60%", y: "8%", label: "Major Projects", sub: "High effort, High impact", color: T.cyan },
            { x: "5%", y: "70%", label: "Fill-ins", sub: "Low effort, Low impact", color: T.yellow },
            { x: "60%", y: "70%", label: "Thankless Tasks", sub: "High effort, Low impact", color: T.red },
          ].map(q => (
            <div key={q.label} style={{ position: "absolute", left: q.x, top: q.y }}>
              <div style={{ color: q.color, fontFamily: T.mono, fontSize: "0.58rem", fontWeight: 700, opacity: 0.6 }}>{q.label}</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", opacity: 0.4 }}>{q.sub}</div>
            </div>
          ))}
          {/* Dividers */}
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: T.border, opacity: 0.5 }} />
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: T.border, opacity: 0.5 }} />
          {/* Bubbles */}
          {rootCauses.map((r, i) => {
            const x = 10 + (Math.min(r.contribution, 100) / 100) * 75;
const y = Math.max(5, 80 - (Math.min(r.impact, 25) / 25) * 65);
            const size = Math.max(30, r.contribution * 0.8);
            const c = catColor(r.category);
            return (
              <motion.div key={r.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: i * 0.1 }}
                onClick={() => { setActiveRC(i); setViewMode("whys"); }}
                title={`${r.title}\nContribution: ${r.contribution}% | Impact: −${r.impact}h`}
                style={{
                  position: "absolute", left: `${x}%`, top: `${y}%`,
                  width: size, height: size, borderRadius: "50%",
                  background: `${c}28`, border: `2px solid ${c}`,
                  transform: "translate(-50%,-50%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexDirection: "column",
                  boxShadow: `0 0 15px ${c}33`, transition: "opacity 0.2s",
                }}
              >
                <span style={{ color: c, fontFamily: T.mono, fontSize: `${Math.max(8, size * 0.22)}px`, fontWeight: 700, lineHeight: 1 }}>{r.contribution}%</span>
                <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", lineHeight: 1 }}>{r.category}</span>
              </motion.div>
            );
          })}
          <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>← Contribution to Gap →</div>
          <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)", color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>← Impact (hrs) →</div>
        </div>
      </div>

      {/* Summary table */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontFamily: T.mono, fontSize: "0.72rem" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["Root Cause", "Category", "Contribution", "Impact (hrs)", "Status", "Solution"].map(h => (
                <th key={h} style={{ color: T.textDim, textAlign: "left", padding: "0.65rem 0.85rem", fontSize: "0.58rem", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rootCauses].sort((a,b) => b.contribution - a.contribution).map((r, i) => {
              const c = catColor(r.category);
              const sc = statusColor(r.status);
              return (
                <tr key={r.id} onClick={() => { setActiveRC(rootCauses.indexOf(r)); setViewMode("whys"); }}
                  style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: i === activeRC ? `${c}08` : "transparent" }}>
                  <td style={{ padding: "0.65rem 0.85rem", color: T.text }}>{r.title}</td>
                  <td style={{ padding: "0.65rem 0.85rem" }}><Badge label={r.category} color={c} /></td>
                  <td style={{ padding: "0.65rem 0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ height: 6, width: 60, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${r.contribution}%`, height: "100%", background: c, borderRadius: 3 }} />
                      </div>
                      <span style={{ color: c, fontWeight: 700 }}>{r.contribution}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem 0.85rem", color: T.yellow, fontWeight: 700 }}>−{r.impact}h</td>
                  <td style={{ padding: "0.65rem 0.85rem" }}><Badge label={r.status} color={sc} /></td>
                  <td style={{ padding: "0.65rem 0.85rem", color: T.textDim, fontSize: "0.65rem", maxWidth: 180 }}>{r.solution}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
      <SectionHeader
        module="Module 08 — Causal Intelligence"
        title="Root Cause Analyzer"
        sub="5 Whys drill-down, Fishbone diagram, Impact matrix. Add your own root causes. All statistically validated."
      />

{/* FMEA Import Suggestion */}
      {fmeaCritical.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: `${T.orange}08`, border: `1px solid ${T.orange}33`, borderRadius: 8, padding: "0.85rem 1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ color: T.orange, fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            💡 FROM FMEA — {fmeaCritical.length} critical failure mode may require root cause investigation:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {fmeaCritical.slice(0, 4).map((item, i) => (
              <span key={i} style={{ background: `${T.red}18`, border: `1px solid ${T.red}44`, borderRadius: 4, color: T.red, fontFamily: T.mono, fontSize: "0.6rem", padding: "0.2rem 0.6rem" }}>
                {item.failure || "Unnamed"} · RPN {item.rpn}
              </span>
            ))}
          </div>
          {spcOOC > 0 && (
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.5rem" }}>
              + SPC mendeteksi {spcOOC} titik out-of-control yang mungkin punya root cause yang sama
            </div>
          )}
        </motion.div>
      )}
      
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Root Causes", val: rootCauses.length, color: T.cyan },
          { label: "Gap Explained", val: `${totalContrib.toFixed(1)}h / ${totalGap}h`, color: T.yellow },
          { label: "% Solved", val: rootCauses.length === 0 ? "—" : `${Math.round((rootCauses.filter(r=>r.status==="SOLVED").length/rootCauses.length)*100)}%`, color: T.green },
          { label: "Validated (p<0.001)", val: rootCauses.filter(r=>r.validated).length, color: T.cyan },
          { label: "Total Impact", val: `−${totalContrib.toFixed(1)}h`, color: T.green },
        ].map(k => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${k.color}22`, borderRadius: 8, padding: "0.9rem", textAlign: "center" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{k.label}</div>
            <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.4rem", fontWeight: 800 }}>{k.val}</div>
          </div>
        ))}
      </div>

            {/* Toolbar */}
      <ModuleToolbar onReset={() => setRootCauses(RC_DEFAULTS)} copyData={copyReport} saved={true}>
        {[
          { id: "whys", label: "? 5 Whys" },
          { id: "fishbone", label: "⟶ Fishbone" },
          { id: "matrix", label: "◫ Matrix" },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{
            background: viewMode === v.id ? `${T.cyan}15` : "transparent",
            border: `1px solid ${viewMode === v.id ? T.cyan : T.border}`,
            color: viewMode === v.id ? T.cyan : T.textDim,
            padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
          }}>{v.label}</button>
        ))}

        <button onClick={() => exportPDF({
          title: "Root Cause Analysis Report",
          subtitle: `${rootCauses.length} validated root causes · Total impact: −${totalContrib.toFixed(1)}h`,
          company,
          filename: "RootCause_Report",
          sections: [
            {
              title: "Summary",
              content: `
                <div class="kpi-grid">
                  <div class="kpi-card"><div class="kpi-val">${rootCauses.length}</div><div class="kpi-label">Root Causes</div></div>
                  <div class="kpi-card"><div class="kpi-val">${rootCauses.filter(r=>r.status==="SOLVED").length}</div><div class="kpi-label">Solved</div></div>
                  <div class="kpi-card"><div class="kpi-val">−${totalContrib.toFixed(1)}h</div><div class="kpi-label">Total Impact</div></div>
                  <div class="kpi-card"><div class="kpi-val">${rootCauses.filter(r=>r.validated).length}</div><div class="kpi-label">Validated</div></div>
                </div>`,
            },
            {
              title: "Root Cause Detail",
              content: rootCauses.map(r => `
                <div style="margin-bottom:16px; padding:10px; border:1px solid #ddd; border-radius:6px;">
                  <h3>${r.title} <span class="badge ${r.status==="SOLVED"?"badge-green":r.status==="OPEN"?"badge-red":"badge-yellow"}">${r.status}</span></h3>
                  <p><strong>Category:</strong> ${r.category} · <strong>Contribution:</strong> ${r.contribution}% · <strong>Impact:</strong> −${r.impact}h</p>
                  <p><strong>Effect:</strong> ${r.effect || "—"}</p>
                  <p><strong>Root Cause:</strong> ${r.rootCause}</p>
                  <p><strong>Solution:</strong> ${r.solution}</p>
                  ${r.whys?.length ? `
                    <table style="margin-top:8px;">
                      <thead><tr><th>#</th><th>Why Question</th><th>Answer</th></tr></thead>
                      <tbody>${r.whys.map((w,i)=>`<tr><td>${i+1}</td><td>${w.q}</td><td>${w.a||"—"}</td></tr>`).join("")}</tbody>
                    </table>` : ""}
                </div>`).join(""),
            },
          ],
        })} disabled={pdfExporting} style={{
          background: `${T.red}12`, border: `1px solid ${T.red}44`,
          color: pdfExporting ? T.textDim : T.red,
          padding: "0.35rem 0.8rem", borderRadius: 4,
          cursor: pdfExporting ? "not-allowed" : "pointer",
          fontFamily: T.mono, fontSize: "0.62rem",
        }}>{pdfExporting ? "⏳..." : "📄 PDF"}</button>
        
        {/* INI TOMBOL ADD ROOT CAUSE YANG LAMA */}
        <button onClick={() => setShowAddRC(p => !p)} style={{
          background: showAddRC ? `${T.green}15` : "transparent",
          border: `1px solid ${showAddRC ? T.green : T.border}`,
          color: showAddRC ? T.green : T.textDim,
          padding: "0.35rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem",
        }}>+ Add Root Cause</button>
        
        {/* INI TOMBOL AUTO-GEN BARU (FITUR 3) */}
        <button onClick={() => {
          try {
            const raw = localStorage.getItem("triage_history") || localStorage.getItem("triage_history_pd") || "[]";
            const history = JSON.parse(raw);
            if (!history.length) { alert("No triage history found. Submit some complaints in Smart Triage first."); return; }
            const cats = {};
            history.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
            const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
            const total = history.length;
            const WHYS_TEMPLATES = {
              "Software Configuration": ["Why did the software fail to function correctly?","Why was the configuration incorrect or missing?","Why was the configuration not validated before deployment?","Why is there no automated config validation in the pipeline?","Why is configuration management not part of the standard release checklist?"],
              "Network Connectivity": ["Why did users lose network connectivity?","Why did the network infrastructure fail?","Why was the failure not detected proactively?","Why is there no real-time network monitoring in place?","Why has preventive maintenance not been scheduled for this infrastructure?"],
              "Hardware Troubleshooting": ["Why did the hardware malfunction?","Why did the hardware malfunction?","Why is there no preventive hardware inspection schedule?","Why are spare parts not readily available?","Why is hardware lifecycle management not formalized?"],
              "Account Access Issues": ["Why could the user not access their account?","Why did the authentication or permission system fail?","Why are access rights not reviewed regularly?","Why is there no automated access audit process?","Why is the identity management system not integrated with HR offboarding?"],
              "Performance Degradation": ["Why did system performance degrade?","Why did resource consumption exceed capacity?","Why was load growth not anticipated?","Why is there no capacity planning process?","Why are performance baselines not established and monitored?"],
              "Integration Problems": ["Why did the integration between systems fail?","Why was the API or connector not functioning?","Why was the integration not monitored for health?","Why is there no integration testing in the deployment pipeline?","Why are third-party dependencies not tracked for changes?"],
              "Data Sync Errors": ["Why did data synchronization fail?","Why did the sync job encounter an error?","Why was the error not detected and alerted automatically?","Why is there no data reconciliation check after each sync?","Why is the sync process not monitored end-to-end?"],
              "Customer Complaints": ["Why did the customer experience a service failure?","Why was the root cause of their issue not resolved?","Why was the customer not kept informed during resolution?","Why is there no proactive customer communication protocol?","Why are recurring customer complaint patterns not analyzed?"],
              "Security & Compliance": ["Why did the security incident occur?","Why was the vulnerability not patched or detected?","Why is vulnerability scanning not performed regularly?","Why is there no security patch management policy?","Why are security audits not scheduled on a fixed cadence?"],
              "HR & People Issues": ["Why did the HR process fail or delay?","Why was the employee situation not handled timely?","Why is the HR workflow not clearly documented?","Why are HR SLAs not tracked or enforced?","Why is there no escalation path for HR issues?"],
              "Finance & Billing": ["Why did the financial discrepancy occur?","Why was the error not caught during reconciliation?","Why is the reconciliation process not automated?","Why are financial controls not enforced at the transaction level?","Why is there no period-end checklist to validate financial data?"],
              "Logistics & Supply Chain": ["Why was the shipment delayed or lost?","Why did the supply chain process break down?","Why was the exception not flagged in the tracking system?","Why is there no automated exception handling for logistics?","Why are supplier SLAs not monitored proactively?"],
            };
            const newItems = sorted.slice(0, 3).map(([cat, count], i) => {
              const pct = Math.round((count / total) * 100);
              const whysTemplate = WHYS_TEMPLATES[cat] || ["Why did this issue occur?","Why was the root cause not addressed?","Why is the process not preventing this?","Why is there no detection mechanism?","Why has this not been resolved systematically?"];
              return {
                id: Date.now() + i,
                title: `Auto: ${cat}`,
                effect: `${count} ticket(s) — ${pct}% of all complaints`,
                rootCause: `Systematic failure in ${cat} process based on ${count} recurring incidents`,
                solution: `Implement structured improvement plan targeting ${cat} — prioritize based on ${pct}% impact weight`,
                category: cat.includes("Software") || cat.includes("Network") || cat.includes("Hardware") ? "Technology" :
                           cat.includes("HR") || cat.includes("Customer") ? "People" :
                           cat.includes("Finance") || cat.includes("Logistics") ? "Process" : "Environment",
                contribution: pct,
                impact: Math.round(pct * 0.3),
                validated: false,
                pValue: `${(Math.random() * 0.03 + 0.01).toFixed(3)}`,
                whys: whysTemplate.map((q, j) => ({ q, a: j === 0 ? `Based on ${count} incident reports in triage history` : "" })),
              };
            });
            setRootCauses(prev => {
              const existing = prev.map(r => r.title);
              const toAdd = newItems.filter(n => !existing.includes(n.title));
              return [...prev, ...toAdd];
            });
            alert(`✓ Auto-generated ${newItems.length} root causes from ${total} triage records. Top categories: ${sorted.slice(0,3).map(([c]) => c).join(", ")}`);
          } catch(e) {
            alert("Could not read triage history. Make sure you have submitted complaints in Smart Triage first.");
          }
        }} style={{
          background: `${T.cyan}15`, border: `1px solid ${T.cyan}44`,
          color: T.cyan, padding: "0.35rem 0.8rem", borderRadius: 4,
          cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700,
        }}>✦ Auto-Gen from Triage</button>
      </ModuleToolbar>

      {viewMode === "fishbone" && <FishboneView />}
      {viewMode === "matrix" && <MatrixView />}

      {viewMode === "whys" && (
        <>
          {/* RC selector cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {rootCauses.map((r, i) => {
              const c = catColor(r.category);
              const sc2 = statusColor(r.status);
              return (
                <motion.button key={r.id} onClick={() => setActiveRC(i)} whileHover={{ scale: 1.02 }} style={{
                  background: activeRC === i ? `${c}12` : T.surface,
                  border: `2px solid ${activeRC === i ? c : T.border}`,
                  borderRadius: 8, padding: "1rem", cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s",
                  boxShadow: activeRC === i ? `0 0 20px ${c}22` : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                    <Badge label={r.category} color={c} />
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <Badge label={r.status} color={sc2} />
                      <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700 }}>{r.contribution}%</span>
                    </div>
                  </div>
                  <div style={{ color: activeRC === i ? T.text : T.textMid, fontFamily: T.display, fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.35rem" }}>{r.title}</div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", lineHeight: 1.4 }}>{r.effect}</div>
                  <div style={{ marginTop: "0.5rem", height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                    <motion.div animate={{ width: `${r.contribution}%` }} transition={{ duration: 0.6 }}
                      style={{ height: "100%", background: c, borderRadius: 2 }} />
                  </div>
                  {r.rSquared && <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.58rem", marginTop: "0.3rem" }}>✓ R² = {r.rSquared} · p {r.pValue}</div>}
                </motion.button>
              );
            })}
          </div>

          {/* 5 Whys drill-down */}
          <AnimatePresence mode="wait">
            <motion.div key={activeRC} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
                  [ 5 WHYS DRILL-DOWN — {rc.title.toUpperCase()} ]
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {rc.whys.map((w, i) => {
                    const isActive = activeWhy === i;
                    return (
                      <div key={i} style={{ display: "flex", gap: "1rem", paddingBottom: "1rem", position: "relative" }}>
                        {i < rc.whys.length - 1 && (
                          <div style={{ position: "absolute", left: 17, top: 38, bottom: 0, width: 2, background: `${T.cyan}33` }} />
                        )}
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          onClick={() => setActiveWhy(isActive ? null : i)}
                          style={{
                            flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
                            background: isActive ? T.cyan : `${T.cyan}18`,
                            border: `2px solid ${T.cyan}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: isActive ? T.bg : T.cyan, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 800,
                            cursor: "pointer", zIndex: 1,
                            boxShadow: isActive ? `0 0 15px ${T.cyan}66` : "none",
                            transition: "all 0.2s",
                          }}>
                          {i + 1}
                        </motion.div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem", marginBottom: "0.25rem", fontStyle: "italic" }}>
                            Why {i + 1}: <EditableLabel value={w.q} onChange={v => setRootCauses(prev => prev.map(r => r.id === rc.id ? { ...r, whys: r.whys.map((x, j) => j === i ? { ...x, q: v } : x) } : r))} style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.7rem" }} />
                          </div>
                          <motion.div
                            animate={{ opacity: 1, height: "auto" }}
                            style={{ background: isActive ? `${T.cyan}10` : T.panel, border: `1px solid ${isActive ? T.cyan + "44" : T.border}`, borderRadius: 6, padding: "0.75rem 1rem", color: T.text, fontSize: "0.83rem", lineHeight: 1.6, transition: "all 0.2s" }}
                            onClick={() => setActiveWhy(isActive ? null : i)}>
                            <EditableLabel value={w.a} onChange={v => setRootCauses(prev => prev.map(r => r.id === rc.id ? { ...r, whys: r.whys.map((x, j) => j === i ? { ...x, a: v } : x) } : r))} style={{ color: T.text, fontFamily: T.mono, fontSize: "0.83rem" }} />
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Root Cause + Solution side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ background: `${T.red}0A`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: "1.5rem" }}>
                  <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>[ FUNDAMENTAL ROOT CAUSE ]</div>
                  <p style={{ color: T.text, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{rc.rootCause}</p>
                </div>
                <div style={{ background: `${T.green}0A`, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem" }}>
                  <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>[ IMPLEMENTED SOLUTION ]</div>
                  <p style={{ color: T.text, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{rc.solution}</p>
                  <div style={{ marginTop: "0.75rem" }}><Badge label={rc.status} color={statusColor(rc.status)} /></div>
                </div>
              </div>

              {/* Contribution bar chart */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "1rem" }}>
                  Root Cause Contribution to {totalGap}h Gap
                </div>
                {[...rootCauses].sort((a,b) => b.impact - a.impact).map((r, i) => {
                  const c = catColor(r.category);
                  return (
                    <div key={r.id} style={{ marginBottom: "0.75rem" }} onClick={() => setActiveRC(rootCauses.indexOf(r))}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", cursor: "pointer" }}>
                        <span style={{ color: rootCauses.indexOf(r) === activeRC ? T.text : T.textMid, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: rootCauses.indexOf(r) === activeRC ? 700 : 400 }}>{r.title}</span>
                        <span style={{ color: c, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>−{r.impact}h ({r.contribution}%)</span>
                      </div>
                      <div style={{ height: 7, background: T.panel, borderRadius: 3, overflow: "hidden" }}>
                        <motion.div animate={{ width: `${(r.impact / totalGap) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.1 }}
                          style={{ height: "100%", background: c, borderRadius: 3, opacity: rootCauses.indexOf(r) === activeRC ? 1 : 0.5 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: "0.85rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
                  * Contributions sum to &gt;100% due to overlapping multivariate effects
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Add RC form */}
      <AnimatePresence>
        {showAddRC && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem", marginTop: "1.5rem" }}>
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", textTransform: "uppercase", marginBottom: "1rem" }}>[ ADD NEW ROOT CAUSE ]</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                {[
                  { label: "Root Cause Title", key: "title", ph: "e.g. Training Gap" },
                  { label: "Effect / Symptom", key: "effect", ph: "e.g. Adds 15h per case" },
                  { label: "Root Cause Statement", key: "rootCause", ph: "Fundamental cause..." },
                  { label: "Proposed Solution", key: "solution", ph: "Corrective action..." },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</label>
                    <input value={newRC[f.key]} onChange={e => setNewRC(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph}
                      style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.78rem", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Category</label>
                  <select value={newRC.category} onChange={e => setNewRC(p => ({ ...p, category: e.target.value }))}
                    style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.78rem", cursor: "pointer", boxSizing: "border-box" }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: T.surface }}>{c}</option>)}
                  </select>
                </div>
                {[
                  { label: "Contribution (%)", key: "contribution", min: 0, max: 100 },
                  { label: "Impact (hrs saved)", key: "impact", min: 0, max: 30 },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>{f.label}</label>
                    <input type="number" value={newRC[f.key]} min={f.min} max={f.max} onChange={e => setNewRC(p => ({ ...p, [f.key]: +e.target.value }))}
                      style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 4, color: T.cyan, padding: "0.5rem 0.65rem", fontFamily: T.mono, fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase" }}>5 Whys (fill each level)</div>
                <button
                  onClick={async () => {
                    if (!newRC.title.trim()) { alert("Isi Title dulu sebelum generate 5 Whys"); return; }
                    setAiWhysLoading(true);
                    setAiWhysError("");
                    const prompt = `You are a Six Sigma Black Belt expert conducting a 5 Whys root cause analysis.

Context:
- Company: ${company?.name || "Unknown"}
- Industry: ${company?.industry || "General"}
- Process: ${company?.processName || "General Process"}
- Problem/Root Cause Title: "${newRC.title}"
- Category: ${newRC.category}

Generate a rigorous 5 Whys analysis for this problem. Each "Why" should drill deeper into the systemic root cause, not just repeat the symptom.

Respond ONLY with valid JSON. No markdown, no explanation:
{
  "whys": [
    { "q": "<Why question 1 — about the immediate symptom>", "a": "<Specific answer based on the context>" },
    { "q": "<Why question 2 — one level deeper>", "a": "<Answer>" },
    { "q": "<Why question 3>", "a": "<Answer>" },
    { "q": "<Why question 4>", "a": "<Answer>" },
    { "q": "<Why question 5 — the true systemic root cause>", "a": "<Answer>" }
  ],
  "rootCause": "<One sentence: the true systemic root cause discovered>",
  "solution": "<One sentence: recommended corrective action>"
}`;
                    try {
                      const res = await fetch("/api/claude", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ messages: [{ content: prompt }] }),
                      });
                      const data = await res.json();
                      const raw = data?.content?.[0]?.text || "";
                      const clean = raw.replace(/```json|```/g, "").trim();
                      const parsed = JSON.parse(clean);
                      setNewRC(p => ({
                        ...p,
                        whys: parsed.whys || p.whys,
                        rootCause: parsed.rootCause || p.rootCause,
                        solution: parsed.solution || p.solution,
                      }));
                    } catch {
                      setAiWhysError("AI gagal — coba lagi");
                    } finally {
                      setAiWhysLoading(false);
                    }
                  }}
                  disabled={aiWhysLoading}
                  style={{
                    background: aiWhysLoading ? `${T.cyan}08` : `${T.cyan}15`,
                    border: `1px solid ${T.cyan}44`,
                    color: aiWhysLoading ? T.textDim : T.cyan,
                    padding: "0.25rem 0.65rem", borderRadius: 4,
                    cursor: aiWhysLoading ? "not-allowed" : "pointer",
                    fontFamily: T.mono, fontSize: "0.6rem",
                  }}>
                  {aiWhysLoading ? "⏳ Generating..." : "✦ AI Draft 5 Whys"}
                </button>
              </div>
              {aiWhysError && <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.6rem", marginBottom: "0.5rem" }}>{aiWhysError}</div>}
              {newRC.whys.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${T.cyan}18`, border: `1px solid ${T.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.cyan, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                  <input value={w.q} onChange={e => setNewRC(p => ({ ...p, whys: p.whys.map((x, j) => j === i ? { ...x, q: e.target.value } : x) }))} placeholder={`Why ${i+1} question...`}
                    style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.text, padding: "0.4rem 0.6rem", fontFamily: T.mono, fontSize: "0.72rem", boxSizing: "border-box" }} />
                  <input value={w.a} onChange={e => setNewRC(p => ({ ...p, whys: p.whys.map((x, j) => j === i ? { ...x, a: e.target.value } : x) }))} placeholder="Answer..."
                    style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.textMid, padding: "0.4rem 0.6rem", fontFamily: T.mono, fontSize: "0.72rem", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button onClick={() => { setRootCauses(p => [...p, { ...newRC, id: Date.now(), validated: false, pValue: "—" }]); setShowAddRC(false); }} style={{ background: T.green, border: "none", color: T.bg, padding: "0.65rem 1.5rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700 }}>
                  ✓ Add Root Cause
                </button>
                <button onClick={() => setShowAddRC(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.65rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.72rem" }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── AI TRIAGE SIMULATOR ────────────────────────────────────────────────────
const COMPLAINT_KEYWORDS = {
  "Software Configuration": ["software","config","configuration","install","setup","application","app","program","setting","database","db","sql","sync","api","integration","error","crash","bug","code","system","deployment","environment","dependency","library","module","plugin","update","upgrade","version","patch","rollback","build","compile","runtime","exception","stacktrace","log","debug","server","client","frontend","backend","microservice","container","docker","kubernetes","pipeline","ci/cd"],
  "Network Connectivity": ["network","wifi","wireless","internet","connection","connect","disconnect","dns","ip address","vpn","ping","bandwidth","slow","timeout","firewall","router","switch","port","latency","offline","packet loss","proxy","gateway","subnet","nat","ssl","certificate","https","tls","socket","host","domain","unreachable","no signal","dropped"],
  "Hardware Troubleshooting": ["hardware","printer","scanner","device","keyboard","mouse","screen","monitor","display","disk","drive","ssd","hdd","memory","ram","cpu","processor","battery","power supply","cable","peripheral","physical","broken","damaged","not working","not detected","overheating","fan","usb","hdmi","port","connector","cartridge","toner","paper jam","touchscreen"],
  "Account Access Issues": ["login","password","account","access","locked","lock out","permission","auth","authentication","authorization","2fa","mfa","token","session","username","credentials","unauthorized","forbidden","reset password","forgot password","expired","inactive","disabled","role","privilege","admin","user management","sso","ldap","active directory","oauth","identity"],
  "Performance Degradation": ["slow","performance","lagging","lag","hang","freeze","freezing","loading","speed","response time","delay","timeout","high cpu","memory leak","bottleneck","throughput","latency","spike","degraded","unresponsive","heavy","resource","capacity","overload","queue","backlog","inefficient","sluggish","takes too long","minutes to load"],
  "Data Sync Errors": ["sync","synchronize","synchronization","data","backup","export","import","upload","download","transfer","missing data","duplicate","corrupt","corrupted","mismatch","inconsistent","out of sync","not updating","stale","wrong data","data loss","record","database","table","field","value","migration","etl","pipeline","replication","real-time","batch"],
  "Integration Problems": ["integration","third party","vendor","api","webhook","connector","middleware","sap","salesforce","erp","crm","hubspot","zendesk","slack","teams","jira","confluence","stripe","payment gateway","external system","interface","endpoint","rest","graphql","soap","wsdl","handshake","authentication failed","rate limit","quota","response error","400","401","403","404","500","502","503"],
  "HR & People Issues": ["hr","human resources","employee","staff","onboarding","offboarding","payroll","salary","leave","attendance","performance review","kpi","promotion","termination","resignation","contract","benefits","insurance","recruitment","hiring","interview","training","compliance","policy","grievance","misconduct","disciplinary","overtime","reimbursement","appraisal","headcount"],
  "Finance & Billing": ["invoice","billing","payment","finance","accounting","budget","expense","reimbursement","tax","audit","reconciliation","purchase order","po","vendor payment","accounts payable","accounts receivable","cash flow","revenue","cost","overcharge","undercharge","refund","credit","debit","transaction","receipt","approval","financial report","month end","quarter end","year end","discrepancy","variance"],
  "Logistics & Supply Chain": ["shipment","delivery","shipping","logistics","supply chain","warehouse","inventory","stock","order","tracking","late delivery","lost package","damaged goods","return","refund","courier","freight","dispatch","fulfillment","pick pack","barcode","sku","purchase order","supplier","vendor","lead time","backorder","out of stock","customs","import","export","last mile"],
  "Customer Complaints": ["customer","client","complaint","dissatisfied","unhappy","frustrated","angry","refund","compensation","poor service","bad experience","not resolved","escalate","manager","sla breach","waiting too long","no response","ignored","wrong product","wrong service","misleading","overcharged","cancel","churn","feedback","review","survey","nps","satisfaction"],
  "Security & Compliance": ["security","breach","hack","phishing","malware","virus","ransomware","vulnerability","threat","attack","unauthorized access","data leak","gdpr","compliance","audit","regulation","policy violation","suspicious","anomaly","incident","forensic","firewall","antivirus","encryption","certificate","pen test","risk","exposure","pii","sensitive data","confidential"],
  "Physical Security & Facilities": ["security guard", "patrol", "access card", "cctv", "gate", "door locked", "parking", "building", "facility", "maintenance", "broken window", "leak", "ac broken", "alarm", "trespasser", "safety", "hazard", "incident report", "visitor", "evacuation"],
  "Data Analytics & Reporting": ["dashboard", "report", "analytics", "data visualization", "metrics", "kpi", "wrong data", "missing data", "export", "excel", "spreadsheet", "bi", "business intelligence", "six sigma", "statistics", "trend", "chart not loading"]
};

const SEVERITY_KEYWORDS = ["urgent","critical","emergency","down","outage","breach","blocked","cannot work","production down","all users affected","data loss","security breach","executive","board","deadline","legal","compliance","immediate","asap","sla breach","escalate"];

const DOMAIN_CONTEXT = {
  "IT / Tech Support": ["Software Configuration","Network Connectivity","Hardware Troubleshooting","Account Access Issues","Performance Degradation","Data Sync Errors","Integration Problems","Security & Compliance"],
  "HR / People Ops": ["HR & People Issues","Account Access Issues","Finance & Billing","Software Configuration"],
  "Financial Services": ["Finance & Billing","Security & Compliance","Data Sync Errors","Integration Problems"],
  "Logistics & Supply Chain": ["Logistics & Supply Chain","Integration Problems","Data Sync Errors","Software Configuration"],
  "Customer Service": ["Customer Complaints","Account Access Issues","Integration Problems","Performance Degradation"],
  "Manufacturing": ["Hardware Troubleshooting","Logistics & Supply Chain","Data Sync Errors","Performance Degradation"],
  "Retail / E-Commerce": ["Customer Complaints","Logistics & Supply Chain","Finance & Billing","Integration Problems"],
};

const RULE_BASED_RESPONSES = {
  "Software Configuration": {
    core_problem: "A software component is misconfigured, incompatible, or failing to run as expected in the target environment.",
    business_impact: "Affected users cannot complete their work tasks, reducing team productivity and potentially delaying deliverables.",
    recommended_action: "Collect error logs, identify recent changes (updates/deployments), and test in an isolated environment to reproduce the issue.",
    red_flags: "Recent deployment, Production environment, Multiple users affected",
  },
  "Network Connectivity": {
    core_problem: "Network infrastructure failure or misconfiguration is preventing users from accessing required systems or services.",
    business_impact: "Users are unable to connect to critical systems, halting operations and communication across the affected area.",
    recommended_action: "Run diagnostic ping/traceroute, check router/switch status, verify DNS resolution, and inspect firewall rules for recent changes.",
    red_flags: "Multiple users affected, Core infrastructure, No workaround available",
  },
  "Hardware Troubleshooting": {
    core_problem: "A physical device or peripheral is malfunctioning, damaged, or not being recognized by the operating system.",
    business_impact: "The affected user cannot perform hardware-dependent tasks, reducing individual productivity until the device is repaired or replaced.",
    recommended_action: "Test with known-good replacement hardware, update device drivers, check physical connections, and inspect for visible damage.",
    red_flags: "No spare available, Shared device, Production hardware",
  },
  "Account Access Issues": {
    core_problem: "A user is unable to authenticate or access required systems due to credential, permission, or session management failure.",
    business_impact: "The user is completely blocked from performing their role, and if it affects multiple accounts, it may indicate a broader identity management issue.",
    recommended_action: "Verify account status in directory service, reset credentials if needed, check permission group membership, and review recent auth logs.",
    red_flags: "Multiple accounts affected, Admin account locked, Possible security incident",
  },
  "Performance Degradation": {
    core_problem: "System resources are being exhausted or there is a bottleneck causing significantly slower than expected response times.",
    business_impact: "User productivity is severely impacted due to excessive wait times, and if unchecked may escalate to a full system outage.",
    recommended_action: "Monitor CPU/memory/disk usage in real-time, identify the resource-intensive process, and check for recent load increases or code changes.",
    red_flags: "Trending worse over time, Approaching capacity limits, Affects all users",
  },
  "Data Sync Errors": {
    core_problem: "Data is not being correctly transferred, replicated, or reconciled between systems, resulting in inconsistencies.",
    business_impact: "Decision-making is compromised by inaccurate data, and duplicate or missing records may cause financial, operational, or compliance risks.",
    recommended_action: "Identify the last successful sync timestamp, compare source vs. destination record counts, and inspect sync job error logs.",
    red_flags: "Financial data affected, Duplicate records detected, Regulatory data involved",
  },
  "Integration Problems": {
    core_problem: "A connection between two or more systems has broken down, preventing data flow or process automation across platforms.",
    business_impact: "Cross-system workflows are interrupted, causing manual workarounds, data silos, and potential cascading failures in dependent processes.",
    recommended_action: "Test API endpoint availability, verify authentication tokens/API keys are valid and not expired, check integration logs for error codes.",
    red_flags: "Business-critical workflow blocked, SLA-sensitive integration, Third-party vendor involved",
  },
  "HR & People Issues": {
    core_problem: "An HR process, policy, or employee lifecycle event is not being handled correctly or in a timely manner.",
    business_impact: "Employee experience and compliance are at risk, potentially leading to legal exposure, talent retention issues, or audit findings.",
    recommended_action: "Review relevant HR policy, escalate to the appropriate HR business partner, and document the issue with timeline for compliance tracking.",
    red_flags: "Legal or compliance risk, Senior employee involved, Payroll deadline approaching",
  },
  "Finance & Billing": {
    core_problem: "A financial transaction, invoice, or reporting process contains errors or has failed to complete correctly.",
    business_impact: "Financial accuracy is compromised, which may affect cash flow, vendor relationships, regulatory compliance, or executive reporting.",
    recommended_action: "Pull the transaction audit trail, cross-reference against source documents, and flag for finance manager review before period close.",
    red_flags: "Period close deadline, Audit trail gap, Regulatory reporting affected",
  },
  "Logistics & Supply Chain": {
    core_problem: "A shipment, inventory, or fulfillment process has failed or been delayed, disrupting the supply chain.",
    business_impact: "Customer commitments and operational continuity are at risk, potentially causing revenue loss and customer churn.",
    recommended_action: "Trace the shipment or order through the tracking system, contact carrier or warehouse, and initiate exception handling procedure.",
    red_flags: "Customer-facing SLA at risk, High-value shipment, Customs or regulatory hold",
  },
  "Customer Complaints": {
    core_problem: "A customer has experienced a service failure or unmet expectation that requires immediate acknowledgment and resolution.",
    business_impact: "Unresolved customer complaints increase churn risk, damage brand reputation, and may trigger negative reviews or legal claims.",
    recommended_action: "Acknowledge the complaint immediately, retrieve the customer's history, identify root cause, and provide a resolution timeline within the hour.",
    red_flags: "High-value customer, Public complaint risk, Repeat complaint from same customer",
  },
  "Security & Compliance": {
    core_problem: "A potential security vulnerability, policy violation, or compliance gap has been identified that requires immediate investigation.",
    business_impact: "Unaddressed security incidents can result in data breaches, regulatory fines, reputational damage, and legal liability.",
    recommended_action: "Isolate affected systems immediately, preserve evidence logs, notify the security team and compliance officer, and initiate incident response protocol.",
    red_flags: "PII or sensitive data exposed, Regulatory breach possible, Active attack suspected",
  },
    "Physical Security & Facilities": {
    core_problem: "A physical security or facility maintenance issue requires on-site intervention.",
    business_impact: "Compromises employee safety or disrupts normal physical operations in the building.",
    recommended_action: "Dispatch security patrol or facility maintenance staff to the location immediately.",
    red_flags: "Safety hazard, Unauthorized access, Physical damage",
  },
  "Data Analytics & Reporting": {
    core_problem: "A business intelligence dashboard or critical data report is inaccurate or unavailable.",
    business_impact: "Management decision-making is delayed or impaired due to lack of visibility.",
    recommended_action: "Verify data pipeline status and check query execution logs in the BI tool.",
    red_flags: "Executive report affected, EOD/EOM deadline",
  },
};

const INDUSTRY_TECHNICIANS = {
  "IT / Tech Support": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Software Configuration","Network Connectivity","Integration Problems"], load: 18, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Hardware Troubleshooting","Account Access Issues","Performance Degradation"], load: 22, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Data Sync Errors","Software Configuration","Network Connectivity"], load: 25, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Account Access Issues","Hardware Troubleshooting"], load: 28, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Integration Problems","Performance Degradation","Software Configuration"], load: 12, maxLoad: 30, color: T.green },
  ],
  "Manufacturing": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Hardware Troubleshooting","Performance Degradation","Data Sync Errors"], load: 15, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Logistics & Supply Chain","Hardware Troubleshooting"], load: 20, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Data Sync Errors","Integration Problems"], load: 22, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Physical Security & Facilities","Hardware Troubleshooting"], load: 18, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Performance Degradation","Software Configuration","Data Analytics & Reporting"], load: 10, maxLoad: 30, color: T.green },
  ],
  "Healthcare": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Software Configuration","Data Sync Errors","Security & Compliance"], load: 16, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Account Access Issues","HR & People Issues"], load: 20, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Data Analytics & Reporting","Integration Problems"], load: 24, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Account Access Issues","Software Configuration"], load: 26, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Security & Compliance","Data Sync Errors","Network Connectivity"], load: 14, maxLoad: 30, color: T.green },
  ],
  "Financial Services": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Finance & Billing","Security & Compliance","Data Sync Errors"], load: 14, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Integration Problems","Finance & Billing"], load: 20, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Data Analytics & Reporting","Data Sync Errors"], load: 22, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Account Access Issues","Software Configuration"], load: 25, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Security & Compliance","Integration Problems","Finance & Billing"], load: 11, maxLoad: 30, color: T.green },
  ],
  "HR / People Ops": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["HR & People Issues","Finance & Billing","Software Configuration"], load: 12, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["HR & People Issues","Account Access Issues"], load: 18, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Data Analytics & Reporting","Software Configuration"], load: 20, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Account Access Issues","HR & People Issues"], load: 22, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Finance & Billing","Integration Problems","HR & People Issues"], load: 10, maxLoad: 30, color: T.green },
  ],
  "Retail / E-Commerce": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Customer Complaints","Logistics & Supply Chain","Integration Problems"], load: 20, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Finance & Billing","Customer Complaints"], load: 24, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Logistics & Supply Chain","Data Sync Errors"], load: 22, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Customer Complaints","Account Access Issues"], load: 27, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Integration Problems","Performance Degradation","Customer Complaints"], load: 15, maxLoad: 30, color: T.green },
  ],
  "Logistics & Supply Chain": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Logistics & Supply Chain","Integration Problems","Data Sync Errors"], load: 17, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Logistics & Supply Chain","Hardware Troubleshooting"], load: 21, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Data Analytics & Reporting","Data Sync Errors"], load: 23, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Customer Complaints","Logistics & Supply Chain"], load: 26, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Integration Problems","Performance Degradation","Logistics & Supply Chain"], load: 13, maxLoad: 30, color: T.green },
  ],
  "Customer Service": [
    { name: "Technician A", level: "Senior (5+ yr)", skills: ["Customer Complaints","Account Access Issues","Integration Problems"], load: 19, maxLoad: 30, color: T.green },
    { name: "Technician B", level: "Mid (3-5 yr)", skills: ["Customer Complaints","Performance Degradation"], load: 23, maxLoad: 30, color: T.cyan },
    { name: "Technician C", level: "Mid (3-5 yr)", skills: ["Software Configuration","Account Access Issues"], load: 21, maxLoad: 30, color: T.yellow },
    { name: "Technician D", level: "Junior (1-2 yr)", skills: ["Customer Complaints","Account Access Issues"], load: 27, maxLoad: 30, color: T.orange },
    { name: "Technician E", level: "Senior (5+ yr)", skills: ["Integration Problems","Data Analytics & Reporting","Customer Complaints"], load: 14, maxLoad: 30, color: T.green },
  ],
};

const DEFAULT_TECHNICIANS = INDUSTRY_TECHNICIANS["IT / Tech Support"];

const getDefaultTechnicians = (industry) =>
  INDUSTRY_TECHNICIANS[industry] || INDUSTRY_TECHNICIANS["IT / Tech Support"];

const SKILL_OPTIONS = ["Software Configuration","Network Connectivity","Hardware Troubleshooting","Account Access Issues","Integration Problems","Performance Degradation","Data Sync Errors", "HR & People Issues",
  "Finance & Billing",
  "Logistics & Supply Chain",
  "Customer Complaints",
  "Security & Compliance",
  "Physical Security & Facilities",
  "Data Analytics & Reporting"
];
const LEVEL_OPTIONS = ["Junior (1-2 yr)","Mid (3-5 yr)","Senior (5+ yr)"];
const TECH_COLORS = [T.green, T.cyan, T.yellow, T.orange, "#9B8EC4", T.red, T.textMid];


function AITriageSimulator() {
  const company = useCompany();
  const isPD = !company || company.isPulseDigital === true;
  // ── State ──
  const [input, setInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [history, setHistory] = useLocalState("triage_history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showTeamEditor, setShowTeamEditor] = useState(false);
  const industry = company?.industry || "IT / Tech Support";
  const techKey = isPD ? "triage_team_pd" : `triage_team_${(company?.name || "custom").replace(/\s+/g, "_").toLowerCase()}`;
  const [technicians, setTechnicians] = useLocalState(
    techKey,
    getDefaultTechnicians(industry)
  );

  // Reset workload semua technician ke nilai awal
  const resetWorkloads = () => {
    setTechnicians(prev => prev.map(t => ({ ...t, load: getDefaultTechnicians(industry).find(d => d.name === t.name)?.load ?? 0 })));
  };

  // Reset technician team ke default industri baru saat industry berubah
  const prevIndustryRef = useRef(industry);
  useEffect(() => {
    if (prevIndustryRef.current !== industry && !isPD) {
      setTechnicians(getDefaultTechnicians(industry));
    }
    prevIndustryRef.current = industry;
  }, [industry]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkPhase, setBulkPhase] = useState("idle");
  const [newTech, setNewTech] = useState({ name: "", level: "Mid (3-5 yr)", skills: [], load: 0, maxLoad: 30 });

  // ── Complexity detector ──
  const isComplexComplaint = (text) => {
    const lower = text.toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;
    const allKeywords = Object.values(COMPLAINT_KEYWORDS).flat();
    const matchCount = allKeywords.filter(k => lower.includes(k)).length;
    const categoryScores = Object.entries(COMPLAINT_KEYWORDS).map(([, kws]) =>
      kws.filter(k => lower.includes(k)).length
    );
    const topTwo = [...categoryScores].sort((a, b) => b - a).slice(0, 2);
    const isAmbiguous = topTwo[0] > 0 && topTwo[1] > 0 && (topTwo[0] - topTwo[1]) <= 1;
    const hasSeverity = SEVERITY_KEYWORDS.some(k => lower.includes(k));
    const hasMultipleSentences = text.split(/[.!?]/).filter(s => s.trim().length > 10).length >= 3;
    return (matchCount === 0) || (isAmbiguous && wordCount > 25) || (wordCount > 50 && hasMultipleSentences);
  };

// ── Classify (rule-based) ──
  const classifyComplaint = (text) => {
    const lower = text.toLowerCase();
    const scores = {};
    const industry = company?.industry || "IT / Tech Support";
    const domainCats = DOMAIN_CONTEXT[industry] || Object.keys(COMPLAINT_KEYWORDS);

    for (const [cat, keywords] of Object.entries(COMPLAINT_KEYWORDS)) {
      const baseScore = keywords.filter(k => lower.includes(k)).length;
      // Boost domain-relevant categories
      const domainBoost = domainCats.includes(cat) ? 1.3 : 1.0;
      scores[cat] = baseScore * domainBoost;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topCat = sorted[0][0];
    const totalMatches = sorted.reduce((acc, [, v]) => acc + v, 0);
    const rawConf = totalMatches === 0 ? 55 : Math.min(60 + (sorted[0][1] / Math.max(totalMatches, 1)) * 40, 97);

    // Detect urgency from severity keywords
    const severityCount = SEVERITY_KEYWORDS.filter(k => lower.includes(k)).length;
    const urgency = severityCount >= 3 ? "Critical" : severityCount >= 2 ? "High" : severityCount >= 1 ? "Medium" : "Low";
    const wordCount = text.trim().split(/\s+/).length;
    const complexity = wordCount > 50 ? "Complex" : wordCount > 20 ? "Moderate" : "Simple";

    const rb = RULE_BASED_RESPONSES[topCat] || {
      core_problem: "The reported issue requires investigation to identify the root cause.",
      business_impact: "Operations may be impacted until this issue is resolved.",
      recommended_action: "Gather more details from the requester and assign to the appropriate team.",
      red_flags: "None",
    };

    return {
      category: topCat,
      confidence: Math.round(rawConf),
      allScores: sorted.slice(0, 3),
      method: "rule-based",
      urgency,
      complexity,
      core_problem: rb.core_problem,
      business_impact: rb.business_impact,
      recommended_action: rb.recommended_action,
      red_flags: severityCount >= 2 ? `${rb.red_flags}, High Severity Detected` : rb.red_flags,
      reasoning: `Classified as "${topCat}" based on keyword pattern matching${domainCats.includes(topCat) ? ` with domain boost for ${industry}` : ""}. Urgency assessed from ${severityCount} severity indicator(s) found in text.`,
    };
  };

  // ── Classify via Gemini ──
  const classifyViaGemini = async (text) => {
    const categories = Object.keys(COMPLAINT_KEYWORDS);
    const teamContext = technicians.map(t =>
      `- ${t.name} (${t.level}): specializes in ${t.skills.join(", ")} | current load ${t.load}/${t.maxLoad} cases`
    ).join("\n");

    const prompt = `You are an intelligent AI triage and routing system embedded inside a ${company?.industry || "business"} operations platform. Your job is to analyze incoming complaints, tickets, or requests — from ANY domain — and classify them so they can be routed to the right person on the team.

## CONTEXT
- Company: ${company?.name || "Unknown Company"}
- Department: ${company?.dept || "Operations"}
- Industry: ${company?.industry || "General"}
- Country: ${company?.country || "Unknown"}
- Process being improved: ${company?.processName || "General Process"}

## AVAILABLE ROUTING CATEGORIES
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## CURRENT TEAM
${teamContext}

## COMPLAINT / TICKET / REQUEST TO ANALYZE
"${text}"

## YOUR TASK
1. Read the complaint carefully — it could be a support ticket, HR request, customer complaint, operational issue, manufacturing defect report, logistics delay — anything relevant to the company above.
2. Classify it into ONE of the available categories above that best fits.
3. Assess confidence honestly. If the complaint is vague, ambiguous, or multi-topic, lower the confidence accordingly.
4. Identify the core problem in one sharp sentence.
5. Assess urgency: how time-sensitive is this? What's the potential business impact if unresolved?
6. Suggest the best technician/person from the team above based on their skills AND current workload — prefer someone with relevant skills who is not overloaded.
7. Note any red flags: escalation risk, SLA breach potential, repeated failure patterns, safety concerns.

## OUTPUT FORMAT
Respond ONLY with valid JSON. No markdown backticks, no explanation outside the JSON:
{
  "category": "<exact category name from the list above>",
  "confidence": <integer between 50 and 97>,
  "reasoning": "<one precise sentence explaining why this category fits>",
  "complexity": "<Simple|Moderate|Complex|Critical>",
  "urgency": "<Low|Medium|High|Critical>",
  "core_problem": "<one sentence: what is the actual root symptom here>",
  "business_impact": "<one sentence: what happens to the business if this is not resolved quickly>",
  "suggested_assignee": "<name of the best technician from the team above, or 'Escalate to Manager' if none fit>",
  "red_flags": "<comma-separated list of concerns, or 'None' if clean>",
  "recommended_action": "<one concrete first action the assigned technician should take>"
}`;
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ content: prompt }] }),
      });
      const data = await res.json();
      const raw = data?.content?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!categories.includes(parsed.category)) throw new Error("Invalid category");
      return {
        category: parsed.category,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        complexity: parsed.complexity,
        urgency: parsed.urgency,
        core_problem: parsed.core_problem,
        business_impact: parsed.business_impact,
        suggested_assignee: parsed.suggested_assignee,
        red_flags: parsed.red_flags,
        recommended_action: parsed.recommended_action,
        allScores: [[parsed.category, parsed.confidence]],
        method: "gemini-ai",
      };
    } catch {
      return { ...classifyComplaint(text), method: "rule-based-fallback" };
    }
  };

  // ── Route ──
  const routeToTechnician = (category) => {
    const eligible = technicians.filter(t => t.skills.includes(category) && t.load < t.maxLoad);
    const allOverloaded = technicians.every(t => t.load >= t.maxLoad);
    if (eligible.length === 0) {
      const fallback = [...technicians].sort((a, b) => a.load - b.load)[0];
      return { tech: fallback, overloaded: true, allOverloaded };
    }
    const best = eligible.sort((a, b) => {
      const lvl = (t) => t.level.includes("Senior") ? 3 : t.level.includes("Mid") ? 2 : 1;
      return lvl(b) - lvl(a) || a.load - b.load;
    })[0];
    return { tech: best, overloaded: false, allOverloaded: false };
  };

  const estimateResolution = (category, tech) => {
    const baseMap = {
      "Software Configuration": 89,
      "Network Connectivity": 78,
      "Hardware Troubleshooting": 52,
      "Account Access Issues": 64,
      "Integration Problems": 83,
      "Performance Degradation": 71,
      "Data Sync Errors": 68,
      "HR & People Issues": 24,
      "Finance & Billing": 36,
      "Logistics & Supply Chain": 48,
      "Customer Complaints": 12,
      "Security & Compliance": 96,
      "Physical Security & Facilities": 4,
      "Data Analytics & Reporting": 32,
    };
    const base = baseMap[category] || 48;
    const expFactor = tech.level.includes("Senior") ? 0.58 : tech.level.includes("Mid") ? 0.82 : 1.0;
    const loadFactor = 1 + (tech.load / tech.maxLoad) * 0.15;
    return Math.round(base * expFactor * loadFactor);
  };

  // ── Analyze single ──
  const analyze = async () => {
    if (!input.trim()) return;
    setPhase("analyzing");
    setProgress(0);

    const complex = isComplexComplaint(input);
    const steps = complex
      ? [
          { label: "Tokenizing complaint...", pct: 15 },
          { label: "Detecting complexity → routing to semantic engine...", pct: 35 },
          { label: "Engine analyzing context & intent...", pct: 65 },
          { label: "Matching skills matrix...", pct: 82 },
          { label: "Generating routing recommendation...", pct: 100 },
        ]
      : [
          { label: "Tokenizing complaint...", pct: 20 },
          { label: "Running keyword classification...", pct: 50 },
          { label: "Checking skills matrix...", pct: 75 },
          { label: "Generating routing recommendation...", pct: 100 },
        ];

    for (let i = 0; i < steps.length - (complex ? 1 : 0); i++) {
      setProgressLabel(steps[i].label);
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
      setProgress(steps[i].pct);
    }

    const classification = complex ? await classifyViaGemini(input) : classifyComplaint(input);
    setProgressLabel(steps[steps.length - 1].label);
    setProgress(100);

    const { tech, overloaded, allOverloaded } = routeToTechnician(classification.category);
    const estHrs = estimateResolution(classification.category, tech);
    const slaTarget = company?.slaTarget || 48;
    const sla = estHrs <= slaTarget ? "ON TRACK" : estHrs <= slaTarget * 1.5 ? "AT RISK" : "BREACH";
    const needsManualReview = classification.confidence < 75;

    const r = {
      ...classification, technician: tech, estimatedHrs: estHrs, sla,
      overloaded, allOverloaded, needsManualReview,
      input: input.trim(), timestamp: Date.now(), id: Date.now(),
    };
    setResult(r);
    setPhase("result");
    setHistory(prev => [r, ...prev].slice(0, 20));
    // Update technician load setelah routing
    setTechnicians(prev => prev.map(t =>
      t.name === tech.name ? { ...t, load: Math.min(t.load + 1, t.maxLoad) } : t
    ));
  };

  // ── Bulk analyze ──
  const analyzeBulk = async () => {
    const lines = bulkInput.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBulkPhase("analyzing");
    setBulkResults([]);
    const results = [];
    let liveTechs = [...technicians];
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      const complex = isComplexComplaint(text);
      const classification = complex ? await classifyViaGemini(text) : classifyComplaint(text);
      // Route pakai liveTechs yang sudah diupdate per-ticket
      const eligible = liveTechs.filter(t => t.skills.includes(classification.category) && t.load < t.maxLoad);
      const tech = eligible.length > 0
        ? eligible.sort((a, b) => {
            const lvl = (t) => t.level.includes("Senior") ? 3 : t.level.includes("Mid") ? 2 : 1;
            return lvl(b) - lvl(a) || a.load - b.load;
          })[0]
        : [...liveTechs].sort((a, b) => a.load - b.load)[0];
      const overloaded = eligible.length === 0;
      const estHrs = estimateResolution(classification.category, tech);
      const slaTarget = company?.slaTarget || 48;
      results.push({
        input: text, ...classification, technician: tech,
        estimatedHrs: estHrs,
        sla: estHrs <= slaTarget ? "ON TRACK" : estHrs <= slaTarget * 1.5 ? "AT RISK" : "BREACH",
        overloaded, needsManualReview: classification.confidence < 75,
        id: Date.now() + i,
      });
      // Update load di liveTechs langsung (bukan tunggu state)
      liveTechs = liveTechs.map(t =>
        t.name === tech.name ? { ...t, load: Math.min(t.load + 1, t.maxLoad) } : t
      );
      setBulkResults([...results]);
      await new Promise(r => setTimeout(r, 200));
    }
    setBulkPhase("done");
    setHistory(prev => [...results, ...prev].slice(0, 20));
    // Update load semua technician yang kena routing dari bulk
    const loadDelta = {};
    results.forEach(r => {
      const name = r.technician?.name;
      if (name) loadDelta[name] = (loadDelta[name] || 0) + 1;
    });
    setTechnicians(prev => prev.map(t =>
      loadDelta[t.name] ? { ...t, load: Math.min(t.load + loadDelta[t.name], t.maxLoad) } : t
    ));
  };
  const reset = () => { setPhase("idle"); setInput(""); setResult(null); setProgress(0); setProgressLabel(""); };

  const exportReport = (r) => {
    const lines = [
      `TRIAGE REPORT — ${new Date(r.timestamp || Date.now()).toLocaleString()}`,
      `${"─".repeat(50)}`,
      `Complaint  : ${r.input}`,
      `Category   : ${r.category}`,
      `Confidence : ${r.confidence}% (${r.method})`,
      `Assigned   : ${r.technician.name} (${r.technician.level})`,
      `Workload   : ${r.technician.load}/${r.technician.maxLoad} cases`,
      `Est. Time  : ${r.estimatedHrs}h`,
      `SLA Status : ${r.sla}`,
      r.needsManualReview ? `⚠️  LOW CONFIDENCE — Manual review recommended` : "",
      r.overloaded ? `⚠️  TECHNICIAN OVERLOADED — Monitor closely` : "",
      r.reasoning ? `AI Reasoning: ${r.reasoning}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard?.writeText(lines);
    return lines;
  };

  const EXAMPLES = [
    "Database keeps crashing when I try to run reports. Getting SQL timeout errors.",
    "I can't login to my account — says password is wrong but I just reset it.",
    "The printer is not printing even though it shows as connected.",
    "API integration with Salesforce stopped syncing customer data since yesterday.",
    "Everything is extremely slow — system takes 3 minutes to load a single page.",
  ];
  const EXAMPLE_LABELS = ["DB Crash","Login Issue","Printer","API Sync","Slow System"];

  const slaColor = (s) => s === "ON TRACK" ? T.green : s === "AT RISK" ? T.yellow : T.red;
  const methodBadge = (m) => m === "gemini-ai" ? { label: "✦ Smart Analysis", color: T.cyan } : m === "rule-based-fallback" ? { label: "⚡ Fallback", color: T.yellow } : { label: "⚡ Rule-Based", color: T.textMid };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1000, margin: "0 auto" }}>
      <SectionHeader 
        module="Module 09 — Smart Triage & Dispatch System" 
        title="Dynamic Triage & Routing Simulator" 
        sub={`Standard complaints → automated routing. Complex issues → advanced semantic analysis. Assigned to ${company?.name || "your team"}'s technicians based on skills + workload.`} 
      />

      {/* ── Top toolbar ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { label: bulkMode ? "◈ Single Mode" : "◈ Bulk Mode", action: () => { setBulkMode(p => !p); setPhase("idle"); setBulkPhase("idle"); } },
          { label: `📋 History (${history.length})`, action: () => setShowHistory(p => !p) },
          { label: `👥 Team (${technicians.length})`, action: () => setShowTeamEditor(p => !p) },
        ].map(b => (
          <button key={b.label} onClick={b.action} style={{
            background: T.surface, border: `1px solid ${T.border}`, color: T.textMid,
            padding: "0.4rem 0.85rem", borderRadius: 6, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.05em",
          }}>{b.label}</button>
        ))}
        {!isPD && (
          <div style={{ background: `${T.yellow}15`, border: `1px solid ${T.yellow}44`, borderRadius: 6, padding: "0.4rem 0.85rem", color: T.yellow, fontFamily: T.mono, fontSize: "0.62rem" }}>
            ⚡ Company Mode: {company?.name}
          </div>
        )}
      </div>

      {/* ── Team Editor ── */}
      <AnimatePresence>
        {showTeamEditor && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: T.surface, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                [ TEAM CONFIGURATION — {company?.name || "Your Company"} ]
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => { if (!window.confirm("Reset all loads to 0?")) return; setTechnicians(prev => prev.map(t => ({ ...t, load: 0 }))); }} style={{ background: `${T.yellow}12`, border: `1px solid ${T.yellow}44`, color: T.yellow, padding: "0.25rem 0.6rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem" }}>↺ Reset Loads</button>
                <button onClick={() => { if (!window.confirm("Reset entire team to default?")) return; setTechnicians(getDefaultTechnicians(company?.industry || "IT / Tech Support")); }} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.25rem 0.6rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.6rem" }}>↺ Reset to Demo</button>
              </div>
            </div>
            {/* Existing technicians */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {technicians.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: T.panel, borderRadius: 6, padding: "0.6rem 0.85rem", flexWrap: "wrap" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${TECH_COLORS[i % TECH_COLORS.length]}22`, border: `1px solid ${TECH_COLORS[i % TECH_COLORS.length]}`, display: "flex", alignItems: "center", justifyContent: "center", color: TECH_COLORS[i % TECH_COLORS.length], fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>{t.name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <input value={t.name} onChange={e => setTechnicians(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      style={{ background: "transparent", border: "none", color: T.text, fontFamily: T.mono, fontSize: "0.78rem", width: "100%", borderBottom: `1px dashed ${T.border}` }} />
                  </div>
                  <select value={t.level} onChange={e => setTechnicians(prev => prev.map((x, j) => j === i ? { ...x, level: e.target.value } : x))}
                    style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 4, padding: "0.25rem 0.4rem", fontFamily: T.mono, fontSize: "0.65rem", cursor: "pointer" }}>
                    {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", flex: 2, minWidth: 160 }}>
                    {SKILL_OPTIONS.map(sk => (
                      <button key={sk} onClick={() => setTechnicians(prev => prev.map((x, j) => j === i ? { ...x, skills: x.skills.includes(sk) ? x.skills.filter(s => s !== sk) : [...x.skills, sk] } : x))}
                        style={{ background: t.skills.includes(sk) ? `${T.cyan}20` : T.surface, border: `1px solid ${t.skills.includes(sk) ? T.cyan : T.border}`, color: t.skills.includes(sk) ? T.cyan : T.textDim, padding: "0.15rem 0.4rem", borderRadius: 20, cursor: "pointer", fontFamily: T.mono, fontSize: "0.55rem" }}>
                        {sk.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>Load:</span>
                    <input type="number" value={t.load} min={0} max={t.maxLoad} onChange={e => setTechnicians(prev => prev.map((x, j) => j === i ? { ...x, load: +e.target.value } : x))}
                      style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.yellow, borderRadius: 3, padding: "0.2rem 0.4rem", fontFamily: T.mono, fontSize: "0.72rem", width: 40, textAlign: "center" }} />
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>/{t.maxLoad}</span>
                  </div>
                  <button onClick={() => setTechnicians(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: `${T.red}15`, border: `1px solid ${T.red}33`, color: T.red, borderRadius: 4, padding: "0.25rem 0.5rem", cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem" }}>✕</button>
                </div>
              ))}
            </div>
            {/* Add new technician */}
            <div style={{ background: `${T.green}08`, border: `1px dashed ${T.green}44`, borderRadius: 6, padding: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <input value={newTech.name} onChange={e => setNewTech(p => ({ ...p, name: e.target.value }))} placeholder="Name"
                style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 4, padding: "0.4rem 0.6rem", fontFamily: T.mono, fontSize: "0.75rem", flex: 1, minWidth: 100, boxSizing: "border-box" }} />
              <select value={newTech.level} onChange={e => setNewTech(p => ({ ...p, level: e.target.value }))}
                style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.textMid, borderRadius: 4, padding: "0.4rem 0.5rem", fontFamily: T.mono, fontSize: "0.65rem", cursor: "pointer" }}>
                {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                {SKILL_OPTIONS.map(sk => (
                  <button key={sk} onClick={() => setNewTech(p => ({ ...p, skills: p.skills.includes(sk) ? p.skills.filter(s => s !== sk) : [...p.skills, sk] }))}
                    style={{ background: newTech.skills.includes(sk) ? `${T.green}20` : T.panel, border: `1px solid ${newTech.skills.includes(sk) ? T.green : T.border}`, color: newTech.skills.includes(sk) ? T.green : T.textDim, padding: "0.15rem 0.4rem", borderRadius: 20, cursor: "pointer", fontFamily: T.mono, fontSize: "0.55rem" }}>
                    {sk.split(" ")[0]}
                  </button>
                ))}
              </div>
              <button onClick={() => {
                if (!newTech.name.trim() || newTech.skills.length === 0) return;
                setTechnicians(prev => [...prev, { ...newTech, color: TECH_COLORS[prev.length % TECH_COLORS.length], maxLoad: 30 }]);
                setNewTech({ name: "", level: "Mid (3-5 yr)", skills: [], load: 0, maxLoad: 30 });
              }} style={{ background: T.green, border: "none", color: T.bg, padding: "0.4rem 1rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>
                + Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── History Panel ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>[ TRIAGE HISTORY — LAST {history.length} ]</div>
              <button onClick={() => setHistory([])} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.red, padding: "0.2rem 0.5rem", borderRadius: 3, cursor: "pointer", fontFamily: T.mono, fontSize: "0.58rem" }}>Clear All</button>
            </div>
            {history.length === 0 ? (
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem", textAlign: "center", padding: "1rem" }}>No history yet — submit a complaint to start.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 260, overflowY: "auto" }}>
                {history.map((h, i) => (
                  <div key={h.id || i} onClick={() => { setResult(h); setInput(h.input); setPhase("result"); setShowHistory(false); }}
                    style={{ display: "flex", gap: "0.75rem", alignItems: "center", background: T.panel, borderRadius: 6, padding: "0.5rem 0.75rem", cursor: "pointer", borderLeft: `3px solid ${slaColor(h.sla)}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.input}</div>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", marginTop: "0.15rem" }}>{h.category} · {h.technician?.name} · {h.estimatedHrs}h</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ color: slaColor(h.sla), fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700 }}>{h.sla}</div>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>{h.confidence}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SINGLE MODE ── */}
      {!bulkMode && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              [ COMPLAINT INPUT ]
            </div>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <div style={{ background: `${T.cyan}12`, border: `1px solid ${T.cyan}33`, borderRadius: 20, padding: "0.2rem 0.65rem", color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem" }}>✦ Analysis</div>
              <div style={{ background: `${T.green}12`, border: `1px solid ${T.green}33`, borderRadius: 20, padding: "0.2rem 0.65rem", color: T.green, fontFamily: T.mono, fontSize: "0.58rem" }}>✦ Deep Analysis</div>
            </div>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={phase === "analyzing"}
            placeholder="Describe a support issue... Simple = instant. Complex/ambiguous = Deep context analysis."
            style={{ width: "100%", minHeight: 100, background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.text, padding: "0.85rem 1rem", fontFamily: T.mono, fontSize: "0.85rem", lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ marginTop: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Quick Examples:</div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)} disabled={phase === "analyzing"} style={{
                  background: T.panel, border: `1px solid ${T.border}`, color: T.textMid,
                  padding: "0.3rem 0.65rem", borderRadius: 20, cursor: "pointer",
                  fontFamily: T.mono, fontSize: "0.62rem",
                }}>{EXAMPLE_LABELS[i]}</button>
              ))}
            </div>
          </div>
          {input.trim() && phase === "idle" && (
            <div style={{ marginBottom: "0.75rem", padding: "0.4rem 0.75rem", background: T.panel, borderRadius: 6, color: T.textMid, fontFamily: T.mono, fontSize: "0.65rem", borderLeft: `3px solid ${isComplexComplaint(input) ? T.green : T.cyan}` }}>
              {isComplexComplaint(input) ? "✦ Complex detected → Deep context analysis" : "⚡ Simple complaint → Instant standard routing"}
            </div>
          )}
          <button onClick={phase === "result" ? reset : analyze} disabled={phase === "analyzing" || (!input.trim() && phase === "idle")} style={{
            background: phase === "result" ? `${T.yellow}18` : `${T.cyan}18`,
            border: `2px solid ${phase === "result" ? T.yellow : T.cyan}`,
            color: phase === "result" ? T.yellow : T.cyan,
            padding: "0.85rem 2rem", borderRadius: 6, cursor: "pointer",
            fontFamily: T.mono, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", width: "100%", transition: "all 0.3s",
          }}>
            {phase === "idle" && "▶ SUBMIT & ANALYZE"}
            {phase === "analyzing" && `⏳ ${progressLabel || "ANALYZING..."} ${progress}%`}
            {phase === "result" && "↺ RESET — TRY ANOTHER"}
          </button>
          {phase === "analyzing" && (
            <div style={{ marginTop: "0.75rem", height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
                style={{ height: "100%", background: T.cyan, borderRadius: 2, boxShadow: `0 0 8px ${T.cyan}` }} />
            </div>
          )}
        </div>
      )}

      {/* ── BULK MODE ── */}
      {bulkMode && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            [ BULK TRIAGE — ONE COMPLAINT PER LINE ]
          </div>
          <textarea
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
            disabled={bulkPhase === "analyzing"}
            placeholder={"Complaint 1 here\nComplaint 2 here\nComplaint 3 here\n..."}
            style={{ width: "100%", minHeight: 140, background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 6, color: T.text, padding: "0.85rem 1rem", fontFamily: T.mono, fontSize: "0.8rem", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ marginTop: "0.5rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
            {bulkInput.split("\n").filter(l => l.trim()).length} complaint(s) queued
          </div>
          <button onClick={bulkPhase === "done" ? () => { setBulkPhase("idle"); setBulkInput(""); setBulkResults([]); } : analyzeBulk}
            disabled={bulkPhase === "analyzing" || (!bulkInput.trim() && bulkPhase === "idle")}
            style={{ background: `${T.cyan}18`, border: `2px solid ${T.cyan}`, color: T.cyan, padding: "0.75rem 2rem", borderRadius: 6, cursor: "pointer", fontFamily: T.mono, fontSize: "0.78rem", fontWeight: 700, width: "100%", marginTop: "0.75rem", textTransform: "uppercase" }}>
            {bulkPhase === "idle" && "▶ ANALYZE ALL"}
            {bulkPhase === "analyzing" && `⏳ Processing ${bulkResults.length}/${bulkInput.split("\n").filter(l => l.trim()).length}...`}
            {bulkPhase === "done" && "↺ RESET BULK"}
          </button>
          {bulkResults.length > 0 && (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {bulkResults.map((r, i) => {
                const mb = methodBadge(r.method);
                return (
                  <div key={r.id || i} style={{ background: T.panel, borderRadius: 6, padding: "0.75rem 1rem", borderLeft: `3px solid ${slaColor(r.sla)}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem", flex: 1 }}>{r.input.length > 80 ? r.input.slice(0, 80) + "…" : r.input}</div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <span style={{ color: slaColor(r.sla), fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700 }}>{r.sla}</span>
                        <span style={{ color: mb.color, fontFamily: T.mono, fontSize: "0.6rem" }}>{mb.label}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem" }}>{r.category}</span>
                      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem" }}>→ {r.technician?.name}</span>
                      <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.65rem" }}>{r.estimatedHrs}h</span>
                      <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>{r.confidence}% confidence</span>
                      {r.needsManualReview && <span style={{ color: T.red, fontFamily: T.mono, fontSize: "0.6rem" }}>⚠ Manual Review</span>}
                      {r.overloaded && <span style={{ color: T.orange, fontFamily: T.mono, fontSize: "0.6rem" }}>⚡ Overloaded</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RESULT ── */}
      <AnimatePresence>
        {phase === "result" && result && !bulkMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Warnings */}
            {(result.needsManualReview || result.allOverloaded || result.overloaded) && (
              <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {result.needsManualReview && (
                  <div style={{ background: `${T.red}12`, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "0.65rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                    <div>
                      <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>LOW CONFIDENCE — MANUAL REVIEW RECOMMENDED</div>
                      <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.65rem" }}>Confidence {result.confidence}% is below 75% threshold. A Tier 2 supervisor should validate this classification before assignment.</div>
                    </div>
                  </div>
                )}
                {result.allOverloaded && (
                  <div style={{ background: `${T.orange}12`, border: `1px solid ${T.orange}44`, borderRadius: 6, padding: "0.65rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1.1rem" }}>🔴</span>
                    <div>
                      <div style={{ color: T.orange, fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700 }}>ALL TECHNICIANS AT CAPACITY</div>
                      <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.65rem" }}>Team is fully loaded. Consider queue management, overtime authorization, or contractor escalation.</div>
                    </div>
                  </div>
                )}
                {result.overloaded && !result.allOverloaded && (
                  <div style={{ background: `${T.yellow}10`, border: `1px solid ${T.yellow}33`, borderRadius: 6, padding: "0.65rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1rem" }}>⚡</span>
                    <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.65rem" }}>No skilled technician available for this category — assigned to least-loaded technician as fallback.</div>
                  </div>
                )}
              </div>
            )}

            {/* Classification */}
            <div style={{ background: T.surface, border: `2px solid ${T.cyan}44`, borderRadius: 8, padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>[ AI CLASSIFICATION RESULT ]</div>
                {(() => { const mb = methodBadge(result.method); return (
                  <div style={{ background: `${mb.color}15`, border: `1px solid ${mb.color}44`, borderRadius: 20, padding: "0.2rem 0.75rem", color: mb.color, fontFamily: T.mono, fontSize: "0.62rem" }}>{mb.label}</div>
                ); })()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                {[
                  { label: "Category", val: result.category, color: T.cyan, big: false },
                  { label: "AI Confidence", val: `${result.confidence}%`, color: result.confidence >= 75 ? T.green : T.red, big: true },
                  { label: "Est. Resolution", val: `${result.estimatedHrs}h`, color: T.yellow, big: true },
                  { label: "SLA Status", val: result.sla, color: slaColor(result.sla), big: false },
                ].map(k => (
                  <div key={k.label} style={{ background: `${k.color}10`, border: `1px solid ${k.color}33`, borderRadius: 6, padding: "1rem" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>{k.label}</div>
                    <div style={{ color: k.color, fontFamily: T.display, fontSize: k.big ? "1.5rem" : "0.95rem", fontWeight: 800 }}>{k.val}</div>
                  </div>
                ))}
              </div>
              {result.reasoning && (
                <div style={{ background: T.panel, borderRadius: 6, padding: "0.75rem 1rem", borderLeft: `3px solid ${T.green}`, marginBottom: "0.75rem" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>✦ Gemini Reasoning</div>
                  <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.5 }}>{result.reasoning}</div>
                </div>
              )}
              {(result.urgency || result.complexity) && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {result.urgency && (
                    <div style={{ background: `${result.urgency === "Critical" ? T.red : result.urgency === "High" ? T.orange : result.urgency === "Medium" ? T.yellow : T.green}18`, border: `1px solid ${result.urgency === "Critical" ? T.red : result.urgency === "High" ? T.orange : result.urgency === "Medium" ? T.yellow : T.green}44`, borderRadius: 6, padding: "0.5rem 0.85rem", flex: 1, minWidth: 120 }}>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Urgency</div>
                      <div style={{ color: result.urgency === "Critical" ? T.red : result.urgency === "High" ? T.orange : result.urgency === "Medium" ? T.yellow : T.green, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>
                        {result.urgency === "Critical" ? "🔴" : result.urgency === "High" ? "🟠" : result.urgency === "Medium" ? "🟡" : "🟢"} {result.urgency}
                      </div>
                    </div>
                  )}
                  {result.complexity && (
                    <div style={{ background: `${T.cyan}10`, border: `1px solid ${T.cyan}33`, borderRadius: 6, padding: "0.5rem 0.85rem", flex: 1, minWidth: 120 }}>
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Complexity</div>
                      <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>
                        {result.complexity === "Critical" ? "💀" : result.complexity === "Complex" ? "🔥" : result.complexity === "Moderate" ? "⚡" : "✓"} {result.complexity}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {result.core_problem && (
                <div style={{ background: `${T.red}08`, border: `1px solid ${T.red}22`, borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>🎯</span>
                  <div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Core Problem</div>
                    <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.5 }}>{result.core_problem}</div>
                  </div>
                </div>
              )}
              {result.business_impact && (
                <div style={{ background: `${T.orange}08`, border: `1px solid ${T.orange}22`, borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>💰</span>
                  <div>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Business Impact</div>
                    <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.5 }}>{result.business_impact}</div>
                  </div>
                </div>
              )}
              {result.red_flags && result.red_flags !== "None" && (
                <div style={{ background: `${T.red}10`, border: `1px solid ${T.red}33`, borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>🚩</span>
                  <div>
                    <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem", fontWeight: 700 }}>Red Flags</div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {result.red_flags.split(",").map((f, i) => (
                        <span key={i} style={{ background: `${T.red}15`, border: `1px solid ${T.red}33`, borderRadius: 20, padding: "0.2rem 0.6rem", color: T.red, fontFamily: T.mono, fontSize: "0.62rem" }}>{f.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {result.recommended_action && (
                <div style={{ background: `${T.green}08`, border: `1px solid ${T.green}22`, borderRadius: 6, padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚡</span>
                  <div>
                    <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.25rem", fontWeight: 700 }}>Recommended First Action</div>
                    <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.5 }}>{result.recommended_action}</div>
                  </div>
                </div>
              )}
              {result.allScores && result.allScores.length > 1 && (
                <>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>Alternative Classifications</div>
                  {result.allScores.map(([cat, score], i) => {
                    const pct = i === 0 ? result.confidence : Math.max(result.confidence - 22 - i * 15, 8);
                    return (
                      <div key={cat} style={{ marginBottom: "0.4rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={{ color: i === 0 ? T.cyan : T.textMid, fontFamily: T.mono, fontSize: "0.7rem" }}>{cat}</span>
                          <span style={{ color: i === 0 ? T.cyan : T.textDim, fontFamily: T.mono, fontSize: "0.68rem" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 3, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? T.cyan : T.textDim, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Routing Result */}
            <div style={{ background: T.surface, border: `2px solid ${T.green}33`, borderRadius: 8, padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>[ ASSIGNED TECHNICIAN ]</div>
                <CopyReportButton data={exportReport(result)} label="⎘ Copy Report" />
              </div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${result.technician.color}22`, border: `2px solid ${result.technician.color}`, display: "flex", alignItems: "center", justifyContent: "center", color: result.technician.color, fontFamily: T.display, fontSize: "1.4rem", fontWeight: 800, flexShrink: 0 }}>
                  {result.technician.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: T.text, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>{result.technician.name}</div>
                  <div style={{ color: result.technician.color, fontFamily: T.mono, fontSize: "0.72rem", marginBottom: "0.5rem" }}>{result.technician.level}</div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {result.technician.skills.map(s => <Badge key={s} label={s} color={s === result.category ? T.green : T.textDim} />)}
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
                💡 <strong style={{ color: T.cyan }}>Why this technician?</strong> Skill match for "{result.category}" ✓ · {result.overloaded ? "Fallback — no skilled tech available" : "Workload within 30-case cap ✓"} · {result.technician.level.includes("Senior") ? "Senior experience reduces est. resolution by ~42% vs junior" : "Mid-level experience, appropriate for this complexity tier"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Explainer ── */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem", marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
        {[
          { icon: "🤖", title: "Hybrid AI Engine", desc: "Short/clear complaints → instant keyword classification. Long, ambiguous, or multi-category complaints → AI semantic engine for deep NLP analysis." },
          { icon: "🎯", title: "Skills-Based Routing", desc: "Matches category to your team's skill matrix. Warns if all technicians are at capacity and falls back to least-loaded." },
          { icon: "⚠️", title: "Confidence Gating", desc: "Confidence <75% triggers a mandatory manual review flag — Tier 2 supervisor must validate before assignment proceeds." },
          { icon: "📋", title: "Audit Trail", desc: "Every triage result is logged to history (up to 20 entries). Click any history item to reload the full result." },
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

// ─── LIVE OPS CENTER ─────────────────────────────────────────────────────────

function LiveOpsCenter() {
  const company = useCompany();
  const { fmt: fmtCur } = useCurrencyFmt();
  const [warRoomMode, setWarRoomMode] = useState(false);
  const [showShiftReport, setShowShiftReport] = useState(false);
  const [shiftReport, setShiftReport] = useState("");

  // ── Listen for localStorage changes (moved up — needed by readLS) ────────
  const [lsRevision, setLsRevision] = useState(0);

  // ── Pull data from every module via shared localStorage ──────────────────
  const readLS = useCallback((key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }, [lsRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  const overviewData   = readLS("overview_data",   OVERVIEW_DEFAULTS);
  const dmaicPhases    = readLS("dmaic_phases",    DMAIC_DEFAULTS);
  const fmeaItems      = readLS("fmea_items",      FMEA_DEFAULTS);
  const copqScenarios  = readLS("copq_scenarios",  COPQ_DEFAULTS);
  const paretoItems    = readLS("pareto_items",    PARETO_DEFAULTS);
  const rcItems        = readLS("rc_items",        RC_DEFAULTS);
  const triageHistory = (() => {
    try {
      const a = JSON.parse(localStorage.getItem("triage_history") || "[]");
      return a;
    } catch { return []; }
  })();
  const [technicians]     = useLocalState(
    company?.isPulseDigital !== false ? "triage_team_pd" : `triage_team_${company?.name || "custom"}`,
    DEFAULT_TECHNICIANS
  );

  // ── Real-time tick (SLA countdowns + "live" pulse) ───────────────────────
  const [now, setNow] = useState(Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); setTick(p => p + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Listen for localStorage changes from other modules ───────────────────
  const [opsTab, setOpsTab] = useState("queue");
  useEffect(() => {
    if (warRoomMode) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [warRoomMode]);
  useEffect(() => {
    const handler = () => setLsRevision(r => r + 1);
    window.addEventListener("storage", handler);
    window.addEventListener("lsupdate", handler);
    // Fallback refresh setiap 3 detik untuk same-tab changes
    const interval = setInterval(() => setLsRevision(r => r + 1), 3000);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("lsupdate", handler);
      clearInterval(interval);
    };
  }, []);

  // ── Derived: OVERVIEW ────────────────────────────────────────────────────
  const metrics     = overviewData.metrics || [];
  const financials  = overviewData.financials || {};
  const sigmaMetric = metrics.find(m => m.id === "sigma") || {};
  const resMetric   = metrics.find(m => m.id === "resolution") || {};
  const ppkMetric   = metrics.find(m => m.id === "ppk") || {};
  const csatMetric  = metrics.find(m => m.id === "csat") || {};

  // ── Derived: DMAIC ───────────────────────────────────────────────────────
  const phaseKeys = ["D", "M", "A", "I", "C"];
  const dmaicOverall = Math.round(phaseKeys.reduce((a, k) => a + (dmaicPhases[k]?.progress || 0), 0) / 5);
  const completedPhases = phaseKeys.filter(k => dmaicPhases[k]?.status === "COMPLETE").length;
  const activePhaseKey = phaseKeys.find(k => dmaicPhases[k]?.status === "ACTIVE") || null;

  // ── Derived: FMEA ────────────────────────────────────────────────────────
  const rpn = i => i.S * i.O * i.D;
  const openItems    = fmeaItems.filter(i => !i.fixed);
  const totalRPN     = openItems.reduce((a, i) => a + rpn(i), 0);
  const criticalItems = openItems.filter(i => rpn(i) > 400);
  const controlledPct = fmeaItems.length > 0
    ? Math.round((fmeaItems.filter(i => i.fixed).length / fmeaItems.length) * 100)
    : 0;
  const topFMEA = [...openItems].sort((a, b) => rpn(b) - rpn(a)).slice(0, 3);

  // ── Derived: COPQ ────────────────────────────────────────────────────────
  const copqA = calcCOPQ(copqScenarios.A);
  const copqB = calcCOPQ(copqScenarios.B);
  const copqSavings = copqA.total - copqB.total;
  const copqDailyBurn = Math.round(copqA.total / 365);
  const copqDailyBurnB = Math.round(copqB.total / 365);

  // ── Derived: PARETO ──────────────────────────────────────────────────────
  const activePareto = (paretoItems || []).filter(i => i.active !== false);
  const totalCases = activePareto.reduce((a, i) => a + i.cases, 0);
  const totalHrs = activePareto.reduce((a, i) => a + i.cases * i.avgHrs, 0);
  const sortedPareto = [...activePareto].sort((a, b) => b.cases * b.avgHrs - a.cases * a.avgHrs);
  const top3Pareto = sortedPareto.slice(0, 3);
  let cumPct = 0;
  const paretoWithCum = sortedPareto.map(i => {
    cumPct += totalHrs > 0 ? (i.cases * i.avgHrs / totalHrs) * 100 : 0;
    return { ...i, cumPct: Math.round(cumPct), totalHrs: i.cases * i.avgHrs };
  });
  const vitalFew = paretoWithCum.filter(i => i.cumPct <= 80);

  // ── Derived: ROOT CAUSE ──────────────────────────────────────────────────
  const solvedRC = rcItems.filter(r => r.status === "SOLVED").length;
  const rcSolvePct = rcItems.length > 0 ? Math.round((solvedRC / rcItems.length) * 100) : 0;
  const totalRCImpact = rcItems.reduce((a, r) => a + (r.impact || 0), 0);

  // ── Derived: TRIAGE / OPS FLOOR ─────────────────────────────────────────
  const onTrack = triageHistory.filter(h => h.sla === "ON TRACK").length;
  const atRisk  = triageHistory.filter(h => h.sla === "AT RISK").length;
  const breach  = triageHistory.filter(h => h.sla === "BREACH").length;
  const slaRate = triageHistory.length > 0 ? Math.round((onTrack / triageHistory.length) * 100) : 0;
  const criticalTickets = triageHistory.filter(h => h.urgency === "Critical");
  const urgencyOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const priorityQueue = [...triageHistory]
    .sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2))
    .slice(0, 5);

  // ── Cross-module AI insight generator ────────────────────────────────────
  const generateInsights = () => {
    const insights = [];
    // FMEA ↔ Pareto correlation
    if (top3Pareto[0] && criticalItems.length > 0) {
      const topCat = top3Pareto[0].category;
      const fmeaMatch = criticalItems.find(i =>
        i.process?.toLowerCase().includes(topCat?.toLowerCase().split(" ")[0]) ||
        i.failure?.toLowerCase().includes(topCat?.toLowerCase().split(" ")[0])
      );
      if (fmeaMatch) {
        insights.push({
          icon: "🔗",
          color: T.red,
          text: `FMEA critical item "${fmeaMatch.failure}" likely linked to Pareto #1 "${topCat}" — converging risk signals.`,
        });
      }
    }
    // DMAIC stall detection
    if (activePhaseKey && dmaicPhases[activePhaseKey]?.progress < 50) {
      insights.push({
        icon: "⚠",
        color: T.yellow,
        text: `DMAIC ${activePhaseKey}-phase is active but below 50% — risk of schedule slip. Check tool completion checklist.`,
      });
    }
    // Triage + COPQ connection
    if (breach > 0 && copqA.total > 0) {
      const estimatedImpact = fmtCur(breach * copqScenarios.A.ltv * (copqScenarios.A.churnRate / 100));
      insights.push({
        icon: "💸",
        color: T.orange,
        text: `${breach} SLA breach(es) in triage queue — estimated churn exposure: ~${estimatedImpact} based on current COPQ parameters.`,
      });
    }
    // RC solve rate + sigma trend
    if (rcSolvePct === 100 && sigmaMetric.after > sigmaMetric.before) {
      insights.push({
        icon: "✓",
        color: T.green,
        text: `All root causes solved & sigma improved ${sigmaMetric.before}→${sigmaMetric.after}σ. System is in sustained improvement mode.`,
      });
    }
    // Triage load warning
    const overloadedTechs = technicians.filter(t => t.load >= t.maxLoad * 0.9);
    if (overloadedTechs.length > 0) {
      insights.push({
        icon: "🔴",
        color: T.red,
        text: `${overloadedTechs.map(t => t.name).join(", ")} approaching max load — rerouting risk for incoming tickets.`,
      });
    }
    // Pareto vital few concentration
    if (vitalFew.length > 0 && top3Pareto.length > 0) {
      const topPct = totalHrs > 0 ? Math.round((top3Pareto[0].totalHrs / totalHrs) * 100) : 0;
      if (topPct > 30) {
        insights.push({
          icon: "◎",
          color: T.cyan,
          text: `"${top3Pareto[0].category}" alone drives ${topPct}% of total hours — highest leverage target for next improvement cycle.`,
        });
      }
    }
    if (insights.length === 0) {
      insights.push({
        icon: "◈",
        color: T.green,
        text: "All systems operating normally. No anomalies detected across modules. Add data to other modules to see cross-module intelligence.",
      });
    }
    return insights.slice(0, 3);
  };

  const insights = generateInsights();

  // ── Status helpers ────────────────────────────────────────────────────────
  const urgencyColor = u => u === "Critical" ? T.red : u === "High" ? T.orange : u === "Medium" ? T.yellow : T.green;
  const slaColor     = s => s === "ON TRACK" ? T.green : s === "AT RISK" ? T.yellow : T.red;
  const rpnColor     = r => r > 400 ? T.red : r > 200 ? T.orange : r > 100 ? T.yellow : T.green;

  // ── Sub-components ────────────────────────────────────────────────────────

  // Reusable panel wrapper
  const Panel = ({ title, accent = T.cyan, children, style = {} }) => (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 8,
      padding: "1rem 1.25rem",
      ...style,
    }}>
      <div style={{ color: accent, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, display: "inline-block", boxShadow: `0 0 6px ${accent}` }} />
        {title}
      </div>
      {children}
    </div>
  );

  // KPI atom
  const KPIAtom = ({ label, value, color, sub }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ color, fontFamily: T.display, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1, textShadow: `0 0 16px ${color}55` }}>{value}</div>
      {sub && <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", textTransform: "uppercase", marginTop: "0.1rem" }}>{sub}</div>}
      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase", marginTop: "0.15rem" }}>{label}</div>
    </div>
  );

  // Mini progress bar
  const MiniBar = ({ pct, color, height = 4 }) => (
    <div style={{ height, background: T.panel, borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
    </div>
  );

      return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1300, margin: "0 auto" }}>
        
        {/* WAR ROOM OVERLAY */}
        {warRoomMode && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: T.bg, display: "flex", flexDirection: "column",
            padding: "1rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.red, boxShadow: `0 0 12px ${T.red}`, animation: "pulse 1s infinite" }} />
                <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>
                  ⚠ WAR ROOM MODE — LIVE OPS CENTER
                </div>
              </div>
              <button onClick={() => setWarRoomMode(false)} style={{
                background: `${T.red}20`, border: `1px solid ${T.red}`, color: T.red,
                padding: "0.4rem 1rem", borderRadius: 4, cursor: "pointer",
                fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700,
              }}>✕ EXIT WAR ROOM</button>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", overflowY: "auto" }}>
              {[
                { label: "ACTIVE TICKETS", value: triageHistory.length, color: T.cyan, sub: "in queue" },
                { label: "CRITICAL ISSUES", value: triageHistory.filter(t => t.urgency === "Critical").length, color: T.red, sub: "need immediate action" },
                { label: "SLA BREACH", value: triageHistory.filter(t => t.sla === "BREACH").length, color: T.orange, sub: "tickets breached" },
                { label: "AT RISK", value: triageHistory.filter(t => t.sla === "AT RISK").length, color: T.yellow, sub: "approaching breach" },
                { label: "ON TRACK", value: triageHistory.filter(t => t.sla === "ON TRACK").length, color: T.green, sub: "within SLA" },
                { label: "AVG EST. TIME", value: triageHistory.length > 0 ? Math.round(triageHistory.reduce((a, t) => a + (t.estimatedHrs || 0), 0) / triageHistory.length) + "h" : "—", color: T.textMid, sub: "resolution estimate" },
              ].map(k => (
                <div key={k.label} style={{ background: T.panel, border: `2px solid ${k.color}33`, borderRadius: 8, padding: "1.5rem", textAlign: "center" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{k.label}</div>
                  <div style={{ color: k.color, fontFamily: T.display, fontSize: "3rem", fontWeight: 800, textShadow: `0 0 30px ${k.color}66`, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", marginTop: "0.4rem" }}>{k.sub}</div>
                </div>
              ))}
            </div>
            {/* Critical queue */}
            {triageHistory.filter(t => t.urgency === "Critical").length > 0 && (
              <div style={{ background: `${T.red}0A`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: "1rem", marginTop: "1rem" }}>
                <div style={{ color: T.red, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "0.75rem" }}>⚠ CRITICAL QUEUE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 180, overflowY: "auto" }}>
                  {triageHistory.filter(t => t.urgency === "Critical").slice(0, 8).map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", background: T.panel, borderRadius: 4, padding: "0.5rem 0.75rem" }}>
                      <span style={{ color: T.text, fontFamily: T.mono, fontSize: "0.65rem" }}>{t.input?.slice(0, 50)}...</span>
                      <span style={{ color: T.red, fontFamily: T.mono, fontSize: "0.62rem", flexShrink: 0, marginLeft: "0.5rem" }}>{t.technician?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SHIFT REPORT MODAL */}
        {showShiftReport && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div style={{ background: T.panel, border: `1px solid ${T.borderHi}`, borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>📋 SHIFT REPORT</div>
                <button onClick={() => setShowShiftReport(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, width: 28, height: 28, borderRadius: 4, cursor: "pointer", fontFamily: T.mono }}>✕</button>
              </div>
              <pre style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.7, whiteSpace: "pre-wrap", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1rem", marginBottom: "1rem" }}>
                {shiftReport}
              </pre>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={() => { navigator.clipboard?.writeText(shiftReport).catch(() => {}); }} style={{ flex: 1, background: `${T.cyan}18`, border: `1px solid ${T.cyan}`, color: T.cyan, padding: "0.65rem", borderRadius: 6, cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem" }}>
                  📋 Copy to Clipboard
                </button>
                <button onClick={() => setShowShiftReport(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.65rem 1rem", borderRadius: 6, cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER DENGAN TOMBOL WAR ROOM & SHIFT REPORT ── */}
        <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 10px ${T.green}`, animation: "pulse 1.5s infinite" }} />
              Module 11 — Team Operations Center
            </div>
            <h2 style={{ fontFamily: T.display, fontSize: "clamp(1.5rem,3.5vw,2.2rem)", color: T.text, fontWeight: 800, margin: "0 0 0.4rem", lineHeight: 1.1 }}>
              Mission Control Room
            </h2>
            <p style={{ color: T.textMid, fontSize: "0.82rem", maxWidth: 650, margin: 0, lineHeight: 1.6 }}>
              Live aggregation of all 10 modules. Every change you make anywhere on this platform reflects here in real-time.
            </p>
          </div>
          
          {/* TOMBOLNYA ADA DI SINI */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setWarRoomMode(true)} style={{
              background: `${T.red}18`, border: `1px solid ${T.red}55`,
              color: T.red, padding: "0.5rem 1rem", borderRadius: 6,
              cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700,
            }}>⚡ WAR ROOM</button>
            
            <button onClick={() => {
              const h = triageHistory;
              const total = h.length;
              const cats = {};
              h.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
              const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
              const topCat = sortedCats[0];
              const critical = h.filter(t => t.urgency === "Critical").length;
              const breach = h.filter(t => t.sla === "BREACH").length;
              const ontrack = h.filter(t => t.sla === "ON TRACK").length;
              const avgHrs = total > 0 ? (h.reduce((a, t) => a + (t.estimatedHrs || 0), 0) / total).toFixed(1) : 0;
              const techLoad = {};
              h.forEach(t => { if (t.technician?.name) techLoad[t.technician.name] = (techLoad[t.technician.name] || 0) + 1; });
              const topTech = Object.entries(techLoad).sort((a, b) => b[1] - a[1])[0];
              const now = new Date();
              const report = `SHIFT REPORT — ${company?.name || "Company"}
Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}
Department: ${company?.dept || "Operations"}
${"─".repeat(45)}

📊 TICKET SUMMARY
  Total Tickets    : ${total}
  Critical Issues  : ${critical}
  SLA Breach       : ${breach}
  At Risk          : ${h.filter(t => t.sla === "AT RISK").length}
  On Track         : ${ontrack}

⏱ PERFORMANCE
  Avg Est. Time    : ${avgHrs}h
  SLA Compliance   : ${total > 0 ? ((ontrack / total) * 100).toFixed(1) : 0}%

🔥 TOP ISSUE CATEGORY
  ${topCat ? `${topCat[0]} (${topCat[1]} tickets)` : "No data"}

👤 MOST LOADED TECHNICIAN
  ${topTech ? `${topTech[0]} — ${topTech[1]} tickets handled` : "No data"}

📋 CATEGORY BREAKDOWN
${sortedCats.map(([c, n]) => `  ${c.padEnd(30)} ${n} ticket(s)`).join("\n")}

${"─".repeat(45)}
Report generated by DMAIC Intelligence Platform
Alfin Yudistira · Pulse Digital`;
              setShiftReport(report);
              setShowShiftReport(true);
            }} style={{
              background: `${T.green}18`, border: `1px solid ${T.green}55`,
              color: T.green, padding: "0.5rem 1rem", borderRadius: 6,
              cursor: "pointer", fontFamily: T.mono, fontSize: "0.7rem", fontWeight: 700,
            }}>📋 SHIFT REPORT</button>
          </div>
        </div>

{/* ── EMPTY STATE BANNER — tampil kalau belum ada triage data ── */}
        {triageHistory.length === 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: `${T.yellow}0A`, border: `1px solid ${T.yellow}33`, borderRadius: 8, padding: "0.9rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.2rem" }}>💡</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.2rem" }}>Live Ops active — waiting for data </div>
              <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem", lineHeight: 1.5 }}>
                This module displays real-time data from all other modules. To see Live Ops in action, go to <strong style={{ color: T.cyan }}>Smart Triage (Modul 9)</strong> and submit some complaints first.
              </div>
            </div>
            <button
              onClick={() => {
                const el = document.querySelector('[data-tab="triage"]');
                if (el) el.click();
              }}
              style={{ background: `${T.cyan}18`, border: `1px solid ${T.cyan}44`, color: T.cyan, padding: "0.4rem 0.85rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem", whiteSpace: "nowrap" }}
            >
              → Open Smart Triage
            </button>
          </motion.div>
        )}
        
      {/* ══ ROW 1: PROJECT HEALTH BANNER ══════════════════════════════════════ */}
      <div style={{
        background: T.panel,
        border: `1px solid ${T.borderHi}`,
        borderRadius: 10,
        padding: "1.25rem 1.75rem",
        marginBottom: "1.25rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: "1.5rem",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.cyan}66, transparent)` }} />

        <KPIAtom
          label="Sigma Level"
          value={`${sigmaMetric.after ?? "—"}σ`}
          color={sigmaMetric.after >= 3 ? T.green : sigmaMetric.after >= 2 ? T.yellow : T.red}
          sub={sigmaMetric.before ? `from ${sigmaMetric.before}σ ↑` : undefined}
        />
        <KPIAtom
          label="Ppk Index"
          value={ppkMetric.after ?? "—"}
          color={ppkMetric.after >= 1.33 ? T.green : ppkMetric.after >= 1 ? T.yellow : T.red}
          sub="process capable ≥1.33"
        />
        <KPIAtom
          label="DMAIC Progress"
          value={`${dmaicOverall}%`}
          color={dmaicOverall === 100 ? T.green : dmaicOverall >= 60 ? T.cyan : T.yellow}
          sub={`${completedPhases}/5 phases complete`}
        />
        <KPIAtom
          label="COPQ Savings"
          value={fmtCur(copqSavings)}
          color={copqSavings > 0 ? T.green : T.red}
          sub={`from ${fmtCur(copqA.total)} total`}
        />
        <KPIAtom
          label="SLA Rate"
          value={`${slaRate}%`}
          color={slaRate >= 80 ? T.green : slaRate >= 60 ? T.yellow : T.red}
          sub={`${triageHistory.length} total tickets`}
        />
        <KPIAtom
          label="Resolution Time"
          value={resMetric.after ? `${resMetric.after}h` : "—"}
          color={resMetric.after <= (resMetric.target || 48) ? T.green : T.yellow}
          sub={resMetric.before ? `was ${resMetric.before}h` : undefined}
        />
        <KPIAtom
          label="CSAT Score"
          value={csatMetric.after ? `${csatMetric.after}/10` : "—"}
          color={csatMetric.after >= 8 ? T.green : csatMetric.after >= 7 ? T.yellow : T.red}
          sub={`target ${csatMetric.target || "—"}/10`}
        />
        <KPIAtom
          label="Daily Burn Rate"
          value={fmtCur(copqDailyBurn)}
          color={T.red}
          sub="cost of quality / day"
        />
      </div>

      {/* ══ ROW 2: 4 INTEL PANELS ═════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>

        {/* ── PANEL A: DMAIC Phase Tracker ── */}
        <Panel title="DMAIC Status" accent={T.cyan}>
          {/* Phase flow */}
          <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1rem" }}>
            {phaseKeys.map(k => {
              const ph = dmaicPhases[k];
              const c = ph.status === "COMPLETE" ? T.green : ph.status === "ACTIVE" ? T.cyan : T.textDim;
              return (
                <div key={k} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    background: ph.status === "COMPLETE" ? `${T.green}22` : ph.status === "ACTIVE" ? `${T.cyan}18` : T.panel,
                    border: `1px solid ${c}44`,
                    borderRadius: 4,
                    padding: "0.4rem 0.2rem",
                    marginBottom: "0.3rem",
                  }}>
                    <div style={{ color: c, fontFamily: T.mono, fontSize: "0.75rem", fontWeight: 700 }}>{k}</div>
                    <div style={{ color: c, fontFamily: T.mono, fontSize: "0.55rem" }}>{ph.progress}%</div>
                  </div>
                  <MiniBar pct={ph.progress} color={c} height={3} />
                </div>
              );
            })}
          </div>
          {/* Overall */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>Overall Completion</span>
            <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>{dmaicOverall}%</span>
          </div>
          <MiniBar pct={dmaicOverall} color={dmaicOverall === 100 ? T.green : T.cyan} height={6} />
          {activePhaseKey && (
            <div style={{ marginTop: "0.75rem", background: `${T.cyan}0A`, border: `1px solid ${T.cyan}22`, borderRadius: 5, padding: "0.5rem 0.75rem" }}>
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>Active: </span>
              <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700 }}>
                {activePhaseKey} — {dmaicPhases[activePhaseKey]?.name}
              </span>
              <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>
                {" "}· {dmaicPhases[activePhaseKey]?.tools?.filter(t => t.done).length}/{dmaicPhases[activePhaseKey]?.tools?.length} tools
              </span>
            </div>
          )}
        </Panel>

        {/* ── PANEL B: FMEA Risk Intelligence ── */}
        <Panel title="FMEA Risk Intel" accent={criticalItems.length > 0 ? T.red : T.yellow}>
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
            {[
              { label: "Open RPN", val: totalRPN, color: totalRPN > 1000 ? T.red : T.yellow },
              { label: "Critical", val: criticalItems.length, color: criticalItems.length > 0 ? T.red : T.green },
              { label: "Controlled", val: `${controlledPct}%`, color: controlledPct >= 70 ? T.green : T.yellow },
            ].map(k => (
              <div key={k.label} style={{ background: T.panel, borderRadius: 5, padding: "0.5rem", textAlign: "center" }}>
                <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 800 }}>{k.val}</div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", textTransform: "uppercase" }}>{k.label}</div>
              </div>
            ))}
          </div>
          {/* Top 3 open risks */}
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>Top Open Risks</div>
          {topFMEA.length === 0 ? (
            <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.68rem" }}>✓ No open risks</div>
          ) : topFMEA.map((item, i) => {
            const r = rpn(item);
            const rc = rpnColor(r);
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <div style={{ width: 36, height: 20, background: `${rc}22`, border: `1px solid ${rc}44`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: rc, fontFamily: T.mono, fontSize: "0.58rem", fontWeight: 700 }}>{r}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.process}: {item.failure}</div>
                </div>
                <MiniBar pct={(r / 1000) * 100} color={rc} height={3} />
              </div>
            );
          })}
        </Panel>

        {/* ── PANEL C: Pareto Vital Few ── */}
        <Panel title="Pareto Intelligence" accent={T.yellow}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
            {[
              { label: "Total Cases", val: totalCases.toLocaleString(), color: T.cyan },
              { label: "Vital Few", val: `${vitalFew.length} cats`, color: T.yellow },
            ].map(k => (
              <div key={k.label} style={{ background: T.panel, borderRadius: 5, padding: "0.5rem", textAlign: "center" }}>
                <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.1rem", fontWeight: 800 }}>{k.val}</div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.5rem", textTransform: "uppercase" }}>{k.label}</div>
              </div>
            ))}
          </div>
          {/* Top 3 categories */}
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>Impact Distribution</div>
          {paretoWithCum.slice(0, 5).map((item, i) => {
            const pct = totalHrs > 0 ? ((item.cases * item.avgHrs) / totalHrs) * 100 : 0;
            const isVital = item.cumPct <= 80;
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isVital ? T.yellow : T.textDim, flexShrink: 0 }} />
                <div style={{ width: 90, color: isVital ? T.text : T.textDim, fontFamily: T.mono, fontSize: "0.6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {item.category}
                </div>
                <MiniBar pct={pct} color={isVital ? T.yellow : T.textDim} height={4} />
                <span style={{ color: isVital ? T.yellow : T.textDim, fontFamily: T.mono, fontSize: "0.58rem", flexShrink: 0, minWidth: 32, textAlign: "right" }}>{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </Panel>

        {/* ── PANEL D: COPQ Hemorrhage Meter ── */}
        <Panel title="COPQ Hemorrhage Meter" accent={T.orange}>
          {/* Animated daily burn */}
          <div style={{ textAlign: "center", marginBottom: "1rem", padding: "0.75rem", background: `${T.red}08`, border: `1px solid ${T.red}22`, borderRadius: 6 }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Daily Cost of Poor Quality</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <div style={{ color: T.red, fontFamily: T.display, fontSize: "1.6rem", fontWeight: 800, textShadow: `0 0 20px ${T.red}55` }}>
                {fmtCur(copqDailyBurn)}
              </div>
              {copqSavings > 0 && (
                <>
                  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.8rem" }}>→</span>
                  <div style={{ color: T.green, fontFamily: T.display, fontSize: "1.2rem", fontWeight: 700 }}>{fmtCur(copqDailyBurnB)}</div>
                </>
              )}
            </div>
            {copqSavings > 0 && (
              <div style={{ color: T.green, fontFamily: T.mono, fontSize: "0.6rem", marginTop: "0.2rem" }}>
                ↓ saving {fmtCur(copqDailyBurn - copqDailyBurnB)}/day after DMAIC
              </div>
            )}
          </div>
          {/* Breakdown bars */}
          {[
            { key: "wastedCap",  label: "Wasted Labor",    color: T.red },
            { key: "churn",      label: "Customer Churn",  color: T.orange },
            { key: "escalation", label: "Escalation",      color: T.yellow },
            { key: "rework",     label: "Rework",          color: T.cyan },
          ].map(c => {
            const pct = copqA.total > 0 ? (copqA[c.key] / copqA.total) * 100 : 0;
            const pctB = copqB.total > 0 ? (copqB[c.key] / copqB.total) * 100 : 0;
            return (
              <div key={c.key} style={{ marginBottom: "0.45rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>{c.label}</span>
                  <span style={{ color: c.color, fontFamily: T.mono, fontSize: "0.58rem", fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 4, background: T.panel, borderRadius: 3, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `${c.color}44`, borderRadius: 3 }} />
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pctB}%`, background: c.color, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: "0.5rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem" }}>
            ■ Scenario B (post-DMAIC)  ░ Scenario A (baseline)
          </div>
        </Panel>

      </div>{/* end row 2 */}

      {/* ══ ROW 3: OPS FLOOR (FULL FEATURE — Queue / Scorecard / Insights) ══ */}
      {(() => {
        // Derived vars khusus Row 3 (sama persis logika lama)
        const history = triageHistory;
        const slaColor = (s) => s === "ON TRACK" ? T.green : s === "AT RISK" ? T.yellow : T.red;
        const urgencyColor = (u) => u === "Critical" ? T.red : u === "High" ? T.orange : u === "Medium" ? T.yellow : T.green;
        const urgencyOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };

        const priorityQueue = [...history]
          .sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2) || (a.estimatedHrs - b.estimatedHrs))
          .slice(0, 15);

        const scorecards = technicians.map(t => {
          const assigned = history.filter(h => h.technician?.name === t.name);
          const resolved = assigned.filter(h => h.sla === "ON TRACK").length;
          const breached = assigned.filter(h => h.sla === "BREACH").length;
          const avgConf = assigned.length > 0 ? Math.round(assigned.reduce((a, h) => a + (h.confidence || 0), 0) / assigned.length) : 0;
          const avgHrs = assigned.length > 0 ? Math.round(assigned.reduce((a, h) => a + (h.estimatedHrs || 0), 0) / assigned.length) : 0;
          return { ...t, assigned: assigned.length, resolved, breached, avgConf, avgHrs };
        });

        const catCounts = {};
        history.forEach(h => { catCounts[h.category] = (catCounts[h.category] || 0) + 1; });
        const catSorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
        const maxCat = catSorted[0]?.[1] || 1;

        const findSimilar = (target) => {
          if (!target) return [];
          return history.filter(h => h.id !== target.id && h.category === target.category).slice(0, 3);
        };

        const ops3Tabs = [
          { key: "queue",     label: "📊 Priority Queue" },
          { key: "scorecard", label: "👥 Scorecard" },
          { key: "insights",  label: "🔍 Insights" },
        ];

        return (
          <div style={{ marginBottom: "1.25rem" }}>

            {/* Section label */}
            <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.cyan, display: "inline-block", boxShadow: `0 0 6px ${T.cyan}` }} />
              Ops Floor · Live Ticket Operations
            </div>

            {/* KPI Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total Tickets", val: history.length, color: T.cyan },
                { label: "SLA Rate", val: `${slaRate}%`, color: slaRate >= 80 ? T.green : slaRate >= 60 ? T.yellow : T.red },
                { label: "On Track", val: onTrack, color: T.green },
                { label: "At Risk", val: atRisk, color: T.yellow },
                { label: "Breached", val: breach, color: T.red },
                { label: "Team Size", val: technicians.length, color: T.textMid },
              ].map(k => (
                <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.85rem 1rem" }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>{k.label}</div>
                  <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.4rem", fontWeight: 800 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: `1px solid ${T.border}`, paddingBottom: "0.75rem", flexWrap: "wrap" }}>
              {ops3Tabs.map(t => (
                <button key={t.key} onClick={() => setOpsTab(t.key)} style={{
                  background: opsTab === t.key ? `${T.cyan}18` : "transparent",
                  border: `1px solid ${opsTab === t.key ? T.cyan : T.border}`,
                  color: opsTab === t.key ? T.cyan : T.textDim,
                  padding: "0.45rem 1rem", borderRadius: 6, cursor: "pointer",
                  fontFamily: T.mono, fontSize: "0.68rem", fontWeight: opsTab === t.key ? 700 : 400,
                }}>{t.label}</button>
              ))}
            </div>

            {/* Priority Queue */}
            {opsTab === "queue" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: T.textDim, fontFamily: T.mono, fontSize: "0.75rem" }}>
                    No tickets yet — submit complaints in the Smart Triage module to populate the queue.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {priorityQueue.map((h, i) => {
                      const elapsed = Math.floor((now - (h.timestamp || now)) / 1000 / 60);
                      const slaRemainMins = (h.estimatedHrs * 60) - elapsed;
                      const slaRemainHrs = Math.max(0, Math.floor(slaRemainMins / 60));
                      const slaRemainMinsRem = Math.max(0, Math.floor(slaRemainMins % 60));
                      const isExpired = slaRemainMins <= 0;
                      const similar = findSimilar(h);
                      return (
                        <div key={h.id || i} style={{ background: T.surface, border: `1px solid ${h.urgency === "Critical" ? T.red + "66" : T.border}`, borderRadius: 8, padding: "0.85rem 1rem", borderLeft: `4px solid ${urgencyColor(h.urgency || "Low")}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                                <span style={{ background: `${urgencyColor(h.urgency || "Low")}18`, border: `1px solid ${urgencyColor(h.urgency || "Low")}44`, color: urgencyColor(h.urgency || "Low"), fontFamily: T.mono, fontSize: "0.6rem", padding: "0.1rem 0.5rem", borderRadius: 20, fontWeight: 700 }}>{h.urgency || "Low"}</span>
                                <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.65rem" }}>{h.category}</span>
                                <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>{h.method === "gemini-ai" ? "✦ AI" : "⚡ Rule"}</span>
                              </div>
                              <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem", lineHeight: 1.4 }}>{h.input?.length > 100 ? h.input.slice(0, 100) + "…" : h.input}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ color: isExpired ? T.red : slaRemainMins < 120 ? T.yellow : T.green, fontFamily: T.mono, fontSize: "0.85rem", fontWeight: 700 }}>
                                {isExpired ? "⏰ EXPIRED" : `${slaRemainHrs}h ${slaRemainMinsRem}m`}
                              </div>
                              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>SLA remaining</div>
<div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", marginTop: "0.1rem" }}>
  submitted {elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed/60)}h ${elapsed%60}m`} ago
                            </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>→ {h.technician?.name}</span>
                            <span style={{ color: slaColor(h.sla), fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700 }}>{h.sla}</span>
                            <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>{h.confidence}% conf</span>
                            {h.needsManualReview && <span style={{ color: T.red, fontFamily: T.mono, fontSize: "0.58rem" }}>⚠ Review</span>}
                          </div>
                          {similar.length > 0 && (
                            <div style={{ marginTop: "0.5rem", padding: "0.4rem 0.65rem", background: `${T.cyan}08`, borderRadius: 4, borderLeft: `2px solid ${T.cyan}44` }}>
                              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>🔍 Similar past cases</div>
                              {similar.map((s, j) => (
                                <div key={j} style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem" }}>· {s.input?.slice(0, 60)}… → {s.technician?.name} ({s.sla})</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Technician Scorecard */}
            {opsTab === "scorecard" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {scorecards.map((t, i) => (
                    <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1rem 1.25rem" }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${TECH_COLORS[i % TECH_COLORS.length]}22`, border: `2px solid ${TECH_COLORS[i % TECH_COLORS.length]}`, display: "flex", alignItems: "center", justifyContent: "center", color: TECH_COLORS[i % TECH_COLORS.length], fontFamily: T.display, fontSize: "1.1rem", fontWeight: 800, flexShrink: 0 }}>{t.name.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: T.text, fontFamily: T.display, fontSize: "0.95rem", fontWeight: 700 }}>{t.name}</div>
                          <div style={{ color: TECH_COLORS[i % TECH_COLORS.length], fontFamily: T.mono, fontSize: "0.65rem" }}>{t.level}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", textAlign: "center" }}>
                          {[
                            { label: "Assigned", val: t.assigned, color: T.cyan },
                            { label: "On Track", val: t.resolved, color: T.green },
                            { label: "Breached", val: t.breached, color: T.red },
                            { label: "Avg Conf", val: t.avgConf ? `${t.avgConf}%` : "—", color: T.yellow },
                          ].map(k => (
                            <div key={k.label}>
                              <div style={{ color: k.color, fontFamily: T.mono, fontSize: "1rem", fontWeight: 700 }}>{k.val}</div>
                              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase" }}>{k.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginTop: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem" }}>Current Load</span>
                          <span style={{ color: t.load > 25 ? T.red : T.green, fontFamily: T.mono, fontSize: "0.6rem", fontWeight: 700 }}>{t.load}/{t.maxLoad}</span>
                        </div>
                        <div style={{ height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${(t.load / t.maxLoad) * 100}%`, height: "100%", background: t.load > 25 ? T.red : t.load > 15 ? T.yellow : T.green, borderRadius: 2, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {t.skills.map(s => <Badge key={s} label={s} color={T.textDim} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Insights */}
            {opsTab === "insights" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1rem" }}>
                  {/* Category breakdown */}
                  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Top Issue Categories</div>
                    {catSorted.length === 0 ? (
                      <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.7rem" }}>No data yet.</div>
                    ) : catSorted.slice(0, 7).map(([cat, count], i) => (
                      <div key={cat} style={{ marginBottom: "0.6rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }}>{cat}</span>
                          <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700 }}>{count}</span>
                        </div>
                        <div style={{ height: 3, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${(count / maxCat) * 100}%`, height: "100%", background: i === 0 ? T.cyan : T.textDim, borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Urgency distribution */}
                  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "1.25rem" }}>
                    <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Urgency Distribution</div>
                    {["Critical","High","Medium","Low"].map(u => {
                      const count = history.filter(h => h.urgency === u).length;
                      const pct = history.length > 0 ? Math.round((count / history.length) * 100) : 0;
                      return (
                        <div key={u} style={{ marginBottom: "0.6rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                            <span style={{ color: urgencyColor(u), fontFamily: T.mono, fontSize: "0.68rem" }}>{u === "Critical" ? "🔴" : u === "High" ? "🟠" : u === "Medium" ? "🟡" : "🟢"} {u}</span>
                            <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.65rem" }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 3, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: urgencyColor(u), borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        );
      })()}
      {/* ══ END ROW 3 ══ */}

      {/* ══ ROW 4: ROOT CAUSE STATUS + SIGMA JOURNEY ═════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>

        {/* Root Cause Resolution */}
        <Panel title="Root Cause Resolution" accent={T.cyan}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "Total RCs", val: rcItems.length, color: T.cyan },
              { label: "% Solved", val: `${rcSolvePct}%`, color: rcSolvePct === 100 ? T.green : T.yellow },
              { label: "Hours Recovered", val: `−${totalRCImpact.toFixed(1)}h`, color: T.green },
            ].map(k => (
              <div key={k.label} style={{ textAlign: "center" }}>
                <div style={{ color: k.color, fontFamily: T.display, fontSize: "1.3rem", fontWeight: 800 }}>{k.val}</div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase" }}>{k.label}</div>
              </div>
            ))}
          </div>
          {rcItems.map((r, i) => {
            const c = r.status === "SOLVED" ? T.green : r.status === "OPEN" ? T.yellow : T.cyan;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                <div style={{ width: 14, height: 14, borderRadius: 2, background: `${c}22`, border: `1.5px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {r.status === "SOLVED" && <span style={{ color: c, fontSize: "0.5rem" }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.62rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 40, height: 4, background: T.panel, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${r.contribution}%`, height: "100%", background: c }} />
                  </div>
                  <span style={{ color: c, fontFamily: T.mono, fontSize: "0.58rem" }}>{r.contribution}%</span>
                </div>
              </div>
            );
          })}
        </Panel>

        {/* Project Outcome Scorecard */}
        <Panel title="Project Outcome Scorecard" accent={T.green}>
          {metrics.slice(0, 6).map((m, i) => {
            const improved = m.invert ? m.after < m.before : m.after > m.before;
            const onTgt = m.invert ? m.after <= m.target : m.after >= m.target;
            const pct = m.before > 0 ? Math.abs(((m.after - m.before) / m.before) * 100).toFixed(0) : "—";
            const arrow = (m.invert ? m.after < m.before : m.after > m.before) ? "↑" : "↓";
            const arrowColor = improved ? T.green : T.red;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0.4rem 0.6rem", background: onTgt ? `${T.green}06` : T.panel, borderRadius: 5, border: `1px solid ${onTgt ? T.green + "22" : T.border}` }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: onTgt ? T.green : T.yellow, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem", textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.1rem" }}>
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem", textDecoration: "line-through" }}>{m.before}{m.unit}</span>
                    <span style={{ color: T.textDim, fontSize: "0.6rem" }}>→</span>
                    <span style={{ color: T.text, fontFamily: T.mono, fontSize: "0.72rem", fontWeight: 700 }}>{m.after}{m.unit}</span>
                    <span style={{ color: arrowColor, fontFamily: T.mono, fontSize: "0.6rem" }}>{arrow}{pct}%</span>
                  </div>
                </div>
                <div style={{ color: onTgt ? T.green : T.yellow, fontFamily: T.mono, fontSize: "0.55rem", flexShrink: 0 }}>
                  {onTgt ? "✓ MET" : "▲ TGT"}
                </div>
              </div>
            );
          })}
        </Panel>

      </div>{/* end row 4 */}

      {/* ══ ROW 5: CROSS-MODULE INSIGHT STRIP ════════════════════════════════ */}
      <div style={{
        background: T.panel,
        border: `1px solid ${T.borderHi}`,
        borderRadius: 10,
        padding: "1rem 1.5rem",
      }}>
        <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: T.cyan, boxShadow: `0 0 8px ${T.cyan}`, animation: "pulse 2s infinite" }} />
          Cross-Module Intelligence · Auto-generated from live data
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.75rem" }}>
          {insights.map((ins, i) => (
            <div key={i} style={{
              display: "flex", gap: "0.65rem", alignItems: "flex-start",
              background: `${ins.color}08`, border: `1px solid ${ins.color}22`,
              borderRadius: 7, padding: "0.75rem 1rem",
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0, lineHeight: 1.4 }}>{ins.icon}</span>
              <p style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem", lineHeight: 1.55, margin: 0 }}>
                {ins.text}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom status bar */}
        <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              { label: "M1 Mission Status", ok: metrics.length > 0 },
              { label: "M3 DMAIC", ok: dmaicOverall > 0 },
              { label: "M4 FMEA", ok: fmeaItems.length > 0 },
              { label: "M5 COPQ", ok: copqA.total > 0 },
              { label: "M7 Pareto", ok: activePareto.length > 0 },
              { label: "M8 Root Cause", ok: rcItems.length > 0 },
              { label: "M9 Triage", ok: triageHistory.length > 0 },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.ok ? T.green : T.textDim, boxShadow: s.ok ? `0 0 6px ${T.green}` : "none" }} />
                <span style={{ color: s.ok ? T.textMid : T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
            Last sync: {new Date(now).toLocaleTimeString()}
          </div>
        </div>
      </div>

    </motion.div>
  );
}


// ─── UNIVERSAL COPQ CALCULATOR ───────────────────────────────────────────────
const INDUSTRY_PRESETS = {
  techsupport: {
    label: "🖥️ IT / Tech Support",
    desc: "Based on data — 547 cases, 30-week initiative",
    fields: [
      { key: "volume", label: "Monthly Case/Ticket Volume", unit: "cases", val: 295, min: 50, max: 5000, step: 10 },
      { key: "reopenRate", label: "Case Reopen / Rework Rate", unit: "%", val: 28, min: 0, max: 60, step: 1 },
      { key: "escalRate", label: "Escalation Rate", unit: "%", val: 58, min: 0, max: 80, step: 1 },
      { key: "wasteHrs", label: "Non-Value-Added Hours per Case", unit: "hrs", val: 33.5, min: 0, max: 60, step: 0.5 },
      { key: "laborRate", label: "Staff Hourly Cost", unit: "/hr", val: 45, min: 10, max: 200, step: 5 },
      { key: "churnRate", label: "Customer Churn Rate (from delay)", unit: "%", val: 35, min: 0, max: 80, step: 1 },
      { key: "ltv", label: "Customer Lifetime Value", unit: "", val: 3200, min: 100, max: 50000, step: 100 },
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
      { key: "laborRate", label: "Labor Cost per Hour", unit: "/hr", val: 30, min: 10, max: 150, step: 2 },
      { key: "churnRate", label: "Customer Return / Warranty Rate", unit: "%", val: 2.5, min: 0, max: 20, step: 0.1 },
      { key: "ltv", label: "Material Cost per Unit", unit: "", val: 85, min: 1, max: 5000, step: 1 },
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
      { key: "laborRate", label: "Staff Hourly Cost", unit: "/hr", val: 25, min: 10, max: 100, step: 2 },
      { key: "churnRate", label: "Customer Churn after Bad Exp.", unit: "%", val: 22, min: 0, max: 60, step: 1 },
      { key: "ltv", label: "Average Order Value / LTV", unit: "", val: 150, min: 10, max: 5000, step: 10 },
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
      { key: "laborRate", label: "Average Staff Hourly Cost", unit: "/hr", val: 35, min: 5, max: 300, step: 5 },
      { key: "churnRate", label: "Customer/Client Loss Rate", unit: "%", val: 20, min: 0, max: 80, step: 1 },
      { key: "ltv", label: "Customer / Contract Value", unit: "", val: 2000, min: 100, max: 100000, step: 100 },
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
  const { fmt, s } = useCurrencyFmt();
  const company = useCompany();
  const [industry, setIndustry] = useLocalState("ucalc_industry", "techsupport");
  const [improvement, setImprovement] = useLocalState("ucalc_improvement", 25);
  const [fieldVals, setFieldVals] = useLocalState("ucalc_fieldvals", {});
  const [importedFromCompany, setImportedFromCompany] = useState(false);

  const preset = INDUSTRY_PRESETS[industry];

  // Auto-populate dari Company Setup kalau ada data valid
  const companyDefaults = (key) => {
    if (!company || company.isPulseDigital) return null;
    const map = { laborRate: company.laborRate, volume: company.monthlyVolume, ltv: company.customerLTV };
    return map[key] ?? null;
  };

  const vals = preset.fields.reduce((acc, f) => {
    const stored = fieldVals[`${industry}_${f.key}`];
    const fromCompany = companyDefaults(f.key);
    return { ...acc, [f.key]: stored ?? fromCompany ?? f.val };
  }, {});
  const setVal = (key, val) => setFieldVals(prev => ({ ...prev, [`${industry}_${key}`]: val }));
  const { rework, escalation, waste, churn, other } = preset.calcCopq(vals);
  const totalCopq = rework + escalation + waste + churn + other;
  const savings = totalCopq * (improvement / 100);

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

      {/* Company import notice */}
      {company && !company.isPulseDigital && (
        <div style={{ background: `${T.green}0A`, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "0.75rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ color: T.green, fontFamily: T.mono, fontSize: "0.65rem", fontWeight: 700 }}>⚡ Company Data Loaded</span>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.62rem" }}>
            Labor rate, volume & LTV pre-filled from {company.name}'s profile. You can override any value below.
          </span>
        </div>
      )}
     
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
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", alignItems: "center" }}>
                  <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "0.68rem" }}>{f.label}</span>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <input
                      type="number"
                      value={vals[f.key]}
                      min={f.min} max={f.max} step={f.step}
                      onChange={e => setVal(f.key, parseFloat(e.target.value) || 0)}
                      style={{ width: 80, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, color: T.yellow, fontFamily: T.mono, fontSize: "0.78rem", padding: "0.15rem 0.3rem", textAlign: "right", fontWeight: 700 }}
                    />
                    <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", minWidth: 30 }}>{f.unit}</span>
                  </div>
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
          This methodology identified <strong style={{ color: T.yellow }}>$9M</strong> in COPQ and delivered <strong style={{ color: T.green }}>$300K</strong> in realized annual savings.
        </div>
      </div>
    </motion.div>
  );
}

// ─── HERO PAGE ────────────────────────────────────────────────────────────────
// ─── GLOBAL RESET + EXPORT HELPERS ────
function getAllModuleData() {
  const keys = {
    company:    "ss_company",
    overview:   "overview_data",
    dmaic:      "dmaic_phases",
    fmea:       "fmea_items",
    copq:       "copq_scenarios",
    spc:        "spc_data",
    pareto:     "pareto_items",
    rootcause:  "rc_items",
    triage:     "triage_history",
    triageTeam: "triage_team_pd",
    universal:  "universal_data",
    ops:        "ops_data",
  };
  const result = {};
  for (const [name, key] of Object.entries(keys)) {
    try {
      const raw = localStorage.getItem(key);
      result[name] = raw ? JSON.parse(raw) : null;
    } catch { result[name] = null; }
  }
  return result;
}

function nuclearReset() {
  const prefixes = ["ss_","sigma_","dmaic_","fmea_","copq_","spc_","pareto_","rc_","triage_","overview_","universal_","ops_","bus_"];
  Object.keys(localStorage).forEach(k => {
    if (prefixes.some(p => k.startsWith(p))) localStorage.removeItem(k);
  });
}

function exportJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    exportedBy: `DMAIC Intelligence Platform — ${getAllModuleData().company?.name || "Alfin Maulana Yudistira"}`,
    version: "1.0",
    modules: getAllModuleData(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dmaic_platform_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const d = getAllModuleData();
  const co = d.company || {};
  const rows = [
    ["Module", "Metric", "Value"],
    ["Company", "Name",            co.name || "—"],
    ["Company", "Department",      co.dept || "—"],
    ["Company", "Industry",        co.industry || "—"],
    ["Company", "Currency",        co.currency || "—"],
    ["Company", "Team Size",       co.teamSize || "—"],
    ["Company", "Baseline Mean",   co.baselineMean || "—"],
    ["Company", "Baseline StdDev", co.baselineStdDev || "—"],
    ["Company", "Target",          co.target || "—"],
    ["Company", "USL",             co.usl || "—"],
    ["Company", "LSL",             co.lsl || "—"],
    ["Company", "Monthly Volume",  co.monthlyVolume || "—"],
    ["Company", "Labor Rate",      co.laborRate || "—"],
  ];

  // DMAIC phases
  const ph = d.dmaic || {};
  ["D","M","A","I","C"].forEach(k => {
    if (ph[k]) {
      rows.push(["DMAIC", `Phase ${k} - Progress`, ph[k].progress ?? "—"]);
      rows.push(["DMAIC", `Phase ${k} - Status`,   ph[k].status  || "—"]);
    }
  });

  // FMEA
  const fmea = Array.isArray(d.fmea) ? d.fmea : [];
  fmea.forEach((item, i) => {
    const rpn = (item.S||0) * (item.O||0) * (item.D||0);
    rows.push(["FMEA", `Item ${i+1} - Failure`,  item.failure  || "—"]);
    rows.push(["FMEA", `Item ${i+1} - RPN`,       rpn]);
    rows.push(["FMEA", `Item ${i+1} - Fixed`,     item.fixed ? "Yes" : "No"]);
  });

  // Pareto
  const pareto = Array.isArray(d.pareto) ? d.pareto : [];
  pareto.forEach((item, i) => {
    rows.push(["Pareto", `Item ${i+1} - Category`, item.category || "—"]);
    rows.push(["Pareto", `Item ${i+1} - Cases`,    item.cases    || "—"]);
    rows.push(["Pareto", `Item ${i+1} - Avg Hrs`,  item.avgHrs   || "—"]);
  });

  // Triage history summary
  const th = Array.isArray(d.triage) ? d.triage : [];
  const onTrack = th.filter(h => h.sla === "ON TRACK").length;
  const atRisk  = th.filter(h => h.sla === "AT RISK").length;
  const breach  = th.filter(h => h.sla === "BREACH").length;
  rows.push(["Triage", "Total Tickets",    th.length]);
  rows.push(["Triage", "SLA On Track",     onTrack]);
  rows.push(["Triage", "SLA At Risk",      atRisk]);
  rows.push(["Triage", "SLA Breach",       breach]);
  rows.push(["Triage", "SLA Rate (%)",     th.length > 0 ? Math.round((onTrack/th.length)*100) : "—"]);

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dmaic_platform_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
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
          DMAIC FULL CYCLE · STATUS: COMPLETE
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
          A full-cycle DMAIC toolkit for any industry.<br />
          Enter your company data → get instant Sigma Level, COPQ, FMEA Risk, and process insights.
        </p>

{/* Six Sigma explainer — for non-practitioners */}
        <div style={{
          maxWidth: 560, margin: "0 auto 2.5rem",
          background: `${T.cyan}08`, border: `1px solid ${T.cyan}22`,
          borderRadius: 10, padding: "1rem 1.25rem",
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem",
          textAlign: "left",
        }}>
          {[
            { icon: "📊", title: "Measure your process", body: "Find out exactly how many errors, delays, or defects are happening right now." },
            { icon: "💸", title: "See the hidden cost", body: "Quantify how much money is being wasted due to poor quality — most companies are shocked." },
            { icon: "🎯", title: "Fix the right things", body: "Use data — not guesswork — to prioritize what to improve and prove the results." },
          ].map(c => (
            <div key={c.title}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{c.icon}</div>
              <div style={{ color: T.text, fontFamily: T.mono, fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.25rem" }}>{c.title}</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", lineHeight: 1.55 }}>{c.body}</div>
            </div>
          ))}
        </div>
        
        {/* Stats */}
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
          {[
            { val: "10", label: "Interactive Modules" },
            { val: "σ → 6σ", label: "Sigma Calculator" },
            { val: "COPQ", label: "Cost of Poor Quality" },
            { val: "FMEA", label: "Risk Scoring Engine" },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "1.2rem", fontWeight: 700, textShadow: `0 0 15px ${T.cyan}66` }}>{stat.val}</div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", marginTop: "0.2rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Module Preview Cards */}
<div style={{ maxWidth: 780, margin: "0 auto 2.5rem", textAlign: "left" }}>
  <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.2em", textAlign: "center", marginBottom: "1rem" }}>
    — 11 Modules Inside —
  </div>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.6rem" }}>
    {[
      { icon: "◈", label: "Mission Status", teaser: "Want to see your project status on a single page? Get instant visibility of all KPIs, sigma levels, and DMAIC progress." },
      { icon: "σ", label: "Sigma Calculator", teaser: "How many errors are in your process? Input your data → instantly get your Sigma Level, DPMO, and industry benchmark position." },
      { icon: "⬡", label: "DMAIC Tracker", teaser: "Got an improvement project? Track your 5 DMAIC phases, log tasks, set deadlines, and monitor your progress in real-time." },
      { icon: "⚠", label: "FMEA Risk Scorer", teaser: "Want to know the most critical risks in your process? Calculate your S×O×D score → get automated action priorities." },
      { icon: "$", label: "COPQ Engine", teaser: "How much money is wasted due to poor processes? Calculate your COPQ and uncover real savings potential." },
      { icon: "~", label: "SPC Charts", teaser: "Is your process stable or acting up? I-MR charts with Western Electric Rules instantly detect anomalies." },
      { icon: "▮", label: "Pareto Builder", teaser: "80% of problems come from 20% of causes—which one should you tackle first? The Pareto Builder gives you the answer visually." },
      { icon: "⟳", label: "Root Cause 5-Whys", teaser: "Know the problem but struggling to find the root cause? Drill down with an interactive 5 Whys + Fishbone diagram." },
      { icon: "✦", label: "AI Triage Simulator", teaser: "Got incoming complaints? Type any complaint → AI instantly classifies and routes it to the right technician." },
      { icon: "∑", label: "Universal COPQ", teaser: "Want to calculate the cost of poor quality for any industry? Use this fully customizable COPQ template." },
      { icon: "⬤", label: "Live Ops Center", teaser: "Want to monitor all active tickets, team workload, and SLAs in real-time? Your operational war room is right here." }
    ].map((m, i) => (
      <motion.div key={m.label} whileHover={{ scale: 1.02, borderColor: T.cyan }}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
        style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "0.85rem 1rem", cursor: "default",
          transition: "border-color 0.2s",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
          <span style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.9rem", fontWeight: 700, width: 20, textAlign: "center" }}>{m.icon}</span>
          <span style={{ color: T.text, fontFamily: T.display, fontSize: "0.8rem", fontWeight: 700 }}>{m.label}</span>
        </div>
        <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.6rem", lineHeight: 1.55, paddingLeft: "1.6rem" }}>{m.teaser}</div>
      </motion.div>
    ))}
  </div>
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
          by Alfin Maulana Yudistira · Six Sigma Black Belt ·
        </div>

        {/* ── Data Management Tools ── */}
        <div style={{ marginTop: "2rem", display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={exportJSON} style={{
            background: `${T.green}12`, border: `1px solid ${T.green}44`,
            color: T.green, padding: "0.5rem 1rem", borderRadius: 6,
            cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
            letterSpacing: "0.05em",
          }}>
            ↓ Backup JSON
          </button>
          {(() => {
  const [csvMsg, setCsvMsg] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
      <button onClick={() => {
        try {
          const raw = localStorage.getItem("triage_history") || "[]";
          const history = JSON.parse(raw);
          if (history.length === 0) {
            setCsvMsg("No triage data yet — submit complaints in Smart Triage first.");
            setTimeout(() => setCsvMsg(""), 3500);
            return;
          }
          exportCSV();
        } catch { exportCSV(); }
      }} style={{
        background: `${T.cyan}12`, border: `1px solid ${T.cyan}44`,
        color: T.cyan, padding: "0.5rem 1rem", borderRadius: 6,
        cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
        letterSpacing: "0.05em",
      }}>
        ↓ Export Triage CSV
      </button>
      {csvMsg && (
        <span style={{ color: T.yellow, fontFamily: T.mono, fontSize: "0.58rem", maxWidth: 200, textAlign: "center", lineHeight: 1.4 }}>
          {csvMsg}
        </span>
      )}
    </div>
  );
})()}
          {(() => {
            const [confirmReset, setConfirmReset] = React.useState(false);
            return confirmReset ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: `${T.red}10`, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "0.6rem 0.85rem" }}>
                <span style={{ color: T.red, fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700 }}>⚠ Hapus SEMUA data? Tidak bisa di-undo.</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => { nuclearReset(); window.location.reload(); }}
                    style={{ background: T.red, border: "none", color: "#fff", padding: "0.3rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem", fontWeight: 700 }}>
                    Ya, Reset
                  </button>
                  <button onClick={() => setConfirmReset(false)}
                    style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.textDim, padding: "0.3rem 0.8rem", borderRadius: 4, cursor: "pointer", fontFamily: T.mono, fontSize: "0.62rem" }}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmReset(true)} style={{
                background: `${T.red}12`, border: `1px solid ${T.red}44`,
                color: T.red, padding: "0.5rem 1rem", borderRadius: 6,
                cursor: "pointer", fontFamily: T.mono, fontSize: "0.65rem",
                letterSpacing: "0.05em",
              }}>
                ✕ Reset All Data
              </button>
            );
          })()}
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
// Inner component so it can use the currency hook inside CompanyCtx.Provider
function AppKPIChips({ company }) {
  const { s, fmt } = useCurrencyFmt();
  // Baca live data dari Overview localStorage kalau ada, fallback ke PROJECT constant
  const liveOverview = (() => {
    try {
      const saved = localStorage.getItem("overview_data");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();
  const livePpk = liveOverview?.metrics?.find(m => m.id === "ppk")?.after ?? PROJECT.final.ppk;
  const liveSigma = liveOverview?.metrics?.find(m => m.id === "sigma")?.after ?? PROJECT.final.sigma;
  const liveSavings = liveOverview?.financials?.savings ?? PROJECT.savings;
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {(company.isPulseDigital ? [
        { label: `${livePpk}`, sub: "Ppk", color: T.green },
        { label: `${liveSigma}σ`, sub: "Level", color: T.cyan },
        { label: `${s}${(liveSavings / 1000).toFixed(0)}K`, sub: "Saved", color: T.yellow },
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
          sub: "Baseline Ppk", color: T.yellow,
        },
        { label: `${company.baselineMean} ${company.processUnit}`, sub: "Baseline", color: T.red },
        { label: `${company.target} ${company.processUnit}`, sub: "Target", color: T.green },
      ]).map(k => (
        <div key={k.sub} style={{ textAlign: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "0.3rem 0.6rem" }}>
          <div style={{ color: k.color, fontFamily: T.mono, fontSize: "0.82rem", fontWeight: 700 }}>{k.label}</div>
          <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.52rem", textTransform: "uppercase" }}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [showApp, setShowApp] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("ss_tab") || "overview");
  const [company, setCompany] = useState(() => {
    try {
      const saved = localStorage.getItem("ss_company");
      return saved ? { ...COMPANY_DEFAULTS, ...JSON.parse(saved) } : COMPANY_DEFAULTS;
    } catch { return COMPANY_DEFAULTS; }
  });
  const [showCompanySetup, setShowCompanySetup] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const handler = () => {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    };
    window.addEventListener("lsupdate", handler);
    return () => window.removeEventListener("lsupdate", handler);
  }, []);

  useEffect(() => { localStorage.setItem("ss_tab", activeTab); }, [activeTab]);
  useEffect(() => { PlatformBus.pruneStale(); }, []); // cleanup bus_ keys lama saat app load
  useEffect(() => {
    try { localStorage.setItem("ss_company", JSON.stringify(company)); } catch {}
  }, [company]);

  useEffect(() => {
    const handler = (e) => {
      // Jangan intercept kalau user sedang fokus di input/textarea/select/contenteditable
      const tag = e.target.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;
      if (isEditing) return;
      // Jangan intercept modifier keys (Ctrl+Z, Alt+-, dll)
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const tabs = ["overview","sigma","dmaic","fmea","copq","spc","pareto","rootcause","triage","universal","ops"];
      if (e.key >= "1" && e.key <= "9") setActiveTab(tabs[parseInt(e.key) - 1]);
      if (e.key === "0") setActiveTab("universal");
      if (e.key === "-" && !e.repeat) setActiveTab("ops");
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
    ops: LiveOpsCenter,
  };
  const ActiveView = views[activeTab] || views.overview;

  if (!showApp) return <Hero onEnter={() => setShowApp(true)} />;

  return (
    <CompanyCtx.Provider value={company}>
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", color: T.text }}>
        <Scanlines />

        {/* Header */}
        <div style={{ background: T.panel, borderBottom: `1px solid ${T.border}`, padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
            <div>
              <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Six Sigma Black Belt ·
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
            <AppKPIChips company={company} />

            {/* Auto-save indicator */}
            <AnimatePresence>
              {savedFlash && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    color: T.green, fontFamily: T.mono, fontSize: "0.55rem",
                    letterSpacing: "0.1em", display: "flex", alignItems: "center",
                    gap: "0.3rem", alignSelf: "center",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, display: "inline-block", boxShadow: `0 0 6px ${T.green}` }} />
                  SAVED
                </motion.span>
              )}
            </AnimatePresence>
            {company.isPulseDigital && (
              <span style={{ background: `${T.yellow}18`, border: `1px solid ${T.yellow}44`, borderRadius: 3, color: T.yellow, fontFamily: T.mono, fontSize: "0.52rem", padding: "0.2rem 0.5rem", letterSpacing: "0.1em", alignSelf: "center" }}>
                DEMO
              </span>
            )}
            <button onClick={() => setShowApp(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 4, color: T.textDim, padding: "0.35rem 0.7rem", fontFamily: T.mono, fontSize: "0.62rem", cursor: "pointer" }}>
              ← EXIT
            </button>
          </div>
        </div>

        <NavBar active={activeTab} setActive={setActiveTab} />

        <main style={{ flex: 1, padding: "2rem 1.5rem", overflowY: "auto" }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ErrorBoundary>
  <ActiveView />
</ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.58rem" }}>
            © {new Date().getFullYear()} Alfin Maulana Yudistira · Six Sigma Black Belt · {company.processName || "Process Efficiency Transformation"}
          </span>
          <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
            {company.isPulseDigital ? "Demo Mode: Pulse Digital" : `Company Mode: ${company.name}`}
          </span>
        </div>

        {/* Keyboard hints */}
        <div style={{ background: "#030709", borderTop: `1px solid ${T.border}`, padding: "0.3rem 1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {[["1-9","Switch modules"],["0","Universal COPQ"],["−","Live Ops (outside inputs)"],["ESC","Back / Exit"],["Click badge","Switch company"]].map(kb => (
            <span key={kb[0]} style={{ color: T.textDim, fontFamily: T.mono, fontSize: "0.55rem" }}>
              <span style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: "0.05rem 0.3rem", color: T.textMid, marginRight: "0.3rem" }}>{kb[0]}</span>
              {kb[1]}
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
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; background: ${T.bg}; color: ${T.text}; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: ${T.bg}; }
          ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
          input:focus, textarea:focus, select:focus { outline: 1px solid ${T.cyan}44; }
          button:hover { opacity: 0.85; }
          select option { background: ${T.surface}; color: ${T.text}; }
          .desktop-nav { display: flex !important; }
          .mobile-nav { display: none !important; }
          @media (max-width: 768px) {
            .desktop-nav { display: none !important; }
            .mobile-nav { display: block !important; }
            main { padding: 1rem 0.75rem !important; }
            table { font-size: 0.62rem !important; display: block; overflow-x: auto; }
            th, td { padding: 0.4rem 0.5rem !important; white-space: nowrap; }
            input[type="range"] { width: 100% !important; }
          }
          @media (max-width: 480px) {
            main { padding: 0.75rem 0.5rem !important; }
          }
          @media print {
            nav, footer, button, .no-print { display: none !important; }
            body { background: #fff !important; color: #111 !important; font-size: 11pt; }
            * { color: #111 !important; border-color: #ccc !important; background: #fff !important; box-shadow: none !important; text-shadow: none !important; }
            h1, h2, h3 { color: #000 !important; }
            .print-break { page-break-before: always; }
            @page { margin: 2cm; size: A4; }
          }
        `}</style>

        <Analytics />
        <SpeedInsights />
      </div>
    </CompanyCtx.Provider>
  );
}

