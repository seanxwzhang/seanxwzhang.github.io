import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { C, DEFAULTS, evaluate, type Inputs } from './model';

type Key = keyof Inputs;
type Result = ReturnType<typeof evaluate>;
interface Mark { value: number; label: string }
interface Knob {
  key: Key; question: string; min: number; max: number; step: number;
  fmt: (v: number) => string; marks: (r: Result) => Mark[]; note?: string;
}

const pct = (v: number) => `${(v * 100).toFixed(Math.round(v * 1000) % 10 === 0 ? 0 : 1)}%`;
const usd = (v: number) => `$${v.toFixed(2)}`;
const yrs = (v: number) => `${v} years`;
const mine = (k: Key): Mark => ({ value: DEFAULTS[k], label: 'My estimate' });

const KNOBS: Record<Key, Knob> = {
  signedRent: { key: 'signedRent', question: 'What do the contracts already signed pay per GPU-hour, on average?',
    min: 2.6, max: 4.2, step: 0.01, fmt: usd,
    marks: () => [{ value: C.irenRent, label: 'IREN' }, mine('signedRent'), { value: C.nebiusRent, label: 'Nebius' }],
    note: 'The shakiest number in the model. Microsoft pays IREN about $2.91 and Nebius about $3.97.' },
  signedBilled: { key: 'signedBilled', question: 'What share of hours do signed contracts actually bill?',
    min: 0.85, max: 1, step: 0.005, fmt: pct,
    marks: () => [{ value: C.utilization, label: 'Same as new capacity' }, { value: 1, label: 'Full take-or-pay' }] },
  rent: { key: 'rent', question: 'What will contracts not yet signed pay per GPU-hour?',
    min: 2, max: 6, step: 0.01, fmt: usd,
    marks: (r) => [
      { value: C.irenRent, label: 'IREN' }, mine('rent'),
      ...(r.implied !== null && r.implied >= 2 && r.implied <= 6 ? [{ value: Math.round(r.implied * 100) / 100, label: "Today's price needs" }] : []),
      { value: 5.66, label: 'Open market, 3-year' },
    ] },
  decline: { key: 'decline', question: 'Once its first contract ends, how much less does a chip rent for each year?',
    min: 0, max: 0.2, step: 0.005, fmt: pct,
    marks: () => [{ value: 0.03, label: 'Bull case' }, { value: 0.06, label: 'A100 history' }, mine('decline')] },
  life: { key: 'life', question: 'How many years does a chip stay useful?',
    min: 5, max: 10, step: 0.5, fmt: yrs,
    marks: () => [{ value: 6, label: "CoreWeave's accounting" }, mine('life'), { value: 10, label: 'Bull case' }] },
  delay: { key: 'delay', question: 'How long until chips already sold are switched on?',
    min: 0.5, max: 4, step: 0.25, fmt: yrs,
    marks: () => [{ value: 1.5, label: 'Management target' }, { value: 3, label: 'Twice as slow' }] },
  rate: { key: 'rate', question: 'What does money cost CoreWeave each year?',
    min: 0.07, max: 0.15, step: 0.0025, fmt: pct,
    marks: () => [{ value: 0.084, label: 'Its average rate today' }, mine('rate'), { value: 0.15, label: 'Its bonds today' }] },
};

// Stories from the article, sorted by what they make a share worth.
const SCENARIOS: { label: string; set: Partial<Inputs> }[] = [
  { label: '6-year chips, 12% money', set: { life: 6, rate: 0.12 } },
  { label: 'Money at its bond yield', set: { rate: 0.15 } },
  { label: "Signed at IREN's price", set: { signedRent: C.irenRent } },
  { label: 'My base case', set: {} },
  { label: '10-year chips', set: { life: 10 } },
  { label: "Signed at Nebius's price", set: { signedRent: C.nebiusRent } },
  { label: '8% money', set: { rate: 0.08 } },
  { label: 'Rent fades 3% a year', set: { decline: 0.03 } },
  { label: 'New deals at $5.66', set: { rent: 5.66 } },
];

