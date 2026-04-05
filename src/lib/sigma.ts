// src/lib/sigma.ts

const SIGMA_TABLE: readonly [dpmo: number, sigma: number][] = [
  [3.4, 6.0],
  [233, 5.0],
  [6210, 4.0],
  [66807, 3.0],
  [308537, 2.0],
  [691462, 1.0],
  [933193, 0.5],
] as const

const MILLION = 1_000_000
const EPS = Number.EPSILON
const D2 = 1.128 // moving range constant for n=2
const D4 = 3.267
const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n))

const safeDiv = (a: number, b: number): number => (b === 0 ? 0 : a / b)

const roundTo = (n: number, decimals: number): number => {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

const validateFinite = (...values: number[]): void => {
  if (!values.every(Number.isFinite)) {
    throw new TypeError('All inputs must be finite numbers')
  }
}

export function dpmoToSigma(dpmo: number): number {
  if (!Number.isFinite(dpmo)) throw new TypeError('dpmo must be finite')
  if (dpmo <= 0) return SIGMA_TABLE[0][1] // 6.0
  if (dpmo >= MILLION) return 0

  for (let i = 0; i < SIGMA_TABLE.length - 1; i++) {
    const [dpLo, sigmaHi] = SIGMA_TABLE[i]
    const [dpHi, sigmaLo] = SIGMA_TABLE[i + 1]

    if (dpLo <= dpmo && dpmo <= dpHi) {
      // Exact match at boundaries
      if (Math.abs(dpmo - dpLo) < EPS) return sigmaHi
      if (Math.abs(dpmo - dpHi) < EPS) return sigmaLo

      // Log‑space linear interpolation
      const t =
        (Math.log(dpmo) - Math.log(dpLo)) /
        (Math.log(dpHi) - Math.log(dpLo))
      const sigma = sigmaHi + t * (sigmaLo - sigmaHi)
      return roundTo(sigma, 2)
    }
  }
  return 0 // fallback (should never happen)
}

/**
 * Convert Sigma level to DPMO.
 * @param sigma - Sigma level (0 … 6)
 * @returns DPMO (integer, 0 … 1_000_000)
 */
export function sigmaToDpmo(sigma: number): number {
  if (!Number.isFinite(sigma)) throw new TypeError('sigma must be finite')

  // Build arrays ascending by sigma (table is descending)
  const sorted = [...SIGMA_TABLE].sort((a, b) => a[1] - b[1])
  const sigmas = sorted.map((r) => r[1])
  const dpmos = sorted.map((r) => r[0])

  const minSigma = sigmas[0]
  const maxSigma = sigmas[sigmas.length - 1]
  const s = clamp(sigma, minSigma, maxSigma)

  // Exact match?
  for (let i = 0; i < sigmas.length; i++) {
    if (Math.abs(s - sigmas[i]) < EPS) return Math.round(dpmos[i])
  }

  // Interpolate between surrounding points
  for (let i = 0; i < sigmas.length - 1; i++) {
    const lo = sigmas[i]
    const hi = sigmas[i + 1]
    if (s >= lo && s <= hi) {
      const t = safeDiv(s - lo, hi - lo)
      const dpmo = dpmos[i] + t * (dpmos[i + 1] - dpmos[i])
      return Math.round(dpmo)
    }
  }

  // Extremes
  return sigma >= maxSigma ? Math.round(dpmos[dpmos.length - 1]) : Math.round(dpmos[0])
}

/* --------------------------------------------------------------------------
   PROCESS CAPABILITY
   -------------------------------------------------------------------------- */

/**
 * Calculate Ppk (process performance index).
 * @returns Ppk value rounded to 4 decimals
 */
export function calcPpk(mean: number, stdDev: number, usl: number, lsl: number): number {
  validateFinite(mean, stdDev, usl, lsl)
  if (stdDev <= 0) return 0

  const cpu = safeDiv(usl - mean, 3 * stdDev)
  const cpl = safeDiv(mean - lsl, 3 * stdDev)
  return roundTo(Math.min(cpu, cpl), 4)
}

/**
 * Calculate Cp (process capability index).
 * @returns Cp value rounded to 4 decimals
 */
export function calcCp(stdDev: number, usl: number, lsl: number): number {
  validateFinite(stdDev, usl, lsl)
  if (stdDev <= 0) return 0
  return roundTo(safeDiv(usl - lsl, 6 * stdDev), 4)
}

/* --------------------------------------------------------------------------
   QUALITY METRICS
   -------------------------------------------------------------------------- */

/**
 * Calculate DPMO from defects, opportunities per unit, and number of units.
 * @returns DPMO (integer)
 */
export function calcDpmo(defects: number, opportunities: number, units: number): number {
  validateFinite(defects, opportunities, units)
  if (opportunities <= 0 || units <= 0) return 0
  const dpmo = (defects / (units * opportunities)) * MILLION
  return Math.round(dpmo)
}

/**
 * Calculate yield percentage from DPMO.
 * @returns Yield percent (0 … 100), rounded to 4 decimals
 */
export function calcYield(dpmo: number): number {
  validateFinite(dpmo)
  const yieldPct = (1 - clamp(dpmo, 0, MILLION) / MILLION) * 100
  return roundTo(yieldPct, 4)
}

/* --------------------------------------------------------------------------
   SPC CONTROL LIMITS (I‑MR CHART)
   -------------------------------------------------------------------------- */

/**
 * Calculate control limits for Individual‑Moving Range (I‑MR) chart.
 * @param data - Array of measurement values (at least 2 points)
 * @returns Object with mean, ucl, lcl, mrUcl, mrMean, sigma
 */
export function calcControlLimits(data: number[]): {
  mean: number
  ucl: number
  lcl: number
  mrUcl: number
  mrMean: number
  sigma: number
} {
  if (!Array.isArray(data)) throw new TypeError('data must be an array')
  if (data.length < 2) {
    return { mean: 0, ucl: 0, lcl: 0, mrUcl: 0, mrMean: 0, sigma: 0 }
  }

  const mean = data.reduce((s, v) => s + v, 0) / data.length

  const mrs: number[] = []
  for (let i = 1; i < data.length; i++) {
    mrs.push(Math.abs(data[i] - data[i - 1]))
  }
  const mrMean = mrs.reduce((s, v) => s + v, 0) / mrs.length
  const sigma = mrMean / D2

  return {
    mean: roundTo(mean, 3),
    ucl: roundTo(mean + 3 * sigma, 3),
    lcl: roundTo(mean - 3 * sigma, 3),
    mrUcl: roundTo(D4 * mrMean, 3),
    mrMean: roundTo(mrMean, 3),
    sigma: roundTo(sigma, 4),
  }
}

/* --------------------------------------------------------------------------
   WESTERN ELECTRIC (WECO) RULES
   -------------------------------------------------------------------------- */
export interface WECOViolation {
  index: number
  rule: '1' | '2' | '3' | '4'
  description: string
}

/**
 * Detect Western Electric rules violations in SPC data.
 * @param data - Array of measurement values
 * @param mean - Process mean (usually from control chart)
 * @param sigma - Process sigma (estimated from moving range)
 * @returns Array of violations with index and rule number
 */
export function detectWECO(data: number[], mean: number, sigma: number): WECOViolation[] {
  if (!Array.isArray(data)) throw new TypeError('data must be an array')
  validateFinite(mean, sigma)
  if (sigma <= 0) return []

  const z = data.map((v) => (v - mean) / sigma)
  const violations: WECOViolation[] = []

  for (let i = 0; i < z.length; i++) {
    const zi = z[i]!

    // Rule 1: point beyond 3σ
    if (Math.abs(zi) > 3) {
      violations.push({ index: i, rule: '1', description: 'Point beyond 3σ control limit' })
    }

    // Rule 2: 9 consecutive points on the same side of center line
    if (i >= 8) {
      const chunk = z.slice(i - 8, i + 1)
      const allPositive = chunk.every((v) => v > 0)
      const allNegative = chunk.every((v) => v < 0)
      if (allPositive || allNegative) {
        violations.push({ index: i, rule: '2', description: '9 consecutive points same side of CL' })
      }
    }

    // Rule 3: 6 consecutive points increasing or decreasing
    if (i >= 5) {
      const chunk = data.slice(i - 5, i + 1)
      let increasing = true,
        decreasing = true
      for (let j = 1; j < chunk.length; j++) {
        if (chunk[j] <= chunk[j - 1]) increasing = false
        if (chunk[j] >= chunk[j - 1]) decreasing = false
        if (!increasing && !decreasing) break
      }
      if (increasing || decreasing) {
        violations.push({ index: i, rule: '3', description: '6 consecutive points trending' })
      }
    }

    // Rule 4: 14 alternating points (up‑down‑up‑down...)
    if (i >= 13) {
      const chunk = data.slice(i - 13, i + 1)
      let alternating = true
      for (let j = 1; j < chunk.length; j++) {
        const up = chunk[j] > chunk[j - 1]
        // Expect pattern: up, down, up, down,... (alternating)
        if ((j % 2 === 1 && !up) || (j % 2 === 0 && up)) {
          alternating = false
          break
        }
      }
      if (alternating) {
        violations.push({ index: i, rule: '4', description: '14 alternating up/down points' })
      }
    }
  }

  return violations
}

/* --------------------------------------------------------------------------
   COST OF POOR QUALITY (COPQ)
   -------------------------------------------------------------------------- */
export interface COPQParams {
  defectsPerMonth: number
  reworkHrsPerDefect: number
  laborRatePerHr: number
  scrapCostPerUnit: number
  scrapUnitsPerMonth: number
  warrantyClaimsPerMonth: number
  avgWarrantyCost: number
  lostSalesPerMonth: number
  avgDealValue: number
}

/**
 * Calculate Cost of Poor Quality (COPQ) broken down into internal and external costs.
 * @returns Object with internal, external, and total cost
 */
export function calcCOPQ(params: COPQParams): {
  internal: number
  external: number
  total: number
} {
  const vals = Object.values(params)
  if (!vals.every(Number.isFinite)) throw new TypeError('All COPQ parameters must be finite numbers')

  const internal =
    params.defectsPerMonth * params.reworkHrsPerDefect * params.laborRatePerHr +
    params.scrapUnitsPerMonth * params.scrapCostPerUnit

  const external =
    params.warrantyClaimsPerMonth * params.avgWarrantyCost +
    params.lostSalesPerMonth * params.avgDealValue

  return { internal, external, total: internal + external }
}

/* --------------------------------------------------------------------------
   FMEA (FAILURE MODE AND EFFECTS ANALYSIS)
   -------------------------------------------------------------------------- */
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * Calculate Risk Priority Number (RPN) = severity × occurrence × detection.
 */
export function calcRPN(severity: number, occurrence: number, detection: number): number {
  validateFinite(severity, occurrence, detection)
  return severity * occurrence * detection
}

/**
 * Determine risk level based on RPN value.
 */
export function riskLevel(rpn: number): RiskLevel {
  validateFinite(rpn)
  if (rpn >= 200) return 'CRITICAL'
  if (rpn >= 100) return 'HIGH'
  if (rpn >= 50) return 'MEDIUM'
  return 'LOW'
}
