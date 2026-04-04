// src/lib/sigma.ts
// ─── Pure Six Sigma Math Library ─────────────────────────────────────────────

// DPMO ↔ Sigma level lookup table (interpolated)
const SIGMA_TABLE: [number, number][] = [
  [3.4,    6.0],
  [233,    5.0],
  [6210,   4.0],
  [66807,  3.0],
  [308537, 2.0],
  [691462, 1.0],
  [933193, 0.5],
]

export function dpmoToSigma(dpmo: number): number {
  if (dpmo <= 0)       return 6.0
  if (dpmo >= 1000000) return 0
  
  for (let i = 0; i < SIGMA_TABLE.length - 1; i++) {
  const rowLo = SIGMA_TABLE[i];
  const rowHi = SIGMA_TABLE[i + 1];
  if (rowLo && rowHi) {
    const [dpmoLo, sigmaHi] = rowLo;
    const [dpmoHi, sigmaLo] = rowHi;
    
    if (dpmo >= dpmoLo && dpmo < dpmoHi) {
      const t =
        (Math.log(dpmo) - Math.log(dpmoLo)) /
        (Math.log(dpmoHi) - Math.log(dpmoLo))
      return +(sigmaHi + t * (sigmaLo - sigmaHi)).toFixed(2)
          }
    }
  }
  return 0
}

export function sigmaToDpmo(sigma: number): number {
  const table: Record<number, number> = {
    6: 3.4, 5: 233, 4: 6210, 3: 66807, 2: 308537, 1: 691462,
  }
  const keys = Object.keys(table).map(Number).sort((a, b) => b - a)
 
  for (let i = 0; i < keys.length - 1; i++) {
  const hi = keys[i];
  const lo = keys[i + 1];

  if (hi !== undefined && lo !== undefined) {
    if (sigma <= hi && sigma >= lo) {
      const t = (sigma - lo) / (hi - lo);
      const valLo = table[lo] ?? 0;
      const valHi = table[hi] ?? 0;
      return Math.round(valLo + t * (valHi - valLo));
    }
  }
}
  
  return sigma >= 6 ? 3.4 : 691462
}

export function calcPpk(mean: number, stdDev: number, usl: number, lsl: number): number {
  if (stdDev <= 0) return 0
  const cpu = (usl - mean) / (3 * stdDev)
  const cpl = (mean - lsl) / (3 * stdDev)
  return +Math.min(cpu, cpl).toFixed(3)
}

export function calcCp(stdDev: number, usl: number, lsl: number): number {
  if (stdDev <= 0) return 0
  return +((usl - lsl) / (6 * stdDev)).toFixed(3)
}

export function calcDpmo(defects: number, opportunities: number, units: number): number {
  if (opportunities <= 0 || units <= 0) return 0
  return Math.round((defects / (units * opportunities)) * 1_000_000)
}

export function calcYield(dpmo: number): number {
  return +((1 - dpmo / 1_000_000) * 100).toFixed(4)
}

// ─── SPC Control Limits ───────────────────────────────────────────────────────
export function calcControlLimits(data: number[]): {
  mean: number; ucl: number; lcl: number; mrUcl: number; mrMean: number
} {
  if (data.length < 2) return { mean: 0, ucl: 0, lcl: 0, mrUcl: 0, mrMean: 0 }
  const mean = data.reduce((a, b) => a + b, 0) / data.length
  const mrs = data.slice(1).map((v, i) => Math.abs(v - data[i]!))
  const mrMean = mrs.reduce((a, b) => a + b, 0) / mrs.length
  // d2 = 1.128 for n=2 (I-MR chart constant)
  const d2 = 1.128
  const sigma = mrMean / d2
  return {
    mean:   +mean.toFixed(3),
    ucl:    +(mean + 3 * sigma).toFixed(3),
    lcl:    +(mean - 3 * sigma).toFixed(3),
    mrUcl:  +(3.267 * mrMean).toFixed(3), // D4 constant = 3.267 for n=2
    mrMean: +mrMean.toFixed(3),
  }
}

// ─── Western Electric Rule violations ────────────────────────────────────────
export interface WECOViolation {
  index: number
  rule: string
  description: string
}

export function detectWECO(data: number[], mean: number, sigma: number): WECOViolation[] {
  const violations: WECOViolation[] = []
  const z = data.map(v => (v - mean) / sigma)

  for (let i = 0; i < z.length; i++) {
    // Rule 1: 1 point beyond 3σ
    if (Math.abs(z[i]!) > 3)
      violations.push({ index: i, rule: '1', description: 'Point beyond 3σ control limit' })

    // Rule 2: 9 consecutive on same side
    if (i >= 8) {
      const chunk = z.slice(i - 8, i + 1)
      if (chunk.every(v => v > 0) || chunk.every(v => v < 0))
        violations.push({ index: i, rule: '2', description: '9 consecutive points same side of CL' })
    }

    // Rule 3: 6 consecutive trend
    if (i >= 5) {
      const chunk = data.slice(i - 5, i + 1)
      const trend = chunk.every((v, j) => j === 0 || v > chunk[j - 1]!) ||
                    chunk.every((v, j) => j === 0 || v < chunk[j - 1]!)
      if (trend)
        violations.push({ index: i, rule: '3', description: '6 consecutive points trending' })
    }

    // Rule 4: 14 alternating direction
    if (i >= 13) {
      const chunk = data.slice(i - 13, i + 1)
      const alt = chunk.every((v, j) => {
        if (j === 0) return true
        const up = v > chunk[j - 1]!
        return j % 2 === 0 ? up : !up
      })
      if (alt)
        violations.push({ index: i, rule: '4', description: '14 alternating up/down points' })
    }
  }

  return violations
}

// ─── COPQ calculations ────────────────────────────────────────────────────────
export function calcCOPQ(params: {
  defectsPerMonth: number
  reworkHrsPerDefect: number
  laborRatePerHr: number
  scrapCostPerUnit: number
  scrapUnitsPerMonth: number
  warrantyClaimsPerMonth: number
  avgWarrantyCost: number
  lostSalesPerMonth: number
  avgDealValue: number
}): {
  internal: number
  external: number
  total: number
  asPercentRevenue?: number
} {
  const internal =
    params.defectsPerMonth * params.reworkHrsPerDefect * params.laborRatePerHr +
    params.scrapUnitsPerMonth * params.scrapCostPerUnit

  const external =
    params.warrantyClaimsPerMonth * params.avgWarrantyCost +
    params.lostSalesPerMonth * params.avgDealValue

  return { internal, external, total: internal + external }
}

// ─── RPN for FMEA ────────────────────────────────────────────────────────────
export function calcRPN(severity: number, occurrence: number, detection: number): number {
  return severity * occurrence * detection
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export function riskLevel(rpn: number): RiskLevel {
  if (rpn >= 200) return 'CRITICAL'
  if (rpn >= 100) return 'HIGH'
  if (rpn >= 50)  return 'MEDIUM'
  return 'LOW'
}