const money = (v: number, d = 2) => `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(d)}`;
const bn = (v: number) => `${v < 0 ? '−' : '+'}$${Math.abs(v).toFixed(1)}B`;
const perShare = (b: number) => (b * 1000) / C.dilutedShares;
const same = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol;
const snap = (k: Knob, v: number) => {
  const s = Math.round((v - k.min) / k.step) * k.step + k.min;
  return Math.min(k.max, Math.max(k.min, Number(s.toFixed(4))));
};
/** An inline number you can drag sideways (or arrow-key) to change; tapping it opens the panel below. */
function Scrub({ k, value, active, onChange, onPick }: {
  k: Knob; value: number; active: boolean; onChange: (v: number) => void; onPick: () => void;
}) {
  const drag = useRef<{ x: number; v: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const PX = 260; // pixels of drag for the full range
  const down = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, v: value, moved: false };
    onPick();
  };
  const move = (e: PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 3) return;
    if (!d.moved) { d.moved = true; setDragging(true); }
    onChange(snap(k, d.v + (dx / PX) * (k.max - k.min)));
  };
  const up = () => { drag.current = null; setDragging(false); };
  const key = (e: KeyboardEvent<HTMLSpanElement>) => {
    const big = e.shiftKey ? 10 : 1;
    const by: Record<string, number> = { ArrowRight: k.step * big, ArrowUp: k.step * big, ArrowLeft: -k.step * big, ArrowDown: -k.step * big };
    if (e.key in by) { e.preventDefault(); onChange(snap(k, value + by[e.key])); onPick(); }
    else if (e.key === 'Home') { e.preventDefault(); onChange(k.min); }
    else if (e.key === 'End') { e.preventDefault(); onChange(k.max); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); }
  };
  const changed = !same(value, DEFAULTS[k.key]);
  return (
    <span role="slider" tabIndex={0} aria-label={k.question} aria-valuemin={k.min} aria-valuemax={k.max}
      aria-valuenow={value} aria-valuetext={k.fmt(value)}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
      title="Drag sideways, or tap for a slider"
      style={{ touchAction: 'pan-y' }}
      className={`relative inline-block cursor-ew-resize select-none rounded px-1 text-center tabular-nums font-semibold outline-none transition-colors
        border-b-2 ${active ? 'border-coral bg-coral/15' : 'border-dashed border-coral/60 hover:bg-coral/10'}
        ${dragging ? 'bg-coral/20' : ''} focus-visible:ring-2 focus-visible:ring-coral/40 text-coral-dark`}>
      {k.fmt(value)}
      {changed && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-coral" />}
    </span>
  );
}

