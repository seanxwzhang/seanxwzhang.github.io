// CoreWeave equity model — a TypeScript port of the "Equity Bridge" sheet in
// Neocloud_BS_Comparison.xlsx (Oct 2026). Units: $M per MW, $bn for the bridge.

export interface Inputs {
  rent: number;      // P2: $/GPU-hour on new contracts signed from now on
  decline: number;   // δ: yearly rent decline after the first contract (0.07 = 7%)
  life: number;      // L: years a chip stays useful
  delay: number;     // years until sold-but-unbuilt chips are switched on
  rate: number;      // r: blended cost of money (0.10 = 10%)
}

export const DEFAULTS: Inputs = { rent: 3.303, decline: 0.07, life: 8, delay: 1.5, rate: 0.10 };

// ---- fixed assumptions (sources in the article's Data section)
export const C = {
  gpusPerMW: 378.9,          // Blackwell-class GPUs per MW (IREN–Microsoft calibration)
  utilization: 0.95,         // billed share of hours
  opexPerMW: 3.8,            // $M per MW per year: power, data-center rent, staff, SG&A
  capexPerMW: 26.075,        // $M per MW: ~$69k per GPU all-in
  term: 5,                   // years of the first contract
  signedRent: 2.90,          // P1: $/GPU-hour on contracts already signed (IREN–Microsoft ≈ $2.91)
  runningMW: 1500,           // in service, June 30, 2026
  runningRevPerMW: 9.581,    // $M per MW per year, Q2'26 annualized
  runningAge: 1.5,           // average years already used
  backlog: 128700,           // $M: RPO $103.7bn + ~$25bn signed early Q3
  contractedPowerMW: 4200,   // MW of power lined up (Aug 2026)
  growthMW: 3600,            // extra MW by 2035 (DCF base case)
  cip: 11.918,               // $bn already spent on chips not yet in service
  owed: 38.622,              // $bn: net debt 28.695 + finance leases 0.235 + customer prepayments 9.692
  dilutedShares: 608,        // millions
  price: 61.39,              // $ per share, close Oct 16, 2026
};

const a = (C.gpusPerMW * 8760 * C.utilization) / 1e6; // $M per MW per year for each $1/GPU-hour
const YEARS = 12;

function idx(age: number, d: number) { return age <= C.term ? 1 : Math.pow(1 - d, age - 1); }
function lifeShare(age: number, L: number) { return Math.max(0, Math.min(1, L - age + 1)); }

/** NPV of one new MW ($M) at rent P, counted from the day it switches on. */
export function npvPerMW(P: number, x: Inputs): number {
  let pv = 0;
  for (let n = 1; n <= YEARS; n++) {
    const cf = Math.max(0, P * a * idx(n, x.decline) - C.opexPerMW) * lifeShare(n, x.life);
    pv += cf / Math.pow(1 + x.rate, n);
  }
  return pv - C.capexPerMW;
}

function runningFleetBn(x: Inputs): number {
  let pv = 0;
  for (let n = 1; n <= YEARS; n++) {
    const age = C.runningAge + n;
    const cf = Math.max(0, C.runningRevPerMW * idx(age, x.decline) - C.opexPerMW) * lifeShare(age, x.life);
    pv += cf / Math.pow(1 + x.rate, n);
  }
  return (C.runningMW * pv) / 1000;
}

// MW already sold but not yet built, backed out of the contract backlog
const remainingRunningRevenue = C.runningMW * C.runningRevPerMW * Math.max(0, C.term - C.runningAge);
export const SOLD_MW = Math.max(0, (C.backlog - remainingRunningRevenue) / (C.signedRent * a * C.term));
const POWERED_MW = Math.max(0, C.contractedPowerMW - C.runningMW - SOLD_MW);

export interface Result {
  running: number; sold: number; spent: number; future: number; owed: number;
  equity: number; perShare: number; upside: number; breakeven: number; implied: number | null;
}

export function evaluate(x: Inputs): Result {
  const disc = (t: number) => Math.pow(1 + x.rate, -t);
  const running = runningFleetBn(x);
  const sold = (SOLD_MW * npvPerMW(C.signedRent, x) * disc(x.delay)) / 1000;
  const spent = C.cip;
  const weightedMW = POWERED_MW * disc(x.delay + 1) + C.growthMW * disc(x.delay + 3.5);
  const future = (weightedMW * Math.max(0, npvPerMW(x.rent, x))) / 1000;
  const owed = -C.owed;
  const equity = running + sold + spent + future + owed;
  const perShare = (equity * 1000) / C.dilutedShares;
  return {
    running, sold, spent, future, owed, equity, perShare,
    upside: perShare / C.price - 1,
    breakeven: solve((p) => npvPerMW(p, x), 0, 0.5, 15) ?? NaN,
    implied: solve((p) => perShareAt(p, x) - C.price, 0, 0.5, 15),
  };
}

export function perShareAt(rent: number, x: Inputs): number {
  const y = { ...x, rent };
  const disc = (t: number) => Math.pow(1 + y.rate, -t);
  const weightedMW = POWERED_MW * disc(y.delay + 1) + C.growthMW * disc(y.delay + 3.5);
  const base = runningFleetBn(y) + (SOLD_MW * npvPerMW(C.signedRent, y) * disc(y.delay)) / 1000 + C.cip - C.owed;
  return ((base + (weightedMW * Math.max(0, npvPerMW(rent, y))) / 1000) * 1000) / C.dilutedShares;
}

/** Bisection for f(p) = target on [lo, hi]; f must be non-decreasing. */
function solve(f: (p: number) => number, target: number, lo: number, hi: number): number | null {
  if (f(hi) < target || f(lo) > target) return null;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (f(m) < target) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