/** Detail panel for the number last touched: a full slider plus reference points you can jump to. */
function Panel({ k, value, r, onChange }: { k: Knob; value: number; r: Result; onChange: (v: number) => void }) {
  const marks = k.marks(r).filter((m) => m.value >= k.min - 1e-9 && m.value <= k.max + 1e-9);
  const pos = (v: number) => (v - k.min) / (k.max - k.min);
  return (
    <div className="mt-4 rounded-lg border border-cream-300 bg-cream-50 px-3.5 py-3 sm:px-4 sm:py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="cw-panel" className="text-[15px] leading-snug text-ink-light">{k.question}</label>
        <span className="font-serif text-xl sm:text-2xl leading-none tabular-nums text-ink whitespace-nowrap">{k.fmt(value)}</span>
      </div>
      <div className="relative mt-3">
        <input id="cw-panel" type="range" min={k.min} max={k.max} step={k.step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))} aria-valuetext={k.fmt(value)}
          className="relative z-[1] w-full accent-coral cursor-pointer" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-1 h-1.5">
          {marks.map((m) => (
            <span key={m.label} className="absolute top-0 h-1.5 w-px bg-ink-muted"
              style={{ left: `calc(8px + (100% - 16px) * ${pos(m.value)})` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {marks.map((m) => {
          const on = same(value, m.value, k.step / 2);
          return (
            <button key={m.label} type="button" onClick={() => onChange(m.value)}
              className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${on
                ? 'border-ink bg-ink text-cream-50' : 'border-cream-400 bg-cream-50 text-ink-light hover:border-ink-muted hover:text-ink'}`}>
              {m.label} <span className="tabular-nums">{k.fmt(m.value)}</span>
            </button>
          );
        })}
      </div>
      {k.note && <div className="mt-2.5 text-[13px] leading-snug text-ink-muted">{k.note}</div>}
    </div>
  );
}

/** One bar: what's signed (after debts) plus the bet on unsigned deals, against today's price. */
function SplitBar({ r }: { r: Result }) {
  const signed = perShare(r.running + r.sold + r.spent + r.owed);
  const future = perShare(r.future);
  const total = r.perShare;
  const lo = Math.min(0, signed, total) * 1.06;
  const hi = Math.max(100, total * 1.04, C.price * 1.1);
  const X = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const W = (a: number, b: number) => `${(Math.abs(b - a) / (hi - lo)) * 100}%`;
  return (
    <div className="mt-5">
      <div className="relative h-11">
        {/* today's price */}
        <div className="absolute top-0 bottom-0 border-l border-dashed border-ink" style={{ left: X(C.price) }} />
        <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-cream-50 px-1 text-[12px] leading-none text-ink"
          style={{ left: X(C.price) }}>Today ${C.price.toFixed(2)}</span>
        {lo < 0 && <div className="absolute bottom-0 h-7 border-l border-ink-muted" style={{ left: X(0) }} />}
        {/* stacked when what's signed is positive; a two-step waterfall when debts outweigh it */}
        <div className={`absolute rounded-sm transition-all duration-200 ${signed >= 0 ? 'bottom-1 h-4 rounded-r-none' : 'bottom-4 h-2.5'}`}
          style={{ left: X(Math.min(0, signed)), width: W(0, signed), background: signed >= 0 ? '#2D3748' : '#C55D45' }} />
        <div className={`absolute rounded-sm bg-coral transition-all duration-200 ${signed >= 0 ? 'bottom-1 h-4 rounded-l-none' : 'bottom-0.5 h-2.5'}`}
          style={{ left: X(signed), width: W(signed, signed + future), opacity: 0.85 }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-light">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: signed >= 0 ? '#2D3748' : '#C55D45' }} />
          Already signed, after debts <b className="font-medium tabular-nums text-ink">{money(signed)}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-coral" style={{ opacity: 0.85 }} />
          Bet on deals not yet signed <b className="font-medium tabular-nums text-ink">+{money(future)}</b>
        </span>
      </div>
    </div>
  );
}

function Math_({ r }: { r: Result }) {
  const signed = r.running + r.sold + r.spent + r.owed;
  const rows: [string, number, boolean?][] = [
    ['Chips running today', r.running],
    ['Chips sold, not yet built', r.sold],
    ['Already spent on those chips', r.spent],
    ['Owed to lenders and customers', r.owed],
    ["What's signed, after debts", signed, true],
    ['Future chips, not yet sold', r.future],
    ['Left for shareholders', r.equity, true],
  ];
  return (
    <details className="group mt-5 border-t border-cream-300 pt-3">
      <summary className="cursor-pointer list-none text-[14px] text-ink-light hover:text-ink">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span> Show the math
      </summary>
      <div role="table" className="mt-3 grid grid-cols-[1fr_auto_auto] text-[14px] tabular-nums">
        {rows.map(([label, v, total]) => (
          <div role="row" key={label} className={`contents ${total ? 'font-medium text-ink' : 'text-ink-light'}`}>
            <span role="cell" className={`py-1 pr-3 ${total ? 'border-t border-cream-300' : ''}`}>{label}</span>
            <span role="cell" className={`py-1 text-right ${total ? 'border-t border-cream-300' : ''} ${v < 0 ? 'text-coral-dark' : ''}`}>{bn(v)}</span>
            <span role="cell" className={`py-1 pl-3 text-right text-ink-muted ${total ? 'border-t border-cream-300' : ''}`}>{money(perShare(v))}/sh</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[14px] leading-snug text-ink-light">
        A new chip breaks even at {money(r.breakevenFull)} an hour if every hour is billed ({money(r.breakeven)} if
        only {Math.round(C.utilization * 100)}% are). For the stock to be worth ${C.price.toFixed(2)}, new contracts
        need {r.implied === null ? 'more than $15' : money(r.implied)} an hour. {C.dilutedShares}M diluted shares.
      </div>
    </details>
  );
}

export default function CoreWeaveModel() {
  const [x, setX] = useState<Inputs>(DEFAULTS);
  const [active, setActive] = useState<Key>('signedRent');
  const r = useMemo(() => evaluate(x), [x]);
  const set = (k: Key) => (v: number) => setX((s) => ({ ...s, [k]: v }));
  const changed = (Object.keys(DEFAULTS) as Key[]).some((k) => !same(x[k], DEFAULTS[k]));
  const worthless = r.perShare <= 0;
  const scen = useMemo(() => SCENARIOS.map((s) => {
    const inputs = { ...DEFAULTS, ...s.set };
    return { ...s, inputs, value: evaluate(inputs).perShare };
  }), []);

  const N = (k: Key): ReactNode => (
    <Scrub k={KNOBS[k]} value={x[k]} active={active === k} onChange={set(k)} onPick={() => setActive(k)} />
  );

  return (
    <div className="not-prose my-8 rounded-xl border border-cream-300 bg-cream-100/60 px-4 py-4 font-sans sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[15px] text-ink-light">One CoreWeave share is worth</span>
          <span className="font-serif text-[1.75rem] sm:text-[2rem] leading-none tabular-nums text-ink">{worthless ? 'nothing' : money(r.perShare)}</span>
          <span className={`text-[15px] ${worthless || r.upside < 0 ? 'text-coral-dark' : 'text-ink-light'}`}>
            {worthless
              ? `debts exceed value by ${money(-r.equity, 1)}B`
              : `${Math.abs(r.upside * 100).toFixed(0)}% ${r.upside < 0 ? 'below' : 'above'} today's $${C.price.toFixed(2)}`}
          </span>
        </div>
        <button type="button" onClick={() => { setX(DEFAULTS); }} disabled={!changed}
          className="text-[14px] text-coral underline decoration-coral/30 hover:decoration-coral disabled:invisible">
          Reset
        </button>
      </div>

      <SplitBar r={r} />

      <div className="mt-5 font-serif text-[1.0625rem] sm:text-[1.125rem] leading-[1.95] text-ink">
        CoreWeave's signed contracts pay {N('signedRent')} per GPU-hour on average and bill {N('signedBilled')} of
        their hours. Contracts it hasn't signed yet will pay {N('rent')}. Once a chip's first contract ends, its rent
        falls {N('decline')} a year, and it stays useful for {N('life')}. Chips already sold get switched on
        after {N('delay')}, and money costs CoreWeave {N('rate')} a year.
      </div>
      <div className="mt-1 text-[13px] text-ink-muted">Drag any coral number sideways, or tap it for a slider and reference points.</div>

      <Panel k={KNOBS[active]} value={x[active]} r={r} onChange={set(active)} />

      <div className="mt-6">
        <h4 className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">Try a story from the article</h4>
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {scen.map((s) => {
            const on = (Object.keys(DEFAULTS) as Key[]).every((k) => same(x[k], s.inputs[k]));
            return (
              <button key={s.label} type="button" onClick={() => setX(s.inputs)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] transition-colors ${on
                  ? 'border-ink bg-ink text-cream-50' : 'border-cream-400 bg-cream-50 text-ink-light hover:border-ink-muted hover:text-ink'}`}>
                {s.label} <span className={`tabular-nums font-medium ${on ? '' : s.value < C.price ? 'text-coral-dark' : 'text-ink'}`}>{money(Math.max(0, s.value), 0)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Math_ r={r} />

      <div className="mt-5 text-[12px] text-ink-muted">
        Share price as of Oct 16, 2026. A simplified model of a complicated company; not investment advice.
      </div>
    </div>
  );
}
